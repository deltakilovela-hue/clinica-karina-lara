'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Paciente } from '@/lib/pacientes'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

const BRISTOL_EMOJI: Record<number, string> = { 1: '🪨', 2: '🌰', 3: '🌭', 4: '🍌', 5: '🫘', 6: '💧', 7: '🌊' }
const BRISTOL_LABEL: Record<number, string> = { 1: 'Estreñimiento severo', 2: 'Estreñimiento leve', 3: 'Normal', 4: 'Normal (ideal)', 5: 'Tránsito rápido', 6: 'Diarrea leve', 7: 'Diarrea severa' }

export default function PortalPage() {
  const router = useRouter()
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [usuarioEmail, setUsuarioEmail] = useState('')
  const [tab, setTab] = useState<'inicio' | 'plan' | 'mediciones'>('inicio')

  // Datos
  const [planActual, setPlanActual] = useState('')
  const [fechaPlan, setFechaPlan] = useState('')
  const [mediciones, setMediciones] = useState<Record<string, unknown>[]>([])
  const [ultimoSeg, setUltimoSeg] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/'); return }
      if (ADMINS.includes(user.email ?? '')) { router.replace('/dashboard'); return }
      setUsuarioEmail(user.email || '')
      try {
        // Buscar por correoAcceso O por correo real del tutor
        const q1 = query(collection(db, 'pacientes'), where('correoAcceso', '==', user.email))
        const q2 = query(collection(db, 'pacientes'), where('correo', '==', user.email))
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)])
        const snap = !snap1.empty ? snap1 : snap2
        if (!snap.empty) {
          const p = { id: snap.docs[0].id, ...snap.docs[0].data() } as Paciente
          setPaciente(p)
          await Promise.all([cargarPlan(p.id!), cargarMediciones(p.id!), cargarSeguimiento(p.id!)])
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

  const cargarSeguimiento = async (pid: string) => {
    const q = query(collection(db, `pacientes/${pid}/seguimientos`), orderBy('fecha', 'desc'))
    const snap = await getDocs(q)
    if (!snap.empty) setUltimoSeg(snap.docs[0].data() as Record<string, unknown>)
  }

  const cerrarSesion = async () => { await signOut(auth); router.push('/') }

  const formatFecha = (ts: unknown) => {
    if (!ts) return '—'
    try { return (ts as { toDate: () => Date }).toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '—' }
  }

  // Renderizar plan nutricional en formato bonito
  const formatearPlan = (texto: string) => {
    const seccion = (desde: string, hasta?: string) => {
      const ini = texto.indexOf(desde)
      if (ini === -1) return ''
      const start = ini + desde.length
      if (!hasta) return texto.slice(start).trim()
      const fin = texto.indexOf(hasta, start)
      return fin === -1 ? texto.slice(start).trim() : texto.slice(start, fin).trim()
    }

    const planSolo = seccion('## PLAN NUTRICIONAL', '### LISTA DEL SÚPER') || texto

    return planSolo.split('\n').map((linea, i) => {
      if (linea.startsWith('### ')) return (
        <h3 key={i} style={{ fontSize: '15px', fontWeight: '700', color: '#7B1B2A', marginTop: '24px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid rgba(123,27,42,0.15)', fontFamily: 'Georgia, serif' }}>
          {linea.replace('### ', '')}
        </h3>
      )
      if (linea.startsWith('## ')) return (
        <h2 key={i} style={{ fontSize: '20px', fontWeight: '600', color: 'white', marginBottom: '16px', fontFamily: 'Georgia, serif' }}>
          {linea.replace('## ', '')}
        </h2>
      )
      if (linea.startsWith('**') && linea.endsWith('**')) return (
        <p key={i} style={{ fontSize: '14px', fontWeight: '700', color: 'white', marginBottom: '6px', marginTop: '10px' }}>
          {linea.replace(/\*\*/g, '')}
        </p>
      )
      if (linea.includes('**')) return (
        <p key={i} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', marginBottom: '6px', lineHeight: '1.6' }}
          dangerouslySetInnerHTML={{ __html: linea.replace(/\*\*(.*?)\*\*/g, '<strong style="color:white">$1</strong>') }} />
      )
      if (linea.startsWith('- ') || linea.startsWith('* ')) return (
        <p key={i} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', marginBottom: '4px', paddingLeft: '16px', lineHeight: '1.6' }}>
          • {linea.replace(/^[-*] /, '')}
        </p>
      )
      if (linea.trim() === '') return <div key={i} style={{ height: '8px' }} />
      return <p key={i} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', marginBottom: '6px', lineHeight: '1.6' }}>{linea}</p>
    })
  }

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a0508 0%, #2d0f0a 50%, #1a0505 100%)' }}>
      <div style={{ width: '36px', height: '36px', border: '2px solid rgba(180,120,60,0.3)', borderTopColor: 'rgba(180,120,60,0.8)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const ultimaMed = mediciones[0] as Record<string, unknown> | undefined

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a0508 0%, #2d0f0a 60%, #1a0505 100%)', fontFamily: "'Lato', sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ borderBottom: '1px solid rgba(180,120,60,0.15)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white', fontFamily: 'Georgia, serif' }}>KL</div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'white', fontFamily: 'Georgia, serif' }}>Clínica Karina Lara</p>
              <p style={{ fontSize: '11px', color: 'rgba(180,120,60,0.7)' }}>Portal para Padres</p>
            </div>
          </div>
          <button onClick={cerrarSesion} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(180,120,60,0.3)', background: 'transparent', color: 'rgba(180,120,60,0.8)', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>
            Salir
          </button>
        </div>
      </header>

      {!paciente ? (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', marginBottom: '8px' }}>No se encontró expediente asociado</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>{usuarioEmail}</p>
          <p style={{ color: 'rgba(180,120,60,0.6)', fontSize: '13px', marginTop: '16px' }}>Contacta a la Lic. Karina Lara para obtener acceso.</p>
        </div>
      ) : (
        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '28px 24px' }}>

          {/* ── PERFIL DEL NIÑO ── */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', marginBottom: '20px', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: 'white', fontFamily: 'Georgia, serif', flexShrink: 0 }}>
                {paciente.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '500', color: 'white', fontFamily: 'Georgia, serif', marginBottom: '4px' }}>{paciente.nombre}</h1>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{paciente.edad} años · {paciente.sexo}</p>
              </div>
            </div>

            {/* Stats rápidos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { label: 'Peso actual', valor: ultimaMed ? `${ultimaMed.peso} kg` : '—' },
                { label: 'Talla', valor: ultimaMed ? `${ultimaMed.talla} cm` : '—' },
                { label: 'IMC', valor: ultimaMed ? String(ultimaMed.imc) : '—' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: 'rgba(180,120,60,0.9)', marginBottom: '3px' }}>{s.valor}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── TABS ── */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '4px' }}>
            {[
              { key: 'inicio', label: '🏠 Inicio' },
              { key: 'plan', label: '🥗 Plan Nutricional' },
              { key: 'mediciones', label: '📏 Mediciones' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as 'inicio' | 'plan' | 'mediciones')} style={{
                flex: 1, padding: '9px 12px', borderRadius: '9px', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', fontFamily: "'Lato', sans-serif", border: 'none',
                background: tab === t.key ? 'rgba(123,27,42,0.8)' : 'transparent',
                color: tab === t.key ? 'white' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.2s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── TAB INICIO ── */}
          {tab === 'inicio' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>

              {/* Último seguimiento digestivo */}
              {ultimoSeg && (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(180,120,60,0.8)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
                    🫃 Último Seguimiento — {formatFecha(ultimoSeg.fecha)}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                      <p style={{ fontSize: '28px', marginBottom: '4px' }}>{BRISTOL_EMOJI[ultimoSeg.bristolTipo as number] || '—'}</p>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>Bristol Tipo {String(ultimoSeg.bristolTipo)}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{BRISTOL_LABEL[ultimoSeg.bristolTipo as number] || ''}</p>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '14px' }}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Evacuaciones/día</p>
                      <p style={{ fontSize: '28px', fontWeight: '700', color: 'white' }}>{String(ultimoSeg.evacuacionesDia)}</p>
                      {(ultimoSeg.sintomasActivos as string[])?.length > 0 && (
                        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(ultimoSeg.sintomasActivos as string[]).slice(0, 2).map((s: string) => (
                            <span key={s} style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', background: 'rgba(155,35,53,0.3)', color: '#F5A0A9' }}>{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {!!ultimoSeg.notasEvolucion && (
                    <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', borderLeft: '3px solid rgba(123,27,42,0.5)' }}>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>"{String(ultimoSeg.notasEvolucion)}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Accesos rápidos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button onClick={() => setTab('plan')} style={{
                  padding: '20px', borderRadius: '16px', cursor: 'pointer', textAlign: 'left',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  fontFamily: "'Lato', sans-serif",
                }}>
                  <p style={{ fontSize: '24px', marginBottom: '8px' }}>🥗</p>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '4px', fontFamily: 'Georgia, serif' }}>Plan Nutricional</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {fechaPlan ? `Actualizado: ${fechaPlan}` : 'Ver plan de alimentación'}
                  </p>
                </button>
                <button onClick={() => setTab('mediciones')} style={{
                  padding: '20px', borderRadius: '16px', cursor: 'pointer', textAlign: 'left',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  fontFamily: "'Lato', sans-serif",
                }}>
                  <p style={{ fontSize: '24px', marginBottom: '8px' }}>📏</p>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '4px', fontFamily: 'Georgia, serif' }}>Mediciones</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {mediciones.length > 0 ? `${mediciones.length} registros` : 'Sin mediciones'}
                  </p>
                </button>
              </div>

              {/* Info de contacto */}
              <div style={{ marginTop: '16px', padding: '16px 20px', borderRadius: '14px', background: 'rgba(180,120,60,0.08)', border: '1px solid rgba(180,120,60,0.15)', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: 'rgba(180,120,60,0.8)', marginBottom: '4px' }}>
                  🌟 Clínica Karina Lara — Nutrición Clínica Especializada
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                  Para dudas o consultas, comunícate directamente con la nutrióloga
                </p>
              </div>
            </div>
          )}

          {/* ── TAB PLAN NUTRICIONAL ── */}
          {tab === 'plan' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              {planActual ? (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: 'white', fontFamily: 'Georgia, serif' }}>Plan de Alimentación</p>
                      {fechaPlan && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Generado: {fechaPlan}</p>}
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(45,106,79,0.3)', color: '#86efac', border: '1px solid rgba(45,106,79,0.4)' }}>
                      Vigente
                    </span>
                  </div>
                  <div>{formatearPlan(planActual)}</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                  <p style={{ fontSize: '40px', marginBottom: '12px' }}>🥗</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', marginBottom: '8px' }}>Sin plan generado aún</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>La nutrióloga generará tu plan en la próxima consulta</p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB MEDICIONES ── */}
          {tab === 'mediciones' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              {mediciones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                  <p style={{ fontSize: '40px', marginBottom: '12px' }}>📏</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>Sin mediciones registradas</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(mediciones as Record<string, unknown>[]).map((m, i) => (
                    <div key={String(m.id)} style={{
                      background: i === 0 ? 'rgba(123,27,42,0.15)' : 'rgba(255,255,255,0.04)',
                      border: i === 0 ? '1px solid rgba(123,27,42,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px', padding: '20px', animation: 'fadeIn 0.3s ease',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: 'white', fontFamily: 'Georgia, serif' }}>
                          {formatFecha(m.fechaCreacion || m.fecha)}
                        </p>
                        {i === 0 && <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(45,106,79,0.3)', color: '#86efac' }}>Más reciente</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                        {[
                          { l: 'Peso', v: `${m.peso} kg` },
                          { l: 'Talla', v: `${m.talla} cm` },
                          { l: 'IMC', v: String(m.imc) },
                          { l: 'P/Edad', v: `P${m.percentilPeso}` },
                          { l: 'T/Edad', v: `P${m.percentilTalla}` },
                        ].map(d => (
                          <div key={d.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                            <p style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(180,120,60,0.9)', marginBottom: '2px' }}>{String(d.v)}</p>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{d.l}</p>
                          </div>
                        ))}
                      </div>
                      {(!!m.interpretacionPeso || !!m.interpretacionTalla) && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {!!m.interpretacionPeso && <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>Peso: {String(m.interpretacionPeso)}</span>}
                          {!!m.interpretacionTalla && <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>Talla: {String(m.interpretacionTalla)}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      )}
    </div>
  )
}