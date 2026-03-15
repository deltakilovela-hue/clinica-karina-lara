'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPaciente, eliminarPaciente, Paciente } from '@/lib/pacientes'
import Link from 'next/link'

const CORREO_AUTORIZADO = 'Ln.karynalaras@gmail.com'

export default function DetallePacientePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || user.email !== CORREO_AUTORIZADO) { router.push('/'); return }
      try {
        const p = await obtenerPaciente(id)
        setPaciente(p)
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router, id])

  const handleEliminar = async () => {
    try { await eliminarPaciente(id); router.push('/pacientes') }
    catch (e) { console.error(e) }
  }

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a0a05' }}>
      <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!paciente) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#1a0a05' }}>
      <p className="text-white/60">Paciente no encontrado</p>
      <Link href="/pacientes" className="text-sm" style={{ color: '#C43B3B' }}>← Volver</Link>
    </div>
  )

  const modulos = [
    { nombre: 'Historia Clínica', icono: '📋', href: `/pacientes/${id}/historia`, listo: false },
    { nombre: 'Antropometría', icono: '📏', href: `/pacientes/${id}/antropometria`, listo: false },
    { nombre: 'Diagnóstico', icono: '🩺', href: `/pacientes/${id}/diagnostico`, listo: false },
    { nombre: 'Plan Nutricional IA', icono: '🧠', href: `/pacientes/${id}/plan`, listo: false },
    { nombre: 'Seguimiento', icono: '📊', href: `/pacientes/${id}/seguimiento`, listo: false },
    { nombre: 'Expediente Completo', icono: '🗂️', href: `/pacientes/${id}/expediente`, listo: false },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a0a05 0%, #2d0f0a 50%, #1a0505 100%)' }}>
      <header style={{ borderBottom: '1px solid rgba(180,120,60,0.2)', background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.4)' }}>Dashboard</Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <Link href="/pacientes" style={{ color: 'rgba(255,255,255,0.4)' }}>Pacientes</Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span className="text-white">{paciente.nombre}</span>
          </div>
          <button onClick={() => setConfirmDelete(true)} className="text-xs px-4 py-2 rounded-lg"
            style={{ border: '1px solid rgba(220,38,38,0.3)', color: 'rgba(220,38,38,0.7)' }}>
            Eliminar
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-start gap-6 mb-8 p-8 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)', color: 'white' }}>
            {paciente.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-light text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              {paciente.nombre}
            </h1>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {paciente.edad} años · {paciente.sexo} · {paciente.fechaNacimiento && new Date(paciente.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[['Tutor', paciente.tutor], ['Teléfono', paciente.telefono], ['Correo', paciente.correo || 'No registrado'], ['Dirección', paciente.direccion || 'No registrada']].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs tracking-wider uppercase mb-0.5" style={{ color: 'rgba(180,120,60,0.6)' }}>{l}</p>
                  <p className="text-sm text-white/70 truncate">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-8 p-6 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'rgba(180,120,60,0.7)' }}>Motivo de Consulta</p>
          <p className="text-white/70 text-sm leading-relaxed">{paciente.motivoConsulta}</p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: 'rgba(180,120,60,0.7)' }}>Módulos Clínicos</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {modulos.map(mod => (
              <Link key={mod.nombre} href={mod.listo ? mod.href : '#'}
                className={`p-5 rounded-xl transition-all ${mod.listo ? 'hover:bg-white/5 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-xl block mb-2">{mod.icono}</span>
                <p className="text-white text-sm font-medium">{mod.nombre}</p>
                <p className="text-xs mt-1" style={{ color: mod.listo ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                  {mod.listo ? 'Disponible' : 'Próximamente'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="max-w-sm w-full p-6 rounded-2xl" style={{ background: '#1a0a05', border: '1px solid rgba(220,38,38,0.3)' }}>
            <h3 className="text-white font-medium mb-2" style={{ fontFamily: 'Georgia, serif' }}>¿Eliminar expediente?</h3>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Se eliminará permanentemente el expediente de <strong className="text-white">{paciente.nombre}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-lg text-sm"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Cancelar</button>
              <button onClick={handleEliminar} className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(220,38,38,0.8)', color: 'white' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}