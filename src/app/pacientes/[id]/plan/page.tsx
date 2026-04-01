'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPaciente, Paciente } from '@/lib/pacientes'
import { collection, addDoc, getDocs, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import PasoNavegacion from '@/components/PasoNavegacion'
import { crearCita } from '@/lib/citas'

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
  const [descargandoMenu, setDescargandoMenu] = useState(false)
  const [errorMenu, setErrorMenu] = useState('')
  const [subiendoDrive, setSubiendoDrive] = useState(false)
  const [driveLink, setDriveLink] = useState<string | null>(null)

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [planes, setPlanes] = useState<Plan[]>([])
  const [historia, setHistoria] = useState<Record<string, unknown> | null>(null)
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [planActual, setPlanActual] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'plan' | 'super' | 'chat'>('plan')
  const [mensajeChat, setMensajeChat] = useState('')
  const [enviandoChat, setEnviandoChat] = useState(false)
  const [historialChat, setHistorialChat] = useState<MensajeChat[]>([])

  // ── Próxima consulta ─────────────────────────────────────────────────────
  const [showProxCita, setShowProxCita] = useState(false)
  const [proxForm, setProxForm] = useState({ fecha: '', hora: '09:00', tipo: 'Seguimiento', notas: '' })
  const [guardandoCita, setGuardandoCita] = useState(false)
  const [citaExito, setCitaExito] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      try {
        const p = await obtenerPaciente(id)
        setPaciente(p)
        await Promise.all([cargarPlanes(), cargarHistoria()])
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

  const cargarHistoria = async () => {
    try {
      const q = query(collection(db, `pacientes/${id}/historiasClinicas`), orderBy('fechaCreacion', 'desc'))
      const snap = await getDocs(q)
      if (!snap.empty) setHistoria(snap.docs[0].data() as Record<string, unknown>)
    } catch { /* sin historia */ }
  }

  const subirMenuDrive = async () => {
    if (!paciente || !planActual) return
    setSubiendoDrive(true)
    setErrorMenu('')
    setDriveLink(null)
    try {
      // 1. Generar el Excel desde la API
      const res = await fetch(`/api/menu/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente, planTexto: planActual, historia }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setErrorMenu(err.error || 'Error al generar el menú')
        return
      }

      // 2. Convertir blob → base64
      const blob = await res.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      // 3. Subir a Google Drive (se convierte automáticamente a Google Sheets)
      const fecha = new Date().toISOString().slice(0, 10)
      const fileName = `Menu_Semanal_${paciente.nombre}_${fecha}`
      const uploadRes = await fetch('/api/upload-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          fileName,
          mimeType: 'application/vnd.ms-excel',
        }),
      })
      const uploadData = await uploadRes.json()

      if (!uploadData.ok) {
        setErrorMenu(uploadData.error || 'Error al subir a Google Drive')
        return
      }

      setDriveLink(uploadData.link)
    } catch (e) {
      setErrorMenu('Error de conexión')
      console.error(e)
    } finally {
      setSubiendoDrive(false)
    }
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
      // Sugerir próxima cita: 4 semanas después por defecto
      const proxFecha = new Date()
      proxFecha.setDate(proxFecha.getDate() + 28)
      setProxForm({ fecha: proxFecha.toISOString().slice(0, 10), hora: '09:00', tipo: 'Seguimiento', notas: '' })
      setCitaExito(false)
      setShowProxCita(true)
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

  // ─── Guardar próxima cita ────────────────────────────────────────────────────
  const guardarProxCita = async () => {
    if (!paciente || !proxForm.fecha) return
    setGuardandoCita(true)
    try {
      await crearCita({
        pacienteId: id,
        pacienteNombre: paciente.nombre,
        tutorNombre: paciente.tutor || '',
        fecha: proxForm.fecha,
        hora: proxForm.hora,
        tipo: proxForm.tipo,
        notas: proxForm.notas || `Seguimiento post plan nutricional`,
        estado: 'pendiente',
      })
      setCitaExito(true)
    } catch (e) { console.error(e) }
    finally { setGuardandoCita(false) }
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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>

                      {/* Botón Menú Semanal → Google Sheets */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px' }}>
                        <button
                          onClick={subirMenuDrive}
                          disabled={subiendoDrive || !planActual}
                          style={{
                            padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                            border: 'none',
                            background: subiendoDrive ? '#C9E8D0' : 'linear-gradient(135deg, #1A73E8, #1557B0)',
                            color: subiendoDrive ? '#1A73E8' : 'white',
                            cursor: (subiendoDrive || !planActual) ? 'not-allowed' : 'pointer',
                            fontFamily: "'Lato', sans-serif",
                            display: 'flex', alignItems: 'center', gap: '6px',
                            opacity: !planActual ? 0.5 : 1,
                            transition: 'opacity 0.15s',
                          }}
                        >
                          {subiendoDrive ? (
                            <>
                              <div style={{ width: '12px', height: '12px', border: '2px solid #1A73E8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                              Subiendo a Drive...
                            </>
                          ) : (
                            <>
                              {/* Google Sheets icon */}
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="2" width="18" height="20" rx="2" fill="white" opacity="0.25"/>
                                <path d="M3 8h18M3 13h18M3 18h18M8 2v20M16 2v20" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                              Guardar en Google Sheets
                            </>
                          )}
                        </button>

                        {/* Link al archivo en Drive tras subir */}
                        {driveLink && !subiendoDrive && (
                          <a
                            href={driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              fontSize: '12px', fontWeight: '700', color: '#1A73E8',
                              background: '#E8F0FE', border: '1px solid #AECBFA',
                              borderRadius: '8px', padding: '5px 12px',
                              textDecoration: 'none',
                            }}
                          >
                            ✅ Abrír en Google Sheets →
                          </a>
                        )}

                        {errorMenu && (
                          <span style={{ fontSize: '11px', color: '#B71C1C' }}>⚠️ {errorMenu}</span>
                        )}
                      </div>

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

        {/* ── Navegación entre secciones ── */}
        <PasoNavegacion pacienteId={id} pasoActual="plan" />
      </main>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: PROGRAMAR PRÓXIMA CONSULTA
      ════════════════════════════════════════════════════════════════════ */}
      {showProxCita && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '36px', maxWidth: '460px', width: '100%', boxShadow: '0 16px 56px rgba(44,24,16,0.22)', fontFamily: "'Lato', sans-serif" }}>

            {citaExito ? (
              /* ── Estado éxito ── */
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#D8F3DC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#2C1810', marginBottom: '8px' }}>¡Cita agendada!</h3>
                <p style={{ fontSize: '14px', color: '#6B4F3A', marginBottom: '6px' }}>
                  <strong>{paciente?.nombre}</strong>
                </p>
                <p style={{ fontSize: '14px', color: '#9B7B65', marginBottom: '24px' }}>
                  {new Date(proxForm.fecha + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} · {proxForm.hora}
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowProxCita(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    Cerrar
                  </button>
                  <Link href="/citas" onClick={() => setShowProxCita(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, #2D6A4F, #40916C)', color: 'white', fontSize: '14px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Ver calendario
                  </Link>
                </div>
              </div>
            ) : (
              /* ── Formulario ── */
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #8B6914, #C4A35A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', margin: 0 }}>Próxima Consulta</h3>
                      <p style={{ fontSize: '12px', color: '#9B7B65', margin: 0 }}>{paciente?.nombre}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowProxCita(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B7B65' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <p style={{ fontSize: '13px', color: '#9B7B65', marginBottom: '22px' }}>Plan nutricional generado ✓ · Agenda la próxima cita ahora</p>

                {/* Fecha + hora */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase' as const, letterSpacing: '0.8px', marginBottom: '6px' }}>Fecha *</label>
                    <input type="date" value={proxForm.fecha} onChange={e => setProxForm(f => ({ ...f, fecha: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E8DDD0', fontSize: '14px', color: '#2C1810', outline: 'none', colorScheme: 'light', boxSizing: 'border-box' as const, fontFamily: "'Lato', sans-serif" }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase' as const, letterSpacing: '0.8px', marginBottom: '6px' }}>Hora *</label>
                    <input type="time" value={proxForm.hora} onChange={e => setProxForm(f => ({ ...f, hora: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E8DDD0', fontSize: '14px', color: '#2C1810', outline: 'none', colorScheme: 'light', boxSizing: 'border-box' as const, fontFamily: "'Lato', sans-serif" }} />
                  </div>
                </div>

                {/* Tipo */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase' as const, letterSpacing: '0.8px', marginBottom: '8px' }}>Tipo de consulta</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                    {['Seguimiento', 'Revisión de plan', 'Primera consulta', 'Urgencia'].map(t => (
                      <button key={t} onClick={() => setProxForm(f => ({ ...f, tipo: t }))} style={{
                        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                        background: proxForm.tipo === t ? '#7B1B2A' : 'white',
                        color: proxForm.tipo === t ? 'white' : '#6B4F3A',
                        border: proxForm.tipo === t ? '1.5px solid #7B1B2A' : '1.5px solid #E8DDD0',
                      }}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* Notas */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase' as const, letterSpacing: '0.8px', marginBottom: '6px' }}>Notas (opcional)</label>
                  <textarea value={proxForm.notas} onChange={e => setProxForm(f => ({ ...f, notas: e.target.value }))} rows={2}
                    placeholder="Instrucciones, seguimiento de indicadores…"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #E8DDD0', fontSize: '13px', color: '#2C1810', outline: 'none', resize: 'none', boxSizing: 'border-box' as const, fontFamily: "'Lato', sans-serif" }} />
                </div>

                {/* Botones */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowProxCita(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>
                    Después
                  </button>
                  <button onClick={guardarProxCita} disabled={guardandoCita || !proxForm.fecha} style={{
                    flex: 2, padding: '12px', borderRadius: '10px', border: 'none',
                    background: guardandoCita || !proxForm.fecha ? '#E8DDD0' : 'linear-gradient(135deg, #7B1B2A, #A63244)',
                    color: guardandoCita || !proxForm.fecha ? '#9B7B65' : 'white',
                    fontSize: '14px', fontWeight: '700', cursor: guardandoCita || !proxForm.fecha ? 'not-allowed' : 'pointer',
                    fontFamily: "'Lato', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                    {guardandoCita ? <><div style={{ width: '14px', height: '14px', border: '2px solid #9B7B65', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Agendando…</> : '📅 Agendar cita'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}