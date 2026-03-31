'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPacientes, Paciente } from '@/lib/pacientes'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

// ─── Íconos SVG de módulos ────────────────────────────────────────────────────
const ModuloIconos: Record<string, ReactElement> = {
  pacientes: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  historia: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  antropometria: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
    </svg>
  ),
  plan: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
      <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
    </svg>
  ),
  seguimiento: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  ),
  expediente: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
}

const MODULOS = [
  { nombre: 'Gestión de Pacientes', desc: 'Crear y administrar expedientes', href: '/pacientes', icono: 'pacientes', color: '#7B1B2A', bg: '#F5E8EB' },
  { nombre: 'Historia Clínica',     desc: 'Antecedentes y diagnósticos',    href: '/pacientes', icono: 'historia',     color: '#2D6A4F', bg: '#F0FAF5' },
  { nombre: 'Antropometría',        desc: 'Peso, talla y percentiles OMS',  href: '/pacientes', icono: 'antropometria', color: '#1B4F8C', bg: '#EEF4FB' },
  { nombre: 'Plan Nutricional IA',  desc: 'Generado con Claude AI',         href: '/pacientes', icono: 'plan',         color: '#5C3D8F', bg: '#F3EEFB' },
  { nombre: 'Seguimiento Digestivo',desc: 'Evolución y síntomas GI',        href: '/pacientes', icono: 'seguimiento',  color: '#8B6914', bg: '#FDF6E3' },
  { nombre: 'Expediente Completo',  desc: 'Historial integral del paciente',href: '/pacientes', icono: 'expediente',   color: '#7B1B2A', bg: '#FAF7F2' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [cargando, setCargando]   = useState(true)
  const [usuario, setUsuario]     = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      setUsuario(user.displayName || user.email || '')
      try { setPacientes(await obtenerPacientes()) } catch { /* silent */ }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router])

  if (cargando) return (
    <div className="loading-screen">
      <div style={{
        width: '44px', height: '44px', borderRadius: '11px',
        background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '700', color: 'white',
        boxShadow: '0 4px 16px rgba(123,27,42,0.3)', marginBottom: '4px',
      }}>KL</div>
      <div className="spinner" />
    </div>
  )

  const ahora = new Date()
  const h = ahora.getHours()
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  const fechaFormato = ahora.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const nuevosEsteMes = pacientes.filter(p => {
    if (!p.fechaCreacion) return false
    const f = p.fechaCreacion.toDate()
    return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear()
  }).length

  const STATS = [
    { label: 'Pacientes Activos', valor: pacientes.length, acento: '#7B1B2A',  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { label: 'Consultas Hoy',     valor: 0,               acento: '#8B6914',  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { label: 'Nuevos este Mes',   valor: nuevosEsteMes,   acento: '#2D6A4F',  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
    { label: 'Planes Generados',  valor: 0,               acento: '#1B4F8C',  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg> },
  ]

  return (
    <div className="app-layout">
      <Sidebar usuario={usuario} />

      <main className="app-main">

        {/* ── Page header ── */}
        <div className="page-header fade-in">
          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#C4A35A', marginBottom: '6px' }}>
              Panel de Control
            </p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '600', color: '#2C1810', lineHeight: 1.2 }}>
              {saludo}, <span style={{ color: '#7B1B2A' }}>Karina</span>
            </h1>
            <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{fechaFormato}</p>
          </div>
          <Link href="/pacientes/nuevo" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Paciente
          </Link>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="stat-card fade-in"
              style={{ borderLeftColor: s.acento, animationDelay: `${i * 60}ms` }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
                <p className="stat-number" style={{ color: s.acento }}>{s.valor}</p>
                <span style={{ color: s.acento, opacity: 0.55, marginTop: '4px' }}>{s.icon}</span>
              </div>
              <p className="stat-label">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Módulos ── */}
        <div style={{ marginBottom: '40px' }}>
          <p className="section-label">Módulos del sistema</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {MODULOS.map((mod, i) => (
              <Link
                key={mod.nombre}
                href={mod.href}
                className="fade-in"
                style={{
                  display: 'block', padding: '22px', textDecoration: 'none',
                  borderRadius: '14px', border: '1px solid #E8DDD0',
                  background: 'white', boxShadow: '0 1px 6px rgba(44,24,16,0.05)',
                  transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
                  animationDelay: `${i * 50}ms`,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.boxShadow = '0 6px 24px rgba(44,24,16,0.10)'
                  el.style.transform = 'translateY(-2px)'
                  el.style.borderColor = '#C9B8A8'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.boxShadow = '0 1px 6px rgba(44,24,16,0.05)'
                  el.style.transform = 'translateY(0)'
                  el.style.borderColor = '#E8DDD0'
                }}
              >
                {/* Ícono con color temático */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: mod.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: '16px',
                  color: mod.color,
                }}>
                  {ModuloIconos[mod.icono]}
                </div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>
                  {mod.nombre}
                </p>
                <p style={{ fontSize: '12px', color: '#9B7B65', lineHeight: 1.5 }}>{mod.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Últimos pacientes ── */}
        {pacientes.length === 0 ? (
          <div className="card fade-in" style={{ padding: '56px', textAlign: 'center', border: '2px dashed #E8DDD0', boxShadow: 'none' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F5E8EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#7B1B2A' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', marginBottom: '8px' }}>Sin pacientes registrados</p>
            <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '24px' }}>Comienza creando el primer expediente clínico</p>
            <Link href="/pacientes/nuevo" className="btn-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Crear Primer Paciente
            </Link>
          </div>
        ) : (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <p className="section-label" style={{ marginBottom: 0 }}>Últimos pacientes</p>
              <Link href="/pacientes" style={{ fontSize: '13px', color: '#7B1B2A', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Ver todos
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Encabezado */}
              <div style={{ display: 'flex', padding: '10px 24px', background: '#FDFBF8', borderBottom: '1px solid #F2EDE4' }}>
                <span style={{ flex: 3, fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', color: '#8B6914' }}>Paciente</span>
                <span style={{ flex: 2, fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', color: '#8B6914' }}>Edad · Sexo</span>
                <span style={{ flex: 2, fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', color: '#8B6914' }}>Tutor</span>
                <span style={{ width: '24px' }} />
              </div>

              {pacientes.slice(0, 6).map(p => (
                <Link
                  key={p.id}
                  href={`/pacientes/${p.id}`}
                  className="patient-row"
                >
                  <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: '13px' }}>
                    <div className="avatar" style={{ width: '38px', height: '38px', fontSize: '15px' }}>
                      {p.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', color: '#2C1810', fontSize: '14px', marginBottom: '1px' }}>{p.nombre}</p>
                      <p style={{ fontSize: '12px', color: '#9B7B65', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.motivoConsulta}
                      </p>
                    </div>
                  </div>
                  <div style={{ flex: 2 }}>
                    <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{p.edad} años · {p.sexo}</span>
                  </div>
                  <div style={{ flex: 2 }}>
                    <p style={{ fontSize: '13px', color: '#6B4F3A' }}>{p.tutor}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9B8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
