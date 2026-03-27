'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPaciente, eliminarPaciente, Paciente } from '@/lib/pacientes'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

export default function DetallePacientePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [inicializando, setInicializando] = useState(true)
  const [descargando, setDescargando] = useState(false)
  const reporteRef = useRef<HTMLDivElement>(null)

  // Datos para el reporte
  const [historia, setHistoria] = useState<Record<string, unknown> | null>(null)
  const [mediciones, setMediciones] = useState<Record<string, unknown>[]>([])
  const [planes, setPlanes] = useState<Record<string, unknown>[]>([])
  const [seguimientos, setSeguimientos] = useState<Record<string, unknown>[]>([])
  const [diagnosticos, setDiagnosticos] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setInicializando(false)
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      try {
        const p = await obtenerPaciente(id)
        setPaciente(p)
        await Promise.all([
          cargarHistoria(),
          cargarMediciones(),
          cargarPlanes(),
          cargarSeguimientos(),
          cargarDiagnosticos(),
        ])
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
  const cargarDiagnosticos = async () => {
    const q = query(collection(db, `pacientes/${id}/diagnosticos`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    setDiagnosticos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const handleEliminar = async () => {
    try { await eliminarPaciente(id); router.push('/pacientes') }
    catch (e) { console.error(e) }
  }

  // ── Descargar reporte PDF completo del paciente ──────────────────────────
  const descargarReporte = async () => {
    const elemento = reporteRef.current
    if (!elemento || !paciente) return
    setDescargando(true)

    const botones = elemento.querySelectorAll('button, a')
    botones.forEach(b => ((b as HTMLElement).style.display = 'none'))

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

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
      const margin = 10
      const imgWidth = pageWidth - margin * 2
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let posY = margin
      let alturaRestante = imgHeight
      pdf.addImage(imgData, 'PNG', margin, posY, imgWidth, imgHeight)
      alturaRestante -= (pageHeight - margin * 2)

      while (alturaRestante > 0) {
        posY = alturaRestante - imgHeight + margin
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', margin, posY, imgWidth, imgHeight)
        alturaRestante -= (pageHeight - margin * 2)
      }

      pdf.save(`Expediente_${paciente.nombre.replace(/ /g, '_')}.pdf`)
    } catch (e) {
      console.error(e)
      alert('Error al generar el PDF')
    } finally {
      botones.forEach(b => ((b as HTMLElement).style.display = ''))
      setDescargando(false)
    }
  }

  const formatFecha = (ts: unknown) => {
    if (!ts) return '—'
    try {
      return (ts as { toDate: () => Date }).toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch { return '—' }
  }

  if (inicializando || cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!paciente) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#FAF7F2' }}>
      <p style={{ color: '#6B4F3A', fontFamily: "'Lato', sans-serif" }}>Paciente no encontrado</p>
      <Link href="/pacientes" style={{ color: '#7B1B2A', fontSize: '14px', fontFamily: "'Lato', sans-serif" }}>← Volver</Link>
    </div>
  )

  const modulos = [
    { nombre: 'Historia Clínica', icono: '📋', href: `/pacientes/${id}/historia`, listo: true },
    { nombre: 'Antropometría', icono: '📏', href: `/pacientes/${id}/antropometria`, listo: true },
    { nombre: 'Diagnóstico', icono: '🩺', href: `/pacientes/${id}/diagnostico`, listo: true },
    { nombre: 'Plan Nutricional IA', icono: '🧠', href: `/pacientes/${id}/plan`, listo: true },
    { nombre: 'Seguimiento', icono: '📊', href: `/pacientes/${id}/seguimiento`, listo: true },
    { nombre: 'Expediente Completo', icono: '🗂️', href: `/pacientes/${id}/expediente`, listo: true },
  ]

  const ultimaDiag = diagnosticos[0] as Record<string, unknown> | undefined
  const ultimaMed = mediciones[0] as Record<string, unknown> | undefined
  const ultimoPlan = planes[0] as Record<string, unknown> | undefined
  const ultimoSeg = seguimientos[0] as Record<string, unknown> | undefined

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── HEADER ── */}
      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Link href="/dashboard" style={{ color: '#9B7B65', textDecoration: 'none' }}>Dashboard</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href="/pacientes" style={{ color: '#9B7B65', textDecoration: 'none' }}>Pacientes</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <span style={{ color: '#2C1810', fontWeight: '600' }}>{paciente.nombre}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* ── BOTÓN DESCARGAR REPORTE ── */}
            <button
              onClick={descargarReporte}
              disabled={descargando}
              style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                border: 'none', cursor: descargando ? 'not-allowed' : 'pointer',
                background: descargando ? '#E8DDD0' : 'linear-gradient(135deg, #1B4F7B, #2E6FA0)',
                color: descargando ? '#9B7B65' : 'white',
                fontFamily: "'Lato', sans-serif",
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {descargando
                ? <><div style={{ width: '12px', height: '12px', border: '2px solid #9B7B65', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Generando...</>
                : '📄 Descargar Expediente'}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', border: '1.5px solid #F5C2C7', background: 'white', color: '#9B2335', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}
            >
              Eliminar
            </button>
          </div>
        </div>
      </header>

      {/* ── ÁREA DEL REPORTE (capturada para PDF) ── */}
      <div ref={reporteRef} style={{ background: '#FAF7F2' }}>
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

          {/* Perfil */}
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8DDD0', padding: '28px', marginBottom: '24px', boxShadow: '0 2px 12px rgba(44,24,16,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: '700', fontFamily: "'Playfair Display', serif" }}>
                {paciente.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>{paciente.nombre}</h1>
                <p style={{ fontSize: '14px', color: '#9B7B65' }}>{paciente.edad} años · {paciente.sexo} · {paciente.fechaNacimiento}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
              {[
                { label: 'TUTOR', valor: paciente.tutor },
                { label: 'TELÉFONO', valor: paciente.telefono },
                { label: 'CORREO', valor: paciente.correo },
              ].map(d => (
                <div key={d.label}>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>{d.label}</p>
                  <p style={{ fontSize: '14px', color: '#2C1810' }}>{d.valor || '—'}</p>
                </div>
              ))}
            </div>

            <div style={{ background: '#FAF7F2', borderRadius: '12px', padding: '14px 18px', border: '1px solid #E8DDD0' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>MOTIVO DE CONSULTA</p>
              <p style={{ fontSize: '14px', color: '#2C1810', lineHeight: '1.6' }}>{paciente.motivoConsulta}</p>
            </div>

            {paciente.correoAcceso && (
              <div style={{ marginTop: '16px', background: '#F0FAF4', borderRadius: '12px', padding: '18px', border: '1px solid #95D5A8' }}>
                <p style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#2D6A4F', marginBottom: '10px' }}>ACCESO PORTAL PADRES</p>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6B4F3A', marginBottom: '4px' }}>Usuario</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#2C1810' }}>{paciente.correoAcceso}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#6B4F3A', marginBottom: '4px' }}>Contraseña</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#2C1810' }}>{paciente.passwordAcceso}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resumen clínico */}
          {(ultimaDiag || ultimaMed || ultimoPlan || ultimoSeg) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {ultimaDiag && (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '20px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>🩺 Diagnóstico Nutricional</p>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: '#7B1B2A', marginBottom: '6px' }}>{String(ultimaDiag.diagnosticoNutricional || '—')}</p>
                  {!!ultimaDiag.diagnosticoNeuropediatra && <p style={{ fontSize: '13px', color: '#6B4F3A' }}>Neuropediatra: {String(ultimaDiag.diagnosticoNeuropediatra)}</p>}
                  {Array.isArray(!!ultimaDiag.restriccionesAlimentarias) && (ultimaDiag.restriccionesAlimentarias as string[]).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                      {(ultimaDiag.restriccionesAlimentarias as string[]).map((r: string) => (
                        <span key={r} style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', background: '#FDECEA', color: '#9B2335' }}>{r}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {ultimaMed && (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '20px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>📏 Última Medición — {formatFecha(ultimaMed.fechaCreacion || ultimaMed.fecha)}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { l: 'Peso', v: `${ultimaMed.peso} kg` },
                      { l: 'Talla', v: `${ultimaMed.talla} cm` },
                      { l: 'IMC', v: String(ultimaMed.imc) },
                      { l: 'P/Edad', v: `P${ultimaMed.percentilPeso}` },
                      { l: 'T/Edad', v: `P${ultimaMed.percentilTalla}` },
                    ].map(d => (
                      <div key={d.l} style={{ background: '#FAF7F2', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: '#9B7B65', marginBottom: '2px' }}>{d.l}</p>
                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#2C1810' }}>{String(d.v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Historia clínica resumida */}
          {historia && (
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '20px', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>📋 Historia Clínica</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { l: 'Diagnósticos previos', v: historia.diagnosticosPrevios },
                  { l: 'Alergias', v: historia.alergias },
                  { l: 'Intolerancias', v: historia.intolerancias },
                  { l: 'Alimentos favoritos', v: historia.alimentosFavoritos },
                  { l: 'Alimentos rechazados', v: historia.alimentosRechazados },
                  { l: 'Texturas aceptadas', v: historia.texturasAceptadas },
                  { l: 'Presupuesto familiar', v: historia.presupuestoAlimentario },
                ].filter(d => d.v).map(d => (
                  <div key={String(d.l)}>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#9B7B65', marginBottom: '2px' }}>{String(d.l)}</p>
                    <p style={{ fontSize: '13px', color: '#2C1810' }}>{String(d.v)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Último plan resumido */}
          {ultimoPlan && (() => {
            const textoRaw = String(ultimoPlan.texto || '')
            // Extraer objetivos del tratamiento (bullet points de la primera sección)
            const objetivosMatch = textoRaw.match(/OBJETIVOS[^\n]*\n([\s\S]*?)(?=###|##|\n\n\n|$)/i)
            const objetivosBullets = objetivosMatch
              ? objetivosMatch[1].split('\n').map(l => l.trim()).filter(l => l.startsWith('- ') || l.startsWith('* ')).slice(0, 3)
              : []
            // Detectar días disponibles
            const diasRegex = /###\s+(LUNES|MARTES|MIÉRCOLES|MIERCOLES|JUEVES|VIERNES|SÁBADO|SABADO|DOMINGO)/gi
            const diasEncontrados: string[] = []
            let m; while ((m = diasRegex.exec(textoRaw)) !== null) diasEncontrados.push(m[1])
            return (
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px' }}>🧠 Último Plan Nutricional IA</p>
                  <p style={{ fontSize: '11px', color: '#9B7B65' }}>{formatFecha(ultimoPlan.fechaCreacion)}</p>
                </div>

                {/* Días del plan */}
                {diasEncontrados.length > 0 && (
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO']
                      .filter(d => diasEncontrados.some(de => de.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase() === d.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()))
                      .map(d => (
                        <span key={d} style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '10px', background: '#F5E8EB', color: '#7B1B2A', fontWeight: '700', letterSpacing: '0.3px' }}>
                          {d.slice(0,3)}
                        </span>
                      ))
                    }
                  </div>
                )}

                {/* Objetivos */}
                {objetivosBullets.length > 0 ? (
                  <div style={{ marginBottom: '12px' }}>
                    {objetivosBullets.map((b, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '5px' }}>
                        <span style={{ color: '#A63244', fontWeight: '700', flexShrink: 0, fontSize: '14px', lineHeight: '1.5' }}>•</span>
                        <p style={{ fontSize: '13px', color: '#2C1810', lineHeight: '1.5', margin: 0 }}>
                          {b.replace(/^[-*] /, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                        </p>
                      </div>
                    ))}
                    {(textoRaw.match(/OBJETIVOS[^\n]*\n([\s\S]*?)(?=###|##|\n\n\n|$)/i)?.[1] ?? '')
                      .split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* ')).length > 3 && (
                      <p style={{ fontSize: '11px', color: '#9B7B65', marginTop: '4px' }}>y más objetivos…</p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#9B7B65', marginBottom: '12px', fontStyle: 'italic' }}>
                    Plan de {diasEncontrados.length > 0 ? `${diasEncontrados.length} días` : 'alimentación'} generado
                  </p>
                )}

                <Link href={`/pacientes/${id}/plan`} style={{ fontSize: '12px', color: '#7B1B2A', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 14px', border: '1.5px solid #7B1B2A', borderRadius: '8px' }}>
                  Ver plan completo →
                </Link>
              </div>
            )
          })()}

          {/* Módulos */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#8B6914', marginBottom: '16px' }}>Módulos Clínicos</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {modulos.map(mod => (
                <Link key={mod.nombre} href={mod.listo ? mod.href : '#'}
                  style={{
                    background: 'white', borderRadius: '14px', border: '1px solid #E8DDD0',
                    padding: '22px', textDecoration: 'none', display: 'block',
                    opacity: mod.listo ? 1 : 0.5, cursor: mod.listo ? 'pointer' : 'not-allowed'
                  }}>
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '10px' }}>{mod.icono}</span>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>{mod.nombre}</p>
                  <p style={{ fontSize: '12px', color: mod.listo ? '#2D6A4F' : '#9B7B65', fontWeight: '500' }}>
                    {mod.listo ? '✓ Disponible' : 'Próximamente'}
                  </p>
                </Link>
              ))}
            </div>
          </div>

        </main>
      </div>

      {/* Modal eliminar */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '100%', boxShadow: '0 8px 40px rgba(44,24,16,0.2)' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', marginBottom: '10px' }}>¿Eliminar expediente?</h3>
            <p style={{ color: '#6B4F3A', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Se eliminará permanentemente el expediente de <strong>{paciente.nombre}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A', cursor: 'pointer', fontFamily: "'Lato', sans-serif", fontWeight: '600' }}>Cancelar</button>
              <button onClick={handleEliminar} style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', background: '#9B2335', color: 'white', border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif", fontWeight: '600' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}