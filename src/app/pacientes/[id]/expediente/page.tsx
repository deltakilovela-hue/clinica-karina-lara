'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPaciente, Paciente } from '@/lib/pacientes'
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

// ─── Escala Bristol resumida ─────────────────────────────────────────────────
const BRISTOL_EMOJI: Record<number, string> = { 1: '🪨', 2: '🌰', 3: '🌭', 4: '🍌', 5: '🫘', 6: '💧', 7: '🌊' }
const TOLERANCIA_COLOR: Record<string, string> = { excelente: '#2E7D32', buena: '#558B2F', regular: '#F57F17', mala: '#E65100', muy_mala: '#B71C1C' }
const TOLERANCIA_LABEL: Record<string, string> = { excelente: '😊 Excelente', buena: '🙂 Buena', regular: '😐 Regular', mala: '😟 Mala', muy_mala: '😣 Muy mala' }

type Tab = 'resumen' | 'historia' | 'antropometria' | 'planes' | 'seguimiento'

export default function ExpedientePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [tab, setTab] = useState<Tab>('resumen')

  // Datos de cada módulo
  const [historia, setHistoria] = useState<Record<string, unknown> | null>(null)
  const [mediciones, setMediciones] = useState<Record<string, unknown>[]>([])
  const [planes, setPlanes] = useState<Record<string, unknown>[]>([])
  const [seguimientos, setSeguimientos] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      try {
        const p = await obtenerPaciente(id)
        setPaciente(p)
        await Promise.all([cargarHistoria(), cargarMediciones(), cargarPlanes(), cargarSeguimientos()])
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router, id])

  const cargarHistoria = async () => {
    const q = query(collection(db, `pacientes/${id}/historiasClinicas`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    if (snap.docs.length > 0) setHistoria(snap.docs[0].data() as Record<string, unknown>)
  }
  const cargarMediciones = async () => {
    const q = query(collection(db, `pacientes/${id}/antropometria`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    setMediciones(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }
  const cargarPlanes = async () => {
    const q = query(collection(db, `pacientes/${id}/planes`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    setPlanes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }
  const cargarSeguimientos = async () => {
    const q = query(collection(db, `pacientes/${id}/seguimientos`), orderBy('fecha', 'desc'))
    const snap = await getDocs(q)
    setSeguimientos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const formatFecha = (ts: unknown) => {
    if (!ts) return '—'
    try { return (ts as Timestamp).toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return '—' }
  }

  const ultimaMedicion = mediciones[0] as Record<string, unknown> | undefined
  const ultimoSeguimiento = seguimientos[0] as Record<string, unknown> | undefined
  const ultimoPlan = planes[0] as Record<string, unknown> | undefined

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'resumen', label: '📊 Resumen' },
    { key: 'historia', label: '📋 Historia Clínica' },
    { key: 'antropometria', label: `📏 Antropometría (${mediciones.length})` },
    { key: 'planes', label: `🧠 Planes IA (${planes.length})` },
    { key: 'seguimiento', label: `🫃 Seguimiento (${seguimientos.length})` },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── HEADER ── */}
      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Link href="/dashboard" style={{ color: '#9B7B65', textDecoration: 'none' }}>Dashboard</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href="/pacientes" style={{ color: '#9B7B65', textDecoration: 'none' }}>Pacientes</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href={`/pacientes/${id}`} style={{ color: '#9B7B65', textDecoration: 'none' }}>{paciente?.nombre}</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <span style={{ color: '#2C1810', fontWeight: '600' }}>Expediente</span>
          </div>
          <Link href={`/pacientes/${id}`} style={{ fontSize: '13px', color: '#7B1B2A', textDecoration: 'none', fontWeight: '600' }}>
            ← Volver al paciente
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Perfil del paciente */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8DDD0', padding: '28px', marginBottom: '24px', boxShadow: '0 2px 12px rgba(44,24,16,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '22px', fontWeight: '700', fontFamily: "'Playfair Display', serif" }}>
              {paciente?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>
                {paciente?.nombre}
              </h1>
              <p style={{ fontSize: '13px', color: '#9B7B65' }}>
                {paciente?.edad} años · {paciente?.sexo} · Tutor: {paciente?.tutor}
              </p>
            </div>
          </div>

          {/* Stats rápidos */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[
              { label: 'Mediciones', valor: mediciones.length, icono: '📏' },
              { label: 'Planes IA', valor: planes.length, icono: '🧠' },
              { label: 'Seguimientos', valor: seguimientos.length, icono: '📊' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', background: '#FAF7F2', borderRadius: '12px', padding: '12px 20px', border: '1px solid #E8DDD0' }}>
                <p style={{ fontSize: '20px', marginBottom: '2px' }}>{s.icono}</p>
                <p style={{ fontSize: '22px', fontWeight: '700', color: '#7B1B2A', fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{s.valor}</p>
                <p style={{ fontSize: '11px', color: '#9B7B65', marginTop: '2px' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'white', borderRadius: '12px', padding: '4px', border: '1px solid #E8DDD0', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 16px', borderRadius: '9px', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', fontFamily: "'Lato', sans-serif", border: 'none', whiteSpace: 'nowrap',
              background: tab === t.key ? '#7B1B2A' : 'transparent',
              color: tab === t.key ? 'white' : '#6B4F3A',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── TAB RESUMEN ── */}
        {tab === 'resumen' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', animation: 'fadeIn 0.3s ease' }}>

            {/* Última medición */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: '#2C1810' }}>📏 Última Medición</h3>
                <Link href={`/pacientes/${id}/antropometria`} style={{ fontSize: '12px', color: '#7B1B2A', textDecoration: 'none', fontWeight: '600' }}>Ver todas →</Link>
              </div>
              {ultimaMedicion ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {[
                    { label: 'Peso', valor: `${ultimaMedicion.peso} kg` },
                    { label: 'Talla', valor: `${ultimaMedicion.talla} cm` },
                    { label: 'IMC', valor: `${ultimaMedicion.imc}` },
                    { label: 'P/Edad', valor: `P${ultimaMedicion.percentilPeso}` },
                    { label: 'T/Edad', valor: `P${ultimaMedicion.percentilTalla}` },
                    { label: 'Fecha', valor: formatFecha(ultimaMedicion.fechaCreacion || ultimaMedicion.fecha) },
                  ].map(d => (
                    <div key={d.label} style={{ background: '#FAF7F2', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', color: '#9B7B65', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>{d.label}</p>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#2C1810' }}>{String(d.valor)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#9B7B65', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Sin mediciones registradas</p>
              )}
            </div>

            {/* Último seguimiento */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: '#2C1810' }}>🫃 Último Seguimiento</h3>
                <Link href={`/pacientes/${id}/seguimiento`} style={{ fontSize: '12px', color: '#7B1B2A', textDecoration: 'none', fontWeight: '600' }}>Ver todos →</Link>
              </div>
              {ultimoSeguimiento ? (
                <div>
                  <p style={{ fontSize: '12px', color: '#9B7B65', marginBottom: '12px' }}>{formatFecha(ultimoSeguimiento.fecha)}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ background: '#FAF7F2', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: '24px' }}>{BRISTOL_EMOJI[ultimoSeguimiento.bristolTipo as number] || '—'}</p>
                      <p style={{ fontSize: '11px', color: '#9B7B65', marginTop: '4px' }}>Bristol Tipo {String(ultimoSeguimiento.bristolTipo)}</p>
                    </div>
                    <div style={{ background: '#FAF7F2', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      {ultimoSeguimiento.toleranciaAlimentaria ? (
                        <>
                          <p style={{ fontSize: '15px', fontWeight: '700', color: TOLERANCIA_COLOR[ultimoSeguimiento.toleranciaAlimentaria as string] || '#2C1810' }}>
                            {TOLERANCIA_LABEL[ultimoSeguimiento.toleranciaAlimentaria as string] || String(ultimoSeguimiento.toleranciaAlimentaria)}
                          </p>
                          <p style={{ fontSize: '11px', color: '#9B7B65', marginTop: '4px' }}>Tolerancia</p>
                        </>
                      ) : <p style={{ fontSize: '13px', color: '#9B7B65' }}>—</p>}
                    </div>
                  </div>
                  {(ultimoSeguimiento.sintomasActivos as string[])?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(ultimoSeguimiento.sintomasActivos as string[]).slice(0, 3).map((s: string) => (
                        <span key={s} style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', background: '#FDECEA', color: '#9B2335' }}>{s}</span>
                      ))}
                      {(ultimoSeguimiento.sintomasActivos as string[]).length > 3 && (
                        <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', background: '#F2EDE4', color: '#6B4F3A' }}>+{(ultimoSeguimiento.sintomasActivos as string[]).length - 3} más</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: '#9B7B65', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Sin seguimientos registrados</p>
              )}
            </div>

            {/* Motivo de consulta */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: '#2C1810', marginBottom: '14px' }}>🩺 Motivo de Consulta</h3>
              <p style={{ fontSize: '14px', color: '#2C1810', lineHeight: '1.7', background: '#FAF7F2', borderRadius: '10px', padding: '14px', borderLeft: '3px solid #7B1B2A' }}>
                {paciente?.motivoConsulta || 'No registrado'}
              </p>
              {paciente?.telefono && (
                <div style={{ marginTop: '14px', display: 'flex', gap: '16px' }}>
                  <p style={{ fontSize: '13px', color: '#9B7B65' }}>📞 {paciente.telefono}</p>
                  {paciente.correo && <p style={{ fontSize: '13px', color: '#9B7B65' }}>✉️ {paciente.correo}</p>}
                </div>
              )}
            </div>

            {/* Último plan */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: '#2C1810' }}>🧠 Último Plan IA</h3>
                <Link href={`/pacientes/${id}/plan`} style={{ fontSize: '12px', color: '#7B1B2A', textDecoration: 'none', fontWeight: '600' }}>Ver plan →</Link>
              </div>
              {ultimoPlan ? (
                <div>
                  <p style={{ fontSize: '12px', color: '#9B7B65', marginBottom: '10px' }}>
                    Generado el {formatFecha(ultimoPlan.fechaCreacion)}
                  </p>
                  <p style={{ fontSize: '13px', color: '#2C1810', lineHeight: '1.6', background: '#FAF7F2', borderRadius: '10px', padding: '12px', maxHeight: '100px', overflow: 'hidden' }}>
                    {String(ultimoPlan.texto || '').slice(0, 200)}...
                  </p>
                  <p style={{ fontSize: '11px', color: '#9B7B65', marginTop: '8px' }}>
                    {planes.length} plan{planes.length !== 1 ? 'es' : ''} generado{planes.length !== 1 ? 's' : ''} en total
                  </p>
                </div>
              ) : (
                <p style={{ color: '#9B7B65', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Sin planes generados</p>
              )}
            </div>

          </div>
        )}

        {/* ── TAB HISTORIA CLÍNICA ── */}
        {tab === 'historia' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <Link href={`/pacientes/${id}/historia`} style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', textDecoration: 'none' }}>
                ✏️ Editar Historia
              </Link>
            </div>
            {historia ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {[
                  { titulo: '🤒 Diagnósticos Previos', campo: 'diagnosticosPrevios' },
                  { titulo: '⚠️ Alergias', campo: 'alergias' },
                  { titulo: '🚫 Intolerancias', campo: 'intolerancias' },
                  { titulo: '✅ Alimentos Favoritos', campo: 'alimentosFavoritos' },
                  { titulo: '❌ Alimentos Rechazados', campo: 'alimentosRechazados' },
                  { titulo: '🤲 Texturas Aceptadas', campo: 'texturasAceptadas' },
                  { titulo: '🙅 Texturas Rechazadas', campo: 'texturasRechazadas' },
                  { titulo: '💰 Presupuesto Familiar', campo: 'presupuestoAlimentario' },
                  { titulo: '🧠 Conducta Alimentaria', campo: 'conductaAlimentaria' },
                ].map(item => (
                  <div key={item.campo} style={{ background: 'white', borderRadius: '14px', border: '1px solid #E8DDD0', padding: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{item.titulo}</p>
                    <p style={{ fontSize: '14px', color: historia[item.campo] ? '#2C1810' : '#C9B8A8', lineHeight: '1.6' }}>
                      {String(historia[item.campo] || 'No registrado')}
                    </p>
                  </div>
                ))}
                {/* Síntomas GI */}
                <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E8DDD0', padding: '20px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>🫃 Síntomas GI</p>
                  {Array.isArray(historia.sintomasGI) && (historia.sintomasGI as string[]).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(historia.sintomasGI as string[]).map((s: string) => (
                        <span key={s} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', background: '#FDECEA', color: '#9B2335', border: '1px solid #F5C2C7' }}>{s}</span>
                      ))}
                    </div>
                  ) : <p style={{ fontSize: '14px', color: '#C9B8A8' }}>Ninguno registrado</p>}
                </div>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #E8DDD0', padding: '60px', textAlign: 'center' }}>
                <p style={{ fontSize: '40px', marginBottom: '12px' }}>📋</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810', marginBottom: '8px' }}>Sin historia clínica</p>
                <Link href={`/pacientes/${id}/historia`} style={{ display: 'inline-block', marginTop: '8px', padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                  Registrar Historia Clínica
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── TAB ANTROPOMETRÍA ── */}
        {tab === 'antropometria' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <Link href={`/pacientes/${id}/antropometria`} style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', textDecoration: 'none' }}>
                ➕ Nueva Medición
              </Link>
            </div>
            {mediciones.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #E8DDD0', padding: '60px', textAlign: 'center' }}>
                <p style={{ fontSize: '40px', marginBottom: '12px' }}>📏</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810' }}>Sin mediciones registradas</p>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 80px 80px 70px 120px 120px', gap: '12px', padding: '12px 24px', background: '#FAF7F2', borderBottom: '1px solid #E8DDD0' }}>
                  {['Fecha', 'Peso', 'Talla', 'IMC', 'P. Peso', 'P. Talla'].map(h => (
                    <p key={h} style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9B7B65' }}>{h}</p>
                  ))}
                </div>
                {(mediciones as Record<string, unknown>[]).map((m, i) => (
                  <div key={String(m.id)} style={{ display: 'grid', gridTemplateColumns: '110px 80px 80px 70px 120px 120px', gap: '12px', padding: '14px 24px', alignItems: 'center', borderBottom: i < mediciones.length - 1 ? '1px solid #F2EDE4' : 'none', background: i === 0 ? '#FFFDF9' : 'white' }}>
                    <p style={{ fontSize: '13px', color: '#2C1810', fontWeight: i === 0 ? '600' : '400' }}>{formatFecha(m.fechaCreacion || m.fecha)}</p>
                    <p style={{ fontSize: '13px', color: '#2C1810' }}>{String(m.peso)} kg</p>
                    <p style={{ fontSize: '13px', color: '#2C1810' }}>{String(m.talla)} cm</p>
                    <p style={{ fontSize: '13px', color: '#2C1810' }}>{String(m.imc)}</p>
                    <p style={{ fontSize: '13px', color: '#7B1B2A', fontWeight: '600' }}>P{String(m.percentilPeso)}</p>
                    <p style={{ fontSize: '13px', color: '#7B1B2A', fontWeight: '600' }}>P{String(m.percentilTalla)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB PLANES IA ── */}
        {tab === 'planes' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <Link href={`/pacientes/${id}/plan`} style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', textDecoration: 'none' }}>
                🧠 Ir a Planes
              </Link>
            </div>
            {planes.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #E8DDD0', padding: '60px', textAlign: 'center' }}>
                <p style={{ fontSize: '40px', marginBottom: '12px' }}>🧠</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810' }}>Sin planes generados</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(planes as Record<string, unknown>[]).map((p, i) => (
                  <div key={String(p.id)} style={{ background: 'white', borderRadius: '14px', border: i === 0 ? '1.5px solid #7B1B2A' : '1px solid #E8DDD0', padding: '20px', boxShadow: '0 2px 8px rgba(44,24,16,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {i === 0 && <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: '#D8F3DC', color: '#2D6A4F' }}>Más reciente</span>}
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#2C1810' }}>
                          Plan {planes.length - i} — {formatFecha(p.fechaCreacion)}
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#6B4F3A', lineHeight: '1.6', maxHeight: '80px', overflow: 'hidden' }}>
                      {String(p.texto || '').slice(0, 250)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB SEGUIMIENTO ── */}
        {tab === 'seguimiento' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <Link href={`/pacientes/${id}/seguimiento`} style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', textDecoration: 'none' }}>
                ➕ Nuevo Seguimiento
              </Link>
            </div>
            {seguimientos.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #E8DDD0', padding: '60px', textAlign: 'center' }}>
                <p style={{ fontSize: '40px', marginBottom: '12px' }}>📊</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810' }}>Sin seguimientos registrados</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(seguimientos as Record<string, unknown>[]).map((s, i) => {
                  const toleranciaColor = TOLERANCIA_COLOR[s.toleranciaAlimentaria as string] || '#9B7B65'
                  const toleranciaLabel = TOLERANCIA_LABEL[s.toleranciaAlimentaria as string] || String(s.toleranciaAlimentaria)
                  return (
                    <div key={String(s.id)} style={{ background: 'white', borderRadius: '14px', border: '1px solid #E8DDD0', padding: '20px', boxShadow: '0 2px 8px rgba(44,24,16,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '14px', fontWeight: '600', color: '#2C1810' }}>
                          {formatFecha(s.fecha)}
{!!s.pesoActual && <span style={{ fontSize: '12px', color: '#9B7B65', fontWeight: '400', marginLeft: '10px' }}>• {String(s.pesoActual)} kg</span>}                        </p>
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: `${toleranciaColor}18`, color: toleranciaColor, border: `1px solid ${toleranciaColor}40` }}>
                          {toleranciaLabel}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '22px' }}>{BRISTOL_EMOJI[s.bristolTipo as number] || '—'}</span>
                        <span style={{ fontSize: '13px', color: '#6B4F3A' }}>Bristol {String(s.bristolTipo)} · {String(s.evacuacionesDia)} evacuación/día</span>
                        {(s.sintomasActivos as string[])?.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {(s.sintomasActivos as string[]).map((sin: string) => (
                              <span key={sin} style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', background: '#FDECEA', color: '#9B2335' }}>{sin}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {!!s.notasEvolucion && (
                        <p style={{ fontSize: '13px', color: '#6B4F3A', marginTop: '10px', fontStyle: 'italic', borderLeft: '3px solid #E8DDD0', paddingLeft: '10px' }}>
                          "{String(s.notasEvolucion)}"
                        </p>
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