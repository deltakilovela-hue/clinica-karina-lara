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
  let tempDocx = ''

  try {
    const datos = await req.json()
    const ts = Date.now()
    tempJson = path.join(tmpdir(), `expediente_${id}_${ts}.json`)
    tempDocx = path.join(tmpdir(), `expediente_${id}_${ts}.docx`)

    // Escribir datos del paciente a archivo temporal
    await writeFile(tempJson, JSON.stringify(datos, null, 2), 'utf-8')

    // Llamar al script Python
    const scriptPath = path.join(process.cwd(), 'scripts', 'generar_expediente.py')
    await execAsync(`python3 "${scriptPath}" "${tempJson}" "${tempDocx}"`)

    // Leer el archivo generado
    const docxBuffer = await readFile(tempDocx)
    const nombrePaciente = (datos.paciente?.nombre as string || 'Paciente').replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9 ]/g, '').trim()

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Expediente_${nombrePaciente}.docx"`,
        'Content-Length': docxBuffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('[expediente]', err)
    return NextResponse.json(
      { error: 'Error al generar el expediente', detalle: String(err) },
      { status: 500 }
    )
  } finally {
    if (tempJson) await unlink(tempJson).catch(() => {})
    if (tempDocx) await unlink(tempDocx).catch(() => {})
  }
}
