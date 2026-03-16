'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { crearPaciente, calcularEdad, generarCredenciales } from '@/lib/pacientes'
import Link from 'next/link'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']
type Step = 1 | 2 | 3 | 4

export default function NuevoPacientePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [inicializando, setInicializando] = useState(true)
  const [credenciales, setCredenciales] = useState<{ correo: string, password: string } | null>(null)
  const [pacienteId, setPacienteId] = useState<string>('')
  const [form, setForm] = useState({
    nombre: '', fechaNacimiento: '', sexo: '' as 'masculino' | 'femenino' | '',
    tutor: '', telefono: '', correo: '', direccion: '', motivoConsulta: '',
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setInicializando(false)
      if (!user || !user.email || !ADMINS.includes(user.email)) router.replace('/')
    })
    return () => unsub()
  }, [router])

  const set = (campo: string, valor: string) => { setForm(prev => ({ ...prev, [campo]: valor })); setError('') }

  const validarStep = () => {
    if (step === 1) {
      if (!form.nombre.trim()) return 'El nombre del paciente es requerido'
      if (!form.fechaNacimiento) return 'La fecha de nacimiento es requerida'
      if (!form.sexo) return 'El sexo es requerido'
    }
    if (step === 2 && !form.tutor.trim()) return 'El nombre del tutor es requerido'
    if (step === 2 && !form.telefono.trim()) return 'El teléfono es requerido'
    if (step === 3 && !form.motivoConsulta.trim()) return 'El motivo de consulta es requerido'
    return ''
  }

  const siguiente = () => { const err = validarStep(); if (err) { setError(err); return }; setStep(s => (s + 1) as Step) }

  const guardar = async () => {
    const err = validarStep(); if (err) { setError(err); return }; if (!form.sexo) return
    setGuardando(true)
    try {
      const creds = generarCredenciales(form.nombre)

      // 1️⃣ Crear paciente en Firestore
      const id = await crearPaciente({
        nombre: form.nombre.trim(), fechaNacimiento: form.fechaNacimiento,
        edad: calcularEdad(form.fechaNacimiento), sexo: form.sexo,
        tutor: form.tutor.trim(), telefono: form.telefono.trim(),
        correo: form.correo.trim(), direccion: form.direccion.trim(),
        motivoConsulta: form.motivoConsulta.trim(),
        correoAcceso: creds.correo, passwordAcceso: creds.password,
      })

      // 2️⃣ Crear usuario en Firebase Authentication
      await fetch('/api/auth-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: creds.correo, password: creds.password, accion: 'crear' }),
      })

      setCredenciales(creds)
      setPacienteId(id)
      setStep(4)
    } catch (e) { setError('Error al guardar. Verifica tu conexión.'); console.error(e) }
    finally { setGuardando(false) }
  }

  if (inicializando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px', fontSize: '14px',
    border: '1.5px solid #E8DDD0', background: '#FAF7F2', color: '#2C1810',
    outline: 'none', fontFamily: "'Lato', sans-serif"
  }
  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: '700' as const,
    letterSpacing: '1px', textTransform: 'uppercase' as const,
    color: '#6B4F3A', marginBottom: '8px', fontFamily: "'Lato', sans-serif"
  }

  const steps = [{n:1,l:'Datos del Niño'},{n:2,l:'Contacto'},{n:3,l:'Consulta'}]

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px', height: '64px', fontSize: '14px' }}>
          <Link href="/pacientes" style={{ color: '#9B7B65', textDecoration: 'none' }}>← Pacientes</Link>
          <span style={{ color: '#C9B8A8' }}>/</span>
          <span style={{ color: '#2C1810', fontWeight: '600' }}>Nuevo Paciente</span>
        </div>
      </header>

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>
            Registrar <span style={{ color: '#7B1B2A' }}>Nuevo Paciente</span>
          </h1>
          <p style={{ color: '#9B7B65', fontSize: '14px' }}>Complete el expediente clínico inicial</p>
        </div>

        {/* Steps */}
        {step < 4 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
            {steps.map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '700',
                    background: step === s.n ? '#7B1B2A' : step > s.n ? '#2D6A4F' : 'white',
                    color: step >= s.n ? 'white' : '#9B7B65',
                    border: step < s.n ? '2px solid #E8DDD0' : 'none',
                  }}>{step > s.n ? '✓' : s.n}</div>
                  <span style={{ fontSize: '13px', color: step === s.n ? '#2C1810' : '#9B7B65', fontWeight: step === s.n ? '600' : '400' }}>{s.l}</span>
                </div>
                {i < steps.length - 1 && <div style={{ width: '32px', height: '1px', background: '#E8DDD0', margin: '0 4px' }} />}
              </div>
            ))}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8DDD0', padding: '36px', boxShadow: '0 2px 16px rgba(44,24,16,0.06)' }}>

          {error && <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', background: '#FDECEA', border: '1px solid #F5C2C7', color: '#9B2335', fontSize: '14px' }}>⚠️ {error}</div>}

          {/* Step 1 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Nombre completo del niño *</label>
                <input style={inputStyle} placeholder="Ej: María García López" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Fecha de nacimiento *</label>
                  <input type="date" style={{ ...inputStyle, colorScheme: 'light' }} value={form.fechaNacimiento} onChange={e => set('fechaNacimiento', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Sexo *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['masculino', 'femenino'].map(s => (
                      <button key={s} onClick={() => set('sexo', s)} style={{
                        flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer',
                        fontFamily: "'Lato', sans-serif", fontWeight: '500', border: '1.5px solid',
                        borderColor: form.sexo === s ? '#7B1B2A' : '#E8DDD0',
                        background: form.sexo === s ? '#F5E8EB' : 'white',
                        color: form.sexo === s ? '#7B1B2A' : '#6B4F3A',
                      }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Nombre del tutor *</label>
                <input style={inputStyle} placeholder="Papá, mamá o tutor responsable" value={form.tutor} onChange={e => set('tutor', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Teléfono *</label>
                  <input style={inputStyle} placeholder="10 dígitos" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Correo del tutor</label>
                  <input type="email" style={inputStyle} placeholder="correo@ejemplo.com" value={form.correo} onChange={e => set('correo', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Dirección</label>
                <input style={inputStyle} placeholder="Ciudad, colonia..." value={form.direccion} onChange={e => set('direccion', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Motivo de consulta *</label>
                <textarea style={{ ...inputStyle, resize: 'none', minHeight: '120px' }}
                  placeholder="Describe el motivo principal, síntomas, diagnósticos previos..."
                  value={form.motivoConsulta} onChange={e => set('motivoConsulta', e.target.value)} />
              </div>
              <div style={{ background: '#FAF7F2', borderRadius: '12px', padding: '20px', border: '1px solid #E8DDD0' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#8B6914', marginBottom: '14px' }}>Resumen del Expediente</p>
                {[['Paciente', form.nombre], ['Edad', form.fechaNacimiento ? `${calcularEdad(form.fechaNacimiento)} años` : '—'], ['Sexo', form.sexo], ['Tutor', form.tutor], ['Teléfono', form.telefono]].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#9B7B65' }}>{l}</span>
                    <span style={{ fontSize: '13px', color: '#2C1810', fontWeight: '600', textTransform: 'capitalize' }}>{v || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 - Éxito */}
          {step === 4 && credenciales && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#2C1810', marginBottom: '8px' }}>Expediente Creado</h2>
              <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '28px' }}>
                Entrega estas credenciales a los padres de <strong style={{ color: '#2C1810' }}>{form.nombre}</strong>
              </p>
              <div style={{ background: '#F0FAF4', borderRadius: '14px', padding: '24px', border: '1.5px solid #95D5A8', marginBottom: '24px', textAlign: 'left' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#2D6A4F', marginBottom: '16px' }}>
                  Credenciales — Portal para Padres
                </p>
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '12px', color: '#6B4F3A', marginBottom: '6px' }}>URL del portal</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#2C1810', background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8DDD0' }}>
                    clinica-karina-lara.vercel.app/portal/login
                  </p>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '12px', color: '#6B4F3A', marginBottom: '6px' }}>Usuario (correo)</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '14px', color: '#2C1810', background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8DDD0', userSelect: 'all' as const }}>{credenciales.correo}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#6B4F3A', marginBottom: '6px' }}>Contraseña</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '14px', color: '#2C1810', background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E8DDD0', userSelect: 'all' as const }}>{credenciales.password}</p>
                </div>
                <p style={{ fontSize: '12px', color: '#9B7B65', marginTop: '12px' }}>💡 Haz clic en cada campo para seleccionar y copiar</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Link href={`/pacientes/${pacienteId}`} style={{
                  flex: 1, padding: '13px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                  background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white',
                  textDecoration: 'none', textAlign: 'center' as const,
                }}>Ver Expediente</Link>
                <Link href="/pacientes/nuevo" style={{
                  flex: 1, padding: '13px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                  border: '1.5px solid #E8DDD0', color: '#6B4F3A',
                  textDecoration: 'none', textAlign: 'center' as const, background: 'white'
                }}>+ Otro Paciente</Link>
              </div>
            </div>
          )}

          {error && step < 4 && <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '10px', background: '#FDECEA', border: '1px solid #F5C2C7', color: '#9B2335', fontSize: '14px' }}>⚠️ {error}</div>}

          {step < 4 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              {step > 1
                ? <button onClick={() => setStep(s => (s - 1) as Step)} style={{ padding: '12px 24px', borderRadius: '10px', fontSize: '14px', border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A', cursor: 'pointer', fontFamily: "'Lato', sans-serif", fontWeight: '600' }}>← Anterior</button>
                : <div />
              }
              {step < 3
                ? <button onClick={siguiente} style={{ padding: '12px 28px', borderRadius: '10px', fontSize: '14px', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif", fontWeight: '600' }}>Siguiente →</button>
                : <button onClick={guardar} disabled={guardando} style={{
                    padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                    background: guardando ? '#E8DDD0' : 'linear-gradient(135deg, #7B1B2A, #A63244)',
                    color: guardando ? '#9B7B65' : 'white', border: 'none',
                    cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: "'Lato', sans-serif",
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    {guardando ? <><div style={{ width: '14px', height: '14px', border: '2px solid #9B7B65', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Guardando...</> : '✓ Crear Expediente'}
                  </button>
              }
            </div>
          )}
        </div>
      </main>
    </div>
  )
}