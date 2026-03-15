'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Paciente } from '@/lib/pacientes'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com']

export default function PortalPage() {
  const router = useRouter()
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [usuarioEmail, setUsuarioEmail] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return }
      if (user.email && ADMINS.includes(user.email)) { router.push('/dashboard'); return }

      setUsuarioEmail(user.email || '')
      try {
        const q = query(collection(db, 'pacientes'), where('correoAcceso', '==', user.email))
        const snap = await getDocs(q)
        if (!snap.empty) {
          setPaciente({ id: snap.docs[0].id, ...snap.docs[0].data() } as Paciente)
        }
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

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a0a05' }}>
      <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #1a0a05 0%, #2d0f0a 50%, #1a0505 100%)' }}>
      <header style={{ borderBottom: '1px solid rgba(180,120,60,0.2)', background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)', color: '#fff' }}>KL</div>
            <div>
              <p className="text-white text-sm font-medium" style={{ fontFamily: 'Georgia, serif' }}>Clínica Karina Lara</p>
              <p className="text-xs" style={{ color: 'rgba(180,120,60,0.8)' }}>Portal para Padres</p>
            </div>
          </div>
          <button onClick={cerrarSesion} className="text-xs px-4 py-2 rounded transition-all"
            style={{ border: '1px solid rgba(180,120,60,0.3)', color: 'rgba(180,120,60,0.8)' }}>
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {!paciente ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-white/60 mb-2">No se encontró expediente asociado</p>
            <p className="text-white/30 text-sm">{usuarioEmail}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Perfil del niño */}
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{ background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)', color: 'white' }}>
                  {paciente.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-light text-white" style={{ fontFamily: 'Georgia, serif' }}>
                    {paciente.nombre}
                  </h1>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {paciente.edad} años · {paciente.sexo}
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'rgba(180,120,60,0.7)' }}>Motivo de Consulta</p>
                <p className="text-sm text-white/70">{paciente.motivoConsulta}</p>
              </div>
            </div>

            {/* Accesos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { titulo: 'Expediente Clínico', desc: 'Historia clínica completa', icono: '🗂️', href: `/portal/expediente` },
                { titulo: 'Plan Nutricional', desc: 'Plan de alimentación actual', icono: '🥗', href: `/portal/plan` },
              ].map(item => (
                <a key={item.titulo} href={item.href}
                  className="p-6 rounded-xl transition-all hover:bg-white/5 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-2xl block mb-3">{item.icono}</span>
                  <p className="text-white font-medium mb-1" style={{ fontFamily: 'Georgia, serif' }}>{item.titulo}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.desc}</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}