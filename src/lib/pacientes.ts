import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export interface Paciente {
  id?: string
  nombre: string
  fechaNacimiento: string
  edad: number
  sexo: 'masculino' | 'femenino'
  tutor: string
  telefono: string
  correo: string
  direccion: string
  motivoConsulta: string
  fechaCreacion?: Timestamp
}

const COLECCION = 'pacientes'

export async function crearPaciente(data: Omit<Paciente, 'id' | 'fechaCreacion'>): Promise<string> {
  const ref = await addDoc(collection(db, COLECCION), {
    ...data,
    fechaCreacion: Timestamp.now(),
  })
  return ref.id
}

export async function obtenerPacientes(): Promise<Paciente[]> {
  const q = query(collection(db, COLECCION), orderBy('fechaCreacion', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Paciente))
}

export async function obtenerPaciente(id: string): Promise<Paciente | null> {
  const ref = doc(db, COLECCION, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Paciente
}

export async function actualizarPaciente(id: string, data: Partial<Paciente>): Promise<void> {
  const ref = doc(db, COLECCION, id)
  await updateDoc(ref, data)
}

export async function eliminarPaciente(id: string): Promise<void> {
  await deleteDoc(doc(db, COLECCION, id))
}

export function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const mes = hoy.getMonth() - nac.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}