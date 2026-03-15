'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { crearPaciente, calcularEdad, generarCredenciales } from '@/lib/pacientes'
import Link from 'next/link'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com']
type Step = 1 | 2 | 3 | 4

export default function NuevoPacientePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [credenciales, setCredenciales] = useState<{ correo: string, password: string } | null>(null)
  const [pacienteId, setPacienteId] = useState<string>('')

  const [form, setForm] = useState({
    nombre: '', fechaNacimiento: '', sexo: '' as 'masculino' | 'femenino' | '',
    tutor: '', telefono: '', correo: '', direccion: '', motivoConsulta: '',
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user || !user.email || !ADMINS.includes(user.email)) router.push('/')
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
      await createUserWithEmailAndPassword(auth, creds.correo, creds.password)
      const id = await crearPaciente({
        nombre: form.nombre.trim(), fechaNacimiento: form.fechaNacimiento,
        edad: calcularEdad(form.fechaNacimiento), sexo: form.sexo,
        tutor: form.tutor.trim(), telefono: form.telefono.trim(),
        correo: form.correo.trim(), direccion: form.direccion.trim(),
        motivoConsulta: form.motivoConsulta.trim(),
        correoAcceso: creds.correo,
        passwordAcceso: creds.password,
      })
      setCredenciales(creds)
      setPacienteId(id)
      setStep(4)
    } catch (e) { setError('Error al guardar. Verifica tu conexión.'); console.error(e) }
    finally { setGuardando(false) }
  }

  const iStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' as const }
  const iClass = "w-full px-4 py-3 rounded-xl text-sm outline-none"
  const lClass = "block text-xs font-medium mb-2 tracking-wider uppercase"
  const lStyle = { color: 'rgba(180,120,60,0.8)' }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a0a05 0%, #2d0f0a 50%, #1a0505 100%)' }}>
      <header style={{ borderBottom: '1px solid rgba(180,120,60,0.2)', background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/pacientes" className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>← Pacientes</Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span className="text-white text-sm">Nuevo Paciente</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Registrar <span style={{ color: '#C43B3B' }}>Nuevo Paciente</span>
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Complete el expediente clínico inicial</p>
        </div>

        {step < 4 && (
          <div className="flex items-center gap-2 mb-8">
            {[{n:1,l:'Datos del Niño'},{n:2,l:'Contacto'},{n:3,l:'Consulta'}].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{
                      background: step === s.n ? 'linear-gradient(135deg, #8B1A1A, #C43B3B)' : step > s.n ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)',
                      color: step === s.n ? 'white' : step > s.n ? '#4ade80' : 'rgba(255,255,255,0.4)',
                      border: step > s.n ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    }}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span className="text-xs hidden sm:block" style={{ color: step === s.n ? 'white' : 'rgba(255,255,255,0.3)' }}>{s.l}</span>
                </div>
                {i < 2 && <div className="w-8 h-px mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />}
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl p-8" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-white font-medium mb-6" style={{ fontFamily: 'Georgia, serif' }}>Datos del Paciente</h2>
              <div>
                <label className={lClass} style={lStyle}>Nombre Completo *</label>
                <input type="text" className={iClass} style={iStyle} placeholder="Nombre completo del niño/niña"
                  value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={lClass} style={lStyle}>Fecha de Nacimiento *</label>
                  <input type="date" className={iClass} style={{ ...iStyle, colorScheme: 'dark' as const }}
                    value={form.fechaNacimiento} onChange={e => set('fechaNacimiento', e.target.value)} />
                  {form.fechaNacimiento && (
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Edad actual: {calcularEdad(form.fechaNacimiento)} años
                    </p>
                  )}
                </div>
                <div>
                  <label className={lClass} style={lStyle}>Sexo *</label>
                  <div className="flex gap-3">
                    {(['masculino', 'femenino'] as const).map(s => (
                      <button key={s} type="button" onClick={() => set('sexo', s)}
                        className="flex-1 py-3 rounded-xl text-sm capitalize"
                        style={{
                          background: form.sexo === s ? 'linear-gradient(135deg, #8B1A1A, #C43B3B)' : 'rgba(255,255,255,0.06)',
                          color: form.sexo === s ? 'white' : 'rgba(255,255,255,0.5)',
                          border: form.sexo === s ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
                        }}>
                        {s === 'masculino' ? '♂ Masculino' : '♀ Femenino'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-white font-medium mb-6" style={{ fontFamily: 'Georgia, serif' }}>Información del Tutor</h2>
              <div>
                <label className={lClass} style={lStyle}>Nombre del Tutor *</label>
                <input type="text" className={iClass} style={iStyle} placeholder="Nombre completo del responsable"
                  value={form.tutor} onChange={e => set('tutor', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={lClass} style={lStyle}>Teléfono *</label>
                  <input type="tel" className={iClass} style={iStyle} placeholder="311 000 0000"
                    value={form.telefono} onChange={e => set('telefono', e.target.value)} />
                </div>
                <div>
                  <label className={lClass} style={lStyle}>Correo del Tutor</label>
                  <input type="email" className={iClass} style={iStyle} placeholder="correo@ejemplo.com"
                    value={form.correo} onChange={e => set('correo', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={lClass} style={lStyle}>Dirección</label>
                <input type="text" className={iClass} style={iStyle} placeholder="Calle, número, colonia, ciudad"
                  value={form.direccion} onChange={e => set('direccion', e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-white font-medium mb-6" style={{ fontFamily: 'Georgia, serif' }}>Motivo de Consulta</h2>
              <div>
                <label className={lClass} style={lStyle}>¿Por qué acude a consulta? *</label>
                <textarea className={iClass} style={{ ...iStyle, resize: 'none' as const }} rows={5}
                  placeholder="Describe el motivo principal, síntomas, diagnósticos previos..."
                  value={form.motivoConsulta} onChange={e => set('motivoConsulta', e.target.value)} />
              </div>
              <div className="p-5 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'rgba(180,120,60,0.7)' }}>Resumen</p>
                <div className="space-y-2 text-sm">
                  {[['Paciente', form.nombre], ['Edad', form.fechaNacimiento ? `${calcularEdad(form.fechaNacimiento)} años` : '—'],
                    ['Sexo', form.sexo], ['Tutor', form.tutor], ['Teléfono', form.telefono]].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</span>
                      <span className="text-white capitalize">{v || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Credenciales generadas */}
          {step === 4 && credenciales && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-3">✅</div>
                <h2 className="text-white font-medium text-xl mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                  Expediente Creado
                </h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Entrega estas credenciales a los padres de {form.nombre}
                </p>
              </div>

              <div className="p-6 rounded-xl space-y-4" style={{ background: 'rgba(26,92,58,0.15)', border: '1px solid rgba(74,222,128,0.2)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(74,222,128,0.8)' }}>
                  Credenciales de Acceso — Portal Padres
                </p>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Usuario (correo)</p>
                  <p className="text-white font-mono text-sm px-4 py-2 rounded-lg select-all"
                    style={{ background: 'rgba(0,0,0,0.3)' }}>{credenciales.correo}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Contraseña</p>
                  <p className="text-white font-mono text-sm px-4 py-2 rounded-lg select-all"
                    style={{ background: 'rgba(0,0,0,0.3)' }}>{credenciales.password}</p>
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  💡 Haz clic en el usuario o contraseña para seleccionarlo y copiarlo
                </p>
              </div>

              <div className="flex gap-3">
                <Link href={`/pacientes/${pacienteId}`}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-center transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)', color: 'white' }}>
                  Ver Expediente
                </Link>
                <Link href="/pacientes/nuevo"
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-center transition-all"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                  + Otro Paciente
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 px-4 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {step < 4 && (
            <div className="flex justify-between mt-8">
              {step > 1
                ? <button onClick={() => setStep(s => (s - 1) as Step)} className="px-5 py-2.5 rounded-lg text-sm"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>← Anterior</button>
                : <div />}
              {step < 3
                ? <button onClick={siguiente} className="px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)', color: 'white' }}>Siguiente →</button>
                : <button onClick={guardar} disabled={guardando} className="px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #1A5C3A, #22c55e)', color: 'white' }}>
                    {guardando ? 'Creando...' : '✓ Crear Expediente'}
                  </button>
              }
            </div>
          )}
        </div>
      </main>
    </div>
  )
}