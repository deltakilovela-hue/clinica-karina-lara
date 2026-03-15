'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import LoginButton from '@/components/LoginButton'

const CORREO_AUTORIZADO = 'Ln.karynalaras@gmail.com'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && user.email === CORREO_AUTORIZADO) {
        router.push('/dashboard')
      }
    })
    return () => unsub()
  }, [router])

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #1a0a05 0%, #2d0f0a 50%, #1a0505 100%)',
      }}
    >
      <div className="text-center mb-10">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)', color: '#fff' }}
        >
          KL
        </div>
        <h1
          className="text-4xl font-light text-white mb-2"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Clínica Karina Lara
        </h1>
        <p className="text-sm" style={{ color: 'rgba(180,120,60,0.8)' }}>
          Nutrición Clínica Especializada
        </p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Neurodesarrollo y Salud Intestinal
        </p>
      </div>

      <LoginButton />
    </main>
  )
}