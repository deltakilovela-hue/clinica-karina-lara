import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let tempJson = ''
  let tempXlsx = ''

  try {
    const { paciente, planTexto, historia } = await req.json()

    // ── 1. Pedir a Claude que estructure el plan en 7 días ──────────────────
    const alergias   = historia?.alergias    || 'Ninguna'
    const intoler    = historia?.intolerancias || 'Ninguna'
    const rechazados = historia?.alimentosRechazados || 'Ninguno'
    const presupuesto= historia?.presupuestoAlimentario || 'No especificado'

    const promptEstructura = `Eres una nutrióloga pediátrica. Basándote en el siguiente plan nutricional, genera un menú semanal para 7 días (Lunes a Domingo) con variedad en cada día.

PLAN DE REFERENCIA:
${planTexto?.slice(0, 3000) || 'Plan no disponible'}

RESTRICCIONES DEL PACIENTE:
- Alergias: ${alergias}
- Intolerancias: ${intoler}
- Alimentos rechazados: ${rechazados}
- Presupuesto: ${presupuesto}

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta (sin texto extra, sin markdown, solo el JSON):
{
  "dias": {
    "LUNES":     { "desayuno": "...", "colacion_am": "...", "comida": "...", "colacion_pm": "...", "cena": "..." },
    "MARTES":    { "desayuno": "...", "colacion_am": "...", "comida": "...", "colacion_pm": "...", "cena": "..." },
    "MIÉRCOLES": { "desayuno": "...", "colacion_am": "...", "comida": "...", "colacion_pm": "...", "cena": "..." },
    "JUEVES":    { "desayuno": "...", "colacion_am": "...", "comida": "...", "colacion_pm": "...", "cena": "..." },
    "VIERNES":   { "desayuno": "...", "colacion_am": "...", "comida": "...", "colacion_pm": "...", "cena": "..." },
    "SÁBADO":    { "desayuno": "...", "colacion_am": "...", "comida": "...", "colacion_pm": "...", "cena": "..." },
    "DOMINGO":   { "desayuno": "...", "colacion_am": "...", "comida": "...", "colacion_pm": "...", "cena": "..." }
  }
}

Reglas:
- Cada campo debe tener máximo 3-4 líneas de texto con alimentos reales mexicanos y porciones caseras.
- Varía los alimentos entre días pero mantén el patrón nutricional del plan de referencia.
- Usa emojis al inicio de cada línea (🥣 🍳 🫘 🥦 🐟 🍗 etc).
- Si el plan dice evitar algún alimento, NO lo incluyas.
- Formato de cada campo: una línea por alimento/grupo, sin salto extra.`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{ role: 'user', content: promptEstructura }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return NextResponse.json({ error: 'Error al estructurar el menú', detalle: err }, { status: 500 })
    }

    const claudeData = await claudeRes.json()
    let menuJson: { dias: Record<string, Record<string, string>> }

    try {
      const rawText = claudeData.content[0].text.trim()
      // Extraer JSON aunque Claude lo envuelva en ```json ... ```
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta')
      menuJson = JSON.parse(jsonMatch[0])
    } catch (e) {
      return NextResponse.json({ error: 'El modelo no devolvió JSON válido', detalle: String(e) }, { status: 500 })
    }

    // ── 2. Llamar al script Python con los datos ──────────────────────────
    const ts = Date.now()
    tempJson = path.join(tmpdir(), `menu_${id}_${ts}.json`)
    tempXlsx = path.join(tmpdir(), `menu_${id}_${ts}.xlsx`)

    const payload = {
      paciente,
      menu: menuJson.dias,
    }

    await writeFile(tempJson, JSON.stringify(payload, null, 2), 'utf-8')

    const scriptPath = path.join(process.cwd(), 'scripts', 'generar_menu_plan.py')
    await execAsync(`python3 "${scriptPath}" "${tempJson}" "${tempXlsx}"`)

    const xlsxBuffer = await readFile(tempXlsx)
    const nombre = (paciente?.nombre as string || 'Paciente').replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9 ]/g, '').trim()

    return new NextResponse(xlsxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Menu_Semanal_${nombre}.xlsx"`,
        'Content-Length': xlsxBuffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('[menu]', err)
    return NextResponse.json({ error: 'Error al generar el menú', detalle: String(err) }, { status: 500 })
  } finally {
    if (tempJson) await unlink(tempJson).catch(() => {})
    if (tempXlsx) await unlink(tempXlsx).catch(() => {})
  }
}
