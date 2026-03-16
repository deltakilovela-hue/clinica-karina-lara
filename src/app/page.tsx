'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

export default function LoginPage() {
  const router = useRouter()
  const [cargando, setCargando] = useState(true)
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && ADMINS.includes(user.email ?? '')) {
        router.replace('/dashboard')
      } else {
        setCargando(false)
      }
    })
    return () => unsub()
  }, [router])

  const handleLogin = async () => {
    setEntrando(true)
    setError('')
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(auth, provider)
      const email = result.user.email

      if (email && ADMINS.includes(email)) {
        router.push('/dashboard')
      } else {
        await auth.signOut()
        setError('Acceso no autorizado. Esta plataforma es de uso exclusivo de la Lic. Karina Lara.')
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code !== 'auth/popup-closed-by-user') {
        setError('Error al iniciar sesión. Intenta de nuevo.')
      }
    } finally {
      setEntrando(false)
    }
  }

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a0508 0%, #2d0f0a 50%, #1a0505 100%)' }}>
      <div style={{ width: '32px', height: '32px', border: '2px solid rgba(180,120,60,0.4)', borderTopColor: 'rgba(180,120,60,0.8)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0508 0%, #2d0f0a 50%, #1a0505 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Lato', sans-serif", padding: '24px',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.5s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 32px rgba(123,27,42,0.5)',
            fontSize: '22px', fontWeight: '700', color: 'white',
            fontFamily: "'Playfair Display', serif",
          }}>KL</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: '500', color: 'white', marginBottom: '8px' }}>
            Clínica Karina Lara
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(180,120,60,0.8)', letterSpacing: '0.5px' }}>
            Nutrición Clínica Especializada
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px', padding: '40px 36px',
          backdropFilter: 'blur(10px)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '28px', lineHeight: '1.6' }}>
            Acceso exclusivo para la Lic. Karina Lara
          </p>

          {/* Botón Google */}
          <button
            onClick={handleLogin}
            disabled={entrando}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: '12px',
              fontSize: '14px', fontWeight: '600', cursor: entrando ? 'not-allowed' : 'pointer',
              background: entrando ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: entrando ? 'rgba(255,255,255,0.3)' : 'white',
              fontFamily: "'Lato', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              transition: 'all 0.2s',
            }}
          >
            {entrando ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Entrando...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Entrar con Google
              </>
            )}
          </button>

          {error && (
            <div style={{
              marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
              background: 'rgba(155,35,53,0.2)', border: '1px solid rgba(155,35,53,0.4)',
              color: '#F5A0A9', fontSize: '13px',
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Link portal padres */}
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px' }}>
          <a href="/portal/login" style={{ color: 'rgba(180,120,60,0.6)', textDecoration: 'none' }}>
            ¿Eres papá o mamá? → Acceder al portal de padres
          </a>
        </p>
      </div>
    </div>
  )
}