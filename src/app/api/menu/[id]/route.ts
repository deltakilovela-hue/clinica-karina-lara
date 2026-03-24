import { NextRequest, NextResponse } from 'next/server'
import { generarMenuExcelXML, DiaMenu } from '@/lib/generar-menu-excel'

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
function parsearPlan(planTexto: string): Record<string, DiaMenu> {
  const resultado: Record<string, DiaMenu> = {}

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
  const { id: _id } = await params

  try {
    const { paciente, planTexto, historia } = await req.json()

    if (!planTexto) {
      return NextResponse.json({ error: 'No hay plan generado. Genera un plan primero.' }, { status: 400 })
    }

    // ── Parsear el plan directamente ────────────────────────────────────────
    let menuDias: Record<string, DiaMenu> = parsearPlan(planTexto)

    // Si no se encontraron suficientes días (plan viejo con formato anterior),
    // usar el contenido general del plan para todos los días con nota
    const diasEncontrados = Object.keys(menuDias).length
    if (diasEncontrados < 5) {
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

    // ── Generar Excel XML (SpreadsheetML) — sin Python, funciona en Vercel ──
    const xmlContent = generarMenuExcelXML({
      paciente,
      historia,
      menu: menuDias,
    })

    const nombre = ((paciente?.nombre as string) || 'Paciente')
      .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9 ]/g, '')
      .trim()

    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="Menu_Semanal_${nombre}.xls"`,
        'Content-Length': Buffer.byteLength(xmlContent, 'utf-8').toString(),
      },
    })
  } catch (err) {
    console.error('[menu]', err)
    return NextResponse.json({ error: 'Error al generar el menú', detalle: String(err) }, { status: 500 })
  }
}
