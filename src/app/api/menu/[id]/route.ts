import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

const DIAS_ES = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO']
// variantes con/sin tildes que Claude puede generar
const DIAS_VARIANTES: Record<string, string> = {
  'MIERCOLES': 'MIÉRCOLES',
  'SABADO':    'SÁBADO',
  'MIÉRCOLES': 'MIÉRCOLES',
  'SÁBADO':    'SÁBADO',
}

function normalizarDia(d: string): string {
  const up = d.toUpperCase().trim()
  return DIAS_VARIANTES[up] || up
}

/**
 * Extrae las comidas de cada día del texto del plan.
 * Espera secciones con el formato:
 *   ### LUNES
 *   **Desayuno:** contenido
 *   **Colación AM:** contenido
 *   ...
 */
function parsearPlan(planTexto: string): Record<string, Record<string, string>> {
  const resultado: Record<string, Record<string, string>> = {}

  // Dividir el texto por secciones de día (### LUNES, ### MARTES, etc.)
  // Capturamos cualquier ### seguido de uno de los días de la semana
  const patronDias = DIAS_ES.map(d => d.replace('É', '[EÉ]').replace('Á', '[AÁ]')).join('|')
  const regexSeccion = new RegExp(
    `###\\s+(${patronDias})\\s*\\n([\\s\\S]*?)(?=###\\s+(?:${patronDias})|###\\s+RECOMENDAC|###\\s+ALIMENTO|###\\s+LISTA|###\\s+PRESUPUESTO|---\\s*$|$)`,
    'gi'
  )

  let match
  while ((match = regexSeccion.exec(planTexto)) !== null) {
    const dia = normalizarDia(match[1])
    const bloque = match[2]

    // Extraer cada tiempo de comida del bloque del día
    const extraer = (patrones: string[]): string => {
      for (const patron of patrones) {
        const re = new RegExp(`\\*\\*${patron}[^*]*\\*\\*:?\\s*(.+?)(?=\\n\\*\\*|\\n###|$)`, 'si')
        const m = bloque.match(re)
        if (m) return m[1].trim().replace(/\n/g, '\n')
      }
      return '—'
    }

    resultado[dia] = {
      desayuno:    extraer(['Desayuno']),
      colacion_am: extraer(['Colaci[oó]n AM', 'Colaci[oó]n Matutina', 'Colaci[oó]n de la ma']),
      comida:      extraer(['Comida']),
      colacion_pm: extraer(['Colaci[oó]n PM', 'Colaci[oó]n Vespertina', 'Colaci[oó]n de la tarde']),
      cena:        extraer(['Cena']),
    }
  }

  return resultado
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let tempJson = ''
  let tempXlsx = ''

  try {
    const { paciente, planTexto, historia } = await req.json()

    if (!planTexto) {
      return NextResponse.json({ error: 'No hay plan generado. Genera un plan primero.' }, { status: 400 })
    }

    // ── Parsear el plan directamente ────────────────────────────────────────
    let menuDias = parsearPlan(planTexto)

    // Si no se encontraron suficientes días (plan viejo con formato anterior),
    // usar el contenido general del plan para todos los días con nota
    const diasEncontrados = Object.keys(menuDias).length
    if (diasEncontrados < 5) {
      // Extraer sección general del plan para mostrar como fallback
      const seccionGeneral = planTexto
        .replace(/### LISTA DEL SÚPER[\s\S]*/i, '')
        .replace(/### RECOMENDACIONES[\s\S]*/i, '')
        .replace(/## PLAN NUTRICIONAL[^\n]*/i, '')
        .trim()
        .slice(0, 600)

      const nota = diasEncontrados === 0
        ? `⚠️ Este plan fue generado con el formato anterior.\n\n${seccionGeneral}`
        : `Parcial: solo se encontraron ${diasEncontrados} días.`

      for (const dia of DIAS_ES) {
        if (!menuDias[dia]) {
          menuDias[dia] = {
            desayuno: nota,
            colacion_am: '—',
            comida: '—',
            colacion_pm: '—',
            cena: '—',
          }
        }
      }
    }

    // ── Llamar script Python ────────────────────────────────────────────────
    const ts = Date.now()
    tempJson = path.join(tmpdir(), `menu_${id}_${ts}.json`)
    tempXlsx = path.join(tmpdir(), `menu_${id}_${ts}.xlsx`)

    const payload = {
      paciente,
      historia,
      menu: menuDias,
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
