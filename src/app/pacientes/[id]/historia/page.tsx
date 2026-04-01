'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPaciente, Paciente } from '@/lib/pacientes'
import { collection, addDoc, updateDoc, doc, getDocs, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import PasoNavegacion from '@/components/PasoNavegacion'

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
  sintomasGIOtros: string
  conductaAlimentaria: string
  texturasAceptadas: string
  texturasRechazadas: string
  alimentosFavoritos: string
  alimentosRechazados: string
  // Texturas por tipo (JSON string → array of {textura, acepta, rechaza})
  texturaDetalle: string
  horasSueno: string
  actividadFisica: string
  // Sección familiar
  horaDesayuno: string
  horaColacion1: string
  horaComida: string
  horaColacion2: string
  horaCena: string
  horariasComida: string  // legacy
  quienCocina: string
  presupuestoAlimentario: string
  habitosFamiliares: string
  personasHogar: string
  notasAdicionales: string
  fechaCreacion?: Timestamp
}

const SINTOMAS_GI = [
  'Estreñimiento', 'Diarrea', 'Reflujo', 'Distensión abdominal',
  'Dolor abdominal', 'Gases', 'Náuseas', 'Vómitos', 'Sangre en heces',
  'Flatulencia excesiva', 'Colitis', 'Pirosis / Acidez', 'Regurgitación',
  'Hipo frecuente', 'Pérdida de apetito', 'Heces con moco',
  'Urgencia defecatoria', 'Indigestión', 'Borborigmos (ruidos intestinales)',
  'Disfagia (dificultad para tragar)', 'Síndrome de intestino irritable',
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
  const [mostrarConfirmHome, setMostrarConfirmHome] = useState(false)
  const [historiaExpandida, setHistoriaExpandida] = useState<string | null>(null)
  const [historiaEditandoId, setHistoriaEditandoId] = useState<string | null>(null)

  const [form, setForm] = useState<Omit<HistoriaClinica, 'id' | 'fechaCreacion'>>({
    fechaConsulta: new Date().toISOString().split('T')[0],
    antecedentesperinatales: '', semanasGestacion: '', pesoNacer: '',
    tipoNacimiento: '', medicamentosActuales: '', alergias: '',
    intolerancias: '', diagnosticosPrevios: '', sintomasGI: [],
    sintomasGIOtros: '',
    conductaAlimentaria: '', texturasAceptadas: '', texturasRechazadas: '',
    alimentosFavoritos: '', alimentosRechazados: '', texturaDetalle: '[]',
    horasSueno: '',
    actividadFisica: '',
    horaDesayuno: '', horaColacion1: '', horaComida: '', horaColacion2: '', horaCena: '',
    horariasComida: '', quienCocina: '',
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

  const formVacio = {
    fechaConsulta: new Date().toISOString().split('T')[0],
    antecedentesperinatales: '', semanasGestacion: '', pesoNacer: '',
    tipoNacimiento: '', medicamentosActuales: '', alergias: '',
    intolerancias: '', diagnosticosPrevios: '', sintomasGI: [] as string[],
    sintomasGIOtros: '', conductaAlimentaria: '', texturasAceptadas: '',
    texturasRechazadas: '', alimentosFavoritos: '', alimentosRechazados: '',
    texturaDetalle: '[]',
    horasSueno: '', actividadFisica: '',
    horaDesayuno: '', horaColacion1: '', horaComida: '', horaColacion2: '', horaCena: '',
    horariasComida: '', quienCocina: '',
    presupuestoAlimentario: '', habitosFamiliares: '', personasHogar: '',
    notasAdicionales: '',
  }

  const abrirNueva = () => {
    setForm(formVacio)
    setHistoriaEditandoId(null)
    setMostrarForm(true)
    setStep(1)
    setError('')
  }

  const abrirEditar = (h: HistoriaClinica) => {
    setForm({
      fechaConsulta: h.fechaConsulta,
      antecedentesperinatales: h.antecedentesperinatales || '',
      semanasGestacion: h.semanasGestacion || '',
      pesoNacer: h.pesoNacer || '',
      tipoNacimiento: h.tipoNacimiento || '',
      medicamentosActuales: h.medicamentosActuales || '',
      alergias: h.alergias || '',
      intolerancias: h.intolerancias || '',
      diagnosticosPrevios: h.diagnosticosPrevios || '',
      sintomasGI: h.sintomasGI || [],
      sintomasGIOtros: h.sintomasGIOtros || '',
      conductaAlimentaria: h.conductaAlimentaria || '',
      texturasAceptadas: h.texturasAceptadas || '',
      texturasRechazadas: h.texturasRechazadas || '',
      alimentosFavoritos: h.alimentosFavoritos || '',
      alimentosRechazados: h.alimentosRechazados || '',
      texturaDetalle: h.texturaDetalle || '[]',
      horasSueno: h.horasSueno || '',
      actividadFisica: h.actividadFisica || '',
      horaDesayuno: h.horaDesayuno || '',
      horaColacion1: h.horaColacion1 || '',
      horaComida: h.horaComida || '',
      horaColacion2: h.horaColacion2 || '',
      horaCena: h.horaCena || '',
      horariasComida: h.horariasComida || '',
      quienCocina: h.quienCocina || '',
      presupuestoAlimentario: h.presupuestoAlimentario || '',
      habitosFamiliares: h.habitosFamiliares || '',
      personasHogar: h.personasHogar || '',
      notasAdicionales: h.notasAdicionales || '',
    })
    setHistoriaEditandoId(h.id!)
    setMostrarForm(true)
    setStep(1)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const guardar = async () => {
    setGuardando(true)
    try {
      if (historiaEditandoId) {
        await updateDoc(doc(db, `pacientes/${id}/historiasClinicas`, historiaEditandoId), { ...form })
      } else {
        await addDoc(collection(db, `pacientes/${id}/historiasClinicas`), {
          ...form, fechaCreacion: Timestamp.now()
        })
      }
      await cargarHistorias()
      setMostrarForm(false)
      setHistoriaEditandoId(null)
      setStep(1)
      setExito(historiaEditandoId ? 'Historia actualizada correctamente' : 'Historia clínica guardada correctamente')
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

      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <button onClick={() => mostrarForm ? setMostrarConfirmHome(true) : router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px 6px', borderRadius: '8px', lineHeight: 1 }} title="Inicio">🏠</button>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href="/pacientes" style={{ color: '#9B7B65', textDecoration: 'none' }}>Pacientes</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href={`/pacientes/${id}`} style={{ color: '#9B7B65', textDecoration: 'none' }}>{paciente?.nombre}</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <span style={{ color: '#2C1810', fontWeight: '600' }}>Historia Clínica</span>
          </div>
          <button onClick={abrirNueva} style={{
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
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810' }}>{historiaEditandoId ? '✏️ Editar Historia Clínica' : 'Nueva Historia Clínica'}</h2>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
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
                {/* Campo Otros */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={lS}>Otros síntomas gastrointestinales</label>
                  <textarea style={{ ...taS, minHeight: '70px' }} placeholder="Describe otros síntomas no listados arriba..." value={form.sintomasGIOtros} onChange={e => set('sintomasGIOtros', e.target.value)} />
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
            {step === 2 && (() => {
              // Helper: leer/escribir el array de detalle de texturas
              let detalle: { textura: string; acepta: string; rechaza: string }[] = []
              try { detalle = JSON.parse(form.texturaDetalle || '[]') } catch { detalle = [] }
              const setTextura = (textura: string, campo: 'acepta' | 'rechaza', valor: string) => {
                const copia = [...detalle]
                const idx = copia.findIndex(t => t.textura === textura)
                if (idx >= 0) { copia[idx] = { ...copia[idx], [campo]: valor } }
                else { copia.push({ textura, acepta: campo === 'acepta' ? valor : '', rechaza: campo === 'rechaza' ? valor : '' }) }
                set('texturaDetalle', JSON.stringify(copia))
              }
              const getTextura = (textura: string, campo: 'acepta' | 'rechaza') =>
                detalle.find(t => t.textura === textura)?.[campo] || ''

              const TEXTURAS = [
                { id: 'crujiente',   label: 'Crujiente',        emoji: '🥨', desc: 'galletas, tostadas, papas' },
                { id: 'suave',       label: 'Suave / Cremosa',  emoji: '🥛', desc: 'purés, yogurt, cremas' },
                { id: 'blanda',      label: 'Blanda / Pastosa', emoji: '🍌', desc: 'plátano, aguacate, tortilla suave' },
                { id: 'fibrosa',     label: 'Fibrosa',          emoji: '🥦', desc: 'verduras cocidas, carnes' },
                { id: 'grumosa',     label: 'Grumosa',          emoji: '🫘', desc: 'frijoles enteros, lentejas' },
                { id: 'pegajosa',    label: 'Pegajosa',         emoji: '🍯', desc: 'arroz, gelatina, miel' },
                { id: 'liquida',     label: 'Líquida',          emoji: '🥤', desc: 'sopas, caldos, jugos' },
                { id: 'mixta',       label: 'Mixta',            emoji: '🍲', desc: 'guisos, estofados con trozos' },
              ]
              return (
              <div>
                {secTitle('Conducta Alimentaria')}

                {/* Descripción general */}
                <div style={{ marginBottom: '22px' }}>
                  <label style={lS}>Descripción general de la conducta alimentaria</label>
                  <textarea style={taS} placeholder="Selectividad, neofobia, rituales, resistencia a nuevos alimentos..." value={form.conductaAlimentaria} onChange={e => set('conductaAlimentaria', e.target.value)} />
                </div>

                {/* ── Texturas por tipo ── */}
                <div style={{ marginBottom: '22px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase' as const, letterSpacing: '0.8px', marginBottom: '14px' }}>
                    Preferencias por tipo de textura
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {TEXTURAS.map(t => (
                      <div key={t.id} style={{ background: '#FAF7F2', borderRadius: '12px', border: '1px solid #E8DDD0', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '18px' }}>{t.emoji}</span>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: '700', color: '#2C1810' }}>{t.label}</p>
                            <p style={{ fontSize: '11px', color: '#9B7B65' }}>ej. {t.desc}</p>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ ...lS, color: '#2D6A4F', marginBottom: '4px', display: 'block' }}>✓ Alimentos que acepta</label>
                            <textarea
                              style={{ ...taS, minHeight: '58px', border: '1.5px solid #95D5A8', background: 'white' }}
                              placeholder="¿Qué alimentos de esta textura tolera?"
                              value={getTextura(t.id, 'acepta')}
                              onChange={e => setTextura(t.id, 'acepta', e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={{ ...lS, color: '#9B2335', marginBottom: '4px', display: 'block' }}>✗ Alimentos que rechaza</label>
                            <textarea
                              style={{ ...taS, minHeight: '58px', border: '1.5px solid #F5C2C7', background: 'white' }}
                              placeholder="¿Qué alimentos de esta textura evita?"
                              value={getTextura(t.id, 'rechaza')}
                              onChange={e => setTextura(t.id, 'rechaza', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Favoritos y rechazados generales ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                  <div>
                    <label style={{ ...lS, color: '#2D6A4F' }}>⭐ Alimentos favoritos generales</label>
                    <textarea style={{ ...taS, minHeight: '80px', border: '1.5px solid #95D5A8' }} placeholder="Lista de alimentos que más le gustan" value={form.alimentosFavoritos} onChange={e => set('alimentosFavoritos', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ ...lS, color: '#9B2335' }}>🚫 Alimentos más rechazados</label>
                    <textarea style={{ ...taS, minHeight: '80px', border: '1.5px solid #F5C2C7' }} placeholder="Lista de alimentos que definitivamente rechaza" value={form.alimentosRechazados} onChange={e => set('alimentosRechazados', e.target.value)} />
                  </div>
                </div>
              </div>
              )
            })()}

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
                {/* Horarios de comida — 5 time pickers */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={lS}>Horarios de comida en casa</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '4px' }}>
                    {[
                      { campo: 'horaDesayuno',  label: 'Desayuno'   },
                      { campo: 'horaColacion1', label: 'Colación 1' },
                      { campo: 'horaComida',    label: 'Comida'     },
                      { campo: 'horaColacion2', label: 'Colación 2' },
                      { campo: 'horaCena',      label: 'Cena'       },
                    ].map(({ campo, label }) => (
                      <div key={campo}>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase' as const, letterSpacing: '0.6px', marginBottom: '5px' }}>{label}</p>
                        <input
                          type="time"
                          value={(form as Record<string, string>)[campo] || ''}
                          onChange={e => set(campo, e.target.value)}
                          style={{ ...iS, colorScheme: 'light', padding: '9px 10px', textAlign: 'center' as const }}
                        />
                      </div>
                    ))}
                  </div>
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
                  {guardando ? 'Guardando...' : historiaEditandoId ? '✓ Actualizar Historia' : '✓ Guardar Historia'}
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
            <button onClick={abrirNueva} style={{ padding: '11px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>+ Nueva Historia</button>
          </div>
        ) : historias.length > 0 && (
          <div>
            <h2 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#8B6914', marginBottom: '16px' }}>
              Historias Registradas ({historias.length})
            </h2>
            {historias.map((h, i) => {
              const expandida = historiaExpandida === h.id
              return (
              <div key={h.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(44,24,16,0.05)' }}>
                {/* Cabecera */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810', fontWeight: '600' }}>
                      Historia #{historias.length - i}
                    </p>
                    <p style={{ fontSize: '13px', color: '#9B7B65', marginTop: '2px' }}>
                      {new Date(h.fechaConsulta + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  {/* Botones Editar / Ver completo */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => abrirEditar(h)} style={{
                      padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      background: '#FAF7F2', color: '#7B1B2A', border: '1.5px solid #E8DDD0', fontFamily: "'Lato', sans-serif",
                    }}>✏️ Editar</button>
                    <button onClick={() => setHistoriaExpandida(expandida ? null : h.id!)} style={{
                      padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      background: expandida ? '#7B1B2A' : '#FAF7F2',
                      color: expandida ? 'white' : '#2C1810',
                      border: '1.5px solid #E8DDD0', fontFamily: "'Lato', sans-serif",
                    }}>{expandida ? '▲ Cerrar' : '▼ Ver completo'}</button>
                  </div>
                </div>

                {/* Síntomas GI chips */}
                {(h.sintomasGI.length > 0 || h.sintomasGIOtros) && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {h.sintomasGI.map(s => (
                      <span key={s} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#F5E8EB', color: '#7B1B2A', fontWeight: '600' }}>{s}</span>
                    ))}
                    {h.sintomasGIOtros && (
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#FFF3E0', color: '#C4831A', fontWeight: '600' }}>Otros: {h.sintomasGIOtros}</span>
                    )}
                  </div>
                )}

                {/* Resumen siempre visible */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'Diagnósticos previos', valor: h.diagnosticosPrevios },
                    { label: 'Alergias', valor: h.alergias },
                    { label: 'Medicamentos', valor: h.medicamentosActuales },
                  ].filter(x => x.valor).map(item => (
                    <div key={item.label} style={{ background: '#FAF7F2', borderRadius: '10px', padding: '12px', border: '1px solid #E8DDD0' }}>
                      <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8B6914', marginBottom: '5px' }}>{item.label}</p>
                      <p style={{ fontSize: '13px', color: '#2C1810', lineHeight: '1.5' }}>{item.valor}</p>
                    </div>
                  ))}
                </div>

                {/* DETALLE COMPLETO (expansible) */}
                {expandida && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid #E8DDD0', paddingTop: '20px' }}>
                    {/* Antecedentes perinatales */}
                    {(h.semanasGestacion || h.pesoNacer || h.tipoNacimiento || h.antecedentesperinatales) && (
                      <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#7B1B2A', marginBottom: '10px' }}>Antecedentes Perinatales</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: h.antecedentesperinatales ? '10px' : 0 }}>
                          {h.semanasGestacion && <div style={{ background: '#FAF7F2', borderRadius: '10px', padding: '10px', border: '1px solid #E8DDD0' }}><p style={{ fontSize: '10px', color: '#8B6914', fontWeight: '700', marginBottom: '4px' }}>SEMANAS GESTACIÓN</p><p style={{ fontSize: '14px', color: '#2C1810' }}>{h.semanasGestacion}</p></div>}
                          {h.pesoNacer && <div style={{ background: '#FAF7F2', borderRadius: '10px', padding: '10px', border: '1px solid #E8DDD0' }}><p style={{ fontSize: '10px', color: '#8B6914', fontWeight: '700', marginBottom: '4px' }}>PESO AL NACER</p><p style={{ fontSize: '14px', color: '#2C1810' }}>{h.pesoNacer} kg</p></div>}
                          {h.tipoNacimiento && <div style={{ background: '#FAF7F2', borderRadius: '10px', padding: '10px', border: '1px solid #E8DDD0' }}><p style={{ fontSize: '10px', color: '#8B6914', fontWeight: '700', marginBottom: '4px' }}>TIPO NACIMIENTO</p><p style={{ fontSize: '14px', color: '#2C1810' }}>{h.tipoNacimiento}</p></div>}
                        </div>
                        {h.antecedentesperinatales && <div style={{ background: '#FAF7F2', borderRadius: '10px', padding: '12px', border: '1px solid #E8DDD0' }}><p style={{ fontSize: '10px', color: '#8B6914', fontWeight: '700', marginBottom: '4px' }}>NOTAS PERINATALES</p><p style={{ fontSize: '13px', color: '#2C1810', lineHeight: '1.6' }}>{h.antecedentesperinatales}</p></div>}
                      </div>
                    )}

                    {/* Intolerancias */}
                    {h.intolerancias && (
                      <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#7B1B2A', marginBottom: '10px' }}>Intolerancias</p>
                        <div style={{ background: '#FAF7F2', borderRadius: '10px', padding: '12px', border: '1px solid #E8DDD0' }}>
                          <p style={{ fontSize: '13px', color: '#2C1810', lineHeight: '1.6' }}>{h.intolerancias}</p>
                        </div>
                      </div>
                    )}

                    {/* Conducta alimentaria */}
                    {(h.conductaAlimentaria || h.texturasAceptadas || h.texturasRechazadas || h.alimentosFavoritos || h.alimentosRechazados) && (
                      <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#7B1B2A', marginBottom: '10px' }}>Conducta Alimentaria</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          {[
                            { label: 'Descripción general', valor: h.conductaAlimentaria },
                            { label: 'Texturas aceptadas', valor: h.texturasAceptadas },
                            { label: 'Texturas rechazadas', valor: h.texturasRechazadas },
                            { label: 'Alimentos favoritos', valor: h.alimentosFavoritos },
                            { label: 'Alimentos rechazados', valor: h.alimentosRechazados },
                          ].filter(x => x.valor).map(item => (
                            <div key={item.label} style={{ background: '#FAF7F2', borderRadius: '10px', padding: '12px', border: '1px solid #E8DDD0' }}>
                              <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#8B6914', marginBottom: '5px' }}>{item.label}</p>
                              <p style={{ fontSize: '13px', color: '#2C1810', lineHeight: '1.5' }}>{item.valor}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sueño y actividad */}
                    {(h.horasSueno || h.actividadFisica) && (
                      <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#7B1B2A', marginBottom: '10px' }}>Hábitos de Vida</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          {h.horasSueno && <div style={{ background: '#FAF7F2', borderRadius: '10px', padding: '12px', border: '1px solid #E8DDD0' }}><p style={{ fontSize: '10px', color: '#8B6914', fontWeight: '700', marginBottom: '4px' }}>HORAS DE SUEÑO</p><p style={{ fontSize: '13px', color: '#2C1810' }}>{h.horasSueno}</p></div>}
                          {h.actividadFisica && <div style={{ background: '#FAF7F2', borderRadius: '10px', padding: '12px', border: '1px solid #E8DDD0' }}><p style={{ fontSize: '10px', color: '#8B6914', fontWeight: '700', marginBottom: '4px' }}>ACTIVIDAD FÍSICA</p><p style={{ fontSize: '13px', color: '#2C1810' }}>{h.actividadFisica}</p></div>}
                        </div>
                      </div>
                    )}

                    {/* Contexto familiar */}
                    {(h.personasHogar || h.quienCocina || h.presupuestoAlimentario || h.horariasComida || h.habitosFamiliares) && (
                      <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#7B1B2A', marginBottom: '10px' }}>Contexto Familiar</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          {[
                            { label: 'Personas en el hogar', valor: h.personasHogar },
                            { label: '¿Quién cocina?', valor: h.quienCocina },
                            { label: 'Presupuesto alimentario', valor: h.presupuestoAlimentario },
                            { label: 'Horarios de comida', valor: h.horariasComida },
                            { label: 'Hábitos familiares', valor: h.habitosFamiliares },
                          ].filter(x => x.valor).map(item => (
                            <div key={item.label} style={{ background: '#FAF7F2', borderRadius: '10px', padding: '12px', border: '1px solid #E8DDD0' }}>
                              <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#8B6914', marginBottom: '5px' }}>{item.label}</p>
                              <p style={{ fontSize: '13px', color: '#2C1810', lineHeight: '1.5' }}>{item.valor}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notas adicionales */}
                    {h.notasAdicionales && (
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#7B1B2A', marginBottom: '10px' }}>Notas Adicionales</p>
                        <div style={{ background: '#FAF7F2', borderRadius: '10px', padding: '14px', border: '1px solid #E8DDD0' }}>
                          <p style={{ fontSize: '13px', color: '#2C1810', lineHeight: '1.6' }}>{h.notasAdicionales}</p>
                        </div>
                      </div>
                    )}

                    {/* Botón cerrar */}
                    <button onClick={() => setHistoriaExpandida(null)} style={{ width: '100%', marginTop: '16px', padding: '10px', borderRadius: '10px', border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>▲ Cerrar detalle</button>
                  </div>
                )}
              </div>
            )
            })}
          </div>
        )}

        {/* ── Navegación entre secciones ── */}
        {!mostrarForm && (
          <PasoNavegacion pacienteId={id} pasoActual="historia" />
        )}
      </main>
    </div>
  )
}