'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function PortalLoginPage() {
  const router = useRouter()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(true)
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [mostrarAdmin, setMostrarAdmin] = useState(false)

  const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (ADMINS.includes(user.email ?? '')) {
          router.replace('/dashboard')
        } else {
          router.replace('/portal')
        }
      } else {
        setCargando(false)
      }
    })
    return () => unsub()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!correo || !password) return
    setEntrando(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, correo, password)
      // onAuthStateChanged se encarga de la redirección
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Correo o contraseña incorrectos.')
      } else if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera unos minutos.')
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.')
      }
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
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px rgba(26,5,8,0.9) inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '420px', animation: 'fadeIn 0.5s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(123,27,42,0.5)',
            fontSize: '22px', fontWeight: '700', color: 'white',
            fontFamily: "'Playfair Display', serif",
          }}>KL</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: '500', color: 'white', marginBottom: '6px' }}>
            Clínica Karina Lara
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(180,120,60,0.8)', letterSpacing: '0.5px' }}>
            Portal para Padres de Familia
          </p>
        </div>

        {/* Card login */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px', padding: '36px',
          backdropFilter: 'blur(10px)',
        }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '400', color: 'white', marginBottom: '6px' }}>
            Iniciar sesión
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px' }}>
            Usa las credenciales que te entregó la nutrióloga
          </p>

          <form onSubmit={handleLogin}>
            {/* Correo */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(180,120,60,0.8)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Correo
              </label>
              <input
                type="email"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                placeholder="nombre.apellido@clinicakarina.app"
                autoComplete="email"
                style={{
                  width: '100%', padding: '13px 16px', borderRadius: '12px', fontSize: '14px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'white', outline: 'none',
                  fontFamily: "'Lato', sans-serif",
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(180,120,60,0.8)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={verPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '13px 48px 13px 16px', borderRadius: '12px', fontSize: '14px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'white', outline: 'none',
                    fontFamily: "'Lato', sans-serif",
                    boxSizing: 'border-box',
                  }}
                />
                <button type="button" onClick={() => setVerPassword(!verPassword)} style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)', fontSize: '16px', padding: '0',
                }}>
                  {verPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
                background: 'rgba(155,35,53,0.2)', border: '1px solid rgba(155,35,53,0.4)',
                color: '#F5A0A9', fontSize: '13px',
              }}>⚠️ {error}</div>
            )}

            <button
              type="submit"
              disabled={entrando || !correo || !password}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '600',
                border: 'none', cursor: (entrando || !correo || !password) ? 'not-allowed' : 'pointer',
                background: (entrando || !correo || !password)
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #7B1B2A, #A63244)',
                color: (entrando || !correo || !password) ? 'rgba(255,255,255,0.3)' : 'white',
                fontFamily: "'Lato', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: (!entrando && correo && password) ? '0 4px 20px rgba(123,27,42,0.4)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {entrando
                ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Entrando...</>
                : 'Entrar al Portal'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '24px' }}>
          ¿Olvidaste tus credenciales? Contáctanos en consulta.
        </p>
      </div>

      {/* ── BOTÓN ADMIN DISCRETO (esquina inferior derecha) ── */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px' }}>
        {!mostrarAdmin ? (
          <button
            onClick={() => setMostrarAdmin(true)}
            title="Acceso administrador"
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.2)', fontSize: '16px',
              transition: 'all 0.2s',
            }}
          >
            ⚙️
          </button>
        ) : (
          <div style={{
            background: 'rgba(20,8,12,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px', padding: '20px',
            width: '280px', animation: 'slideUp 0.2s ease',
            backdropFilter: 'blur(20px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(180,120,60,0.8)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                🔐 Acceso Administrador
              </p>
              <button onClick={() => setMostrarAdmin(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '16px' }}>×</button>
            </div>
            <a
              href="/dashboard"
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 14px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
                color: 'white', textDecoration: 'none', fontSize: '13px', fontWeight: '600',
                fontFamily: "'Lato', sans-serif",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Entrar con Google (Karina)
            </a>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '10px', textAlign: 'center' }}>
              Solo para uso de la Lic. Karina Lara
            </p>
          </div>
        )}
      </div>

    </div>
  )
}