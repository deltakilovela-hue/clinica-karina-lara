// Tablas OMS simplificadas para percentiles peso/talla por edad y sexo
// Valores de mediana (M) y desviación estándar (SD) por mes de edad

export type Sexo = 'masculino' | 'femenino'

// Interpretación clínica basada en percentil
export function interpretarPercentil(percentil: number, tipo: 'peso' | 'talla' | 'imc'): { texto: string; color: string } {
  if (tipo === 'imc') {
    if (percentil < 3) return { texto: 'Delgadez severa', color: '#9B2335' }
    if (percentil < 15) return { texto: 'Delgadez', color: '#C4831A' }
    if (percentil < 85) return { texto: 'Normal', color: '#2D6A4F' }
    if (percentil < 97) return { texto: 'Sobrepeso', color: '#C4831A' }
    return { texto: 'Obesidad', color: '#9B2335' }
  }
  if (percentil < 3) return { texto: 'Muy bajo', color: '#9B2335' }
  if (percentil < 15) return { texto: 'Bajo', color: '#C4831A' }
  if (percentil < 85) return { texto: 'Normal', color: '#2D6A4F' }
  if (percentil < 97) return { texto: 'Alto', color: '#C4831A' }
  return { texto: 'Muy alto', color: '#9B2335' }
}

// Calcular percentil usando distribución normal estándar (Z-score → percentil)
export function zScoreAPercentil(z: number): number {
  // Aproximación de la función de distribución normal acumulada
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.sqrt(2)
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return Math.round(((1 + sign * y) / 2) * 100)
}

// Tablas OMS peso-para-edad (medianas y SD por mes, 0-60 meses)
// [mes, mediana_niño, sd_niño, mediana_niña, sd_niña]
const PESO_EDAD: [number, number, number, number, number][] = [
  [0, 3.3, 0.39, 3.2, 0.38], [1, 4.5, 0.52, 4.2, 0.49], [2, 5.6, 0.62, 5.1, 0.58],
  [3, 6.4, 0.69, 5.8, 0.65], [4, 7.0, 0.75, 6.4, 0.71], [5, 7.5, 0.80, 6.9, 0.75],
  [6, 7.9, 0.84, 7.3, 0.79], [7, 8.3, 0.88, 7.6, 0.82], [8, 8.6, 0.90, 7.9, 0.85],
  [9, 8.9, 0.93, 8.2, 0.88], [10, 9.2, 0.96, 8.5, 0.90], [11, 9.4, 0.98, 8.7, 0.92],
  [12, 9.6, 1.00, 8.9, 0.94], [15, 10.3, 1.06, 9.6, 1.00], [18, 10.9, 1.12, 10.2, 1.05],
  [21, 11.5, 1.17, 10.9, 1.11], [24, 12.2, 1.23, 11.5, 1.16], [30, 13.3, 1.33, 12.7, 1.27],
  [36, 14.3, 1.43, 13.9, 1.38], [42, 15.3, 1.52, 14.9, 1.48], [48, 16.3, 1.62, 15.9, 1.58],
  [54, 17.3, 1.72, 16.9, 1.68], [60, 18.3, 1.83, 17.9, 1.78],
]

// Tablas OMS talla-para-edad (medianas y SD por mes, 0-60 meses)
const TALLA_EDAD: [number, number, number, number, number][] = [
  [0, 49.9, 1.89, 49.1, 1.86], [1, 54.7, 2.01, 53.7, 1.98], [2, 58.4, 2.12, 57.1, 2.08],
  [3, 61.4, 2.21, 59.8, 2.17], [4, 63.9, 2.28, 62.1, 2.23], [5, 65.9, 2.34, 64.0, 2.30],
  [6, 67.6, 2.39, 65.7, 2.35], [7, 69.2, 2.43, 67.3, 2.39], [8, 70.6, 2.47, 68.7, 2.43],
  [9, 72.0, 2.51, 70.1, 2.46], [10, 73.3, 2.54, 71.5, 2.50], [11, 74.5, 2.57, 72.8, 2.53],
  [12, 75.7, 2.60, 74.0, 2.56], [15, 79.1, 2.68, 77.5, 2.65], [18, 82.3, 2.76, 80.7, 2.73],
  [21, 85.1, 2.83, 83.7, 2.80], [24, 87.8, 2.90, 86.4, 2.87], [30, 92.7, 3.03, 91.3, 3.00],
  [36, 96.1, 3.14, 95.1, 3.11], [42, 99.9, 3.25, 98.7, 3.22], [48, 103.3, 3.35, 102.7, 3.32],
  [54, 106.4, 3.45, 105.9, 3.42], [60, 110.0, 3.55, 109.4, 3.52],
]

function interpolarTabla(
  tabla: [number, number, number, number, number][],
  meses: number,
  sexo: Sexo
): { mediana: number; sd: number } {
  const idx = sexo === 'masculino' ? 1 : 3
  const sdIdx = sexo === 'masculino' ? 2 : 4

  // Buscar rango
  let inf = tabla[0], sup = tabla[tabla.length - 1]
  for (let i = 0; i < tabla.length - 1; i++) {
    if (tabla[i][0] <= meses && tabla[i + 1][0] >= meses) {
      inf = tabla[i]; sup = tabla[i + 1]; break
    }
  }
  if (inf[0] === sup[0]) return { mediana: inf[idx], sd: inf[sdIdx] }

  // Interpolación lineal
  const t = (meses - inf[0]) / (sup[0] - inf[0])
  return {
    mediana: inf[idx] + t * (sup[idx] - inf[idx]),
    sd: inf[sdIdx] + t * (sup[sdIdx] - inf[sdIdx])
  }
}

export function calcularPercentilPeso(
  pesoKg: number, edadMeses: number, sexo: Sexo
): { percentil: number; interpretacion: ReturnType<typeof interpretarPercentil> } {
  const { mediana, sd } = interpolarTabla(PESO_EDAD, Math.min(edadMeses, 60), sexo)
  const z = (pesoKg - mediana) / sd
  const percentil = Math.max(1, Math.min(99, zScoreAPercentil(z)))
  return { percentil, interpretacion: interpretarPercentil(percentil, 'peso') }
}

export function calcularPercentilTalla(
  tallaCm: number, edadMeses: number, sexo: Sexo
): { percentil: number; interpretacion: ReturnType<typeof interpretarPercentil> } {
  const { mediana, sd } = interpolarTabla(TALLA_EDAD, Math.min(edadMeses, 60), sexo)
  const z = (tallaCm - mediana) / sd
  const percentil = Math.max(1, Math.min(99, zScoreAPercentil(z)))
  return { percentil, interpretacion: interpretarPercentil(percentil, 'talla') }
}

export function calcularIMC(pesoKg: number, tallaCm: number): number {
  const tallaM = tallaCm / 100
  return Math.round((pesoKg / (tallaM * tallaM)) * 10) / 10
}

export function edadEnMeses(fechaNacimiento: string): number {
  const hoy = new Date()
  const nac = new Date(fechaNacimiento + 'T00:00:00')
  return (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth())
}