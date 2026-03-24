'use client'

import { useEffect, useState } from 'react'
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

  // Extrae una sección del texto del plan
  const extraerSeccion = (texto: string, desde: string, hasta?: string) => {
    const ini = texto.indexOf(desde)
    if (ini === -1) return ''
    const start = ini + desde.length
    if (!hasta) return texto.slice(start).trim()
    const fin = texto.indexOf(hasta, start)
    return fin === -1 ? texto.slice(start).trim() : texto.slice(start, fin).trim()
  }

  // Renderiza el texto del plan en HTML legible
  const renderizarTexto = (texto: string) => {
    return texto.split('\n').map((linea, i) => {
      const l = linea.trim()
      if (!l) return <div key={i} style={{ height: '10px' }} />
      if (l.startsWith('---')) return <hr key={i} style={{ border: 'none', borderTop: '1px solid #E8DDD0', margin: '18px 0' }} />
      if (l.startsWith('## ') || l.startsWith('# ')) return (
        <h2 key={i} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: '700', color: '#7B1B2A', margin: '24px 0 10px', paddingBottom: '8px', borderBottom: '2px solid #F0E4E7' }}>
          {l.replace(/^#{1,2} /, '')}
        </h2>
      )
      if (l.startsWith('### ')) return (
        <h3 key={i} style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '15px', fontWeight: '700', color: '#5C1521', margin: '20px 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {l.replace('### ', '')}
        </h3>
      )
      if (l.startsWith('**') && l.endsWith('**') && !l.slice(2, -2).includes('**')) return (
        <p key={i} style={{ fontSize: '14px', fontWeight: '700', color: '#2C1810', margin: '14px 0 6px' }}>
          {l.replace(/\*\*/g, '')}
        </p>
      )
      if (l.startsWith('- ') || l.startsWith('* ')) {
        const texto = l.replace(/^[-*] /, '')
        const partes = texto.split(/\*\*(.*?)\*\*/g)
        return (
          <div key={i} style={{ display: 'flex', gap: '10px', margin: '5px 0', paddingLeft: '4px' }}>
            <span style={{ color: '#A63244', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>•</span>
            <p style={{ fontSize: '15px', color: '#3D2010', lineHeight: '1.65', margin: 0 }}>
              {partes.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
            </p>
          </div>
        )
      }
      // Líneas numeradas
      if (/^\d+\. /.test(l)) {
        const num = l.match(/^(\d+)\. (.*)/)?.[1]
        const cont = l.replace(/^\d+\. /, '')
        return (
          <div key={i} style={{ display: 'flex', gap: '10px', margin: '5px 0', paddingLeft: '4px' }}>
            <span style={{ color: '#A63244', fontWeight: '700', flexShrink: 0, minWidth: '18px' }}>{num}.</span>
            <p style={{ fontSize: '15px', color: '#3D2010', lineHeight: '1.65', margin: 0 }}>{cont}</p>
          </div>
        )
      }
      // Líneas con negrita inline
      if (l.includes('**')) {
        const partes = l.split(/\*\*(.*?)\*\*/g)
        return (
          <p key={i} style={{ fontSize: '15px', color: '#3D2010', lineHeight: '1.65', margin: '4px 0' }}>
            {partes.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
          </p>
        )
      }
      return <p key={i} style={{ fontSize: '15px', color: '#3D2010', lineHeight: '1.65', margin: '4px 0' }}>{l}</p>
    })
  }

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a0508 0%, #2d0f0a 50%, #1a0505 100%)' }}>
      <div style={{ width: '36px', height: '36px', border: '2px solid rgba(180,120,60,0.3)', borderTopColor: 'rgba(180,120,60,0.8)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const ultimaMed = mediciones[0] as Record<string, unknown> | undefined
  const planSeccion = planActual ? (extraerSeccion(planActual, '## PLAN NUTRICIONAL', '### LISTA DEL SÚPER') || extraerSeccion(planActual, '## PLAN NUTRICIONAL') || planActual) : ''
  const listaSuper = planActual ? extraerSeccion(planActual, '### LISTA DEL SÚPER') : ''

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #1a0508 0%, #2d0f0a 60%, #1a0505 100%)', fontFamily: "'Lato', sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        * { box-sizing: border-box; }
      `}</style>

      {/* HEADER */}
      <header style={{ borderBottom: '1px solid rgba(180,120,60,0.18)', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '62px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white', fontFamily: 'Georgia, serif' }}>KL</div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'white', fontFamily: 'Georgia, serif' }}>Clínica Karina Lara</p>
              <p style={{ fontSize: '11px', color: 'rgba(180,120,60,0.65)' }}>Portal para Padres</p>
            </div>
          </div>
          <button onClick={cerrarSesion} style={{ fontSize: '13px', padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(180,120,60,0.3)', background: 'transparent', color: 'rgba(180,120,60,0.85)', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>
            Salir
          </button>
        </div>
      </header>

      {!paciente ? (
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '70px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '16px', marginBottom: '8px' }}>No se encontró expediente asociado</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>{usuarioEmail}</p>
          <p style={{ color: 'rgba(180,120,60,0.65)', fontSize: '13px', marginTop: '16px' }}>Contacta a la Lic. Karina Lara para obtener acceso.</p>
        </div>
      ) : (
        <main style={{ maxWidth: '760px', margin: '0 auto', padding: '24px 20px 60px' }}>

          {/* PERFIL */}
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '22px', marginBottom: '18px', animation: 'fadeIn 0.35s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: 'white', fontFamily: 'Georgia, serif', flexShrink: 0 }}>
                {paciente.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontSize: '19px', fontWeight: '600', color: 'white', fontFamily: 'Georgia, serif', marginBottom: '3px', textTransform: 'capitalize' }}>{paciente.nombre}</h1>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{paciente.edad} años · {paciente.sexo}</p>
              </div>
            </div>

            {/* Stats */}
            {ultimaMed && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { label: 'Peso actual', valor: `${ultimaMed.peso} kg` },
                  { label: 'Talla', valor: `${ultimaMed.talla} cm` },
                  { label: 'IMC', valor: String(ultimaMed.imc) },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '17px', fontWeight: '700', color: 'rgba(200,150,80,0.95)', marginBottom: '3px' }}>{s.valor}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '18px', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '5px' }}>
            {[
              { key: 'plan', label: '🥗 Plan Nutricional' },
              { key: 'mediciones', label: '📏 Mediciones' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as 'plan' | 'mediciones')} style={{
                flex: 1, padding: '11px 12px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                cursor: 'pointer', fontFamily: "'Lato', sans-serif", border: 'none', transition: 'all 0.2s',
                background: tab === t.key ? 'rgba(123,27,42,0.85)' : 'transparent',
                color: tab === t.key ? 'white' : 'rgba(255,255,255,0.45)',
              }}>{t.label}</button>
            ))}
          </div>

          {/* TAB PLAN NUTRICIONAL */}
          {tab === 'plan' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              {planActual ? (
                <>
                  {/* Plan de alimentación */}
                  <div style={{ background: 'white', borderRadius: '18px', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
                    <div style={{ background: 'linear-gradient(135deg, #7B1B2A, #A63244)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'white', fontFamily: 'Georgia, serif', marginBottom: '3px' }}>Plan de Alimentación</h2>
                        {fechaPlan && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>Generado: {fechaPlan}</p>}
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}>
                        ✓ Vigente
                      </span>
                    </div>
                    <div style={{ padding: '24px 26px' }}>
                      {renderizarTexto(planSeccion)}
                    </div>
                  </div>

                  {/* Lista del Súper */}
                  {listaSuper && (
                    <div style={{ background: 'white', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
                      <div style={{ background: 'linear-gradient(135deg, #2D6A4F, #40916C)', padding: '18px 24px' }}>
                        <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'white', fontFamily: 'Georgia, serif' }}>🛒 Lista del Súper</h2>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '3px' }}>Ingredientes para el plan de esta semana</p>
                      </div>
                      <div style={{ padding: '24px 26px' }}>
                        {renderizarTexto(listaSuper)}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ background: 'white', borderRadius: '18px', padding: '60px 24px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
                  <p style={{ fontSize: '48px', marginBottom: '14px' }}>🥗</p>
                  <p style={{ fontSize: '17px', fontWeight: '600', color: '#2C1810', marginBottom: '8px', fontFamily: 'Georgia, serif' }}>Sin plan generado aún</p>
                  <p style={{ color: '#9B7B65', fontSize: '14px' }}>La nutrióloga generará tu plan en la próxima consulta</p>
                </div>
              )}
            </div>
          )}

          {/* TAB MEDICIONES */}
          {tab === 'mediciones' && (
            <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {mediciones.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '18px', padding: '60px 24px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}>
                  <p style={{ fontSize: '48px', marginBottom: '14px' }}>📏</p>
                  <p style={{ fontSize: '17px', fontWeight: '600', color: '#2C1810', marginBottom: '8px', fontFamily: 'Georgia, serif' }}>Sin mediciones registradas</p>
                </div>
              ) : (mediciones as Record<string, unknown>[]).map((m, i) => (
                <div key={String(m.id)} style={{
                  background: 'white', borderRadius: '18px', overflow: 'hidden',
                  boxShadow: i === 0 ? '0 4px 24px rgba(123,27,42,0.18)' : '0 4px 18px rgba(0,0,0,0.18)',
                  border: i === 0 ? '2px solid rgba(123,27,42,0.2)' : 'none',
                  animation: 'fadeIn 0.35s ease',
                }}>
                  <div style={{ padding: '16px 22px', background: i === 0 ? '#FAF0F2' : '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F0E8E8' }}>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#2C1810', fontFamily: 'Georgia, serif' }}>
                      {formatFecha(m.fechaCreacion || m.fecha)}
                    </p>
                    {i === 0 && <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(123,27,42,0.1)', color: '#7B1B2A', border: '1px solid rgba(123,27,42,0.15)' }}>Más reciente</span>}
                  </div>
                  <div style={{ padding: '18px 22px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: (m.interpretacionPeso || m.interpretacionTalla) ? '14px' : 0 }}>
                      {[
                        { l: 'Peso', v: `${m.peso} kg` },
                        { l: 'Talla', v: `${m.talla} cm` },
                        { l: 'IMC', v: String(m.imc) },
                        { l: 'P. Peso', v: `P${m.percentilPeso}` },
                        { l: 'P. Talla', v: `P${m.percentilTalla}` },
                      ].map(d => (
                        <div key={d.l} style={{ background: '#FAF7F2', borderRadius: '10px', padding: '11px 6px', textAlign: 'center', border: '1px solid #EFE8E0' }}>
                          <p style={{ fontSize: '15px', fontWeight: '700', color: '#7B1B2A', marginBottom: '3px' }}>{String(d.v)}</p>
                          <p style={{ fontSize: '10px', color: '#9B7B65', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{d.l}</p>
                        </div>
                      ))}
                    </div>
                    {(!!m.interpretacionPeso || !!m.interpretacionTalla) && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {!!m.interpretacionPeso && (
                          <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: '#F5E8EB', color: '#7B1B2A', border: '1px solid rgba(123,27,42,0.15)' }}>
                            Peso: {String(m.interpretacionPeso)}
                          </span>
                        )}
                        {!!m.interpretacionTalla && (
                          <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: '#E8F4F0', color: '#2D6A4F', border: '1px solid rgba(45,106,79,0.15)' }}>
                            Talla: {String(m.interpretacionTalla)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '28px', padding: '14px 20px', borderRadius: '12px', background: 'rgba(180,120,60,0.07)', border: '1px solid rgba(180,120,60,0.15)', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'rgba(180,120,60,0.75)' }}>🌟 Clínica Karina Lara · Nutrición Clínica Especializada</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)', marginTop: '3px' }}>Para dudas, comunícate directamente con la nutrióloga</p>
          </div>
        </main>
      )}
    </div>
  )
}
