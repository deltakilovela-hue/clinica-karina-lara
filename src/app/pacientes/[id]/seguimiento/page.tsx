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

// ─── Escala de Bristol ───────────────────────────────────────────────────────
const BRISTOL = [
  { tipo: 1, emoji: '🪨', descripcion: 'Bolitas duras separadas', color: '#8B4513', label: 'Tipo 1 — Estreñimiento severo' },
  { tipo: 2, emoji: '🌰', descripcion: 'Forma de salchicha con grumos', color: '#A0522D', label: 'Tipo 2 — Estreñimiento leve' },
  { tipo: 3, emoji: '🌭', descripcion: 'Salchicha con grietas', color: '#CD853F', label: 'Tipo 3 — Normal' },
  { tipo: 4, emoji: '🍌', descripcion: 'Suave y lisa (ideal)', color: '#DAA520', label: 'Tipo 4 — Normal (ideal)' },
  { tipo: 5, emoji: '🫘', descripcion: 'Trozos blandos con bordes', color: '#D2691E', label: 'Tipo 5 — Tránsito rápido' },
  { tipo: 6, emoji: '💧', descripcion: 'Blanda con bordes irregulares', color: '#B8860B', label: 'Tipo 6 — Diarrea leve' },
  { tipo: 7, emoji: '🌊', descripcion: 'Líquida, sin sólidos', color: '#8B6914', label: 'Tipo 7 — Diarrea severa' },
]

const SINTOMAS_GI = [
  'Gases / flatulencias', 'Distensión abdominal', 'Dolor abdominal',
  'Náuseas', 'Vómitos', 'Reflujo', 'Estreñimiento', 'Diarrea',
  'Sangre en heces', 'Moco en heces', 'Regurgitación',
]

const TOLERANCIA = [
  { valor: 'excelente', label: '😊 Excelente', color: '#2E7D32' },
  { valor: 'buena', label: '🙂 Buena', color: '#558B2F' },
  { valor: 'regular', label: '😐 Regular', color: '#F57F17' },
  { valor: 'mala', label: '😟 Mala', color: '#E65100' },
  { valor: 'muy_mala', label: '😣 Muy mala', color: '#B71C1C' },
]

const CONDUCTA = [
  { valor: 'sin_cambios', label: '➡️ Sin cambios' },
  { valor: 'mejoria', label: '📈 Mejoría' },
  { valor: 'retroceso', label: '📉 Retroceso' },
  { valor: 'nueva_aceptacion', label: '✅ Nueva aceptación' },
  { valor: 'nuevo_rechazo', label: '❌ Nuevo rechazo' },
]

interface Seguimiento {
  id?: string
  fecha: Timestamp
  bristolTipo: number
  evacuacionesDia: number
  sintomasActivos: string[]
  toleranciaAlimentaria: string
  conductaAlimentaria: string
  pesoActual: string
  notasEvolucion: string
  alimento_nuevo?: string
  alimento_rechazado?: string
}

export default function SeguimientoPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [vista, setVista] = useState<'nuevo' | 'historial'>('nuevo')
  const [historial, setHistorial] = useState<Seguimiento[]>([])
  const [exito, setExito] = useState(false)

  // ── Formulario ──────────────────────────────────────────────────────────────
  const [bristolTipo, setBristolTipo] = useState<number>(0)
  const [evacuacionesDia, setEvacuacionesDia] = useState(1)
  const [sintomasActivos, setSintomasActivos] = useState<string[]>([])
  const [toleranciaAlimentaria, setToleranciaAlimentaria] = useState('')
  const [conductaAlimentaria, setConductaAlimentaria] = useState('')
  const [pesoActual, setPesoActual] = useState('')
  const [notasEvolucion, setNotasEvolucion] = useState('')
  const [alimentoNuevo, setAlimentoNuevo] = useState('')
  const [alimentoRechazado, setAlimentoRechazado] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      try {
        const p = await obtenerPaciente(id)
        setPaciente(p)
        await cargarHistorial()
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router, id])

  const cargarHistorial = async () => {
    const q = query(collection(db, `pacientes/${id}/seguimientos`), orderBy('fecha', 'desc'))
    const snap = await getDocs(q)
    setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() } as Seguimiento)))
  }

  const toggleSintoma = (s: string) => {
    setSintomasActivos(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  const guardarSeguimiento = async () => {
    if (!bristolTipo || !toleranciaAlimentaria || !conductaAlimentaria) return
    setGuardando(true)
    try {
      await addDoc(collection(db, `pacientes/${id}/seguimientos`), {
        fecha: Timestamp.now(),
        bristolTipo,
        evacuacionesDia,
        sintomasActivos,
        toleranciaAlimentaria,
        conductaAlimentaria,
        pesoActual,
        notasEvolucion,
        alimento_nuevo: alimentoNuevo,
        alimento_rechazado: alimentoRechazado,
      })
      await cargarHistorial()
      // Reset form
      setBristolTipo(0); setEvacuacionesDia(1); setSintomasActivos([])
      setToleranciaAlimentaria(''); setConductaAlimentaria('')
      setPesoActual(''); setNotasEvolucion('')
      setAlimentoNuevo(''); setAlimentoRechazado('')
      setExito(true)
      setTimeout(() => { setExito(false); setVista('historial') }, 1500)
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  const bristolSeleccionado = BRISTOL.find(b => b.tipo === bristolTipo)

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── HEADER ── */}
      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Link href="/dashboard" style={{ color: '#9B7B65', textDecoration: 'none' }}>Dashboard</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href={`/pacientes/${id}`} style={{ color: '#9B7B65', textDecoration: 'none' }}>{paciente?.nombre}</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <span style={{ color: '#2C1810', fontWeight: '600' }}>Seguimiento Digestivo</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Título */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>
            Seguimiento Digestivo
          </h1>
          <p style={{ color: '#9B7B65', fontSize: '14px' }}>
            {paciente?.nombre} · {historial.length} registro{historial.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'white', borderRadius: '12px', padding: '4px', border: '1px solid #E8DDD0', width: 'fit-content' }}>
          {[
            { key: 'nuevo', label: '➕ Nuevo registro' },
            { key: 'historial', label: `📋 Historial (${historial.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setVista(t.key as 'nuevo' | 'historial')} style={{
              padding: '8px 20px', borderRadius: '9px', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', fontFamily: "'Lato', sans-serif", border: 'none',
              background: vista === t.key ? '#7B1B2A' : 'transparent',
              color: vista === t.key ? 'white' : '#6B4F3A',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── FORMULARIO NUEVO REGISTRO ── */}
        {vista === 'nuevo' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>

            {/* Éxito */}
            {exito && (
              <div style={{ padding: '14px 20px', borderRadius: '12px', marginBottom: '20px', background: '#E8F5E9', border: '1px solid #A5D6A7', color: '#2E7D32', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>
                ✅ Seguimiento guardado correctamente
              </div>
            )}

            {/* Card: Escala de Bristol */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '28px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(44,24,16,0.05)' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', color: '#2C1810', marginBottom: '6px' }}>
                🚽 Escala de Bristol
              </h3>
              <p style={{ fontSize: '13px', color: '#9B7B65', marginBottom: '20px' }}>Selecciona el tipo de evacuación observada</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '20px' }}>
                {BRISTOL.map(b => (
                  <button key={b.tipo} onClick={() => setBristolTipo(b.tipo)} style={{
                    padding: '12px 6px', borderRadius: '12px', border: bristolTipo === b.tipo ? `2px solid ${b.color}` : '2px solid #E8DDD0',
                    background: bristolTipo === b.tipo ? `${b.color}18` : 'white',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{b.emoji}</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: b.color }}>Tipo {b.tipo}</div>
                  </button>
                ))}
              </div>

              {bristolSeleccionado && (
                <div style={{ padding: '12px 16px', borderRadius: '10px', background: `${bristolSeleccionado.color}12`, border: `1px solid ${bristolSeleccionado.color}40` }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: bristolSeleccionado.color }}>{bristolSeleccionado.label}</span>
                  <span style={{ fontSize: '13px', color: '#6B4F3A' }}> — {bristolSeleccionado.descripcion}</span>
                </div>
              )}

              {/* Evacuaciones por día */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C1810', display: 'block', marginBottom: '10px' }}>
                  Evacuaciones por día
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[0, 1, 2, 3, 4, 5, 6].map(n => (
                    <button key={n} onClick={() => setEvacuacionesDia(n)} style={{
                      width: '40px', height: '40px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                      border: evacuacionesDia === n ? '2px solid #7B1B2A' : '2px solid #E8DDD0',
                      background: evacuacionesDia === n ? '#7B1B2A' : 'white',
                      color: evacuacionesDia === n ? 'white' : '#6B4F3A',
                      cursor: 'pointer',
                    }}>{n === 0 ? '0' : n === 6 ? '5+' : n}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card: Síntomas GI */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '28px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(44,24,16,0.05)' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', color: '#2C1810', marginBottom: '6px' }}>
                🫃 Síntomas Digestivos Activos
              </h3>
              <p style={{ fontSize: '13px', color: '#9B7B65', marginBottom: '16px' }}>Selecciona todos los que apliquen (deja vacío si no hay síntomas)</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {SINTOMAS_GI.map(s => (
                  <button key={s} onClick={() => toggleSintoma(s)} style={{
                    padding: '7px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                    fontFamily: "'Lato', sans-serif",
                    background: sintomasActivos.includes(s) ? '#7B1B2A' : 'white',
                    color: sintomasActivos.includes(s) ? 'white' : '#6B4F3A',
                    border: sintomasActivos.includes(s) ? '1.5px solid #7B1B2A' : '1.5px solid #E8DDD0',
                  }}>{s}</button>
                ))}
              </div>
              {sintomasActivos.length === 0 && (
                <p style={{ fontSize: '12px', color: '#9B7B65', marginTop: '12px', fontStyle: 'italic' }}>
                  ✅ Sin síntomas seleccionados
                </p>
              )}
            </div>

            {/* Card: Tolerancia y Conducta */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '28px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(44,24,16,0.05)' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', color: '#2C1810', marginBottom: '20px' }}>
                🍽️ Tolerancia y Conducta Alimentaria
              </h3>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C1810', display: 'block', marginBottom: '10px' }}>
                  Tolerancia alimentaria esta semana
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {TOLERANCIA.map(t => (
                    <button key={t.valor} onClick={() => setToleranciaAlimentaria(t.valor)} style={{
                      padding: '8px 16px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer',
                      fontFamily: "'Lato', sans-serif", fontWeight: '600',
                      background: toleranciaAlimentaria === t.valor ? t.color : 'white',
                      color: toleranciaAlimentaria === t.valor ? 'white' : '#6B4F3A',
                      border: toleranciaAlimentaria === t.valor ? `2px solid ${t.color}` : '2px solid #E8DDD0',
                    }}>{t.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C1810', display: 'block', marginBottom: '10px' }}>
                  Conducta alimentaria
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {CONDUCTA.map(c => (
                    <button key={c.valor} onClick={() => setConductaAlimentaria(c.valor)} style={{
                      padding: '8px 16px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer',
                      fontFamily: "'Lato', sans-serif", fontWeight: '600',
                      background: conductaAlimentaria === c.valor ? '#7B1B2A' : 'white',
                      color: conductaAlimentaria === c.valor ? 'white' : '#6B4F3A',
                      border: conductaAlimentaria === c.valor ? '2px solid #7B1B2A' : '2px solid #E8DDD0',
                    }}>{c.label}</button>
                  ))}
                </div>
              </div>

              {/* Alimento nuevo / rechazado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C1810', display: 'block', marginBottom: '6px' }}>
                    ✅ Nuevo alimento aceptado
                  </label>
                  <input
                    value={alimentoNuevo}
                    onChange={e => setAlimentoNuevo(e.target.value)}
                    placeholder="Ej: zanahoria rallada..."
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', border: '1.5px solid #E8DDD0', background: '#FAF7F2', color: '#2C1810', outline: 'none', fontFamily: "'Lato', sans-serif", boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C1810', display: 'block', marginBottom: '6px' }}>
                    ❌ Alimento rechazado / nuevo rechazo
                  </label>
                  <input
                    value={alimentoRechazado}
                    onChange={e => setAlimentoRechazado(e.target.value)}
                    placeholder="Ej: brócoli..."
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', border: '1.5px solid #E8DDD0', background: '#FAF7F2', color: '#2C1810', outline: 'none', fontFamily: "'Lato', sans-serif", boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* Card: Peso y Notas */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '28px', marginBottom: '24px', boxShadow: '0 2px 12px rgba(44,24,16,0.05)' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', color: '#2C1810', marginBottom: '20px' }}>
                📝 Notas de Evolución
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C1810', display: 'block', marginBottom: '6px' }}>
                  Peso actual (kg) — opcional
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pesoActual}
                  onChange={e => setPesoActual(e.target.value)}
                  placeholder="Ej: 18.5"
                  style={{ width: '160px', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', border: '1.5px solid #E8DDD0', background: '#FAF7F2', color: '#2C1810', outline: 'none', fontFamily: "'Lato', sans-serif" }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#2C1810', display: 'block', marginBottom: '6px' }}>
                  Notas clínicas de evolución
                </label>
                <textarea
                  value={notasEvolucion}
                  onChange={e => setNotasEvolucion(e.target.value)}
                  placeholder="Observaciones generales, cambios relevantes, respuesta al tratamiento..."
                  rows={4}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', fontSize: '13px', border: '1.5px solid #E8DDD0', background: '#FAF7F2', color: '#2C1810', outline: 'none', fontFamily: "'Lato', sans-serif", resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Botón guardar */}
            <button
              onClick={guardarSeguimiento}
              disabled={guardando || !bristolTipo || !toleranciaAlimentaria || !conductaAlimentaria}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '600',
                border: 'none', cursor: (!bristolTipo || !toleranciaAlimentaria || !conductaAlimentaria || guardando) ? 'not-allowed' : 'pointer',
                background: (!bristolTipo || !toleranciaAlimentaria || !conductaAlimentaria || guardando)
                  ? '#E8DDD0'
                  : 'linear-gradient(135deg, #7B1B2A, #A63244)',
                color: (!bristolTipo || !toleranciaAlimentaria || !conductaAlimentaria || guardando) ? '#9B7B65' : 'white',
                fontFamily: "'Lato', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {guardando
                ? <><div style={{ width: '16px', height: '16px', border: '2px solid #9B7B65', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Guardando...</>
                : '💾 Guardar Seguimiento'}
            </button>
            {(!bristolTipo || !toleranciaAlimentaria || !conductaAlimentaria) && (
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#9B7B65', marginTop: '8px' }}>
                * Completa: Escala Bristol, Tolerancia y Conducta alimentaria
              </p>
            )}
          </div>
        )}

        {/* ── HISTORIAL ── */}
        {vista === 'historial' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {historial.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #E8DDD0', padding: '60px', textAlign: 'center' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>📋</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810', marginBottom: '8px' }}>Sin registros aún</p>
                <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '20px' }}>Comienza registrando el primer seguimiento digestivo</p>
                <button onClick={() => setVista('nuevo')} style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>
                  ➕ Nuevo registro
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {historial.map((s, i) => {
                  const bristol = BRISTOL.find(b => b.tipo === s.bristolTipo)
                  const tolerancia = TOLERANCIA.find(t => t.valor === s.toleranciaAlimentaria)
                  const conducta = CONDUCTA.find(c => c.valor === s.conductaAlimentaria)
                  return (
                    <div key={s.id || i} style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)', animation: 'fadeIn 0.3s ease' }}>

                      {/* Cabecera */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #E8DDD0' }}>
                        <div>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: '600', color: '#2C1810' }}>
                            {s.fecha?.toDate().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          {s.pesoActual && (
                            <p style={{ fontSize: '13px', color: '#9B7B65', marginTop: '2px' }}>Peso: {s.pesoActual} kg</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {tolerancia && (
                            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: `${tolerancia.color}18`, color: tolerancia.color, border: `1px solid ${tolerancia.color}40` }}>
                              {tolerancia.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Grid de datos */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: s.sintomasActivos?.length > 0 || s.notasEvolucion ? '16px' : '0' }}>
                        {/* Bristol */}
                        <div style={{ background: '#FAF7F2', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                          <p style={{ fontSize: '11px', color: '#9B7B65', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bristol</p>
                          <p style={{ fontSize: '28px', marginBottom: '4px' }}>{bristol?.emoji}</p>
                          <p style={{ fontSize: '12px', fontWeight: '700', color: bristol?.color }}>Tipo {s.bristolTipo}</p>
                        </div>

                        {/* Evacuaciones */}
                        <div style={{ background: '#FAF7F2', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                          <p style={{ fontSize: '11px', color: '#9B7B65', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evacuaciones/día</p>
                          <p style={{ fontSize: '32px', fontWeight: '700', color: '#2C1810' }}>{s.evacuacionesDia}</p>
                        </div>

                        {/* Conducta */}
                        <div style={{ background: '#FAF7F2', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                          <p style={{ fontSize: '11px', color: '#9B7B65', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conducta</p>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: '#2C1810', lineHeight: '1.3' }}>{conducta?.label || s.conductaAlimentaria}</p>
                        </div>
                      </div>

                      {/* Síntomas */}
                      {s.sintomasActivos?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', color: '#9B7B65', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Síntomas activos</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {s.sintomasActivos.map(sin => (
                              <span key={sin} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', background: '#FDECEA', color: '#9B2335', border: '1px solid #F5C2C7' }}>{sin}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Alimentos */}
                      {(s.alimento_nuevo || s.alimento_rechazado) && (
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                          {s.alimento_nuevo && (
                            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7' }}>✅ {s.alimento_nuevo}</span>
                          )}
                          {s.alimento_rechazado && (
                            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', background: '#FDECEA', color: '#9B2335', border: '1px solid #F5C2C7' }}>❌ {s.alimento_rechazado}</span>
                          )}
                        </div>
                      )}

                      {/* Notas */}
                      {s.notasEvolucion && (
                        <div style={{ background: '#FAF7F2', borderRadius: '10px', padding: '12px 14px', borderLeft: '3px solid #7B1B2A' }}>
                          <p style={{ fontSize: '13px', color: '#2C1810', lineHeight: '1.6', fontStyle: 'italic' }}>"{s.notasEvolucion}"</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}