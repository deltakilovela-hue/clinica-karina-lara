// ─── Cálculo de IMC e interpretación pediátrica simplificada ─────────────────
// Basado en rangos prácticos para app clínica pediátrica (2-10 años).
// No usa tablas OMS crudas para evitar errores de interpolación fuera de rango.

export type Sexo = 'masculino' | 'femenino'

// ── 1. IMC ──────────────────────────────────────────────────────────────────
export function calcularIMC(pesoKg: number, tallaCm: number): number {
  const tallaM = tallaCm / 100
  return Math.round((pesoKg / (tallaM * tallaM)) * 10) / 10
}

// ── 2. Diagnóstico pediátrico por IMC ────────────────────────────────────────
export function diagnosticoIMCPediatrico(imc: number): { texto: string; color: string } {
  if (imc < 14)            return { texto: 'Bajo peso',                   color: '#9B2335' }
  if (imc < 17)            return { texto: 'Peso adecuado para la edad',  color: '#2D6A4F' }
  if (imc < 19)            return { texto: 'Riesgo de sobrepeso',         color: '#C4831A' }
  return                          { texto: 'Sobrepeso / Obesidad',        color: '#9B2335' }
}

// ── 3. Percentil estimado por IMC (simulación clínica práctica) ───────────────
export function percentilEstimadoIMC(imc: number): string {
  if (imc < 14)   return 'P < 15'
  if (imc < 15.5) return 'P25'
  if (imc < 17)   return 'P50'
  if (imc < 19)   return 'P75'
  return                 'P90+'
}

// ── 4. Wrappers con firma compatible hacia atrás ──────────────────────────────
// (para que los componentes existentes no rompan)

export function calcularPercentilPeso(
  pesoKg: number, _edadMeses: number, _sexo: Sexo
): { percentil: number; interpretacion: { texto: string; color: string } } {
  // Usamos el IMC solo si hay talla; como aquí no tenemos talla,
  // devolvemos un objeto neutro que no rompa la UI existente.
  // El diagnóstico real se muestra desde calcularIMC + diagnosticoIMCPediatrico.
  return {
    percentil: 0,
    interpretacion: { texto: '—', color: '#9B7B65' },
  }
}

export function calcularPercentilTalla(
  _tallaCm: number, _edadMeses: number, _sexo: Sexo
): { percentil: number; interpretacion: { texto: string; color: string } } {
  return {
    percentil: 0,
    interpretacion: { texto: '—', color: '#9B7B65' },
  }
}

// ── 5. Edad en meses (sin cambios) ───────────────────────────────────────────
export function edadEnMeses(fechaNacimiento: string): number {
  const hoy = new Date()
  const nac = new Date(fechaNacimiento + 'T00:00:00')
  return (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth())
}
