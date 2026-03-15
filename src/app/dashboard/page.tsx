'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com']

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/'); return }
      if (!ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      
      setUsuario(user?.displayName || user?.email || '')
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
  const loginGoogle = async () => {
    try {
      setCargando(true)
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err.code !== 'auth/popup-closed-by-user') setError('Error al iniciar sesión con Google')
    } finally {
      setCargando(false)
    }
  }

  const loginEmail = async () => {
    if (!email || !password) { setError('Ingresa tu correo y contraseña'); return }
    try {
      setCargando(true)
      setError('')
      await signInWithEmailAndPassword(auth, email, password)
    } catch {
      setError('Correo o contraseña incorrectos')
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #1a0a05 0%, #2d0f0a 50%, #1a0505 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)', color: '#fff' }}>
            KL
          </div>
          <h1 className="text-3xl font-light text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Clínica Karina Lara
          </h1>
          <p className="text-sm" style={{ color: 'rgba(180,120,60,0.8)' }}>Nutrición Clínica Especializada</p>
        </div>

        <div className="rounded-2xl p-8 space-y-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Email/Password */}
          <div>
            <label className="block text-xs tracking-widest uppercase mb-2"
              style={{ color: 'rgba(180,120,60,0.8)' }}>Correo</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="correo@ejemplo.com"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase mb-2"
              style={{ color: 'rgba(180,120,60,0.8)' }}>Contraseña</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && loginEmail()}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(220,38,38,0.15)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.3)' }}>
              {error}
            </p>
          )}

          <button onClick={loginEmail} disabled={cargando}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)', color: 'white' }}>
            {cargando ? 'Entrando...' : 'Iniciar Sesión'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>o</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Google para admins */}
          <button onClick={loginGoogle} disabled={cargando}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Entrar con Google (Administrador)
          </button>
        </div>
      </div>
    </main>
  )
}