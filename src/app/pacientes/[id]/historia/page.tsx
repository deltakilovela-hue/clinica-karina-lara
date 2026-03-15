'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPaciente, Paciente } from '@/lib/pacientes'
import { collection, addDoc, getDocs, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']
type Step = 1 | 2 | 3

interface HistoriaClinica {
  id?: string
  fechaConsulta: string
  // Sección niño
  antecedentesperinatales: string
  semanasGestacion: string
  pesoNacer: string
  tipoNacimiento: string
  medicamentosActuales: string
  alergias: string
  intolerancias: string
  diagnosticosPrevios: string
  sintomasGI: string[]
  conductaAlimentaria: string
  texturasAceptadas: string
  texturasRechazadas: string
  alimentosFavoritos: string
  alimentosRechazados: string
  horasSueno: string
  actividadFisica: string
  // Sección familiar
  horariasComida: string
  quienCocina: string
  presupuestoAlimentario: string
  habitosFamiliares: string
  personasHogar: string
  notasAdicionales: string
  fechaCreacion?: Timestamp
}

const SINTOMAS_GI = [
  'Estreñimiento', 'Diarrea', 'Reflujo', 'Distensión abdominal',
  'Dolor abdominal', 'Gases', 'Náuseas', 'Vómitos', 'Sangre en heces'
]

export default function HistoriaClinicaPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [historias, setHistorias] = useState<HistoriaClinica[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const [form, setForm] = useState<Omit<HistoriaClinica, 'id' | 'fechaCreacion'>>({
    fechaConsulta: new Date().toISOString().split('T')[0],
    antecedentesperinatales: '', semanasGestacion: '', pesoNacer: '',
    tipoNacimiento: '', medicamentosActuales: '', alergias: '',
    intolerancias: '', diagnosticosPrevios: '', sintomasGI: [],
    conductaAlimentaria: '', texturasAceptadas: '', texturasRechazadas: '',
    alimentosFavoritos: '', alimentosRechazados: '', horasSueno: '',
    actividadFisica: '', horariasComida: '', quienCocina: '',
    presupuestoAlimentario: '', habitosFamiliares: '', personasHogar: '',
    notasAdicionales: '',
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      try {
        const p = await obtenerPaciente(id)
        setPaciente(p)
        await cargarHistorias()
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router, id])

  const cargarHistorias = async () => {
    const q = query(collection(db, `pacientes/${id}/historiasClinicas`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    setHistorias(snap.docs.map(d => ({ id: d.id, ...d.data() } as HistoriaClinica)))
  }

  const set = (campo: string, valor: string) => setForm(p => ({ ...p, [campo]: valor }))

  const toggleSintoma = (s: string) => {
    setForm(p => ({
      ...p,
      sintomasGI: p.sintomasGI.includes(s) ? p.sintomasGI.filter(x => x !== s) : [...p.sintomasGI, s]
    }))
  }

  const guardar = async () => {
    setGuardando(true)
    try {
      await addDoc(collection(db, `pacientes/${id}/historiasClinicas`), {
        ...form, fechaCreacion: Timestamp.now()
      })
      await cargarHistorias()
      setMostrarForm(false)
      setStep(1)
      setExito('Historia clínica guardada correctamente')
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

  const iS = { width: '100%', padding: '11px 14px', borderRadius: '10px', fontSize: '14px', border: '1.5px solid #E8DDD0', background: '#FAF7F2', color: '#2C1810', outline: 'none', fontFamily: "'Lato', sans-serif" }
  const taS = { ...iS, resize: 'none' as const, minHeight: '90px' }
  const lS = { display: 'block', fontSize: '11px', fontWeight: '700' as const, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#6B4F3A', marginBottom: '7px' }
  const secTitle = (t: string) => (
    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: '#7B1B2A', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #E8DDD0' }}>{t}</h3>
  )

  const steps = [{ n: 1, l: 'Antecedentes' }, { n: 2, l: 'Alimentación' }, { n: 3, l: 'Familia' }]

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
            <span style={{ color: '#2C1810', fontWeight: '600' }}>Historia Clínica</span>
          </div>
          <button onClick={() => { setMostrarForm(true); setStep(1); setError('') }} style={{
            padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
            background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white',
            border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
            boxShadow: '0 2px 8px rgba(123,27,42,0.25)'
          }}>+ Nueva Historia</button>
        </div>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>
            Historia Clínica
          </h1>
          <p style={{ color: '#9B7B65', fontSize: '14px' }}>{paciente?.nombre} · {paciente?.edad} años</p>
        </div>

        {exito && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', background: '#F0FAF4', border: '1px solid #95D5A8', color: '#2D6A4F', fontSize: '14px' }}>✓ {exito}</div>
        )}

        {/* Formulario */}
        {mostrarForm && (
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8DDD0', padding: '36px', marginBottom: '28px', boxShadow: '0 2px 16px rgba(44,24,16,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810' }}>Nueva Historia Clínica</h2>
              <div>
                <label style={lS}>Fecha de consulta</label>
                <input type="date" style={{ ...iS, width: 'auto', colorScheme: 'light' }}
                  value={form.fechaConsulta} onChange={e => set('fechaConsulta', e.target.value)} />
              </div>
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
              {steps.map((s, i) => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700',
                      background: step === s.n ? '#7B1B2A' : step > s.n ? '#D8F3DC' : '#F2EDE4',
                      color: step === s.n ? 'white' : step > s.n ? '#2D6A4F' : '#9B7B65',
                    }}>{step > s.n ? '✓' : s.n}</div>
                    <span style={{ fontSize: '13px', color: step === s.n ? '#2C1810' : '#9B7B65', fontWeight: step === s.n ? '600' : '400' }}>{s.l}</span>
                  </div>
                  {i < 2 && <div style={{ width: '24px', height: '1px', background: '#E8DDD0', margin: '0 4px' }} />}
                </div>
              ))}
            </div>

            {/* Step 1: Antecedentes */}
            {step === 1 && (
              <div>
                {secTitle('Antecedentes Perinatales')}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                  <div>
                    <label style={lS}>Semanas de gestación</label>
                    <input type="number" style={iS} placeholder="ej. 38" value={form.semanasGestacion} onChange={e => set('semanasGestacion', e.target.value)} />
                  </div>
                  <div>
                    <label style={lS}>Peso al nacer (kg)</label>
                    <input type="number" step="0.1" style={iS} placeholder="ej. 3.2" value={form.pesoNacer} onChange={e => set('pesoNacer', e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={lS}>Tipo de nacimiento</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['Parto natural', 'Cesárea', 'Parto con fórceps'].map(t => (
                      <button key={t} type="button" onClick={() => set('tipoNacimiento', t)} style={{
                        padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                        background: form.tipoNacimiento === t ? '#7B1B2A' : '#FAF7F2',
                        color: form.tipoNacimiento === t ? 'white' : '#6B4F3A',
                        border: form.tipoNacimiento === t ? '1.5px solid #7B1B2A' : '1.5px solid #E8DDD0'
                      }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={lS}>Notas de antecedentes perinatales</label>
                  <textarea style={taS} placeholder="Complicaciones en el embarazo, hospitalizaciones, etc." value={form.antecedentesperinatales} onChange={e => set('antecedentesperinatales', e.target.value)} />
                </div>
                {secTitle('Diagnósticos y Medicamentos')}
                <div style={{ marginBottom: '18px' }}>
                  <label style={lS}>Diagnósticos médicos previos</label>
                  <textarea style={taS} placeholder="TEA, epilepsia, TDAH, etc." value={form.diagnosticosPrevios} onChange={e => set('diagnosticosPrevios', e.target.value)} />
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={lS}>Medicamentos actuales</label>
                  <textarea style={taS} placeholder="Nombre, dosis y frecuencia" value={form.medicamentosActuales} onChange={e => set('medicamentosActuales', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                  <div>
                    <label style={lS}>Alergias</label>
                    <textarea style={{ ...taS, minHeight: '70px' }} placeholder="Alimentos, medicamentos, etc." value={form.alergias} onChange={e => set('alergias', e.target.value)} />
                  </div>
                  <div>
                    <label style={lS}>Intolerancias</label>
                    <textarea style={{ ...taS, minHeight: '70px' }} placeholder="Lactosa, gluten, etc." value={form.intolerancias} onChange={e => set('intolerancias', e.target.value)} />
                  </div>
                </div>
                {secTitle('Síntomas Gastrointestinales')}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
                  {SINTOMAS_GI.map(s => (
  <button key={s} type="button" onClick={() => toggleSintoma(s)} style={{
    padding: '8px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
    background: form.sintomasGI.includes(s) ? '#F5E8EB' : '#FAF7F2',
    color: form.sintomasGI.includes(s) ? '#7B1B2A' : '#6B4F3A',
    border: form.sintomasGI.includes(s) ? '1.5px solid #A63244' : '1.5px solid #E8DDD0',
    fontWeight: form.sintomasGI.includes(s) ? '700' : '400'
  }}>{form.sintomasGI.includes(s) ? '✓ ' : ''}{s}</button>
))}
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={lS}>Horas de sueño</label>
                  <input type="text" style={iS} placeholder="ej. 8-9 horas, duerme bien" value={form.horasSueno} onChange={e => set('horasSueno', e.target.value)} />
                </div>
                <div>
                  <label style={lS}>Actividad física</label>
                  <input type="text" style={iS} placeholder="ej. Juega fútbol 3 veces/semana" value={form.actividadFisica} onChange={e => set('actividadFisica', e.target.value)} />
                </div>
              </div>
            )}

            {/* Step 2: Alimentación */}
            {step === 2 && (
              <div>
                {secTitle('Conducta Alimentaria')}
                <div style={{ marginBottom: '18px' }}>
                  <label style={lS}>Descripción general de la conducta alimentaria</label>
                  <textarea style={taS} placeholder="Selectividad, neofobia, rituales, etc." value={form.conductaAlimentaria} onChange={e => set('conductaAlimentaria', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                  <div>
                    <label style={lS}>Texturas aceptadas</label>
                    <textarea style={{ ...taS, minHeight: '80px' }} placeholder="Suave, cremosa, crujiente..." value={form.texturasAceptadas} onChange={e => set('texturasAceptadas', e.target.value)} />
                  </div>
                  <div>
                    <label style={lS}>Texturas rechazadas</label>
                    <textarea style={{ ...taS, minHeight: '80px' }} placeholder="Fibrosa, pegajosa, grumosa..." value={form.texturasRechazadas} onChange={e => set('texturasRechazadas', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                  <div>
                    <label style={lS}>Alimentos favoritos</label>
                    <textarea style={{ ...taS, minHeight: '80px' }} placeholder="Lista de alimentos que acepta bien" value={form.alimentosFavoritos} onChange={e => set('alimentosFavoritos', e.target.value)} />
                  </div>
                  <div>
                    <label style={lS}>Alimentos rechazados</label>
                    <textarea style={{ ...taS, minHeight: '80px' }} placeholder="Lista de alimentos que rechaza" value={form.alimentosRechazados} onChange={e => set('alimentosRechazados', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Familia */}
            {step === 3 && (
              <div>
                {secTitle('Contexto Familiar')}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                  <div>
                    <label style={lS}>Número de personas en el hogar</label>
                    <input type="number" style={iS} placeholder="ej. 4" value={form.personasHogar} onChange={e => set('personasHogar', e.target.value)} />
                  </div>
                  <div>
                    <label style={lS}>¿Quién cocina en casa?</label>
                    <input type="text" style={iS} placeholder="Mamá, abuela, papá..." value={form.quienCocina} onChange={e => set('quienCocina', e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={lS}>Horarios de comida en casa</label>
                  <textarea style={taS} placeholder="Desayuno 7am, comida 2pm, cena 8pm..." value={form.horariasComida} onChange={e => set('horariasComida', e.target.value)} />
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={lS}>Presupuesto alimentario familiar</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['Menos de $500/sem', '$500-$1000/sem', '$1000-$2000/sem', 'Más de $2000/sem'].map(p => (
                      <button key={p} type="button" onClick={() => set('presupuestoAlimentario', p)} style={{
                        padding: '9px 14px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                        background: form.presupuestoAlimentario === p ? '#7B1B2A' : '#FAF7F2',
                        color: form.presupuestoAlimentario === p ? 'white' : '#6B4F3A',
                        border: form.presupuestoAlimentario === p ? '1.5px solid #7B1B2A' : '1.5px solid #E8DDD0',
                        fontWeight: form.presupuestoAlimentario === p ? '600' : '400'
                      }}>{p}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={lS}>Hábitos alimentarios de la familia</label>
                  <textarea style={taS} placeholder="Comen juntos, comida rápida frecuente, dieta especial familiar..." value={form.habitosFamiliares} onChange={e => set('habitosFamiliares', e.target.value)} />
                </div>
                <div>
                  <label style={lS}>Notas adicionales</label>
                  <textarea style={taS} placeholder="Cualquier información relevante adicional..." value={form.notasAdicionales} onChange={e => set('notasAdicionales', e.target.value)} />
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', marginTop: '16px', background: '#FDECEA', border: '1px solid #F5C2C7', color: '#9B2335', fontSize: '13px' }}>{error}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
              {step > 1 ? (
                <button onClick={() => setStep(s => (s - 1) as Step)} style={{ padding: '11px 22px', borderRadius: '10px', fontSize: '14px', border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>← Anterior</button>
              ) : (
                <button onClick={() => setMostrarForm(false)} style={{ padding: '11px 22px', borderRadius: '10px', fontSize: '14px', border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>Cancelar</button>
              )}
              {step < 3 ? (
                <button onClick={() => setStep(s => (s + 1) as Step)} style={{ padding: '11px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>Siguiente →</button>
              ) : (
                <button onClick={guardar} disabled={guardando} style={{ padding: '11px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', background: 'linear-gradient(135deg, #2D6A4F, #40916C)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif", opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? 'Guardando...' : '✓ Guardar Historia'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Historial */}
        {historias.length === 0 && !mostrarForm ? (
          <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #E8DDD0', padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', marginBottom: '12px' }}>📋</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810', marginBottom: '8px' }}>Sin historias clínicas</p>
            <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '20px' }}>Registra la primera historia clínica del paciente</p>
            <button onClick={() => setMostrarForm(true)} style={{ padding: '11px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>+ Nueva Historia</button>
          </div>
        ) : historias.length > 0 && (
          <div>
            <h2 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#8B6914', marginBottom: '16px' }}>
              Historias Registradas ({historias.length})
            </h2>
            {historias.map((h, i) => (
              <div key={h.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810', fontWeight: '600' }}>
                      Historia #{historias.length - i}
                    </p>
                    <p style={{ fontSize: '13px', color: '#9B7B65', marginTop: '2px' }}>
                      {new Date(h.fechaConsulta + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  {h.sintomasGI.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '400px', justifyContent: 'flex-end' }}>
                      {h.sintomasGI.map(s => (
                        <span key={s} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#F5E8EB', color: '#7B1B2A', fontWeight: '600' }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {[
                    { label: 'Diagnósticos', valor: h.diagnosticosPrevios },
                    { label: 'Alergias', valor: h.alergias },
                    { label: 'Medicamentos', valor: h.medicamentosActuales },
                    { label: 'Alimentos favoritos', valor: h.alimentosFavoritos },
                    { label: 'Alimentos rechazados', valor: h.alimentosRechazados },
                    { label: 'Texturas aceptadas', valor: h.texturasAceptadas },
                  ].filter(x => x.valor).map(item => (
                    <div key={item.label} style={{ background: '#FAF7F2', borderRadius: '10px', padding: '14px', border: '1px solid #E8DDD0' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8B6914', marginBottom: '6px' }}>{item.label}</p>
                      <p style={{ fontSize: '13px', color: '#2C1810', lineHeight: '1.5' }}>{item.valor}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}