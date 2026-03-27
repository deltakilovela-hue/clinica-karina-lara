'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPacientes, Paciente } from '@/lib/pacientes'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

const MODULOS = [
  { nombre: 'Gestión de Pacientes', desc: 'Crear y administrar expedientes', href: '/pacientes', icono: '👥', activo: true },
  { nombre: 'Historia Clínica',     desc: 'Antecedentes y diagnósticos',    href: '/pacientes', icono: '📋', activo: true },
  { nombre: 'Antropometría',        desc: 'Peso, talla y percentiles OMS',  href: '/pacientes', icono: '📏', activo: true },
  { nombre: 'Plan Nutricional IA',  desc: 'Generado con Claude AI',         href: '/pacientes', icono: '🧠', activo: true },
  { nombre: 'Seguimiento Digestivo',desc: 'Evolución y síntomas GI',        href: '/pacientes', icono: '📊', activo: true },
  { nombre: 'Expediente Completo',  desc: 'Historial integral del paciente',href: '/pacientes', icono: '🗂️', activo: true },
]

export default function DashboardPage() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [cargando, setCargando] = useState(true)
  const [usuario, setUsuario] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      setUsuario(user.displayName || user.email || '')
      try { setPacientes(await obtenerPacientes()) } catch {}
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router])

  if (cargando) return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )

  const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const saludo = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'

  const nuevosEsteMes = pacientes.filter(p => {
    if (!p.fechaCreacion) return false
    const f = p.fechaCreacion.toDate(), a = new Date()
    return f.getMonth() === a.getMonth() && f.getFullYear() === a.getFullYear()
  }).length

  const STATS = [
    { label: 'Pacientes Activos', valor: pacientes.length, color: '#7B1B2A', icon: '👥' },
    { label: 'Consultas Hoy',     valor: 0,                color: '#8B6914', icon: '📅' },
    { label: 'Nuevos este Mes',   valor: nuevosEsteMes,    color: '#2D6A4F', icon: '✨' },
    { label: 'Planes Generados',  valor: 0,                color: '#1B5F8C', icon: '🧠' },
  ]

  return (
    <div className="app-layout">
      <Sidebar usuario={usuario} />

      <main className="app-main" style={{ padding: '40px 40px 60px' }}>
        {/* ── Page header ──────────────────────────────────────── */}
        <div className="page-header fade-in">
          <div>
            <h1 className="page-title">
              {saludo}, <span>Karina</span>
            </h1>
            <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{hoy}</p>
          </div>
          <Link href="/pacientes/nuevo" className="btn-primary">
            + Nuevo Paciente
          </Link>
        </div>

        {/* ── Stats ────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '36px' }}>
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="stat-card fade-in"
              style={{ borderLeftColor: s.color, animationDelay: `${i * 60}ms` }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
                <p className="stat-number" style={{ color: s.color }}>{s.valor}</p>
                <span style={{ fontSize: '22px', opacity: 0.7 }}>{s.icon}</span>
              </div>
              <p className="stat-label">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Módulos ──────────────────────────────────────────── */}
        <div style={{ marginBottom: '36px' }}>
          <p className="section-label">Módulos del sistema</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {MODULOS.map((mod, i) => (
              <Link
                key={mod.nombre}
                href={mod.href}
                className="card card-hover fade-in"
                style={{ padding: '24px', textDecoration: 'none', display: 'block', animationDelay: `${i * 50}ms` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #FAF7F2, #F2EDE4)',
                    border: '1px solid #E8DDD0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px',
                  }}>{mod.icono}</div>
                  <span className="badge badge-success">Activo</span>
                </div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>{mod.nombre}</p>
                <p style={{ fontSize: '12px', color: '#9B7B65' }}>{mod.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Últimos pacientes ─────────────────────────────────── */}
        {pacientes.length === 0 ? (
          <div className="card fade-in" style={{ padding: '60px', textAlign: 'center', border: '2px dashed #E8DDD0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👶</div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#2C1810', marginBottom: '8px' }}>Sin pacientes aún</p>
            <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '28px' }}>Comienza creando el primer expediente clínico</p>
            <Link href="/pacientes/nuevo" className="btn-primary">+ Crear Primer Paciente</Link>
          </div>
        ) : (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <p className="section-label" style={{ marginBottom: 0 }}>Últimos pacientes</p>
              <Link href="/pacientes" style={{ fontSize: '13px', color: '#7B1B2A', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Ver todos →
              </Link>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {pacientes.slice(0, 6).map((p, i) => (
                <Link
                  key={p.id}
                  href={`/pacientes/${p.id}`}
                  className="patient-row"
                  style={{ borderBottom: i < Math.min(pacientes.length, 6) - 1 ? '1px solid #F2EDE4' : 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="avatar" style={{ width: '42px', height: '42px', fontSize: '17px' }}>
                      {p.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', color: '#2C1810', fontSize: '14px', marginBottom: '2px' }}>{p.nombre}</p>
                      <p style={{ fontSize: '12px', color: '#9B7B65' }}>{p.edad} años · Tutor: {p.tutor}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{p.sexo}</span>
                    <span style={{ fontSize: '12px', color: '#C9B8A8' }}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
