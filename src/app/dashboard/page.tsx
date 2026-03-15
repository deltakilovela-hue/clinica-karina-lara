'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPacientes, Paciente } from '@/lib/pacientes'
import Link from 'next/link'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

export default function DashboardPage() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [cargando, setCargando] = useState(true)
  const [usuario, setUsuario] = useState<string>('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/'); return }
      if (!ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      setUsuario(user?.displayName || user?.email || '')
      try {
        const lista = await obtenerPacientes()
        setPacientes(lista)
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router])

  const cerrarSesion = async () => { await signOut(auth); router.replace('/') }
  const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const modulos = [
    { nombre: 'Gestión de Pacientes', desc: 'Crear y administrar expedientes', href: '/pacientes', icono: '👥', activo: true },
    { nombre: 'Historia Clínica', desc: 'Antecedentes y diagnósticos', href: '#', icono: '📋', activo: true },
    { nombre: 'Antropometría', desc: 'Peso, talla y percentiles OMS', href: '#', icono: '📏', activo: true },
    { nombre: 'Plan Nutricional IA', desc: 'Generado con Claude API', href: '#', icono: '🧠', activo: true },
    { nombre: 'Seguimiento Digestivo', desc: 'Evolución y síntomas GI', href: '#', icono: '📊', activo: false },
    { nombre: 'Expediente Completo', desc: 'Historial integral', href: '#', icono: '🗂️', activo: false },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: '700', fontFamily: "'Playfair Display', serif" }}>KL</div>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: '600', fontSize: '16px', color: '#2C1810' }}>Clínica Karina Lara</p>
              <p style={{ fontSize: '11px', color: '#8B6914' }}>Nutrición Clínica Especializada</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <p style={{ fontSize: '13px', color: '#9B7B65' }}>{hoy}</p>
            <p style={{ fontSize: '13px', color: '#6B4F3A' }}>{usuario}</p>
            <button onClick={cerrarSesion} style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '13px', border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>Salir</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '32px', fontWeight: '600', color: '#2C1810', marginBottom: '6px' }}>
            Buenos días, <span style={{ color: '#7B1B2A' }}>Karina</span>
          </h1>
          <p style={{ color: '#9B7B65', fontSize: '14px' }}>{hoy}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Pacientes Activos', valor: pacientes.length, color: '#7B1B2A' },
            { label: 'Consultas Hoy', valor: 0, color: '#8B6914' },
            { label: 'Nuevos este Mes', valor: pacientes.filter(p => {
              if (!p.fechaCreacion) return false
              const f = p.fechaCreacion.toDate(), a = new Date()
              return f.getMonth() === a.getMonth() && f.getFullYear() === a.getFullYear()
            }).length, color: '#2D6A4F' },
            { label: 'Planes Generados', valor: 0, color: '#1B4F7B' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'white', borderRadius: '14px', border: '1px solid #E8DDD0', padding: '20px 24px' }}>
              <p style={{ fontSize: '36px', fontWeight: '300', color: stat.color, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{stat.valor}</p>
              <p style={{ fontSize: '11px', color: '#9B7B65', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#8B6914', marginBottom: '16px' }}>Módulos del Sistema</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {modulos.map(mod => (
              <Link key={mod.nombre} href={mod.activo ? mod.href : '#'} style={{
                background: 'white', borderRadius: '14px', border: '1px solid #E8DDD0',
                padding: '24px', textDecoration: 'none', display: 'block',
                opacity: mod.activo ? 1 : 0.5, cursor: mod.activo ? 'pointer' : 'not-allowed'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{mod.icono}</span>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '600', background: mod.activo ? '#D8F3DC' : '#F2EDE4', color: mod.activo ? '#2D6A4F' : '#9B7B65' }}>
                    {mod.activo ? 'Activo' : 'Próximo'}
                  </span>
                </div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>{mod.nombre}</p>
                <p style={{ fontSize: '13px', color: '#9B7B65' }}>{mod.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {pacientes.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #E8DDD0', padding: '48px', textAlign: 'center' }}>
            <p style={{ fontSize: '40px', marginBottom: '16px' }}>👶</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', marginBottom: '8px' }}>Sin pacientes registrados</p>
            <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '24px' }}>Comienza creando el primer expediente clínico</p>
            <Link href="/pacientes/nuevo" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '10px', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>+ Crear Primer Paciente</Link>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#8B6914' }}>Últimos Pacientes</h2>
              <Link href="/pacientes" style={{ fontSize: '13px', color: '#7B1B2A', textDecoration: 'none', fontWeight: '600' }}>Ver todos →</Link>
            </div>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', overflow: 'hidden' }}>
              {pacientes.slice(0, 5).map((p, i) => (
                <Link key={p.id} href={`/pacientes/${p.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', textDecoration: 'none', borderBottom: i < Math.min(pacientes.length, 5) - 1 ? '1px solid #F2EDE4' : 'none', background: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F5E8EB', color: '#7B1B2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', fontFamily: "'Playfair Display', serif" }}>
                      {p.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', color: '#2C1810', fontSize: '15px', marginBottom: '2px' }}>{p.nombre}</p>
                      <p style={{ fontSize: '12px', color: '#9B7B65' }}>{p.edad} años · Tutor: {p.tutor}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: '#F2EDE4', color: '#6B4F3A', textTransform: 'capitalize', fontWeight: '500' }}>{p.sexo}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}