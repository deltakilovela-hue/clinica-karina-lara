'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPacientes, Paciente } from '@/lib/pacientes'
import Link from 'next/link'

const CORREO_AUTORIZADO = 'Ln.karynalaras@gmail.com'

export default function DashboardPage() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [cargando, setCargando] = useState(true)
  const [usuario, setUsuario] = useState<string>('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || user.email !== CORREO_AUTORIZADO) {
        router.push('/')
        return
      }
      setUsuario(user.displayName || user.email || '')
      try {
        const lista = await obtenerPacientes()
        setPacientes(lista)
      } catch (e) {
        console.error(e)
      } finally {
        setCargando(false)
      }
    })
    return () => unsub()
  }, [router])

  const cerrarSesion = async () => {
    await signOut(auth)
    router.push('/')
  }

  const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a0a05' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-200/60 font-light tracking-widest text-sm uppercase">Cargando...</p>
        </div>
      </div>
    )
  }

  const modulos = [
    { nombre: 'Gestión de Pacientes', descripcion: 'Crear y administrar expedientes', href: '/pacientes', icono: '👥', listo: true },
    { nombre: 'Historia Clínica', descripcion: 'Antecedentes y diagnósticos', href: '#', icono: '📋', listo: false },
    { nombre: 'Antropometría', descripcion: 'Peso, talla y percentiles', href: '#', icono: '📏', listo: false },
    { nombre: 'Plan Nutricional IA', descripcion: 'Generado con Claude API', href: '#', icono: '🧠', listo: false },
    { nombre: 'Seguimiento Digestivo', descripcion: 'Evolución y síntomas GI', href: '#', icono: '📊', listo: false },
    { nombre: 'Expediente Completo', descripcion: 'Historial integral del paciente', href: '#', icono: '🗂️', listo: false },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a0a05 0%, #2d0f0a 50%, #1a0505 100%)' }}>
      <header style={{ borderBottom: '1px solid rgba(180, 120, 60, 0.2)', background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)', color: '#fff' }}>
              KL
            </div>
            <div>
              <h1 className="text-white font-semibold tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                Clínica Karina Lara
              </h1>
              <p className="text-xs" style={{ color: 'rgba(180,120,60,0.8)' }}>Nutrición Clínica Especializada</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-sm hidden md:block" style={{ color: 'rgba(255,255,255,0.4)' }}>{hoy}</p>
            <p className="text-sm text-white/70 hidden sm:block">{usuario}</p>
            <button onClick={cerrarSesion}
              className="text-xs px-4 py-2 rounded transition-all"
              style={{ border: '1px solid rgba(180,120,60,0.3)', color: 'rgba(180,120,60,0.8)' }}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h2 className="text-3xl font-light text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Buenos días, <span style={{ color: '#C43B3B' }}>Karina</span>
          </h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Sistema de gestión clínica nutricional pediátrica</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Pacientes Activos', valor: pacientes.length },
            { label: 'Consultas Hoy', valor: 0 },
            { label: 'Nuevos este Mes', valor: pacientes.filter(p => {
              if (!p.fechaCreacion) return false
              const fecha = p.fechaCreacion.toDate()
              const ahora = new Date()
              return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear()
            }).length },
            { label: 'Planes Generados', valor: 0 },
          ].map((stat) => (
            <div key={stat.label} className="p-5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-3xl font-light text-white mb-1">{stat.valor}</p>
              <p className="text-xs tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-10">
          <h3 className="text-xs font-semibold tracking-widest uppercase mb-5"
            style={{ color: 'rgba(180,120,60,0.7)' }}>Módulos del Sistema</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulos.map((mod) => (
              <Link key={mod.nombre} href={mod.listo ? mod.href : '#'}
                className={`group p-6 rounded-xl transition-all duration-300 ${mod.listo ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start justify-between mb-4">
                  <span className="text-2xl">{mod.icono}</span>
                  {mod.listo
                    ? <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(26,92,58,0.3)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>Activo</span>
                    : <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>Próximo</span>
                  }
                </div>
                <h4 className="text-white font-medium mb-1" style={{ fontFamily: 'Georgia, serif' }}>{mod.nombre}</h4>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{mod.descripcion}</p>
              </Link>
            ))}
          </div>
        </div>

        {pacientes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-semibold tracking-widest uppercase"
                style={{ color: 'rgba(180,120,60,0.7)' }}>Últimos Pacientes Registrados</h3>
              <Link href="/pacientes" className="text-xs" style={{ color: 'rgba(196,59,59,0.8)' }}>Ver todos →</Link>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {pacientes.slice(0, 5).map((p, i) => (
                <Link key={p.id} href={`/pacientes/${p.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
                  style={{ borderBottom: i < Math.min(pacientes.length, 5) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                      style={{ background: 'rgba(139,26,26,0.4)', color: '#e88' }}>
                      {p.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{p.nombre}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{p.edad} años · Tutor: {p.tutor}</p>
                    </div>
                  </div>
                  <span className="text-xs capitalize px-3 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                    {p.sexo}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {pacientes.length === 0 && (
          <div className="text-center py-16 rounded-xl" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
            <p className="text-4xl mb-4">👶</p>
            <p className="text-white/60 mb-2">No hay pacientes registrados aún</p>
            <p className="text-white/30 text-sm mb-6">Comienza creando el primer expediente clínico</p>
            <Link href="/pacientes/nuevo"
              className="inline-block px-6 py-3 rounded-lg text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)', color: 'white' }}>
              + Crear Primer Paciente
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}