'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Paciente } from '@/lib/pacientes'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

export default function PortalPage() {
  const router = useRouter()
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [usuarioEmail, setUsuarioEmail] = useState('')
  const [tab, setTab] = useState<'plan' | 'mediciones'>('plan')

  const [planActual, setPlanActual] = useState('')
  const [fechaPlan, setFechaPlan] = useState('')
  const [mediciones, setMediciones] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/'); return }
      if (ADMINS.includes(user.email ?? '')) { router.replace('/dashboard'); return }
      setUsuarioEmail(user.email || '')
      try {
        const q1 = query(collection(db, 'pacientes'), where('correoAcceso', '==', user.email))
        const q2 = query(collection(db, 'pacientes'), where('correo', '==', user.email))
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)])
        const snap = !snap1.empty ? snap1 : snap2
        if (!snap.empty) {
          const p = { id: snap.docs[0].id, ...snap.docs[0].data() } as Paciente
          setPaciente(p)
          await Promise.all([cargarPlan(p.id!), cargarMediciones(p.id!)])
        }
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router])

  const cargarPlan = async (pid: string) => {
    const q = query(collection(db, `pacientes/${pid}/planes`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const d = snap.docs[0].data()
      setPlanActual(d.texto || '')
      try { setFechaPlan(d.fechaCreacion?.toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) || '') } catch { setFechaPlan('') }
    }
  }

  const cargarMediciones = async (pid: string) => {
    const q = query(collection(db, `pacientes/${pid}/antropometria`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    setMediciones(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const cerrarSesion = async () => { await signOut(auth); router.push('/') }

  const formatFecha = (ts: unknown) => {
    if (!ts) return '—'
    try { return (ts as { toDate: () => Date }).toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '—' }
  }

  // Extrae una sección del texto del plan (búsqueda flexible, insensible a mayúsculas/tildes)
  const extraerSeccion = (texto: string, desde: string, hasta?: string) => {
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const textoN = normalize(texto)
    const desdeN = normalize(desde)
    const ini = textoN.indexOf(desdeN)
    if (ini === -1) return ''
    const start = ini + desde.length
    if (!hasta) return texto.slice(start).trim()
    const hastaN = normalize(hasta)
    const fin = textoN.indexOf(hastaN, start)
    return fin === -1 ? texto.slice(start).trim() : texto.slice(start, fin).trim()
  }

  // Detecta y agrupa líneas de tabla markdown
  const renderizarTexto = (texto: string) => {
    const lineas = texto.split('\n')
    const resultado: React.ReactNode[] = []
    let i = 0
    while (i < lineas.length) {
      const l = lineas[i].trim()
      // Detectar inicio de tabla markdown
      if (l.startsWith('|') && l.endsWith('|')) {
        const filas: string[][] = []
        while (i < lineas.length) {
          const fila = lineas[i].trim()
          if (!fila.startsWith('|')) break
          // Saltar la línea separadora |---|---|
          if (/^\|[\s\-|]+\|$/.test(fila)) { i++; continue }
          const celdas = fila.split('|').slice(1, -1).map(c => c.trim())
          filas.push(celdas)
          i++
        }
        if (filas.length > 0) {
          resultado.push(
            <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '16px 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#7B1B2A' }}>
                    {filas[0].map((c, ci) => (
                      <th key={ci} style={{ padding: '10px 14px', color: 'white', fontWeight: '700', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}
                        dangerouslySetInnerHTML={{ __html: c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.slice(1).map((fila, fi) => (
                    <tr key={fi} style={{ background: fi % 2 === 0 ? '#FAF7F2' : 'white', borderBottom: '1px solid #E8DDD0' }}>
                      {fila.map((c, ci) => (
                        <td key={ci} style={{ padding: '9px 14px', color: '#2C1810', borderRight: '1px solid #E8DDD0', lineHeight: '1.5' }}
                          dangerouslySetInnerHTML={{ __html: c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        continue
      }
      if (!l) { resultado.push(<div key={i} style={{ height: '10px' }} />); i++; continue }
      if (l.startsWith('---')) { resultado.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #E8DDD0', margin: '18px 0' }} />); i++; continue }
      if (l.startsWith('## ') || l.startsWith('# ')) {
        resultado.push(<h2 key={i} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: '700', color: '#7B1B2A', margin: '24px 0 10px', paddingBottom: '8px', borderBottom: '2px solid #F0E4E7' }}>{l.replace(/^#{1,2} /, '')}</h2>); i++; continue
      }
      if (l.startsWith('### ')) {
        resultado.push(<h3 key={i} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '15px', fontWeight: '700', color: '#5C1521', margin: '20px 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l.replace('### ', '')}</h3>); i++; continue
      }
      if (l.startsWith('**') && l.endsWith('**') && !l.slice(2, -2).includes('**')) {
        resultado.push(<p key={i} style={{ fontSize: '14px', fontWeight: '700', color: '#2C1810', margin: '14px 0 6px' }}>{l.replace(/\*\*/g, '')}</p>); i++; continue
      }
      if (l.startsWith('- ') || l.startsWith('* ')) {
        const txt = l.replace(/^[-*] /, '')
        const partes = txt.split(/\*\*(.*?)\*\*/g)
        resultado.push(
          <div key={i} style={{ display: 'flex', gap: '10px', margin: '5px 0', paddingLeft: '4px' }}>
            <span style={{ color: '#A63244', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>•</span>
            <p style={{ fontSize: '15px', color: '#3D2010', lineHeight: '1.65', margin: 0 }}>
              {partes.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
            </p>
          </div>
        ); i++; continue
      }
      if (/^\d+\. /.test(l)) {
        const num = l.match(/^(\d+)\. /)?.[1]
        const cont = l.replace(/^\d+\. /, '')
        resultado.push(
          <div key={i} style={{ display: 'flex', gap: '10px', margin: '5px 0', paddingLeft: '4px' }}>
            <span style={{ color: '#A63244', fontWeight: '700', flexShrink: 0, minWidth: '18px' }}>{num}.</span>
            <p style={{ fontSize: '15px', color: '#3D2010', lineHeight: '1.65', margin: 0 }}>{cont}</p>
          </div>
        ); i++; continue
      }
      if (l.includes('**')) {
        const partes = l.split(/\*\*(.*?)\*\*/g)
        resultado.push(<p key={i} style={{ fontSize: '15px', color: '#3D2010', lineHeight: '1.65', margin: '4px 0' }}>{partes.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>); i++; continue
      }
      resultado.push(<p key={i} style={{ fontSize: '15px', color: '#3D2010', lineHeight: '1.65', margin: '4px 0' }}>{l}</p>)
      i++
    }
    return resultado
  }

  if (cargando) return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )

  const ultimaMed = mediciones[0] as Record<string, unknown> | undefined

  // Encabezados posibles para la lista del súper (el AI puede variar el nombre)
  const LISTA_HEADERS = ['### LISTA DEL SÚPER', '### Lista del Súper', '## LISTA DEL SÚPER',
    '### LISTA DE SUPER', '### Lista de Super', 'LISTA DEL SÚPER', 'Lista del Súper']
  const PLAN_HEADERS = ['## PLAN NUTRICIONAL', '# PLAN NUTRICIONAL', 'PLAN NUTRICIONAL']

  // Busca la primera sección que exista
  const encontrarSeccion = (texto: string, posibles: string[]) =>
    posibles.find(h => extraerSeccion(texto, h) !== '') || ''

  const listaHeader = planActual ? encontrarSeccion(planActual, LISTA_HEADERS) : ''
  const planHeader  = planActual ? encontrarSeccion(planActual, PLAN_HEADERS)  : ''

  const planSeccion = planActual
    ? (listaHeader
        ? extraerSeccion(planActual, planHeader || '', listaHeader) || extraerSeccion(planActual, planHeader || '') || planActual
        : planHeader
          ? extraerSeccion(planActual, planHeader) || planActual
          : planActual)
    : ''
  const listaSuper = planActual && listaHeader ? extraerSeccion(planActual, listaHeader) : ''

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>

      {/* ── HEADER PORTAL ─────────────────────────────────────── */}
      <header style={{
        background: 'white', borderBottom: '1px solid #E8DDD0',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 8px rgba(44,24,16,0.06)',
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: '700', color: 'white',
              fontFamily: "'Playfair Display', serif",
              boxShadow: '0 3px 10px rgba(123,27,42,0.28)',
            }}>KL</div>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: '600', fontSize: '15px', color: '#2C1810', lineHeight: 1.2 }}>Clínica Karina Lara</p>
              <p style={{ fontSize: '10px', color: '#C4A35A', fontWeight: '600', letterSpacing: '0.5px' }}>PORTAL PARA PADRES</p>
            </div>
          </div>
          <button
            onClick={cerrarSesion}
            className="btn-ghost"
            style={{ fontSize: '13px' }}
          >
            Salir
          </button>
        </div>
      </header>

      {!paciente ? (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '20px' }}>🔍</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#2C1810', marginBottom: '10px' }}>Sin expediente asociado</h2>
          <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '6px' }}>{usuarioEmail}</p>
          <p style={{ color: '#C4A35A', fontSize: '14px' }}>Contacta a la Lic. Karina Lara para obtener acceso.</p>
        </div>
      ) : (
        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px 64px' }}>

          {/* ── TARJETA PERFIL ───────────────────────────────── */}
          <div className="card fade-in" style={{
            padding: '0', marginBottom: '20px', overflow: 'hidden',
          }}>
            {/* Banner decorativo */}
            <div style={{
              height: '6px',
              background: 'linear-gradient(90deg, #7B1B2A 0%, #A63244 40%, #C4A35A 100%)',
            }} />
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: ultimaMed ? '20px' : 0 }}>
                <div className="avatar" style={{ width: '56px', height: '56px', fontSize: '22px', borderRadius: '14px' }}>
                  {paciente.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '600', color: '#2C1810', marginBottom: '4px', textTransform: 'capitalize' }}>
                    {paciente.nombre}
                  </h1>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#9B7B65' }}>{paciente.edad} años</span>
                    <span className="badge badge-muted" style={{ textTransform: 'capitalize', fontSize: '11px' }}>{paciente.sexo}</span>
                  </div>
                </div>
                <span className="badge badge-success">✓ Activo</span>
              </div>

              {/* Stats mediciones */}
              {ultimaMed && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { label: 'Peso actual', valor: `${ultimaMed.peso} kg`, color: '#7B1B2A' },
                    { label: 'Talla',       valor: `${ultimaMed.talla} cm`, color: '#2D6A4F' },
                    { label: 'IMC',         valor: String(ultimaMed.imc),   color: '#8B6914' },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: '#FAF7F2', borderRadius: '12px', padding: '14px',
                      textAlign: 'center', border: '1px solid #E8DDD0',
                    }}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: '600', color: s.color, marginBottom: '3px' }}>{s.valor}</p>
                      <p style={{ fontSize: '10px', color: '#9B7B65', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── TABS ─────────────────────────────────────────── */}
          <div className="tab-bar fade-in">
            {[
              { key: 'plan',      label: '🥗 Plan Nutricional' },
              { key: 'mediciones', label: '📏 Mediciones' },
            ].map(t => (
              <button
                key={t.key}
                className={`tab-item${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key as 'plan' | 'mediciones')}
              >{t.label}</button>
            ))}
          </div>

          {/* ── TAB PLAN ─────────────────────────────────────── */}
          {tab === 'plan' && (
            <div className="fade-in">
              {planActual ? (
                <>
                  {/* Plan */}
                  <div className="card" style={{ overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
                      padding: '20px 26px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '3px' }}>Plan de Alimentación</h2>
                        {fechaPlan && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Generado: {fechaPlan}</p>}
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                        ✓ Vigente
                      </span>
                    </div>
                    <div style={{ padding: '26px 28px' }}>
                      {renderizarTexto(planSeccion)}
                    </div>
                  </div>

                  {/* Lista del súper */}
                  {listaSuper && (
                    <div className="card" style={{ overflow: 'hidden' }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #2D6A4F, #40916C)',
                        padding: '20px 26px',
                      }}>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '3px' }}>🛒 Lista del Súper</h2>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Ingredientes para el plan de esta semana</p>
                      </div>
                      <div style={{ padding: '26px 28px' }}>
                        {renderizarTexto(listaSuper)}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="card" style={{ padding: '60px 24px', textAlign: 'center', border: '2px dashed #E8DDD0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥗</div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810', marginBottom: '8px' }}>Sin plan generado aún</p>
                  <p style={{ color: '#9B7B65', fontSize: '14px' }}>La nutrióloga generará tu plan en la próxima consulta</p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB MEDICIONES ───────────────────────────────── */}
          {tab === 'mediciones' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {mediciones.length === 0 ? (
                <div className="card" style={{ padding: '60px 24px', textAlign: 'center', border: '2px dashed #E8DDD0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📏</div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810' }}>Sin mediciones registradas</p>
                </div>
              ) : (mediciones as Record<string, unknown>[]).map((m, i) => (
                <div
                  key={String(m.id)}
                  className="card"
                  style={{
                    overflow: 'hidden',
                    borderColor: i === 0 ? 'rgba(123,27,42,0.25)' : '#E8DDD0',
                    borderWidth: i === 0 ? '1.5px' : '1px',
                  }}
                >
                  <div style={{
                    padding: '14px 22px',
                    background: i === 0 ? '#F5E8EB' : '#FFFAF7',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid #E8DDD0',
                  }}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: '600', color: '#2C1810' }}>
                      {formatFecha(m.fechaCreacion || m.fecha)}
                    </p>
                    {i === 0 && <span className="badge badge-vino">Más reciente</span>}
                  </div>
                  <div style={{ padding: '18px 22px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: (m.interpretacionPeso || m.interpretacionTalla) ? '14px' : 0 }}>
                      {[
                        { l: 'Peso',   v: `${m.peso} kg` },
                        { l: 'Talla',  v: `${m.talla} cm` },
                        { l: 'IMC',    v: String(m.imc) },
                        { l: 'P. Peso', v: `P${m.percentilPeso}` },
                        { l: 'P. Talla', v: `P${m.percentilTalla}` },
                      ].map(d => (
                        <div key={d.l} style={{
                          background: '#FAF7F2', borderRadius: '10px', padding: '10px 6px',
                          textAlign: 'center', border: '1px solid #E8DDD0',
                        }}>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: '600', color: '#7B1B2A', marginBottom: '3px' }}>{String(d.v)}</p>
                          <p style={{ fontSize: '10px', color: '#9B7B65', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{d.l}</p>
                        </div>
                      ))}
                    </div>
                    {(!!m.interpretacionPeso || !!m.interpretacionTalla) && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {!!m.interpretacionPeso && <span className="badge badge-vino">Peso: {String(m.interpretacionPeso)}</span>}
                        {!!m.interpretacionTalla && <span className="badge badge-success">Talla: {String(m.interpretacionTalla)}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Footer ───────────────────────────────────────── */}
          <div style={{
            marginTop: '36px', padding: '16px 20px', borderRadius: '12px',
            background: '#FDF6E3', border: '1px solid #E8DDD0',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '13px', color: '#8B6914', fontWeight: '600' }}>🌟 Clínica Karina Lara · Nutrición Clínica Especializada</p>
            <p style={{ fontSize: '12px', color: '#9B7B65', marginTop: '3px' }}>Para dudas, comunícate directamente con la nutrióloga</p>
          </div>

        </main>
      )}
    </div>
  )
}
