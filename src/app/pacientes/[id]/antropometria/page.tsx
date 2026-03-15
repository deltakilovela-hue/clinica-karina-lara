'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPaciente, Paciente } from '@/lib/pacientes'
import { collection, addDoc, getDocs, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { calcularPercentilPeso, calcularPercentilTalla, calcularIMC, edadEnMeses } from '@/lib/percentiles'
import Link from 'next/link'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

interface Medicion {
  id?: string
  fecha: string
  peso: number
  talla: number
  imc: number
  percentilPeso: number
  percentilTalla: number
  interpretacionPeso: string
  interpretacionTalla: string
  notas: string
  fechaCreacion?: Timestamp
}

export default function AntropometriaPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [mediciones, setMediciones] = useState<Medicion[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    peso: '', talla: '', notas: ''
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      try {
        const p = await obtenerPaciente(id)
        setPaciente(p)
        await cargarMediciones()
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router, id])

  const cargarMediciones = async () => {
    const q = query(collection(db, `pacientes/${id}/antropometria`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    setMediciones(snap.docs.map(d => ({ id: d.id, ...d.data() } as Medicion)))
  }

  const calcular = () => {
    if (!form.peso || !form.talla || !paciente) return null
    const peso = parseFloat(form.peso)
    const talla = parseFloat(form.talla)
    if (isNaN(peso) || isNaN(talla)) return null
    const meses = edadEnMeses(paciente.fechaNacimiento)
    const sexo = paciente.sexo
    const imc = calcularIMC(peso, talla)
    const resPeso = calcularPercentilPeso(peso, meses, sexo)
    const resTalla = calcularPercentilTalla(talla, meses, sexo)
    return { peso, talla, imc, meses, resPeso, resTalla }
  }

  const preview = calcular()

  const guardar = async () => {
    if (!preview) { setError('Ingresa peso y talla válidos'); return }
    setGuardando(true)
    try {
      const medicion: Omit<Medicion, 'id'> = {
        fecha: form.fecha,
        peso: preview.peso,
        talla: preview.talla,
        imc: preview.imc,
        percentilPeso: preview.resPeso.percentil,
        percentilTalla: preview.resTalla.percentil,
        interpretacionPeso: preview.resPeso.interpretacion.texto,
        interpretacionTalla: preview.resTalla.interpretacion.texto,
        notas: form.notas,
        fechaCreacion: Timestamp.now(),
      }
      await addDoc(collection(db, `pacientes/${id}/antropometria`), medicion)
      await cargarMediciones()
      setForm({ fecha: new Date().toISOString().split('T')[0], peso: '', talla: '', notas: '' })
      setMostrarForm(false)
      setExito('Medición guardada correctamente')
      setTimeout(() => setExito(''), 3000)
    } catch (e) { setError('Error al guardar'); console.error(e) }
    finally { setGuardando(false) }
  }

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '10px', fontSize: '14px',
    border: '1.5px solid #E8DDD0', background: '#FAF7F2', color: '#2C1810',
    outline: 'none', fontFamily: "'Lato', sans-serif"
  }
  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: '700' as const,
    letterSpacing: '1px', textTransform: 'uppercase' as const,
    color: '#6B4F3A', marginBottom: '7px'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Link href="/dashboard" style={{ color: '#9B7B65', textDecoration: 'none' }}>Dashboard</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href="/pacientes" style={{ color: '#9B7B65', textDecoration: 'none' }}>Pacientes</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href={`/pacientes/${id}`} style={{ color: '#9B7B65', textDecoration: 'none' }}>{paciente?.nombre}</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <span style={{ color: '#2C1810', fontWeight: '600' }}>Antropometría</span>
          </div>
          <button onClick={() => { setMostrarForm(true); setError('') }} style={{
            padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
            background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white',
            border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
            boxShadow: '0 2px 8px rgba(123,27,42,0.25)'
          }}>+ Nueva Medición</button>
        </div>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Título */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>
            Antropometría
          </h1>
          <p style={{ color: '#9B7B65', fontSize: '14px' }}>
            {paciente?.nombre} · {paciente?.edad} años · {paciente?.sexo}
          </p>
        </div>

        {/* Éxito */}
        {exito && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', background: '#F0FAF4', border: '1px solid #95D5A8', color: '#2D6A4F', fontSize: '14px' }}>
            ✓ {exito}
          </div>
        )}

        {/* Formulario nueva medición */}
        {mostrarForm && (
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8DDD0', padding: '32px', marginBottom: '28px', boxShadow: '0 2px 16px rgba(44,24,16,0.06)' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', marginBottom: '24px' }}>
              Nueva Medición
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Fecha *</label>
                <input type="date" style={{ ...inputStyle, colorScheme: 'light' }}
                  value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Peso (kg) *</label>
                <input type="number" step="0.1" min="0" max="200" style={inputStyle}
                  placeholder="ej. 12.5"
                  value={form.peso} onChange={e => setForm(p => ({ ...p, peso: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Talla (cm) *</label>
                <input type="number" step="0.1" min="0" max="250" style={inputStyle}
                  placeholder="ej. 89.5"
                  value={form.talla} onChange={e => setForm(p => ({ ...p, talla: e.target.value }))} />
              </div>
            </div>

            {/* Preview en tiempo real */}
            {preview && (
              <div style={{ background: '#FAF7F2', borderRadius: '14px', padding: '20px', border: '1px solid #E8DDD0', marginBottom: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#8B6914', marginBottom: '16px' }}>
                  Cálculo Automático
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {[
                    { label: 'IMC', valor: `${preview.imc} kg/m²`, sub: preview.imc < 18.5 ? 'Bajo peso' : preview.imc < 25 ? 'Normal' : 'Sobrepeso', color: preview.imc >= 18.5 && preview.imc < 25 ? '#2D6A4F' : '#C4831A' },
                    { label: 'Percentil Peso/Edad', valor: `P${preview.resPeso.percentil}`, sub: preview.resPeso.interpretacion.texto, color: preview.resPeso.interpretacion.color },
                    { label: 'Percentil Talla/Edad', valor: `P${preview.resTalla.percentil}`, sub: preview.resTalla.interpretacion.texto, color: preview.resTalla.interpretacion.color },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '1px solid #E8DDD0' }}>
                      <p style={{ fontSize: '11px', color: '#9B7B65', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{item.label}</p>
                      <p style={{ fontSize: '22px', fontWeight: '700', color: item.color, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{item.valor}</p>
                      <p style={{ fontSize: '12px', color: item.color, marginTop: '4px', fontWeight: '600' }}>{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Notas clínicas</label>
              <textarea style={{ ...inputStyle, resize: 'none', minHeight: '80px' }}
                placeholder="Observaciones adicionales..."
                value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', background: '#FDECEA', border: '1px solid #F5C2C7', color: '#9B2335', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => { setMostrarForm(false); setError('') }} style={{
                padding: '11px 22px', borderRadius: '10px', fontSize: '14px',
                border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A',
                cursor: 'pointer', fontFamily: "'Lato', sans-serif"
              }}>Cancelar</button>
              <button onClick={