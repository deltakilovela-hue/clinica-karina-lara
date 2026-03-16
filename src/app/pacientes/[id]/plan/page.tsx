'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPaciente, Paciente } from '@/lib/pacientes'
import { collection, addDoc, getDocs, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

interface Plan { id?: string; texto: string; fechaCreacion?: Timestamp }
interface MensajeChat { rol: 'usuario' | 'asistente'; texto: string }

export default function PlanPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const chatRef = useRef<HTMLDivElement>(null)
  const planPdfRef = useRef<HTMLDivElement>(null)
  const [descargando, setDescargando] = useState(false)

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [planes, setPlanes] = useState<Plan[]>([])
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [planActual, setPlanActual] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'plan' | 'super' | 'chat'>('plan')
  const [mensajeChat, setMensajeChat] = useState('')
  const [enviandoChat, setEnviandoChat] = useState(false)
  const [historialChat, setHistorialChat] = useState<MensajeChat[]>([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      try {
        const p = await obtenerPaciente(id)
        setPaciente(p)
        await cargarPlanes()
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router, id])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [historialChat])

  const cargarPlanes = async () => {
    const q = query(collection(db, `pacientes/${id}/planes`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan))
    setPlanes(lista)
    if (lista.length > 0) setPlanActual(lista[0].texto)
  }

  const generarPlan = async () => {
    if (!paciente) return
    setGenerando(true); setError('')
    try {
      const historiaSnap = await getDocs(query(collection(db, `pacientes/${id}/historiasClinicas`), orderBy('fechaCreacion', 'desc')))
      const historia = historiaSnap.docs[0]?.data() || null
      const antropoSnap = await getDocs(query(collection(db, `pacientes/${id}/antropometria`), orderBy('fechaCreacion', 'desc')))
      const antropometria = antropoSnap.docs[0]?.data() || null

      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente, historia, antropometria }),
      })
      const data = await res.json()
      if (!res.ok) { setError('Error al generar el plan.'); return }
      setPlanActual(data.plan)
      setHistorialChat([])
      await addDoc(collection(db, `pacientes/${id}/planes`), { texto: data.plan, fechaCreacion: Timestamp.now() })
      await cargarPlanes()
    } catch (e) { setError('Error de conexión.'); console.error(e) }
    finally { setGenerando(false) }
  }

  const enviarChat = async () => {
    if (!mensajeChat.trim() || !planActual) return
    const msg = mensajeChat.trim()
    setMensajeChat('')
    setHistorialChat(h => [...h, { rol: 'usuario', texto: msg }])
    setEnviandoChat(true)
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente, mensajeChat: msg, planPrevio: planActual }),
      })
      const data = await res.json()
      if (!res.ok) { setHistorialChat(h => [...h, { rol: 'asistente', texto: 'Error al procesar tu solicitud.' }]); return }
      setHistorialChat(h => [...h, { rol: 'asistente', texto: data.plan }])
      if (data.plan.includes('## PLAN NUTRICIONAL')) {
        setPlanActual(data.plan)
        await addDoc(collection(db, `pacientes/${id}/planes`), { texto: data.plan, fechaCreacion: Timestamp.now() })
        await cargarPlanes()
      }
    } catch (e) { console.error(e) }
    finally { setEnviandoChat(false) }
  }

  // ─── Función para descargar PDF limpio (sin botones) ─────────────────────────
  const descargarPDF = async () => {
    const elemento = planPdfRef.current
    if (!elemento || !paciente) return
    setDescargando(true)

    // 1️⃣ Ocultar todos los botones dentro del área del plan antes de capturar
    const botones = elemento.querySelectorAll('button')
    botones.forEach(b => (b.style.display = 'none'))

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      // 2️⃣ Capturar solo el contenido del plan (sin header, chat, ni botones)
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 12
      const imgWidth = pageWidth - margin * 2
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let posicionY = margin
      let alturaRestante = imgHeight

      pdf.addImage(imgData, 'PNG', margin, posicionY, imgWidth, imgHeight)
      alturaRestante -= (pageHeight - margin * 2)

      while (alturaRestante > 0) {
        posicionY = alturaRestante - imgHeight + margin
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', margin, posicionY, imgWidth, imgHeight)
        alturaRestante -= (pageHeight - margin * 2)
      }

      const nombreArchivo = `Plan_Nutricional_${paciente.nombre.replace(/ /g, '_')}.pdf`
      pdf.save(nombreArchivo)

    } catch (e) {
      console.error('Error generando PDF:', e)
      alert('Error al generar el PDF. Intenta usar el botón Imprimir.')
    } finally {
      // 3️⃣ Volver a mostrar los botones siempre (aunque haya error)
      botones.forEach(b => (b.style.display = ''))
      setDescargando(false)
    }
  }

  // ─── Extraer secciones del texto del plan ────────────────────────────────────
  const extraerSeccion = (texto: string, desde: string, hasta?: string) => {
    const ini = texto.indexOf(desde)
    if (ini === -1) return ''
    const start = ini + desde.length
    if (!hasta) return texto.slice(start).trim()
    const fin = texto.indexOf(hasta, start)
    return fin === -1 ? texto.slice(start).trim() : texto.slice(start, fin).trim()
  }

  const planSinExtras = planActual ? extraerSeccion(planActual, '## PLAN NUTRICIONAL', '### LISTA DEL SÚPER') : ''
  const listaSuper = planActual ? extraerSeccion(planActual, '### LISTA DEL SÚPER', '### PRESUPUESTO ESTIMADO') : ''
  const presupuesto = planActual ? extraerSeccion(planActual, '### PRESUPUESTO ESTIMADO') : ''

  // ─── Renderizar tabla de presupuesto con HTML real ───────────────────────────
  const renderizarTabla = (texto: string) => {
    const lineas = texto.split('\n')
    const filasTabla: string[][] = []
    let recolectandoTabla = false
    const resultado: React.ReactNode[] = []
    let keyCounter = 0

    const vaciarTabla = () => {
      if (filasTabla.length < 2) { filasTabla.length = 0; return }

      const [encabezado, ...filas] = filasTabla
      resultado.push(
        <div key={`tabla-${keyCounter++}`} style={{ overflowX: 'auto', marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E8DDD0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #7B1B2A, #A63244)' }}>
                {encabezado.map((h, j) => (
                  <th key={j} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: 'white',
                    fontWeight: '600',
                    fontFamily: "'Lato', sans-serif",
                    fontSize: '13px',
                  }}>
                    {h.replace(/\*\*/g, '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, fi) => {
                const esTotal = fila.some(c => c.toUpperCase().includes('TOTAL'))
                return (
                  <tr key={fi} style={{
                    background: esTotal ? '#F5E8EB' : fi % 2 === 0 ? 'white' : '#FAF7F2',
                    borderBottom: '1px solid #E8DDD0',
                  }}>
                    {fila.map((celda, ci) => (
                      <td key={ci} style={{
                        padding: '10px 16px',
                        color: esTotal ? '#7B1B2A' : '#2C1810',
                        fontWeight: esTotal ? '700' : '400',
                        fontFamily: "'Lato', sans-serif",
                        fontSize: '13px',
                      }}>
                        {celda.replace(/\*\*/g, '')}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      filasTabla.length = 0
      recolectandoTabla = false
    }

    lineas.forEach((linea) => {
      if (/^\|[-\s|:]+\|/.test(linea)) return

      if (linea.startsWith('| ') || linea.startsWith('|')) {
        recolectandoTabla = true
        const celdas = linea.split('|').map(c => c.trim()).filter(c => c !== '')
        if (celdas.length > 0) filasTabla.push(celdas)
      } else {
        if (recolectandoTabla) vaciarTabla()

        if (linea.startsWith('### ')) {
          resultado.push(<h3 key={keyCounter++} style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: '#7B1B2A', marginBottom: '10px', marginTop: '24px', paddingBottom: '6px', borderBottom: '1px solid #E8DDD0' }}>{linea.replace('### ', '')}</h3>)
        } else if (linea.startsWith('## ')) {
          resultado.push(<h2 key={keyCounter++} style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#2C1810', marginBottom: '20px', marginTop: '8px' }}>{linea.replace('## ', '')}</h2>)
        } else if (linea.startsWith('**') && linea.endsWith('**')) {
          resultado.push(<p key={keyCounter++} style={{ fontSize: '14px', fontWeight: '700', color: '#2C1810', marginBottom: '6px', marginTop: '12px' }}>{linea.replace(/\*\*/g, '')}</p>)
        } else if (linea.includes('**')) {
          resultado.push(<p key={keyCounter++} style={{ fontSize: '14px', color: '#2C1810', marginBottom: '6px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: linea.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />)
        } else if (linea.startsWith('- ') || linea.startsWith('* ')) {
          resultado.push(<p key={keyCounter++} style={{ fontSize: '14px', color: '#2C1810', marginBottom: '4px', paddingLeft: '16px', lineHeight: '1.6' }}>• {linea.replace(/^[-*] /, '')}</p>)
        } else if (linea.trim() === '') {
          resultado.push(<div key={keyCounter++} style={{ height: '8px' }} />)
        } else {
          resultado.push(<p key={keyCounter++} style={{ fontSize: '14px', color: '#2C1810', marginBottom: '6px', lineHeight: '1.6' }}>{linea}</p>)
        }
      }
    })

    if (recolectandoTabla) vaciarTabla()

    return resultado
  }

  // ─── Renderizar texto normal (sin tablas) ────────────────────────────────────
  const formatear = (texto: string) => texto.split('\n').map((linea, i) => {
    if (linea.startsWith('### ')) return <h3 key={i} style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: '#7B1B2A', marginBottom: '10px', marginTop: '24px', paddingBottom: '6px', borderBottom: '1px solid #E8DDD0' }}>{linea.replace('### ', '')}</h3>
    if (linea.startsWith('## ')) return <h2 key={i} style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#2C1810', marginBottom: '20px', marginTop: '8px' }}>{linea.replace('## ', '')}</h2>
    if (linea.startsWith('| ')) return null
    if (linea.startsWith('**') && linea.endsWith('**')) return <p key={i} style={{ fontSize: '14px', fontWeight: '700', color: '#2C1810', marginBottom: '6px', marginTop: '12px' }}>{linea.replace(/\*\*/g, '')}</p>
    if (linea.includes('**')) return <p key={i} style={{ fontSize: '14px', color: '#2C1810', marginBottom: '6px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: linea.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
    if (linea.startsWith('- ') || linea.startsWith('* ')) return <p key={i} style={{ fontSize: '14px', color: '#2C1810', marginBottom: '4px', paddingLeft: '16px', lineHeight: '1.6' }}>• {linea.replace(/^[-*] /, '')}</p>
    if (linea.trim() === '') return <div key={i} style={{ height: '8px' }} />
    return <p key={i} style={{ fontSize: '14px', color: '#2C1810', marginBottom: '6px', lineHeight: '1.6' }}>{linea}</p>
  })

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }

        @media print {
          body * { visibility: hidden !important; }
          #area-impresion, #area-impresion * { visibility: visible !important; }
          #area-impresion {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 24px !important;
          }
          #area-impresion button { display: none !important; }
          #area-impresion > div { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Link href="/dashboard" style={{ color: '#9B7B65', textDecoration: 'none' }}>Dashboard</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href={`/pacientes/${id}`} style={{ color: '#9B7B65', textDecoration: 'none' }}>{paciente?.nombre}</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <span style={{ color: '#2C1810', fontWeight: '600' }}>Plan Nutricional</span>
          </div>
          <button onClick={generarPlan} disabled={generando} style={{
            padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
            background: generando ? '#E8DDD0' : 'linear-gradient(135deg, #7B1B2A, #A63244)',
            color: generando ? '#9B7B65' : 'white', border: 'none', cursor: generando ? 'not-allowed' : 'pointer',
            fontFamily: "'Lato', sans-serif", display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {generando
              ? <><div style={{ width: '14px', height: '14px', border: '2px solid #9B7B65', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Generando...</>
              : '🧠 Nuevo Plan con IA'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>Plan Nutricional</h1>
          <p style={{ color: '#9B7B65', fontSize: '14px' }}>{paciente?.nombre} · {planes.length} plan{planes.length !== 1 ? 'es' : ''} generado{planes.length !== 1 ? 's' : ''}</p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', background: '#FDECEA', border: '1px solid #F5C2C7', color: '#9B2335', fontSize: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        {generando && (
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8DDD0', padding: '48px', textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', marginBottom: '8px' }}>Generando plan nutricional...</p>
            <p style={{ color: '#9B7B65', fontSize: '14px' }}>Claude está analizando el caso clínico de {paciente?.nombre}</p>
          </div>
        )}

        {!planActual && !generando && (
          <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #E8DDD0', padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', marginBottom: '8px' }}>Sin planes generados</p>
            <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '24px' }}>Claude generará un plan personalizado con lista del súper y presupuesto</p>
            <button onClick={generarPlan} style={{ padding: '13px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: '600', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>
              🧠 Generar Primer Plan
            </button>
          </div>
        )}

        {planActual && !generando && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'start' }}>

            {/* ── COLUMNA PRINCIPAL ── */}
            <div>
              {/* Selector de versiones */}
              {planes.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
                  {planes.map((p, i) => (
                    <button key={p.id} onClick={() => { setPlanActual(p.texto); setHistorialChat([]) }} style={{
                      padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                      fontFamily: "'Lato', sans-serif", whiteSpace: 'nowrap',
                      background: planActual === p.texto ? '#7B1B2A' : 'white',
                      color: planActual === p.texto ? 'white' : '#6B4F3A',
                      border: planActual === p.texto ? '1.5px solid #7B1B2A' : '1.5px solid #E8DDD0',
                    }}>
                      Plan {planes.length - i} · {p.fechaCreacion?.toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </button>
                  ))}
                </div>
              )}

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'white', borderRadius: '12px', padding: '4px', border: '1px solid #E8DDD0', width: 'fit-content' }}>
                {[
                  { key: 'plan', label: '📋 Plan' },
                  { key: 'super', label: '🛒 Lista del Súper' },
                ].map(t => (
                  <button key={t.key} onClick={() => setTab(t.key as 'plan' | 'super' | 'chat')} style={{
                    padding: '8px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: '600',
                    cursor: 'pointer', fontFamily: "'Lato', sans-serif", border: 'none',
                    background: tab === t.key ? '#7B1B2A' : 'transparent',
                    color: tab === t.key ? 'white' : '#6B4F3A',
                  }}>{t.label}</button>
                ))}
              </div>

              {/* ── ÁREA DE IMPRESIÓN ── */}
              <div id="area-impresion">
                <div
                  ref={planPdfRef}
                  style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8DDD0', padding: '36px', boxShadow: '0 2px 16px rgba(44,24,16,0.06)' }}
                >
                  {/* Cabecera del plan */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #E8DDD0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🧠</div>
                      <div>
                        <p style={{ fontWeight: '600', color: '#2C1810', fontSize: '14px' }}>Plan de alimentación</p>
                        <p style={{ fontSize: '12px', color: '#9B7B65' }}>Clínica Karina Lara</p>
                      </div>
                    </div>

                    {/* ── BOTONES (se ocultan en PDF e impresión) ── */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={descargarPDF}
                        disabled={descargando}
                        style={{
                          padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                          border: 'none',
                          background: descargando ? '#E8DDD0' : 'linear-gradient(135deg, #7B1B2A, #A63244)',
                          color: descargando ? '#9B7B65' : 'white',
                          cursor: descargando ? 'not-allowed' : 'pointer',
                          fontFamily: "'Lato', sans-serif",
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                      >
                        {descargando
                          ? <><div style={{ width: '12px', height: '12px', border: '2px solid #9B7B65', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Generando...</>
                          : '⬇️ Descargar PDF'}
                      </button>

                      <button
                        onClick={() => window.print()}
                        style={{
                          padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                          border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A',
                          cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                        }}
                      >
                        🖨️ Imprimir
                      </button>
                    </div>
                  </div>

                  {/* ── CONTENIDO TAB PLAN ── */}
                  {tab === 'plan' && (
                    <div>{formatear(planSinExtras || planActual)}</div>
                  )}

                  {/* ── CONTENIDO TAB SÚPER ── */}
                  {tab === 'super' && (
                    <div>
                      {listaSuper ? (
                        <div>
                          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810', marginBottom: '20px' }}>
                            Lista del Súper — 1 semana
                          </h3>
                          {formatear(listaSuper)}
                          {presupuesto && (
                            <div style={{ marginTop: '28px', background: '#FAF7F2', borderRadius: '14px', padding: '20px', border: '1px solid #E8DDD0' }}>
                              <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: '#7B1B2A', marginBottom: '14px' }}>
                                💰 Presupuesto Estimado — Tepic
                              </h4>
                              {renderizarTabla(presupuesto)}
                              <p style={{ fontSize: '11px', color: '#9B7B65', marginTop: '12px', fontStyle: 'italic' }}>
                                * Precios de referencia aproximados para Walmart/Soriana/Chedraui en Tepic, Nayarit. Pueden variar.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p style={{ color: '#9B7B65', fontSize: '14px', textAlign: 'center', padding: '24px' }}>
                          La lista del súper se genera con el plan. Genera un nuevo plan para verla.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── CHAT LATERAL ── */}
            <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8DDD0', overflow: 'hidden', boxShadow: '0 2px 16px rgba(44,24,16,0.06)', position: 'sticky', top: '24px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8DDD0', background: 'linear-gradient(135deg, #7B1B2A, #A63244)' }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: 'white', fontWeight: '600', marginBottom: '2px' }}>🧠 Chat con IA</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Modifica o consulta sobre el plan</p>
              </div>

              <div ref={chatRef} style={{ height: '340px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historialChat.length === 0 && (
                  <div>
                    <p style={{ fontSize: '13px', color: '#9B7B65', marginBottom: '12px', textAlign: 'center' }}>Ejemplos de lo que puedes pedir:</p>
                    {[
                      'Cambia el desayuno por algo sin gluten',
                      'El niño no tolera la leche, ajusta el plan',
                      'Sugiere recetas fáciles para el lunch',
                      'Reduce el presupuesto semanal a $500',
                    ].map(s => (
                      <button key={s} onClick={() => setMensajeChat(s)} style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                        borderRadius: '8px', marginBottom: '6px', fontSize: '12px', cursor: 'pointer',
                        fontFamily: "'Lato', sans-serif", background: '#FAF7F2',
                        color: '#6B4F3A', border: '1px solid #E8DDD0'
                      }}>{s}</button>
                    ))}
                  </div>
                )}
                {historialChat.map((m, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.5',
                    background: m.rol === 'usuario' ? '#7B1B2A' : '#FAF7F2',
                    color: m.rol === 'usuario' ? 'white' : '#2C1810',
                    alignSelf: m.rol === 'usuario' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    border: m.rol === 'asistente' ? '1px solid #E8DDD0' : 'none',
                  }}>
                    {m.texto.length > 300 ? m.texto.substring(0, 300) + '... [Plan actualizado arriba]' : m.texto}
                  </div>
                ))}
                {enviandoChat && (
                  <div style={{ padding: '10px 14px', borderRadius: '12px', background: '#FAF7F2', border: '1px solid #E8DDD0', alignSelf: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {[0, 1, 2].map(n => (
                        <div key={n} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9B7B65', animation: `pulse 1s ${n * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 16px', borderTop: '1px solid #E8DDD0', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={mensajeChat}
                  onChange={e => setMensajeChat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !enviandoChat && enviarChat()}
                  placeholder="Pide un cambio al plan..."
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', fontSize: '13px', border: '1.5px solid #E8DDD0', background: '#FAF7F2', color: '#2C1810', outline: 'none', fontFamily: "'Lato', sans-serif" }}
                />
                <button
                  onClick={enviarChat}
                  disabled={enviandoChat || !mensajeChat.trim()}
                  style={{
                    padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                    background: enviandoChat || !mensajeChat.trim() ? '#E8DDD0' : '#7B1B2A',
                    color: enviandoChat || !mensajeChat.trim() ? '#9B7B65' : 'white',
                    border: 'none', cursor: enviandoChat || !mensajeChat.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: "'Lato', sans-serif",
                  }}
                >→</button>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}