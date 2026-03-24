import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { paciente, historia, antropometria, mensajeChat, planPrevio } = await req.json()

    const esModoChat = !!mensajeChat && !!planPrevio

    const prompt = esModoChat
      ? `Eres una nutrióloga clínica especializada en nutrición pediátrica. Tienes el siguiente plan nutricional semanal generado previamente:

${planPrevio}

El usuario quiere hacer el siguiente cambio o tiene la siguiente pregunta:
"${mensajeChat}"

Responde de forma profesional. Si aplica, regenera el plan semanal COMPLETO (los 7 días) manteniendo el mismo formato exacto con secciones ### LUNES, ### MARTES ... ### DOMINGO, y al final: ### RECOMENDACIONES PARA PADRES, ### ALIMENTOS A EVITAR, ### LISTA DEL SÚPER, ### PRESUPUESTO ESTIMADO. Si solo es una pregunta puntual, respóndela sin regenerar el plan completo.`

      : `Eres una nutrióloga clínica especializada en nutrición pediátrica, neurodesarrollo y salud intestinal infantil. Genera un MENÚ SEMANAL COMPLETO personalizado de 7 días para el paciente.

DATOS DEL PACIENTE:
- Nombre: ${paciente.nombre}
- Edad: ${paciente.edad} años
- Sexo: ${paciente.sexo}
- Motivo de consulta: ${paciente.motivoConsulta}

${historia ? `HISTORIA CLÍNICA:
- Diagnósticos previos: ${historia.diagnosticosPrevios || 'No registrado'}
- Alergias: ${historia.alergias || 'Ninguna'}
- Intolerancias: ${historia.intolerancias || 'Ninguna'}
- Síntomas GI activos: ${Array.isArray(historia.sintomasGI) ? historia.sintomasGI.join(', ') : historia.sintomasGI || 'Ninguno'}
- Alimentos favoritos: ${historia.alimentosFavoritos || 'No registrado'}
- Alimentos rechazados: ${historia.alimentosRechazados || 'No registrado'}
- Texturas aceptadas: ${historia.texturasAceptadas || 'No registrado'}
- Texturas rechazadas: ${historia.texturasRechazadas || 'No registrado'}
- Conducta alimentaria: ${historia.conductaAlimentaria || 'No registrado'}
- Presupuesto familiar: ${historia.presupuestoAlimentario || 'No especificado'}` : ''}

${antropometria ? `DATOS ANTROPOMÉTRICOS:
- Peso: ${antropometria.peso} kg | Talla: ${antropometria.talla} cm | IMC: ${antropometria.imc} kg/m²
- Percentil peso/edad: P${antropometria.percentilPeso} (${antropometria.interpretacionPeso})
- Percentil talla/edad: P${antropometria.percentilTalla} (${antropometria.interpretacionTalla})` : ''}

Genera el plan con el siguiente formato EXACTO. Es OBLIGATORIO incluir los 7 días con los 5 tiempos de comida cada uno, con alimentos mexicanos reales, porciones en medidas caseras y variedad entre días.

## PLAN NUTRICIONAL — ${paciente.nombre}

### OBJETIVOS DEL TRATAMIENTO
- [Objetivo 1 específico]
- [Objetivo 2]
- [Objetivo 3]
- [Objetivo 4]

---

## MENÚ SEMANAL

### LUNES
**Desayuno:** [alimentos con porciones — usa medidas caseras: tazas, piezas, cdas. Ej: 2 huevos revueltos | 1 tortilla de maíz | ½ tz papaya | Agua natural]
**Colación AM:** [alimento — 1-2 ítems concretos]
**Comida:** [plato principal con guarniciones | líquido — Ej: Caldo de pollo con chayote | ½ tz arroz | 2 tortillas | Agua de jamaica]
**Colación PM:** [alimento — 1-2 ítems concretos]
**Cena:** [alimentos — Ej: 2 quesadillas de queso | Jitomate | Vaso de leche tibia]

### MARTES
**Desayuno:** [diferente al lunes]
**Colación AM:** [diferente]
**Comida:** [diferente]
**Colación PM:** [diferente]
**Cena:** [diferente]

### MIÉRCOLES
**Desayuno:** [...]
**Colación AM:** [...]
**Comida:** [...]
**Colación PM:** [...]
**Cena:** [...]

### JUEVES
**Desayuno:** [...]
**Colación AM:** [...]
**Comida:** [...]
**Colación PM:** [...]
**Cena:** [...]

### VIERNES
**Desayuno:** [...]
**Colación AM:** [...]
**Comida:** [...]
**Colación PM:** [...]
**Cena:** [...]

### SÁBADO
**Desayuno:** [...]
**Colación AM:** [...]
**Comida:** [...]
**Colación PM:** [...]
**Cena:** [...]

### DOMINGO
**Desayuno:** [...]
**Colación AM:** [...]
**Comida:** [...]
**Colación PM:** [...]
**Cena:** [...]

---

### RECOMENDACIONES PARA PADRES
[5-7 recomendaciones específicas y prácticas]

${historia?.diagnosticosPrevios?.toLowerCase().includes('tea') || historia?.diagnosticosPrevios?.toLowerCase().includes('autis') || historia?.diagnosticosPrevios?.toLowerCase().includes('epilep') || historia?.diagnosticosPrevios?.toLowerCase().includes('tdah') ? `### CONSIDERACIONES ESPECIALES
[Recomendaciones específicas para el diagnóstico neurológico]` : ''}

### ALIMENTOS A EVITAR
[Lista con justificación clínica breve]

### LISTA DEL SÚPER
**🥩 Proteínas:**
- [alimento] — [cantidad para 1 semana]

**🥦 Verduras y frutas:**
- [alimento] — [cantidad para 1 semana]

**🌾 Cereales y tubérculos:**
- [alimento] — [cantidad para 1 semana]

**🥛 Lácteos:**
- [alimento] — [cantidad para 1 semana]

**🫙 Despensa:**
- [alimento] — [cantidad para 1 semana]

### PRESUPUESTO ESTIMADO

| Categoría | Productos principales | Costo estimado/semana |
|-----------|----------------------|----------------------|
| Proteínas | [lista] | $[monto] |
| Verduras y frutas | [lista] | $[monto] |
| Cereales | [lista] | $[monto] |
| Lácteos | [lista] | $[monto] |
| Despensa | [lista] | $[monto] |
| **TOTAL SEMANAL** | | **$[total]** |
| **TOTAL MENSUAL** | | **$[total x4]** |

Precios de referencia aproximados para Tepic, Nayarit (Walmart/Soriana/Chedraui 2025).

REGLAS IMPORTANTES:
- Los 7 días DEBEN tener comidas DIFERENTES con variedad real (no repetir el mismo desayuno cada día)
- Respetar TODAS las alergias e intolerancias listadas
- Usar alimentos mexicanos asequibles para Tepic, Nayarit
- Adaptar texturas si hay selectividad
- Porciones apropiadas para la edad y peso del paciente`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
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
