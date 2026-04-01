'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPacientes, Paciente } from '@/lib/pacientes'
import { Cita, crearCita, obtenerCitas, actualizarCita, eliminarCita } from '@/lib/citas'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

const TIPOS = ['Primera consulta', 'Seguimiento', 'Revisión de plan', 'Urgencia', 'Otro']

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ── Helpers ──────────────────────────────────────────────────────────────────
function fechaHoy() {
  return new Date().toISOString().slice(0, 10)
}
function formatFechaCorta(fecha: string) {
  if (!fecha) return '—'
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}
function esPasada(cita: Cita) {
  const hoy = fechaHoy()
  return cita.fecha < hoy || (cita.fecha === hoy && cita.estado === 'completada')
}

// Color y label por estado
function estadoInfo(estado: string) {
  switch (estado) {
    case 'completada': return { bg: '#D8F3DC', color: '#2D6A4F', label: 'Completada' }
    case 'cancelada':  return { bg: '#F9E5E7', color: '#9B2335', label: 'Cancelada' }
    default:           return { bg: '#FEF3C7', color: '#92400E', label: 'Pendiente' }
  }
}
function tipoColor(tipo: string) {
  const m: Record<string, string> = {
    'Primera consulta': '#7B1B2A',
    'Seguimiento':      '#2D6A4F',
    'Revisión de plan': '#1B4F8C',
    'Urgencia':         '#9B2335',
    'Otro':             '#8B6914',
  }
  return m[tipo] || '#6B4F3A'
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CitasPage() {
  const router = useRouter()
  const [usuario, setUsuario]       = useState('')
  const [cargando, setCargando]     = useState(true)
  const [citas, setCitas]           = useState<Cita[]>([])
  const [pacientes, setPacientes]   = useState<Paciente[]>([])

  // Vista
  const [vista, setVista]           = useState<'mes' | 'lista'>('mes')
  const [hoy] = useState(new Date())
  const [mesActual, setMesActual]   = useState(hoy.getMonth())
  const [anioActual, setAnioActual] = useState(hoy.getFullYear())

  // Modal nueva cita
  const [showModal, setShowModal]   = useState(false)
  const [editando, setEditando]     = useState<Cita | null>(null)
  const [guardando, setGuardando]   = useState(false)
  const [errorForm, setErrorForm]   = useState('')
  const [fechaPreselec, setFechaPreselec] = useState('')

  const emptyForm = (): Omit<Cita, 'id' | 'fechaCreacion'> => ({
    pacienteId: '', pacienteNombre: '', tutorNombre: '',
    fecha: fechaHoy(), hora: '09:00',
    tipo: 'Seguimiento', notas: '', estado: 'pendiente',
  })
  const [form, setForm] = useState(emptyForm())

  const cargar = useCallback(async () => {
    try {
      const [cs, ps] = await Promise.all([obtenerCitas(), obtenerPacientes()])
      setCitas(cs)
      setPacientes(ps)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      setUsuario(user.displayName || user.email || '')
      await cargar()
      setCargando(false)
    })
    return () => unsub()
  }, [router, cargar])

  const abrirNueva = (fecha?: string) => {
    const f = emptyForm()
    if (fecha) f.fecha = fecha
    setForm(f)
    setEditando(null)
    setErrorForm('')
    setShowModal(true)
  }

  const abrirEditar = (cita: Cita) => {
    setForm({ ...cita })
    setEditando(cita)
    setErrorForm('')
    setShowModal(true)
  }

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const onPacienteChange = (id: string) => {
    const p = pacientes.find(p => p.id === id)
    setForm(f => ({ ...f, pacienteId: id, pacienteNombre: p?.nombre || '', tutorNombre: p?.tutor || '' }))
  }

  const guardar = async () => {
    if (!form.pacienteId) { setErrorForm('Selecciona un paciente'); return }
    if (!form.fecha)      { setErrorForm('Indica la fecha'); return }
    if (!form.hora)       { setErrorForm('Indica la hora'); return }
    setGuardando(true)
    try {
      if (editando?.id) {
        await actualizarCita(editando.id, form)
      } else {
        await crearCita(form)
      }
      await cargar()
      setShowModal(false)
    } catch { setErrorForm('Error al guardar. Intenta de nuevo.') }
    finally { setGuardando(false) }
  }

  const cambiarEstado = async (cita: Cita, estado: Cita['estado']) => {
    if (!cita.id) return
    await actualizarCita(cita.id, { estado })
    await cargar()
  }

  const borrar = async (id: string) => {
    if (!confirm('¿Eliminar esta cita?')) return
    await eliminarCita(id)
    await cargar()
  }

  if (cargando) return (
    <div className="loading-screen">
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ── Construir días del mes para el calendario ────────────────────────────
  const diasEnMes   = getDaysInMonth(anioActual, mesActual)
  const primerDia   = getFirstDayOfMonth(anioActual, mesActual)
  const celdas: (number | null)[] = [
    ...Array(primerDia).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]
  // Completar hasta múltiplo de 7
  while (celdas.length % 7 !== 0) celdas.push(null)

  const citasDelMes = citas.filter(c => {
    const [y, m] = c.fecha.split('-').map(Number)
    return y === anioActual && m - 1 === mesActual
  })

  const citasPorDia = (dia: number) => {
    const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return citas.filter(c => c.fecha === fechaStr)
  }

  const proximas = citas.filter(c => c.fecha >= fechaHoy() && c.estado !== 'cancelada')
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
    .slice(0, 15)

  const hoyStr = fechaHoy()

  return (
    <div className="app-layout">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .cita-pill { cursor: pointer; transition: filter 0.15s; }
        .cita-pill:hover { filter: brightness(0.92); }
        .cal-day { transition: background 0.12s; cursor: pointer; }
        .cal-day:hover { background: #F5E8EB !important; }
        .btn-vista { transition: background 0.12s, color 0.12s; }
      `}</style>
      <Sidebar usuario={usuario} />

      <main className="app-main">

        {/* ── Header ── */}
        <div className="page-header fade-in">
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#C4A35A', marginBottom: '6px' }}>Agenda</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '600', color: '#2C1810', lineHeight: 1.2 }}>Citas</h1>
            <p style={{ color: '#9B7B65', fontSize: '14px', marginTop: '4px' }}>
              {citas.filter(c => c.fecha >= hoyStr && c.estado === 'pendiente').length} citas próximas pendientes
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Toggle vista */}
            <div style={{ display: 'flex', background: '#F2EDE4', borderRadius: '10px', padding: '3px', gap: '2px' }}>
              {(['mes', 'lista'] as const).map(v => (
                <button key={v} onClick={() => setVista(v)} className="btn-vista" style={{
                  padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                  border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                  background: vista === v ? 'white' : 'transparent',
                  color: vista === v ? '#7B1B2A' : '#9B7B65',
                  boxShadow: vista === v ? '0 1px 4px rgba(44,24,16,0.1)' : 'none',
                }}>
                  {v === 'mes' ? 'Mes' : 'Lista'}
                </button>
              ))}
            </div>
            <button
              onClick={() => abrirNueva()}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif", boxShadow: '0 3px 10px rgba(123,27,42,0.25)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nueva Cita
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            VISTA MES (Calendario)
        ════════════════════════════════════════════════════════════════════ */}
        {vista === 'mes' && (
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8DDD0', padding: '24px', marginBottom: '28px', boxShadow: '0 2px 12px rgba(44,24,16,0.05)' }}>
            {/* Navegación de mes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <button onClick={() => {
                if (mesActual === 0) { setMesActual(11); setAnioActual(a => a - 1) }
                else setMesActual(m => m - 1)
              }} style={{ background: 'none', border: '1.5px solid #E8DDD0', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#6B4F3A', fontSize: '16px' }}>‹</button>

              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '600', color: '#2C1810' }}>
                {MESES[mesActual]} {anioActual}
              </h2>

              <button onClick={() => {
                if (mesActual === 11) { setMesActual(0); setAnioActual(a => a + 1) }
                else setMesActual(m => m + 1)
              }} style={{ background: 'none', border: '1.5px solid #E8DDD0', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#6B4F3A', fontSize: '16px' }}>›</button>
            </div>

            {/* Encabezados días */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
              {DIAS_SEMANA.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#9B7B65', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 0' }}>{d}</div>
              ))}
            </div>

            {/* Celdas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {celdas.map((dia, i) => {
                if (!dia) return <div key={`empty-${i}`} />
                const fechaStr = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
                const citasDia = citasPorDia(dia)
                const esHoy    = fechaStr === hoyStr

                return (
                  <div
                    key={dia}
                    className="cal-day"
                    onClick={() => abrirNueva(fechaStr)}
                    style={{
                      minHeight: '80px', borderRadius: '10px', padding: '8px',
                      background: esHoy ? '#F5E8EB' : '#FAFAFA',
                      border: esHoy ? '2px solid #C4A35A' : '1px solid #F0E8E0',
                    }}
                  >
                    <p style={{ fontSize: '13px', fontWeight: esHoy ? '800' : '600', color: esHoy ? '#7B1B2A' : '#2C1810', marginBottom: '4px' }}>{dia}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {citasDia.slice(0, 3).map(c => (
                        <div
                          key={c.id}
                          className="cita-pill"
                          onClick={e => { e.stopPropagation(); abrirEditar(c) }}
                          style={{
                            fontSize: '10px', fontWeight: '600',
                            padding: '2px 6px', borderRadius: '4px',
                            background: tipoColor(c.tipo) + '22',
                            color: tipoColor(c.tipo),
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            textDecoration: c.estado === 'cancelada' ? 'line-through' : 'none',
                            opacity: c.estado === 'cancelada' ? 0.6 : 1,
                          }}
                          title={`${c.hora} · ${c.pacienteNombre}`}
                        >
                          {c.hora} {c.pacienteNombre.split(' ')[0]}
                        </div>
                      ))}
                      {citasDia.length > 3 && (
                        <span style={{ fontSize: '10px', color: '#9B7B65', paddingLeft: '4px' }}>+{citasDia.length - 3} más</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            VISTA LISTA
        ════════════════════════════════════════════════════════════════════ */}
        {vista === 'lista' && (
          <div>
            {proximas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9B7B65' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C9B8A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#6B4F3A' }}>Sin citas próximas</p>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>Crea una nueva cita con el botón arriba</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {proximas.map((cita, i) => {
                  const est = estadoInfo(cita.estado)
                  const esHoyC = cita.fecha === hoyStr
                  return (
                    <div
                      key={cita.id}
                      style={{
                        background: 'white', borderRadius: '14px', border: '1px solid #E8DDD0',
                        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
                        boxShadow: '0 2px 8px rgba(44,24,16,0.04)',
                        animation: `fadeUp 0.2s ease ${i * 30}ms both`,
                        borderLeft: `4px solid ${tipoColor(cita.tipo)}`,
                      }}
                    >
                      {/* Fecha */}
                      <div style={{ textAlign: 'center', minWidth: '52px' }}>
                        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '700', color: esHoyC ? '#7B1B2A' : '#2C1810', lineHeight: 1 }}>{cita.fecha.slice(8)}</p>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: '#9B7B65', textTransform: 'uppercase' }}>{MESES[Number(cita.fecha.slice(5, 7)) - 1].slice(0, 3)}</p>
                        {esHoyC && <span style={{ fontSize: '10px', background: '#F5E8EB', color: '#7B1B2A', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>HOY</span>}
                      </div>

                      {/* Divider */}
                      <div style={{ width: '1px', height: '48px', background: '#E8DDD0' }} />

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '600', color: '#2C1810' }}>{cita.pacienteNombre}</p>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: tipoColor(cita.tipo) + '18', color: tipoColor(cita.tipo), fontWeight: '700' }}>{cita.tipo}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#6B4F3A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {cita.hora}
                          </span>
                          {cita.tutorNombre && (
                            <span style={{ fontSize: '13px', color: '#9B7B65' }}>Tutor: {cita.tutorNombre}</span>
                          )}
                          {cita.notas && (
                            <span style={{ fontSize: '12px', color: '#9B7B65', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{cita.notas}</span>
                          )}
                        </div>
                      </div>

                      {/* Estado */}
                      <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '10px', background: est.bg, color: est.color, fontWeight: '700', flexShrink: 0 }}>{est.label}</span>

                      {/* Acciones */}
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {cita.estado === 'pendiente' && (
                          <button
                            onClick={() => cambiarEstado(cita, 'completada')}
                            title="Marcar completada"
                            style={{ background: '#D8F3DC', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#2D6A4F' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                        )}
                        <button
                          onClick={() => abrirEditar(cita)}
                          title="Editar"
                          style={{ background: '#F2EDE4', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#6B4F3A' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          onClick={() => cita.id && borrar(cita.id)}
                          title="Eliminar"
                          style={{ background: '#F9E5E7', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#9B2335' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL NUEVA / EDITAR CITA
      ════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 12px 48px rgba(44,24,16,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810' }}>
                {editando ? 'Editar Cita' : 'Nueva Cita'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B7B65', padding: '4px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {errorForm && (
              <div style={{ background: '#F9E5E7', border: '1px solid #F5C2C7', borderRadius: '10px', padding: '10px 14px', color: '#9B2335', fontSize: '13px', marginBottom: '16px' }}>
                {errorForm}
              </div>
            )}

            {/* Paciente */}
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Paciente *</label>
            <select
              value={form.pacienteId}
              onChange={e => onPacienteChange(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E8DDD0', fontSize: '14px', color: '#2C1810', background: 'white', marginBottom: '16px', fontFamily: "'Lato', sans-serif", outline: 'none' }}
            >
              <option value="">Seleccionar paciente…</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.tutor})</option>
              ))}
            </select>

            {/* Fecha y hora */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Fecha *</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={e => set('fecha', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E8DDD0', fontSize: '14px', color: '#2C1810', fontFamily: "'Lato', sans-serif", outline: 'none', colorScheme: 'light', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Hora *</label>
                <input
                  type="time"
                  value={form.hora}
                  onChange={e => set('hora', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E8DDD0', fontSize: '14px', color: '#2C1810', fontFamily: "'Lato', sans-serif", outline: 'none', colorScheme: 'light', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Tipo */}
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Tipo de consulta</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {TIPOS.map(t => (
                <button
                  key={t}
                  onClick={() => set('tipo', t)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                    border: form.tipo === t ? `2px solid ${tipoColor(t)}` : '1.5px solid #E8DDD0',
                    background: form.tipo === t ? tipoColor(t) + '18' : 'white',
                    color: form.tipo === t ? tipoColor(t) : '#6B4F3A',
                    cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                  }}
                >{t}</button>
              ))}
            </div>

            {/* Estado (solo en edición) */}
            {editando && (
              <>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Estado</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {(['pendiente', 'completada', 'cancelada'] as const).map(e => {
                    const ei = estadoInfo(e)
                    return (
                      <button key={e} onClick={() => set('estado', e)} style={{
                        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                        border: form.estado === e ? `2px solid ${ei.color}` : '1.5px solid #E8DDD0',
                        background: form.estado === e ? ei.bg : 'white',
                        color: form.estado === e ? ei.color : '#6B4F3A',
                        cursor: 'pointer', fontFamily: "'Lato', sans-serif',",
                      }}>{ei.label}</button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Notas */}
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Notas (opcional)</label>
            <textarea
              value={form.notas || ''}
              onChange={e => set('notas', e.target.value)}
              rows={3}
              placeholder="Motivo, recordatorios, indicaciones…"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E8DDD0', fontSize: '14px', color: '#2C1810', fontFamily: "'Lato', sans-serif", outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '24px' }}
            />

            {/* Botones */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: guardando ? '#E8DDD0' : 'linear-gradient(135deg, #7B1B2A, #A63244)', color: guardando ? '#9B7B65' : 'white', fontSize: '14px', fontWeight: '700', cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: "'Lato', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {guardando ? <><div style={{ width: '14px', height: '14px', border: '2px solid #9B7B65', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Guardando…</> : (editando ? 'Guardar cambios' : 'Crear cita')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
