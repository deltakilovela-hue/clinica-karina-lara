import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { paciente, historia, antropometria } = await req.json()

    const prompt = `Eres una nutrióloga clínica especializada en nutrición pediátrica, neurodesarrollo y salud intestinal infantil. Tu tarea es generar un plan nutricional personalizado y detallado.

DATOS DEL PACIENTE:
- Nombre: ${paciente.nombre}
- Edad: ${paciente.edad} años
- Sexo: ${paciente.sexo}
- Motivo de consulta: ${paciente.motivoConsulta}

${historia ? `HISTORIA CLÍNICA:
- Diagnósticos previos: ${historia.diagnosticosPrevios || 'No registrado'}
- Alergias: ${historia.alergias || 'Ninguna'}
- Intolerancias: ${historia.intolerancias || 'Ninguna'}
- Síntomas GI activos: ${historia.sintomasGI?.join(', ') || 'Ninguno'}
- Alimentos favoritos: ${historia.alimentosFavoritos || 'No registrado'}
- Alimentos rechazados: ${historia.alimentosRechazados || 'No registrado'}
- Texturas aceptadas: ${historia.texturasAceptadas || 'No registrado'}
- Texturas rechazadas: ${historia.texturasRechazadas || 'No registrado'}
- Conducta alimentaria: ${historia.conductaAlimentaria || 'No registrado'}
- Presupuesto familiar: ${historia.presupuestoAlimentario || 'No especificado'}` : ''}

${antropometria ? `DATOS ANTROPOMÉTRICOS:
- Peso: ${antropometria.peso} kg
- Talla: ${antropometria.talla} cm
- IMC: ${antropometria.imc} kg/m²
- Percentil peso/edad: P${antropometria.percentilPeso} (${antropometria.interpretacionPeso})
- Percentil talla/edad: P${antropometria.percentilTalla} (${antropometria.interpretacionTalla})` : ''}

Genera un plan nutricional completo con el siguiente formato EXACTO:

## PLAN NUTRICIONAL — ${paciente.nombre}

### OBJETIVOS DEL TRATAMIENTO
[Lista 3-4 objetivos específicos basados en los datos del paciente]

### DESAYUNO
**Alimentos:** [Lista con porciones en medidas caseras mexicanas]
**Preparación sugerida:** [Indicaciones breves]

### COLACIÓN MATUTINA
**Alimentos:** [Lista con porciones]

### COMIDA
**Alimentos:** [Lista con porciones en medidas caseras mexicanas]
**Preparación sugerida:** [Indicaciones breves]

### COLACIÓN VESPERTINA
**Alimentos:** [Lista con porciones]

### CENA
**Alimentos:** [Lista con porciones en medidas caseras mexicanas]
**Preparación sugerida:** [Indicaciones breves]

### RECOMENDACIONES PARA PADRES
[5-7 recomendaciones específicas y prácticas basadas en el caso]

${historia?.diagnosticosPrevios?.toLowerCase().includes('tea') || historia?.diagnosticosPrevios?.toLowerCase().includes('autis') || historia?.diagnosticosPrevios?.toLowerCase().includes('epilep') ? `### CONSIDERACIONES ESPECIALES
[Recomendaciones específicas para el diagnóstico neurológico del paciente]` : ''}

### ALIMENTOS A EVITAR
[Lista con justificación clínica]

Usa alimentos mexicanos comunes y asequibles. Sé específico con las porciones usando medidas caseras (tazas, cucharadas, piezas). El plan debe ser realista para una familia mexicana.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    const data = await response.json()
    const planTexto = data.content[0].text

    return NextResponse.json({ plan: planTexto })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error generando el plan' }, { status: 500 })
  }
}