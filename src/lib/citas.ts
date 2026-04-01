import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, where, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export interface Cita {
  id?: string
  pacienteId: string
  pacienteNombre: string
  tutorNombre: string
  fecha: string           // 'YYYY-MM-DD'
  hora: string            // 'HH:MM'
  tipo: string            // 'Primera consulta' | 'Seguimiento' | 'Revisión de plan' | 'Urgencia' | 'Otro'
  notas?: string
  estado: 'pendiente' | 'completada' | 'cancelada'
  fechaCreacion?: Timestamp
}

const COL = 'citas'

export async function crearCita(data: Omit<Cita, 'id' | 'fechaCreacion'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    fechaCreacion: Timestamp.now(),
  })
  return ref.id
}

export async function obtenerCitas(): Promise<Cita[]> {
  const q = query(collection(db, COL), orderBy('fecha', 'asc'), orderBy('hora', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Cita))
}

export async function obtenerCitasDelDia(fecha: string): Promise<Cita[]> {
  const q = query(collection(db, COL), where('fecha', '==', fecha), orderBy('hora', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Cita))
}

export async function actualizarCita(id: string, data: Partial<Cita>): Promise<void> {
  await updateDoc(doc(db, COL, id), data)
}

export async function eliminarCita(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}
