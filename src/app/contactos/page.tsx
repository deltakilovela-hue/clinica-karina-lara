'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPacientes, Paciente } from '@/lib/pacientes'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

function limpiarTel(tel: string) {
  // Quitar todo excepto dígitos y +
  return tel.replace(/[\s\-\(\)\.]/g, '')
}

function whatsappLink(tel: string) {
  const limpio = limpiarTel(tel)
  // Si empieza con + ya es internacional; si no, asumimos México (+52)
  const num = limpio.startsWith('+') ? limpio.slice(1) : limpio.startsWith('52') ? limpio : `52${limpio}`
  return `https://wa.me/${num}`
}

function telLink(tel: string) {
  return `tel:${limpiarTel(tel)}`
}

// Iniciales del tutor
function iniciales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// Color determinista por inicial
const COLORES = ['#7B1B2A', '#2D6A4F', '#1B4F8C', '#5C3D8F', '#8B6914', '#A63244', '#40916C']
function colorTutor(nombre: string) {
  const idx = nombre.charCodeAt(0) % COLORES.length
  return COLORES[idx]
}

export default function ContactosPage() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [cargando, setCargando]   = useState(true)
  const [usuario, setUsuario]     = useState('')
  const [busqueda, setBusqueda]   = useState('')
  const [copiado, setCopiado]     = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      setUsuario(user.displayName || user.email || '')
      try { setPacientes(await obtenerPacientes()) } catch { /* silent */ }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router])

  const copiar = (texto: string, clave: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(clave)
      setTimeout(() => setCopiado(null), 2000)
    }).catch(() => {})
  }

  if (cargando) return (
    <div className="loading-screen">
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // Agrupar por tutor (puede haber un tutor con varios pacientes)
  const tutorMap = new Map<string, { tutor: string; telefono: string; correo: string; pacientes: Paciente[] }>()
  pacientes.forEach(p => {
    const key = p.tutor?.toLowerCase().trim() || 'sin tutor'
    if (!tutorMap.has(key)) {
      tutorMap.set(key, { tutor: p.tutor || 'Sin nombre', telefono: p.telefono || '', correo: p.correo || '', pacientes: [] })
    }
    tutorMap.get(key)!.pacientes.push(p)
  })

  const tutores = Array.from(tutorMap.values()).sort((a, b) => a.tutor.localeCompare(b.tutor))
  const filtrados = busqueda.trim()
    ? tutores.filter(t =>
        t.tutor.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.telefono.includes(busqueda) ||
        t.correo.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.pacientes.some(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      )
    : tutores

  return (
    <div className="app-layout">
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } } .contacto-card { animation: fadeUp 0.25s ease both; transition: box-shadow 0.15s, transform 0.15s; } .contacto-card:hover { box-shadow: 0 6px 24px rgba(44,24,16,0.10) !important; transform: translateY(-2px); }`}</style>
      <Sidebar usuario={usuario} />

      <main className="app-main">

        {/* ── Header ── */}
        <div className="page-header fade-in">
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#C4A35A', marginBottom: '6px' }}>
              Directorio
            </p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '600', color: '#2C1810', lineHeight: 1.2 }}>
              Contactos de Tutores
            </h1>
            <p style={{ color: '#9B7B65', fontSize: '14px', marginTop: '4px' }}>{tutores.length} tutores registrados · {pacientes.length} pacientes</p>
          </div>
        </div>

        {/* ── Buscador ── */}
        <div style={{ marginBottom: '28px' }}>
          <div className="search-wrapper" style={{ maxWidth: '420px' }}>
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Buscar tutor, teléfono, paciente…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9B7B65', padding: '2px', display: 'flex', alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Lista de contactos ── */}
        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9B7B65' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C9B8A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#6B4F3A' }}>Sin resultados</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Intenta con otro término de búsqueda</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {filtrados.map((t, i) => {
              const tieneWA   = !!t.telefono
              const tieneCorr = !!t.correo
              const color     = colorTutor(t.tutor)
              const ini       = iniciales(t.tutor)

              return (
                <div
                  key={t.tutor}
                  className="contacto-card"
                  style={{
                    background: 'white', borderRadius: '16px',
                    border: '1px solid #E8DDD0', padding: '20px',
                    boxShadow: '0 2px 10px rgba(44,24,16,0.05)',
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  {/* ── Cabecera del tutor ── */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '16px', fontWeight: '700',
                      fontFamily: "'Playfair Display', serif", flexShrink: 0,
                    }}>{ini}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: '700', fontSize: '16px', color: '#2C1810', fontFamily: "'Playfair Display', serif", marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.tutor}</p>
                      <p style={{ fontSize: '12px', color: '#9B7B65' }}>
                        {t.pacientes.length === 1 ? t.pacientes[0].nombre : `${t.pacientes.length} pacientes`}
                      </p>
                    </div>
                  </div>

                  {/* ── Pacientes ── */}
                  {t.pacientes.length > 1 && (
                    <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {t.pacientes.map(p => (
                        <Link key={p.id} href={`/pacientes/${p.id}`} style={{
                          fontSize: '11px', padding: '3px 9px', borderRadius: '20px',
                          background: '#F5E8EB', color: '#7B1B2A', fontWeight: '600',
                          textDecoration: 'none',
                        }}>{p.nombre}</Link>
                      ))}
                    </div>
                  )}

                  {/* ── Teléfono ── */}
                  {t.telefono && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B7B65" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.69a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      <span style={{ fontSize: '13px', color: '#6B4F3A', flex: 1 }}>{t.telefono}</span>
                    </div>
                  )}

                  {/* ── Correo ── */}
                  {t.correo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B7B65" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <span style={{ fontSize: '13px', color: '#6B4F3A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.correo}</span>
                    </div>
                  )}

                  {/* ── Acciones ── */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

                    {/* WhatsApp */}
                    {tieneWA && (
                      <a
                        href={whatsappLink(t.telefono)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                          background: '#25D366', color: 'white', textDecoration: 'none',
                          flex: 1, justifyContent: 'center', boxShadow: '0 2px 8px rgba(37,211,102,0.25)',
                        }}
                      >
                        {/* WhatsApp icon */}
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </a>
                    )}

                    {/* Llamar */}
                    {tieneWA && (
                      <a
                        href={telLink(t.telefono)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                          background: 'white', color: '#6B4F3A', textDecoration: 'none',
                          border: '1.5px solid #E8DDD0',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.69a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        Llamar
                      </a>
                    )}

                    {/* Ver expediente (si tiene 1 paciente) */}
                    {t.pacientes.length === 1 && (
                      <Link
                        href={`/pacientes/${t.pacientes[0].id}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                          background: '#FAF7F2', color: '#7B1B2A', textDecoration: 'none',
                          border: '1.5px solid #E8DDD0',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Expediente
                      </Link>
                    )}
                  </div>

                  {/* Sin teléfono */}
                  {!t.telefono && (
                    <p style={{ fontSize: '12px', color: '#C9B8A8', fontStyle: 'italic', marginTop: '4px' }}>Sin teléfono registrado</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}
