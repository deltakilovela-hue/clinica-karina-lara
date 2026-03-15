'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPacientes, Paciente } from '@/lib/pacientes'
import Link from 'next/link'

const CORREO_AUTORIZADO = 'Ln.karynalaras@gmail.com'

export default function PacientesPage() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || user.email !== CORREO_AUTORIZADO) {
        router.push('/')
        return
      }
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

  const filtrados = pacientes.filter(p =>
    p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    p.tutor.toLowerCase().includes(filtro.toLowerCase()) ||
    p.motivoConsulta.toLowerCase().includes(filtro.toLowerCase())
  )

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a0a05' }}>
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a0a05 0%, #2d0f0a 50%, #1a0505 100%)' }}>
      <header style={{ borderBottom: '1px solid rgba(180,120,60,0.2)', background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>← Dashboard</Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span className="text-white text-sm">Pacientes</span>
          </div>
          <Link href="/pacientes/nuevo"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)', color: 'white' }}>
            + Nuevo Paciente
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Gestión de <span style={{ color: '#C43B3B' }}>Pacientes</span>
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''} registrado{pacientes.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre, tutor o motivo de consulta..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="w-full px-5 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          />
        </div>

        {filtrados.length === 0 ? (
          <div className="text-center py-20 rounded-xl" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-white/50 mb-1">No se encontraron pacientes</p>
            {!filtro && (
              <Link href="/pacientes/nuevo"
                className="inline-block mt-4 px-6 py-3 rounded-lg text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)', color: 'white' }}>
                + Crear Primer Paciente
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtrados.map((p) => (
              <Link key={p.id} href={`/pacientes/${p.id}`}
                className="group flex items-center justify-between p-5 rounded-xl transition-all hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-semibold"
                    style={{ background: 'rgba(139,26,26,0.4)', color: '#e88' }}>
                    {p.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium" style={{ fontFamily: 'Georgia, serif' }}>{p.nombre}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {p.edad} años · {p.sexo} · Tutor: {p.tutor}
                    </p>
                    <p className="text-xs mt-0.5 truncate max-w-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {p.motivoConsulta}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.telefono}</p>
                    {p.fechaCreacion && (
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {p.fechaCreacion.toDate().toLocaleDateString('es-MX')}
                      </p>
                    )}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}