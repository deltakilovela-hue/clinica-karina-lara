'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPacientes, Paciente } from '@/lib/pacientes'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

export default function PacientesPage() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [usuario, setUsuario] = useState('')
  const [vista, setVista] = useState<'lista' | 'grid'>('lista')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      setUsuario(user.displayName || user.email || '')
      try { setPacientes(await obtenerPacientes()) } catch {}
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router])

  const filtrados = pacientes.filter(p =>
    p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    p.tutor.toLowerCase().includes(filtro.toLowerCase()) ||
    p.motivoConsulta.toLowerCase().includes(filtro.toLowerCase())
  )

  if (cargando) return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )

  return (
    <div className="app-layout">
      <Sidebar usuario={usuario} />

      <main className="app-main" style={{ padding: '40px 40px 60px' }}>
        {/* ── Breadcrumb ──────────────────────────────────────── */}
        <div className="breadcrumb fade-in">
          <Link href="/dashboard">Dashboard</Link>
          <span>/</span>
          <span className="current">Pacientes</span>
        </div>

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="page-header fade-in">
          <div>
            <h1 className="page-title">Gestión de <span>Pacientes</span></h1>
            <p className="page-subtitle">
              {pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''} registrado{pacientes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/pacientes/nuevo" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Paciente
          </Link>
        </div>

        {/* ── Search + toggle ──────────────────────────────────── */}
        <div className="fade-in" style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
          <div className="search-wrapper">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              className="search-input"
              type="text"
              placeholder="Buscar por nombre, tutor o motivo de consulta..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
            />
          </div>
          {/* Vista toggle */}
          <div style={{ display: 'flex', border: '1.5px solid #E8DDD0', borderRadius: '10px', overflow: 'hidden', background: 'white' }}>
            {([
              { v: 'lista' as const, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
              { v: 'grid' as const,  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg> },
            ]).map(({ v, icon }) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                style={{
                  padding: '9px 13px', border: 'none', cursor: 'pointer',
                  background: vista === v ? '#F5E8EB' : 'white',
                  color: vista === v ? '#7B1B2A' : '#9B7B65',
                  display: 'flex', alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── Results ──────────────────────────────────────────── */}
        {filtrados.length === 0 ? (
          <div className="card fade-in" style={{ padding: '60px', textAlign: 'center', border: '2px dashed #E8DDD0', boxShadow: 'none' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#F5E8EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#7B1B2A' }}>
              {filtro
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              }
            </div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', marginBottom: '8px' }}>
              {filtro ? 'Sin resultados' : 'Sin pacientes registrados'}
            </p>
            <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '24px' }}>
              {filtro ? `No se encontró "${filtro}"` : 'Registra tu primer paciente para comenzar'}
            </p>
            {!filtro && (
              <Link href="/pacientes/nuevo" className="btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Crear Primer Paciente
              </Link>
            )}
          </div>
        ) : vista === 'lista' ? (
          /* ── Vista lista ─────────────────────────────────── */
          <div className="card fade-in" style={{ overflow: 'hidden' }}>
            {/* Encabezado tabla */}
            <div style={{ display: 'flex', padding: '10px 24px', background: '#FFFAF7', borderBottom: '1px solid #F2EDE4' }}>
              <span style={{ flex: 3, fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', color: '#8B6914' }}>Paciente</span>
              <span style={{ flex: 2, fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', color: '#8B6914' }}>Tutor</span>
              <span style={{ flex: 2, fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', color: '#8B6914' }}>Motivo</span>
              <span style={{ flex: 1, fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', color: '#8B6914', textAlign: 'right' }}>Fecha</span>
            </div>
            {filtrados.map((p, i) => (
              <Link
                key={p.id}
                href={`/pacientes/${p.id}`}
                className="patient-row"
                style={{ borderBottom: i < filtrados.length - 1 ? '1px solid #F2EDE4' : 'none' }}
              >
                <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                    {p.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: '600', color: '#2C1810', fontSize: '14px', marginBottom: '2px' }}>{p.nombre}</p>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#9B7B65' }}>{p.edad} años</span>
                      <span className="badge badge-muted" style={{ fontSize: '10px', padding: '1px 7px', textTransform: 'capitalize' }}>{p.sexo}</span>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 2 }}>
                  <p style={{ fontSize: '13px', color: '#6B4F3A', fontWeight: '500' }}>{p.tutor}</p>
                  <p style={{ fontSize: '12px', color: '#9B7B65' }}>{p.telefono}</p>
                </div>
                <div style={{ flex: 2 }}>
                  <p style={{ fontSize: '12px', color: '#9B7B65', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                    {p.motivoConsulta.substring(0, 55)}{p.motivoConsulta.length > 55 ? '…' : ''}
                  </p>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  {p.fechaCreacion && (
                    <p style={{ fontSize: '12px', color: '#C9B8A8' }}>
                      {p.fechaCreacion.toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9B8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* ── Vista grid ──────────────────────────────────── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }} className="fade-in">
            {filtrados.map((p, i) => (
              <Link
                key={p.id}
                href={`/pacientes/${p.id}`}
                className="card card-hover"
                style={{ padding: '22px', textDecoration: 'none', display: 'block', animationDelay: `${i * 30}ms` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
                    {p.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: '600', color: '#2C1810', fontSize: '15px', marginBottom: '2px' }}>{p.nombre}</p>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <span style={{ fontSize: '12px', color: '#9B7B65' }}>{p.edad} años</span>
                      <span className="badge badge-muted" style={{ fontSize: '10px', padding: '1px 7px', textTransform: 'capitalize' }}>{p.sexo}</span>
                    </div>
                  </div>
                </div>
                <hr className="divider" style={{ margin: '0 0 12px' }} />
                <div className="info-field" style={{ marginBottom: '8px' }}>
                  <span className="info-label">Tutor</span>
                  <span className="info-value">{p.tutor}</span>
                </div>
                <div className="info-field">
                  <span className="info-label">Motivo</span>
                  <span className="info-value" style={{ fontSize: '13px', color: '#9B7B65' }}>
                    {p.motivoConsulta.substring(0, 60)}{p.motivoConsulta.length > 60 ? '…' : ''}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {filtrados.length > 0 && (
          <p style={{ fontSize: '12px', color: '#C9B8A8', textAlign: 'center', marginTop: '20px' }}>
            {filtrados.length} de {pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''}
          </p>
        )}
      </main>
    </div>
  )
}
