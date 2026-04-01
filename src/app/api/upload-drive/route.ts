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

// ── Subir archivo a Drive ─────────────────────────────────────────────────────
async function subirADrive(
  token: string,
  folderId: string,
  fileName: string,
  fileBuffer: Buffer,
  sourceMimeType: string
): Promise<{ fileId: string; link: string }> {
  // Metadata del archivo
  const metadata = {
    name: fileName,
    parents: [folderId],
    // Convertir automáticamente a Google Sheets
    mimeType: 'application/vnd.google-apps.spreadsheet',
  }

  // Construir multipart/related body
  const boundary = '-------GoogleDriveUploadBoundary'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`
  const filePart = `${delimiter}Content-Type: ${sourceMimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${fileBuffer.toString('base64')}${closeDelimiter}`

  const body = metadataPart + filePart

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body,
    }
  )

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`Drive upload error: ${err}`)
  }

  const result = await uploadRes.json()
  return {
    fileId: result.id,
    link: result.webViewLink || `https://docs.google.com/spreadsheets/d/${result.id}/edit`,
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

  try {
    const body = await req.json()
    base64 = body.base64
    fileName = body.fileName || 'Menu_Semanal.xlsx'
    mimeType = body.mimeType || 'application/vnd.ms-excel'

    if (!base64) throw new Error('Campo base64 requerido')
  } catch (e) {
    return NextResponse.json({ ok: false, error: `Body inválido: ${e}` }, { status: 400 })
  }

  try {
    const sa: ServiceAccountKey = JSON.parse(saJson)
    const token = await obtenerAccessToken(sa)
    const fileBuffer = Buffer.from(base64, 'base64')

    const { fileId, link } = await subirADrive(token, folderId, fileName, fileBuffer, mimeType)

    return NextResponse.json({ ok: true, fileId, link })
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
    return NextResponse.json({ ok: true, carpeta: data.name, id: data.id })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
