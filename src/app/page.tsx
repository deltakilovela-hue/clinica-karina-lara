'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

export default function LoginPage() {
  const router = useRouter()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(true)
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [mostrarAdmin, setMostrarAdmin] = useState(false)
  const [modoRecuperar, setModoRecuperar] = useState(false)
  const [correoRecuperar, setCorreoRecuperar] = useState('')
  const [enviandoRecuperar, setEnviandoRecuperar] = useState(false)
  const [recuperarExito, setRecuperarExito] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (ADMINS.includes(user.email ?? '')) router.replace('/dashboard')
        else router.replace('/portal')
      } else {
        setCargando(false)
      }
    })
    return () => unsub()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!correo || !password) return
    setEntrando(true); setError('')
    try {
      await signInWithEmailAndPassword(auth, correo, password)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Correo o contraseña incorrectos. Verifica tus datos.')
      } else if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera unos minutos.')
      } else if (code === 'auth/user-disabled') {
        setError('Esta cuenta ha sido desactivada.')
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.')
      }
      setEntrando(false)
    }
  }

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!correoRecuperar) return
    setEnviandoRecuperar(true); setError('')
    try {
      await sendPasswordResetEmail(auth, correoRecuperar)
      setRecuperarExito(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/user-not-found') {
        setError('No encontramos una cuenta con ese correo.')
      } else {
        setError('Error al enviar el correo. Intenta de nuevo.')
      }
    } finally {
      setEnviandoRecuperar(false)
    }
  }

  const handleAdminLogin = async () => {
    setMostrarAdmin(false)
    setError('')
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await signInWithPopup(auth, provider)
      if (ADMINS.includes(result.user.email ?? '')) {
        router.push('/dashboard')
      } else {
        await auth.signOut()
        setError('Acceso no autorizado. Solo para la Lic. Karina Lara.')
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code !== 'auth/popup-closed-by-user') {
        setError('Error al iniciar sesión con Google.')
      }
    }
  }

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a0508 0%, #2d0f0a 50%, #1a0505 100%)' }}>
      <div style={{ width: '32px', height: '32px', border: '2px solid rgba(180,120,60,0.4)', borderTopColor: 'rgba(180,120,60,0.8)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: '12px', fontSize: '14px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: 'white', outline: 'none',
    fontFamily: "'Lato', sans-serif",
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: '12px', fontWeight: '600' as const,
    color: 'rgba(180,120,60,0.8)', display: 'block',
    marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  }

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
          -webkit-box-shadow: 0 0 0 1000px rgba(26,5,8,0.95) inset !important;
          -webkit-text-fill-color: white !important;
        }
        input::placeholder { color: rgba(255,255,255,0.25); }
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

        {/* ── MODO RECUPERAR CONTRASEÑA ── */}
        {modoRecuperar ? (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '36px', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.3s ease' }}>
            {recuperarExito ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '40px', marginBottom: '16px' }}>📧</p>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '400', color: 'white', marginBottom: '10px' }}>
                  Correo enviado
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', marginBottom: '24px' }}>
                  Revisa tu bandeja en <strong style={{ color: 'white' }}>{correoRecuperar}</strong> y sigue las instrucciones para restablecer tu contraseña.
                </p>
                <button onClick={() => { setModoRecuperar(false); setRecuperarExito(false); setCorreoRecuperar('') }} style={{
                  width: '100%', padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                  background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                }}>
                  ← Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => { setModoRecuperar(false); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '16px', padding: 0, fontFamily: "'Lato', sans-serif" }}>
                  ← Volver
                </button>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '400', color: 'white', marginBottom: '8px' }}>
                  Recuperar contraseña
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px', lineHeight: '1.5' }}>
                  Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
                </p>
                <form onSubmit={handleRecuperar}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Tu correo electrónico</label>
                    <input type="email" value={correoRecuperar} onChange={e => setCorreoRecuperar(e.target.value)} placeholder="tu@correo.com" style={inputStyle} />
                  </div>
                  {error && (
                    <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', background: 'rgba(155,35,53,0.2)', border: '1px solid rgba(155,35,53,0.4)', color: '#F5A0A9', fontSize: '13px' }}>
                      ⚠️ {error}
                    </div>
                  )}
                  <button type="submit" disabled={enviandoRecuperar || !correoRecuperar} style={{
                    width: '100%', padding: '13px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                    border: 'none', cursor: (enviandoRecuperar || !correoRecuperar) ? 'not-allowed' : 'pointer',
                    background: (enviandoRecuperar || !correoRecuperar) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #7B1B2A, #A63244)',
                    color: (enviandoRecuperar || !correoRecuperar) ? 'rgba(255,255,255,0.3)' : 'white',
                    fontFamily: "'Lato', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                    {enviandoRecuperar
                      ? <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Enviando...</>
                      : '📧 Enviar correo de recuperación'}
                  </button>
                </form>
              </>
            )}
          </div>
        ) : (
          /* ── MODO LOGIN NORMAL ── */
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '36px', backdropFilter: 'blur(10px)' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '400', color: 'white', marginBottom: '6px' }}>
              Iniciar sesión
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px' }}>
              Usa el correo y contraseña que te entregó la nutrióloga
            </p>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Correo electrónico</label>
                <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="tu@correo.com" autoComplete="email" style={inputStyle} />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={labelStyle}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={verPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{ ...inputStyle, paddingRight: '48px' }}
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

              <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                <button type="button" onClick={() => { setModoRecuperar(true); setError(''); setCorreoRecuperar(correo) }} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '12px', color: 'rgba(180,120,60,0.7)', fontFamily: "'Lato', sans-serif",
                  textDecoration: 'underline',
                }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {error && (
                <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', background: 'rgba(155,35,53,0.2)', border: '1px solid rgba(155,35,53,0.4)', color: '#F5A0A9', fontSize: '13px' }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" disabled={entrando || !correo || !password} style={{
                width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '600',
                border: 'none', cursor: (entrando || !correo || !password) ? 'not-allowed' : 'pointer',
                background: (entrando || !correo || !password) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #7B1B2A, #A63244)',
                color: (entrando || !correo || !password) ? 'rgba(255,255,255,0.3)' : 'white',
                fontFamily: "'Lato', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: (!entrando && correo && password) ? '0 4px 20px rgba(123,27,42,0.4)' : 'none',
                transition: 'all 0.2s',
              }}>
                {entrando
                  ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Entrando...</>
                  : 'Entrar al Portal'}
              </button>
            </form>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '24px' }}>
          ¿Problemas para acceder? Contáctanos en consulta.
        </p>
      </div>

      {/* ── BOTÓN ADMIN DISCRETO ── */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px' }}>
        {!mostrarAdmin ? (
          <button onClick={() => setMostrarAdmin(true)} title="Acceso administrador" style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', transition: 'all 0.2s',
          }}>⚙️</button>
        ) : (
          <div style={{
            background: 'rgba(15,5,8,0.97)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '20px', width: '260px',
            animation: 'slideUp 0.2s ease', backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(180,120,60,0.8)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                🔐 Administrador
              </p>
              <button onClick={() => setMostrarAdmin(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '18px', lineHeight: 1, padding: 0 }}>×</button>
            </div>

            {/* ── BOTÓN GOOGLE ADMIN ── */}
            <button onClick={handleAdminLogin} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px',
              borderRadius: '10px', background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
              color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
              fontFamily: "'Lato', sans-serif", width: '100%',
            }}>
              <svg width="14" height="14" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Entrar con Google (Karina)
            </button>

            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '10px', textAlign: 'center' }}>
              Solo para la Lic. Karina Lara
            </p>
          </div>
        )}
      </div>

    </div>
  )
}