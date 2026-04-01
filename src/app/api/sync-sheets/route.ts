/**
 * /api/sync-sheets
 *
 * Sincroniza datos de pacientes con Google Sheets usando una Cuenta de Servicio.
 *
 * CONFIGURACIÓN REQUERIDA (una sola vez):
 * ─────────────────────────────────────────
 * 1. Ve a https://console.cloud.google.com
 * 2. Crea o selecciona tu proyecto
 * 3. Activa la API "Google Sheets API"
 * 4. Ve a "Credenciales" → "Crear credenciales" → "Cuenta de servicio"
 * 5. Descarga el archivo JSON de la cuenta de servicio
 * 6. En Google Sheets: comparte tu hoja con el email de la cuenta de servicio
 *    (ej: karina-sync@tu-proyecto.iam.gserviceaccount.com) con rol "Editor"
 * 7. En Vercel → Settings → Environment Variables agrega:
 *    GOOGLE_SERVICE_ACCOUNT_JSON  →  pega todo el contenido del JSON descargado
 *    GOOGLE_SHEET_ID              →  el ID de tu hoja (está en la URL de Sheets)
 *
 * USO:
 *   POST /api/sync-sheets   con body { pacientes: PacienteRow[] }
 *   GET  /api/sync-sheets   solo verifica que la conexión funciona
 */

import { NextRequest, NextResponse } from 'next/server'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ServiceAccountKey {
  client_email: string
  private_key: string
  token_uri: string
}

interface PacienteRow {
  id?: string
  nombrePaciente: string
  fechaNacimiento?: string
  sexo?: string
  tutorNombre?: string
  tutorTelefono?: string
  tutorCorreo?: string
  diagnostico?: string
  ultimaMedicion?: string
  ultimoPeso?: string
  ultimaTalla?: string
  imc?: string
  proximaCita?: string
}

// ── Helper: firmar JWT para Google OAuth2 ────────────────────────────────────
async function obtenerAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const toSign = `${encode(header)}.${encode(payload)}`

  // Importar la clave privada para firmar
  const pemKey = serviceAccount.private_key.replace(/\\n/g, '\n')
  const keyData = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryKey = Buffer.from(keyData, 'base64')
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(toSign)
  )

  const jwt = `${toSign}.${Buffer.from(signature).toString('base64url')}`

  // Intercambiar JWT por access token
  const res = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Error obteniendo token de Google: ${err}`)
  }

  const data = await res.json()
  return data.access_token as string
}

// ── Helper: escribir en Sheets ────────────────────────────────────────────────
async function escribirEnSheets(
  accessToken: string,
  sheetId: string,
  filas: string[][]
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Pacientes!A1:M${filas.length + 1}?valueInputOption=RAW`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: filas }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Error escribiendo en Sheets: ${err}`)
  }
}

// ── GET: verificar conexión ───────────────────────────────────────────────────
export async function GET() {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const sheetId = process.env.GOOGLE_SHEET_ID

  if (!saJson || !sheetId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Variables de entorno no configuradas.',
        instrucciones: [
          'Agrega GOOGLE_SERVICE_ACCOUNT_JSON en Vercel → Settings → Environment Variables',
          'Agrega GOOGLE_SHEET_ID en Vercel → Settings → Environment Variables',
        ],
      },
      { status: 500 }
    )
  }

  try {
    const serviceAccount: ServiceAccountKey = JSON.parse(saJson)
    const token = await obtenerAccessToken(serviceAccount)

    // Leer metadatos de la hoja para verificar
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) throw new Error('No se pudo acceder a la hoja. Verifica que el service account tenga acceso.')

    const data = await res.json()
    return NextResponse.json({ ok: true, hoja: data.properties?.title })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// ── POST: sincronizar pacientes ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const sheetId = process.env.GOOGLE_SHEET_ID

  if (!saJson || !sheetId) {
    return NextResponse.json(
      { ok: false, error: 'Variables de entorno no configuradas (GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SHEET_ID).' },
      { status: 500 }
    )
  }

  let pacientes: PacienteRow[] = []
  try {
    const body = await req.json()
    pacientes = body.pacientes ?? []
  } catch {
    return NextResponse.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 })
  }

  try {
    const serviceAccount: ServiceAccountKey = JSON.parse(saJson)
    const accessToken = await obtenerAccessToken(serviceAccount)

    // Construir filas: encabezado + datos
    const encabezado = [
      'ID', 'Paciente', 'Fecha Nac.', 'Sexo', 'Tutor', 'Teléfono', 'Correo',
      'Diagnóstico', 'Últ. Medición', 'Peso (kg)', 'Talla (cm)', 'IMC', 'Próx. Cita',
    ]

    const filas: string[][] = [
      encabezado,
      ...pacientes.map(p => [
        p.id ?? '',
        p.nombrePaciente ?? '',
        p.fechaNacimiento ?? '',
        p.sexo ?? '',
        p.tutorNombre ?? '',
        p.tutorTelefono ?? '',
        p.tutorCorreo ?? '',
        p.diagnostico ?? '',
        p.ultimaMedicion ?? '',
        p.ultimoPeso ?? '',
        p.ultimaTalla ?? '',
        p.imc ?? '',
        p.proximaCita ?? '',
      ]),
    ]

    await escribirEnSheets(accessToken, sheetId, filas)

    return NextResponse.json({
      ok: true,
      sincronizados: pacientes.length,
      mensaje: `${pacientes.length} paciente(s) sincronizados correctamente.`,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
