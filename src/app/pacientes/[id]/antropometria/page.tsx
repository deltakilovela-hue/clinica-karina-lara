'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPaciente, Paciente } from '@/lib/pacientes'
import { collection, addDoc, getDocs, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { calcularIMC, diagnosticoIMCPediatrico, percentilEstimadoIMC, edadEnMeses } from '@/lib/percentiles'
import Link from 'next/link'
import PasoNavegacion from '@/components/PasoNavegacion'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

interface Medicion {
  id?: string
  fecha: string
  peso: number
  talla: number       // siempre en cm
  imc: number
  percentilIMC: string
  diagnostico: string
  // Campos legacy (pueden venir de registros anteriores)
  percentilPeso?: number
  percentilTalla?: number
  interpretacionPeso?: string
  interpretacionTalla?: string
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
  const [mostrarConfirmHome, setMostrarConfirmHome] = useState(false)
  const [mostrarInfoCalculo, setMostrarInfoCalculo] = useState(false)

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
    const talla = parseFloat(form.talla)   // en cm
    if (isNaN(peso) || isNaN(talla) || talla <= 0 || peso <= 0) return null
    const imc = calcularIMC(peso, talla)
    const diagnostico = diagnosticoIMCPediatrico(imc)
    const percentilIMC = percentilEstimadoIMC(imc)
    return { peso, talla, imc, diagnostico, percentilIMC }
  }

  const preview = calcular()

  const guardar = async () => {
    if (!preview) { setError('Ingresa peso y talla válidos'); return }
    setGuardando(true)
    try {
      const medicion: Omit<Medicion, 'id'> = {
        fecha: form.fecha,
        peso: preview.peso,
        talla: preview.talla,        // cm
        imc: preview.imc,
        percentilIMC: preview.percentilIMC,
        diagnostico: preview.diagnostico.texto,
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
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Modal confirmación salir */}
      {mostrarConfirmHome && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '36px 32px', maxWidth: '400px', width: '90%', boxShadow: '0 8px 40px rgba(44,24,16,0.18)', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', marginBottom: '10px' }}>¿Salir sin guardar?</h3>
            <p style={{ fontSize: '14px', color: '#9B7B65', marginBottom: '28px', lineHeight: '1.6' }}>Si sales ahora, <strong>perderás los cambios</strong> que no hayas guardado.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setMostrarConfirmHome(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>Quedarme</button>
              <button onClick={() => router.push('/dashboard')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>Salir</button>
            </div>
          </div>
        </div>
      )}

      {/* Panel info cálculo */}
      {mostrarInfoCalculo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '36px 32px', maxWidth: '520px', width: '90%', boxShadow: '0 8px 40px rgba(44,24,16,0.18)', animation: 'fadeIn 0.25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810' }}>📐 ¿Cómo se calculan los valores?</h3>
              <button onClick={() => setMostrarInfoCalculo(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9B7B65', padding: '4px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { icon: '⚖️', titulo: 'IMC — Índice de Masa Corporal', formula: 'IMC = Peso (kg) ÷ Talla² (m)', desc: 'Relaciona el peso con la estatura para estimar si el estado ponderal es adecuado. Se calcula dividiendo el peso en kilogramos entre la talla en metros elevada al cuadrado.' },
                { icon: '📊', titulo: 'Percentil Peso/Edad', formula: 'Tablas OMS según sexo y edad en meses', desc: 'Indica la posición del peso del niño respecto a otros niños de la misma edad y sexo. Un P50 es el promedio. P<3 indica bajo peso, P>97 indica sobrepeso.' },
                { icon: '📏', titulo: 'Percentil Talla/Edad', formula: 'Tablas OMS según sexo y edad en meses', desc: 'Compara la estatura del niño con la de su grupo de referencia. Permite detectar talla baja (P<3) o talla alta (P>97). Refleja el crecimiento a largo plazo.' },
              ].map(item => (
                <div key={item.titulo} style={{ background: '#FAF7F2', borderRadius: '12px', padding: '16px', border: '1px solid #E8DDD0' }}>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#2C1810', marginBottom: '4px' }}>{item.icon} {item.titulo}</p>
                  <p style={{ fontSize: '12px', color: '#7B1B2A', fontWeight: '600', marginBottom: '6px', fontFamily: 'monospace' }}>{item.formula}</p>
                  <p style={{ fontSize: '13px', color: '#6B4F3A', lineHeight: '1.6' }}>{item.desc}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setMostrarInfoCalculo(false)} style={{ width: '100%', marginTop: '20px', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>Entendido</button>
          </div>
        </div>
      )}

      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <button onClick={() => mostrarForm ? setMostrarConfirmHome(true) : router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px 6px', borderRadius: '8px', lineHeight: 1 }} title="Inicio">🏠</button>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href="/pacientes" style={{ color: '#9B7B65', textDecoration: 'none' }}>Pacientes</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href={`/pacientes/${id}`} style={{ color: '#9B7B65', textDecoration: 'none' }}>{paciente?.nombre}</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <span style={{ color: '#2C1810', fontWeight: '600' }}>Antropometría</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setMostrarInfoCalculo(true)} style={{
              padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
              background: '#FAF7F2', color: '#7B1B2A', border: '1.5px solid #E8DDD0',
              cursor: 'pointer', fontFamily: "'Lato', sans-serif",
            }}>ℹ️ ¿Cómo se calcula?</button>
            <button onClick={() => { setMostrarForm(true); setError('') }} style={{
              padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
              background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white',
              border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
              boxShadow: '0 2px 8px rgba(123,27,42,0.25)'
            }}>+ Nueva Medición</button>
          </div>
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
                <label style={labelStyle}>Talla — ingresar en centímetros (cm) *</label>
                <input type="number" step="0.1" min="0" max="250" style={inputStyle}
                  placeholder="ej. 120.5 cm"
                  value={form.talla} onChange={e => setForm(p => ({ ...p, talla: e.target.value }))} />
              </div>
            </div>

            {/* Preview en tiempo real */}
            {preview && (
              <div style={{ background: '#FAF7F2', borderRadius: '14px', padding: '20px', border: '1px solid #E8DDD0', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#8B6914' }}>
                    Cálculo Automático · IMC Pediátrico
                  </p>
                  <button onClick={() => setMostrarInfoCalculo(true)} type="button" style={{ background: 'none', border: '1px solid #E8DDD0', borderRadius: '8px', padding: '3px 10px', fontSize: '12px', color: '#9B7B65', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>ℹ️ ¿Qué mide?</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {/* IMC */}
                  <div style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '1px solid #E8DDD0' }}>
                    <p style={{ fontSize: '11px', color: '#9B7B65', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>IMC</p>
                    <p style={{ fontSize: '22px', fontWeight: '700', color: preview.diagnostico.color, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{preview.imc} kg/m²</p>
                    <p style={{ fontSize: '12px', color: '#9B7B65', marginTop: '4px' }}>Peso ÷ Talla²</p>
                  </div>
                  {/* Percentil estimado */}
                  <div style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '1px solid #E8DDD0' }}>
                    <p style={{ fontSize: '11px', color: '#9B7B65', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Percentil estimado</p>
                    <p style={{ fontSize: '22px', fontWeight: '700', color: preview.diagnostico.color, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{preview.percentilIMC}</p>
                    <p style={{ fontSize: '12px', color: '#9B7B65', marginTop: '4px' }}>Basado en IMC</p>
                  </div>
                  {/* Diagnóstico */}
                  <div style={{ background: preview.diagnostico.color + '12', borderRadius: '10px', padding: '14px', border: `1.5px solid ${preview.diagnostico.color}44` }}>
                    <p style={{ fontSize: '11px', color: '#9B7B65', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Diagnóstico</p>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: preview.diagnostico.color, fontFamily: "'Playfair Display', serif", lineHeight: 1.3 }}>{preview.diagnostico.texto}</p>
                    <p style={{ fontSize: '11px', color: '#9B7B65', marginTop: '6px' }}>Clasificación pediátrica</p>
                  </div>
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
              <button onClick={guardar} disabled={guardando || !preview} style={{
                padding: '11px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                background: 'linear-gradient(135deg, #2D6A4F, #40916C)', color: 'white',
                border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                opacity: guardando || !preview ? 0.6 : 1
              }}>{guardando ? 'Guardando...' : '✓ Guardar Medición'}</button>
            </div>
          </div>
        )}

        {/* Tabla de mediciones */}
        {mediciones.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #E8DDD0', padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', marginBottom: '12px' }}>📏</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810', marginBottom: '8px' }}>Sin mediciones registradas</p>
            <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '20px' }}>Registra la primera medición antropométrica</p>
            <button onClick={() => setMostrarForm(true)} style={{
              padding: '11px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
              background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white',
              border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif"
            }}>+ Nueva Medición</button>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F2EDE4' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810' }}>
                Historial de Mediciones
              </h2>
              <p style={{ fontSize: '13px', color: '#9B7B65', marginTop: '2px' }}>
                {mediciones.length} medición{mediciones.length !== 1 ? 'es' : ''} registrada{mediciones.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Header tabla */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 80px 90px 80px 120px 1fr', gap: '12px', padding: '12px 24px', background: '#FAF7F2', borderBottom: '1px solid #E8DDD0' }}>
              {['Fecha', 'Peso', 'Talla (cm)', 'IMC', 'Diagnóstico', 'Notas'].map(h => (
                <p key={h} style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9B7B65' }}>{h}</p>
              ))}
            </div>

            {mediciones.map((m, i) => {
              // Compatibilidad con registros viejos que no tienen diagnostico
              const diag = m.diagnostico || diagnosticoIMCPediatrico(m.imc)
              const diagTexto = typeof diag === 'string' ? diag : diag.texto
              const diagColor = typeof diag === 'string' ? diagnosticoIMCPediatrico(m.imc).color : diag.color
              return (
              <div key={m.id} style={{
                display: 'grid', gridTemplateColumns: '130px 80px 90px 80px 120px 1fr',
                gap: '12px', padding: '16px 24px', alignItems: 'center',
                borderBottom: i < mediciones.length - 1 ? '1px solid #F2EDE4' : 'none'
              }}>
                <p style={{ fontSize: '14px', color: '#2C1810', fontWeight: '500' }}>
                  {new Date(m.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p style={{ fontSize: '14px', color: '#2C1810' }}>{m.peso} kg</p>
                <p style={{ fontSize: '14px', color: '#2C1810', fontWeight: '600' }}>{m.talla} cm</p>
                <p style={{ fontSize: '14px', color: '#2C1810' }}>{m.imc}</p>
                <div>
                  <span style={{
                    fontSize: '12px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px',
                    background: diagColor + '18', color: diagColor,
                  }}>{diagTexto}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#9B7B65', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.notas || '—'}
                </p>
              </div>
              )
            })}
          </div>
        )}

        {/* Última medición destacada */}
        {mediciones.length > 0 && (
          <div style={{ marginTop: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#8B6914', marginBottom: '16px' }}>
              Última Medición — {new Date(mediciones[0].fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {(() => {
                const ult = mediciones[0]
                const diag = diagnosticoIMCPediatrico(ult.imc)
                const perc = ult.percentilIMC || percentilEstimadoIMC(ult.imc)
                return [
                  { label: 'Peso', valor: `${ult.peso} kg`, sub: undefined, color: '#2C1810' },
                  { label: 'Talla', valor: `${ult.talla} cm`, sub: undefined, color: '#2C1810' },
                  { label: 'IMC', valor: `${ult.imc} kg/m²`, sub: perc, color: diag.color },
                  { label: 'Diagnóstico', valor: diag.texto, sub: 'Clasificación pediátrica', color: diag.color },
                ]
              })().map(item => (
                <div key={item.label} style={{ background: '#FAF7F2', borderRadius: '12px', padding: '16px', border: '1px solid #E8DDD0' }}>
                  <p style={{ fontSize: '11px', color: '#9B7B65', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{item.label}</p>
                  <p style={{ fontSize: '20px', fontWeight: '700', color: 'color' in item ? item.color : '#2C1810', fontFamily: "'Playfair Display', serif" }}>{item.valor}</p>
                  {'sub' in item && <p style={{ fontSize: '12px', color: 'color' in item ? item.color as string : '#9B7B65', marginTop: '2px', fontWeight: '600' }}>{item.sub}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Navegación entre secciones ── */}
        <PasoNavegacion pacienteId={id} pasoActual="antropometria" />
      </main>
    </div>
  )
}