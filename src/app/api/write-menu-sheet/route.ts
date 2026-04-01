/**
 * /api/write-menu-sheet
 *
 * Escribe el menú semanal de un paciente DIRECTAMENTE en una Google Sheet
 * que TEES TÚ quien la posee (compartida con la cuenta de servicio como Editor).
 *
 * Así el archivo cuenta contra TU cuota de Drive, no la de la cuenta de servicio.
 *
 * Cada paciente obtiene su propia PESTAÑA dentro de la misma hoja maestra.
 *
 * Variables de entorno requeridas en Vercel:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  → contenido del JSON de cuenta de servicio
 *   GOOGLE_SHEET_ID              → ID de la hoja de cálculo que TÚ creaste y
 *                                  compartiste con la cuenta de servicio
 *
 * Body esperado:
 *   { pacienteNombre: string, planTexto: string, fecha?: string }
 *
 * Responde:
 *   { ok: true, link: string, hoja: string }
 */

import { NextRequest, NextResponse } from 'next/server'

interface ServiceAccountKey {
  client_email: string
  private_key: string
  token_uri: string
}

// ── JWT → Access Token ────────────────────────────────────────────────────────
async function obtenerAccessToken(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: sa.token_uri,
    exp: now + 3600,
    iat: now,
  }

  const encode = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const toSign = `${encode(header)}.${encode(payload)}`

  const pemKey = sa.private_key.replace(/\\n/g, '\n')
  const keyData = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    Buffer.from(keyData, 'base64'),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, Buffer.from(toSign))
  const jwt = `${toSign}.${Buffer.from(sig).toString('base64url')}`

  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) throw new Error(`Token error: ${await res.text()}`)
  const data = await res.json()
  return data.access_token as string
}

// ── Asegurar que existe una pestaña con el nombre del paciente ─────────────────
async function asegurarPestana(
  token: string,
  sheetId: string,
  nombrePestana: string
): Promise<number> {
  // Obtener info de la hoja para verificar si la pestaña ya existe
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`No se pudo acceder a la hoja: ${await res.text()}`)
  const data = await res.json()

  const sheets = data.sheets as { properties: { title: string; sheetId: number } }[]
  const existente = sheets.find(s => s.properties.title === nombrePestana)

  if (existente) return existente.properties.sheetId

  // Crear nueva pestaña
  const addRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: nombrePestana } } }],
      }),
    }
  )
  if (!addRes.ok) throw new Error(`No se pudo crear la pestaña: ${await addRes.text()}`)
  const addData = await addRes.json()
  return addData.replies[0].addSheet.properties.sheetId as number
}

// ── Parsear el plan de texto a filas para la hoja ─────────────────────────────
function parsearPlanAFilas(planTexto: string, pacienteNombre: string, fecha: string): string[][] {
  const filas: string[][] = []

  // Encabezado
  filas.push([`MENÚ SEMANAL — ${pacienteNombre.toUpperCase()}`])
  filas.push([`Generado: ${fecha}`])
  filas.push([])

  // Extraer días del plan
  const DIAS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'SABADO', 'DOMINGO']
  const COMIDAS = ['Desayuno', 'Colación AM', 'Colacion AM', 'Comida', 'Colación PM', 'Colacion PM', 'Cena', 'Snack']

  // Encabezado de tabla
  filas.push(['Día', 'Tiempo', 'Descripción'])

  const lineas = planTexto.split('\n')
  let diaActual = ''

  for (const linea of lineas) {
    const lineaLimpia = linea.replace(/[#*_]/g, '').trim()
    if (!lineaLimpia) continue

    // Detectar si es un día
    const esDia = DIAS.some(d => lineaLimpia.toUpperCase().startsWith(d))
    if (esDia) {
      diaActual = lineaLimpia.toUpperCase().split(':')[0].trim()
      continue
    }

    // Detectar si es una comida
    const esComida = COMIDAS.find(c =>
      lineaLimpia.toLowerCase().startsWith(c.toLowerCase())
    )
    if (esComida && diaActual) {
      const descripcion = lineaLimpia.substring(esComida.length).replace(/^[:\-\s]+/, '').trim()
      filas.push([diaActual, esComida, descripcion])
      diaActual = '' // reset día para no repetir
      continue
    }

    // Línea con "Comida:" al inicio
    const matchComida = lineaLimpia.match(/^([^:]+):\s*(.+)$/)
    if (matchComida && diaActual && matchComida[1].length < 20) {
      filas.push([diaActual, matchComida[1].trim(), matchComida[2].trim()])
      diaActual = ''
    }
  }

  // Si no se pudo parsear correctamente, poner el texto plano
  if (filas.length <= 4) {
    filas.push([])
    filas.push(['Plan completo:'])
    const parrafos = planTexto.split('\n').filter(l => l.trim())
    for (const p of parrafos) {
      filas.push([p.replace(/[#*_]/g, '').trim()])
    }
  }

  return filas
}

// ── Escribir filas en la pestaña del paciente ─────────────────────────────────
async function escribirEnPestana(
  token: string,
  sheetId: string,
  nombrePestana: string,
  filas: string[][]
): Promise<void> {
  // Limpiar el contenido anterior de la pestaña
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(nombrePestana)}!A1:Z500:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }
  )

  // Escribir nuevas filas
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(nombrePestana)}!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: filas }),
    }
  )
  if (!res.ok) throw new Error(`Error escribiendo en la hoja: ${await res.text()}`)
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const sheetId = process.env.GOOGLE_SHEET_ID

  if (!saJson || !sheetId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Faltan variables de entorno: GOOGLE_SERVICE_ACCOUNT_JSON y/o GOOGLE_SHEET_ID',
        instrucciones: [
          '1. Crea una Google Sheet y cópiala con el email de la cuenta de servicio (Editor)',
          '2. Agrega GOOGLE_SHEET_ID en Vercel con el ID de esa hoja',
        ],
      },
      { status: 500 }
    )
  }

  let pacienteNombre: string
  let planTexto: string
  let fecha: string

  try {
    const body = await req.json()
    pacienteNombre = body.pacienteNombre || 'Paciente'
    planTexto = body.planTexto || ''
    fecha = body.fecha || new Date().toLocaleDateString('es-MX')
    if (!planTexto) throw new Error('Campo planTexto requerido')
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Body inválido: ${e}` }, { status: 400 })
  }

  try {
    const sa: ServiceAccountKey = JSON.parse(saJson)
    const token = await obtenerAccessToken(sa)

    // Nombre de la pestaña = nombre del paciente (máx 100 chars)
    const nombrePestana = pacienteNombre.substring(0, 100)

    // Asegurar que la pestaña existe
    await asegurarPestana(token, sheetId, nombrePestana)

    // Parsear plan a filas
    const filas = parsearPlanAFilas(planTexto, pacienteNombre, fecha)

    // Escribir en la hoja
    await escribirEnPestana(token, sheetId, nombrePestana, filas)

    const link = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`

    return NextResponse.json({
      ok: true,
      link,
      hoja: nombrePestana,
      filas: filas.length,
    })
  } catch (err) {
    console.error('[write-menu-sheet]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
