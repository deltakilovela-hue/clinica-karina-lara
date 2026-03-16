'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

export default function PortalLoginPage() {
  const router = useRouter()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [verPassword, setVerPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!correo || !password) return
    setCargando(true)
    setError('')

    try {
      await signInWithEmailAndPassword(auth, correo, password)
      router.push('/portal')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Correo o contraseña incorrectos. Verifica tus datos.')
      } else if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera unos minutos e intenta de nuevo.')
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0508 0%, #2d0f0a 50%, #1a0505 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Lato', sans-serif", padding: '24px',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px rgba(255,255,255,0.05) inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '420px', animation: 'fadeIn 0.5s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B1A1A, #C43B3B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(139,26,26,0.4)',
            fontSize: '20px', fontWeight: '700', color: 'white',
            fontFamily: 'Georgia, serif',
          }}>KL</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: '400', color: 'white', marginBottom: '6px' }}>
            Clínica Karina Lara
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(180,120,60,0.8)', letterSpacing: '0.5px' }}>
            Portal para Padres de Familia
          </p>
        </div>

        {/* Card de login */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px', padding: '36px',
          backdropFilter: 'blur(10px)',
        }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: '400', color: 'white', marginBottom: '6px' }}>
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
                placeholder="tu.correo@clinicakarina.app"
                autoComplete="email"
                style={{
                  width: '100%', padding: '13px 16px', borderRadius: '12px', fontSize: '14px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
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
                    background: 'rgba(255,255,255,0.05)',
                    color: 'white', outline: 'none',
                    fontFamily: "'Lato', sans-serif",
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.4)', fontSize: '16px', padding: '0',
                  }}
                >
                  {verPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
                background: 'rgba(155,35,53,0.2)', border: '1px solid rgba(155,35,53,0.4)',
                color: '#F5A0A9', fontSize: '13px',
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando || !correo || !password}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '600',
                border: 'none', cursor: (cargando || !correo || !password) ? 'not-allowed' : 'pointer',
                background: (cargando || !correo || !password)
                  ? 'rgba(255,255,255,0.1)'
                  : 'linear-gradient(135deg, #8B1A1A, #C43B3B)',
                color: (cargando || !correo || !password) ? 'rgba(255,255,255,0.3)' : 'white',
                fontFamily: "'Lato', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: (!cargando && correo && password) ? '0 4px 20px rgba(139,26,26,0.4)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {cargando
                ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Entrando...</>
                : 'Entrar al Portal'}
            </button>
          </form>
        </div>

        {/* Pie */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '24px' }}>
          ¿Olvidaste tus credenciales? Contáctanos en consulta.
        </p>
        <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '16px' }}>
          <a href="/" style={{ color: 'rgba(180,120,60,0.6)', textDecoration: 'none' }}>
            ← Soy la nutrióloga, ir al login principal
          </a>
        </p>
      </div>
    </div>
  )
}