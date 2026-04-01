/**
 * /api/upload-drive
 *
 * Recibe un archivo en base64 y lo sube a Google Drive
 * convirtiéndolo automáticamente a Google Sheets.
 *
 * Body esperado:
 *   { base64: string, fileName: string, mimeType?: string }
 *
 * Responde:
 *   { ok: true, fileId: string, link: string }
 *   { ok: false, error: string }
 *
 * Variables de entorno requeridas en Vercel:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  →  contenido del JSON de cuenta de servicio
 *   GOOGLE_DRIVE_FOLDER_ID       →  ID de la carpeta compartida en Drive
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
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive',
    ].join(' '),
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

// ── Buscar archivo existente en la carpeta por nombre base del paciente ───────
async function buscarArchivoExistente(
  token: string,
  folderId: string,
  nombreBase: string // ej: "Menu_Semanal_Valentina Lopez"
): Promise<string | null> {
  const q = encodeURIComponent(
    `'${folderId}' in parents and name contains '${nombreBase.replace(/'/g, "\\'")}' and trashed = false`
  )
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=5`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

// ── Actualizar contenido de archivo existente ─────────────────────────────────
async function actualizarArchivo(
  token: string,
  fileId: string,
  fileName: string,
  fileBuffer: Buffer,
  sourceMimeType: string
): Promise<{ fileId: string; link: string }> {
  const boundary = '-------GoogleDriveUpdateBoundary'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: fileName })}`
  const filePart = `${delimiter}Content-Type: ${sourceMimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${fileBuffer.toString('base64')}${closeDelimiter}`

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,webViewLink`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: metadataPart + filePart,
    }
  )
  if (!res.ok) throw new Error(`Drive update error: ${await res.text()}`)
  const result = await res.json()
  return {
    fileId: result.id,
    link: result.webViewLink || `https://docs.google.com/spreadsheets/d/${result.id}/edit`,
  }
}

// ── Crear archivo nuevo en Drive ──────────────────────────────────────────────
async function crearArchivo(
  token: string,
  folderId: string,
  fileName: string,
  fileBuffer: Buffer,
  sourceMimeType: string
): Promise<{ fileId: string; link: string }> {
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/vnd.google-apps.spreadsheet',
  }

  const boundary = '-------GoogleDriveUploadBoundary'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`
  const filePart = `${delimiter}Content-Type: ${sourceMimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${fileBuffer.toString('base64')}${closeDelimiter}`

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: metadataPart + filePart,
    }
  )
  if (!res.ok) throw new Error(`Drive upload error: ${await res.text()}`)
  const result = await res.json()
  return {
    fileId: result.id,
    link: result.webViewLink || `https://docs.google.com/spreadsheets/d/${result.id}/edit`,
  }
}

// ── Subir o actualizar archivo en Drive ───────────────────────────────────────
async function subirADrive(
  token: string,
  folderId: string,
  fileName: string,
  fileBuffer: Buffer,
  sourceMimeType: string,
  nombrePaciente: string
): Promise<{ fileId: string; link: string; actualizado: boolean }> {
  // Buscar si ya existe un archivo para este paciente
  const nombreBase = `Menu_Semanal_${nombrePaciente}`
  const existingId = await buscarArchivoExistente(token, folderId, nombreBase)

  if (existingId) {
    // Actualizar el archivo existente (sin crear uno nuevo → sin usar más cuota)
    const result = await actualizarArchivo(token, existingId, fileName, fileBuffer, sourceMimeType)
    return { ...result, actualizado: true }
  } else {
    // Crear archivo nuevo
    const result = await crearArchivo(token, folderId, fileName, fileBuffer, sourceMimeType)
    return { ...result, actualizado: false }
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!saJson || !folderId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Variables de entorno no configuradas.',
        requeridas: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_DRIVE_FOLDER_ID'],
      },
      { status: 500 }
    )
  }

  let base64: string
  let fileName: string
  let mimeType: string
  let nombrePaciente: string

  try {
    const body = await req.json()
    base64 = body.base64
    fileName = body.fileName || 'Menu_Semanal.xlsx'
    mimeType = body.mimeType || 'application/vnd.ms-excel'
    nombrePaciente = body.nombrePaciente || fileName

    if (!base64) throw new Error('Campo base64 requerido')
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Body inválido: ${e}` }, { status: 400 })
  }

  try {
    const sa: ServiceAccountKey = JSON.parse(saJson)
    const token = await obtenerAccessToken(sa)
    const fileBuffer = Buffer.from(base64, 'base64')

    const { fileId, link, actualizado } = await subirADrive(
      token, folderId, fileName, fileBuffer, mimeType, nombrePaciente
    )

    return NextResponse.json({ ok: true, fileId, link, actualizado })
  } catch (err) {
    console.error('[upload-drive]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// ── GET: verificar configuración ──────────────────────────────────────────────
export async function GET() {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  if (!saJson || !folderId) {
    return NextResponse.json({
      ok: false,
      error: 'Faltan variables: GOOGLE_SERVICE_ACCOUNT_JSON y/o GOOGLE_DRIVE_FOLDER_ID',
    })
  }

  try {
    const sa: ServiceAccountKey = JSON.parse(saJson)
    const token = await obtenerAccessToken(sa)

    // Verificar acceso a la carpeta
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name,id`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) throw new Error('No se pudo acceder a la carpeta. Verifica que esté compartida con la cuenta de servicio.')

    const data = await res.json()

    // Contar archivos en la carpeta y mostrar uso estimado
    const listaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${folderId}' in parents and trashed = false`)}&fields=files(id,name,size)&pageSize=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const lista = listaRes.ok ? await listaRes.json() : { files: [] }
    const totalBytes = lista.files.reduce((sum: number, f: { size?: string }) => sum + parseInt(f.size || '0', 10), 0)

    return NextResponse.json({
      ok: true,
      carpeta: data.name,
      id: data.id,
      archivos: lista.files.length,
      usoEstimadoMB: (totalBytes / 1024 / 1024).toFixed(2),
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// ── DELETE: limpiar todos los archivos de la carpeta (liberar cuota) ──────────
export async function DELETE(req: NextRequest) {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!saJson || !folderId) return NextResponse.json({ ok: false, error: 'Env vars missing' }, { status: 500 })

  // Solo permitir si se pasa ?confirm=true
  const { searchParams } = new URL(req.url)
  if (searchParams.get('confirm') !== 'true') {
    return NextResponse.json({ ok: false, error: 'Agrega ?confirm=true para confirmar la limpieza.' })
  }

  try {
    const sa: ServiceAccountKey = JSON.parse(saJson)
    const token = await obtenerAccessToken(sa)

    // Listar todos los archivos de la carpeta
    const listaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${folderId}' in parents and trashed = false`)}&fields=files(id,name)&pageSize=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const lista = await listaRes.json()
    const archivos: { id: string; name: string }[] = lista.files || []

    // Eliminar cada archivo
    const eliminados: string[] = []
    for (const archivo of archivos) {
      const del = await fetch(`https://www.googleapis.com/drive/v3/files/${archivo.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (del.ok || del.status === 204) eliminados.push(archivo.name)
    }

    return NextResponse.json({ ok: true, eliminados: eliminados.length, archivos: eliminados })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
