/**
 * Genera un archivo SpreadsheetML (Excel XML) del menú semanal.
 * Compatible con Excel, LibreOffice y Google Sheets.
 * No requiere paquetes npm externos.
 */

export interface DiaMenu {
  desayuno:    string
  colacion_am: string
  comida:      string
  colacion_pm: string
  cena:        string
}

export interface DatosMenu {
  paciente: { nombre?: string; edad?: string; [k: string]: unknown }
  historia?: { [k: string]: unknown } | null
  menu: Record<string, DiaMenu>
}

const DIAS = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO']

const COMIDAS: { label: string; clave: keyof DiaMenu; colorH: string; colorBg: string }[] = [
  { label: '🌅 DESAYUNO',    clave: 'desayuno',    colorH: '#1565C0', colorBg: '#E3F2FD' },
  { label: '🍎 COLACIÓN AM', clave: 'colacion_am', colorH: '#2D6A4F', colorBg: '#D8F3DC' },
  { label: '🍽️ COMIDA',      clave: 'comida',      colorH: '#7B1B2A', colorBg: '#F5E8EB' },
  { label: '🥜 COLACIÓN PM', clave: 'colacion_pm', colorH: '#E65100', colorBg: '#FFF3E0' },
  { label: '🌙 CENA',        clave: 'cena',        colorH: '#4A148C', colorBg: '#F3E5F5' },
]

function x(s: string | undefined | null): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\|/g, '&#10;')     // pipe → nueva línea dentro de celda
    .replace(/\n/g, '&#10;')
}

function hexColor(h: string): string {
  return h.replace('#', '')
}

function styles(): string {
  const s = (id: string, opts: {
    bgColor?: string; fontColor?: string; bold?: boolean; size?: number
    italic?: boolean; hAlign?: string; vAlign?: string; wrap?: boolean
    rotate?: number; borderColor?: string; fontSize?: number
  }) => {
    const bg = opts.bgColor
      ? `<Interior ss:Color="#${hexColor(opts.bgColor)}" ss:Pattern="Solid"/>`
      : ''
    const fColor = opts.fontColor ? ` ss:Color="#${hexColor(opts.fontColor)}"` : ''
    const fBold  = opts.bold   ? ' ss:Bold="1"' : ''
    const fItal  = opts.italic ? ' ss:Italic="1"' : ''
    const fSize  = opts.fontSize ? ` ss:Size="${opts.fontSize}"` : ''
    const font = `<Font ss:Name="Arial"${fColor}${fBold}${fItal}${fSize}/>`
    const ha = opts.hAlign || 'Left'
    const va = opts.vAlign || 'Top'
    const wrap = opts.wrap !== false ? ' ss:WrapText="1"' : ''
    const rot  = opts.rotate ? ` ss:Rotate="${opts.rotate}"` : ''
    const align = `<Alignment ss:Horizontal="${ha}" ss:Vertical="${va}"${wrap}${rot}/>`
    const bc = opts.borderColor || 'CCCCCC'
    const bdr = `<Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${bc}"/>
      <Border ss:Position="Left"   ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${bc}"/>
      <Border ss:Position="Right"  ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${bc}"/>
      <Border ss:Position="Top"    ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#${bc}"/>
    </Borders>`
    return `<Style ss:ID="${id}">${bg}${font}${align}${bdr}</Style>`
  }

  const mealStyles = COMIDAS.flatMap(c => {
    const id = c.label.replace(/[^a-zA-Z]/g, '')
    const bg = hexColor(c.colorH)
    const light = hexColor(c.colorBg)
    return [
      s(`lbl_${id}`, { bgColor: c.colorH, fontColor: '#FFFFFF', bold: true, fontSize: 10,
          hAlign: 'Center', vAlign: 'Center', rotate: 90, borderColor: '999999' }),
      s(`cell_${id}`, { bgColor: c.colorBg, fontColor: '#1A1A1A', fontSize: 9,
          hAlign: 'Left', vAlign: 'Top', wrap: true, borderColor: 'CCCCCC' }),
    ]
  }).join('\n')

  return `<Styles>
    ${s('h1',    { bgColor: '#7B1B2A', fontColor: '#FFFFFF', bold: true,  fontSize: 13, hAlign: 'Center', vAlign: 'Center', borderColor: '7B1B2A' })}
    ${s('h2',    { bgColor: '#F5E8EB', fontColor: '#5C1521', italic: true, fontSize: 10, hAlign: 'Center', vAlign: 'Center', borderColor: 'E8D0D5' })}
    ${s('lbl3',  { bgColor: '#ECEFF1', fontColor: '#37474F', bold: true,  fontSize: 10, hAlign: 'Left',   vAlign: 'Center', borderColor: 'CCCCCC' })}
    ${s('val3',  { bgColor: '#FFFFFF', fontColor: '#1A1A1A', bold: true,  fontSize: 11, hAlign: 'Left',   vAlign: 'Center', borderColor: 'AAAAAA' })}
    ${s('dayH',  { bgColor: '#37474F', fontColor: '#FFFFFF', bold: true,  fontSize: 10, hAlign: 'Center', vAlign: 'Center', borderColor: '555555' })}
    ${s('note',  { bgColor: '#FFFDE7', fontColor: '#5C4033', italic: true, fontSize: 8,  hAlign: 'Left',   vAlign: 'Center', borderColor: 'E0D060' })}
    ${s('foot',  { bgColor: '#F0F4F8', fontColor: '#37474F', fontSize: 8,  hAlign: 'Left',   vAlign: 'Center', borderColor: 'CCCCCC' })}
    ${mealStyles}
  </Styles>`
}

function row(cells: string, height: number): string {
  return `<Row ss:Height="${height}" ss:AutoFitHeight="0">${cells}</Row>`
}

function cell(
  content: string,
  styleId: string,
  mergeAcross = 0,
): string {
  const ma = mergeAcross > 0 ? ` ss:MergeAcross="${mergeAcross}"` : ''
  return `<Cell${ma} ss:StyleID="${styleId}"><Data ss:Type="String">${x(content)}</Data></Cell>`
}

function emptyCell(styleId: string): string {
  return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String"></Data></Cell>`
}

export function generarMenuExcelXML(datos: DatosMenu): string {
  const nombre = datos.paciente?.nombre || 'Paciente'
  const edad   = datos.paciente?.edad   || ''
  const menu   = datos.menu || {}

  const fecha = new Date().toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  // ── Anchos de columnas (en puntos) ──────────────────────────────────────
  const cols = `
    <Column ss:Width="100"/>
    ${'<Column ss:Width="145"/>'.repeat(7)}
  `

  // ── Filas ──────────────────────────────────────────────────────────────
  const rows: string[] = []

  // Fila 1 — Encabezado
  rows.push(row(
    cell('CLÍNICA KARINA LARA  ·  Nutrición Clínica Especializada', 'h1', 7),
    28
  ))

  // Fila 2 — Subtítulo
  rows.push(row(
    cell('MENÚ SEMANAL PERSONALIZADO  ·  Plan Nutricional Individual  ·  Guía del Plato del Bien Comer', 'h2', 7),
    18
  ))

  // Fila 3 — Datos del paciente
  rows.push(row(
    cell('Paciente:', 'lbl3') +
    cell(`${nombre}${edad ? `  (${edad} años)` : ''}`, 'val3', 2) +
    cell('Semana del:', 'lbl3') +
    cell(fecha, 'val3', 1) +
    cell('Nutrióloga:', 'lbl3') +
    cell('Lic. Karina Lara', 'val3', 0),
    22
  ))

  // Fila 4 — Encabezados de días
  rows.push(row(
    cell('TIEMPO DE COMIDA', 'dayH') +
    DIAS.map(d => cell(d, 'dayH')).join(''),
    30
  ))

  // Filas 5-9 — Comidas
  for (const c of COMIDAS) {
    const styleId = c.label.replace(/[^a-zA-Z]/g, '')
    rows.push(row(
      cell(c.label, `lbl_${styleId}`) +
      DIAS.map(dia => {
        const txt = (menu[dia] || {})[c.clave] || '—'
        return cell(txt, `cell_${styleId}`)
      }).join(''),
      80
    ))
  }

  // Fila 10 — Nota hidratación
  rows.push(row(
    cell(
      '💧 HIDRATACIÓN: Mínimo 1–1.5 L de agua natural al día.  🍬 Sin azúcar añadida ni bebidas azucaradas.  🧂 Limitar sal y evitar ultraprocesados.  ⚠️ Adaptar porciones según edad y peso.',
      'note', 7
    ),
    32
  ))

  // Fila 11 — Plato del bien comer
  rows.push(row(
    cell(
      `🍽️ PLATO DEL BIEN COMER: ½ plato = Verduras y frutas  |  ¼ = Cereales y tubérculos integrales  |  ¼ = Leguminosas y proteína animal  |  ✅ Generado el ${fecha}  ·  Lic. Karina Lara`,
      'foot', 7
    ),
    24
  ))

  const tableRows = rows.join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:o="urn:schemas-microsoft-com:office:office">
  <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
    <WindowHeight>10000</WindowHeight>
    <WindowWidth>20000</WindowWidth>
  </ExcelWorkbook>
  ${styles()}
  <Worksheet ss:Name="Menú Semanal">
    <Table ss:DefaultColumnWidth="80">
      ${cols}
      ${tableRows}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <PageSetup>
        <Layout x:Orientation="Landscape" x:CenterHorizontal="1"/>
        <PageMargins x:Bottom="0.6" x:Left="0.5" x:Right="0.5" x:Top="0.6"/>
        <Header x:Data="&amp;C&amp;B&amp;14CLÍNICA KARINA LARA  ·  Menú Semanal"/>
        <Footer x:Data="&amp;LLic. Karina Lara&amp;R&amp;P de &amp;N"/>
      </PageSetup>
      <FitToPage/>
      <Print>
        <FitWidth>1</FitWidth>
        <FitHeight>1</FitHeight>
        <ValidPrinterInfo/>
        <PaperSizeIndex>9</PaperSizeIndex>
      </Print>
    </WorksheetOptions>
  </Worksheet>
</Workbook>`
}
