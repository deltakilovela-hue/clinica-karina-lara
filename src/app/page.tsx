'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

const ADMINS = [
  'Ln.karynalaras@gmail.com',
  'deltakilo.vela@gmail.com',
  'admin@clinicakarina.app',
  'deltakilo.gemini@gmail.com',
]

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 16, color = 'white' }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}40`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ─── Banner de error ───────────────────────────────────────────────────────────
function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: '10px',
      background: '#FEF2F3', border: '1px solid #F5C5C9',
      color: '#9B2335', fontSize: '13px', fontWeight: '500',
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      animation: 'fadeUp 0.3s ease',
    }}>
      <span style={{ flexShrink: 0 }}>⚠️</span>
      <span>{message}</span>
    </div>
  )
}

// ─── Ícono Google ──────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

// ─── Ícono Ojo ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

// ─── Campo de formulario ───────────────────────────────────────────────────────
function Field({
  label, type = 'text', value, onChange, placeholder, autoComplete, rightEl,
}: {
  label: string; type?: string; value: string
  onChange: (v: string) => void; placeholder?: string
  autoComplete?: string; rightEl?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <label style={{
        fontSize: '11px', fontWeight: '700', letterSpacing: '0.9px',
        textTransform: 'uppercase', color: '#9B7B65',
        fontFamily: "'Lato', sans-serif",
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '13px 16px',
            paddingRight: rightEl ? '48px' : '16px',
            borderRadius: '10px',
            fontSize: '15px',
            border: `1.5px solid ${focused ? '#7B1B2A' : '#E8DDD0'}`,
            background: '#FDFAF7',
            color: '#2C1810',
            outline: 'none',
            fontFamily: "'Lato', sans-serif",
            boxSizing: 'border-box' as const,
            boxShadow: focused ? '0 0 0 3px rgba(123,27,42,0.08)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        />
        {rightEl && (
          <div style={{
            position: 'absolute', right: '14px', top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center',
          }}>
            {rightEl}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const [correo, setCorreo]                   = useState('')
  const [password, setPassword]               = useState('')
  const [cargando, setCargando]               = useState(true)
  const [entrando, setEntrando]               = useState(false)
  const [error, setError]                     = useState('')
  const [verPassword, setVerPassword]         = useState(false)
  const [modoRecuperar, setModoRecuperar]     = useState(false)
  const [correoRec, setCorreoRec]             = useState('')
  const [enviandoRec, setEnviandoRec]         = useState(false)
  const [recuperarOk, setRecuperarOk]         = useState(false)
  const [mostrarAdmin, setMostrarAdmin]       = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
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
      setError(
        code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'Correo o contraseña incorrectos. Verifica tus datos.'
          : code === 'auth/too-many-requests'
            ? 'Demasiados intentos. Espera unos minutos e intenta de nuevo.'
            : code === 'auth/user-disabled'
              ? 'Esta cuenta ha sido desactivada.'
              : 'Error al iniciar sesión. Intenta de nuevo.'
      )
      setEntrando(false)
    }
  }

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!correoRec) return
    setEnviandoRec(true); setError('')
    try {
      await sendPasswordResetEmail(auth, correoRec)
      setRecuperarOk(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      setError(code === 'auth/user-not-found'
        ? 'No encontramos una cuenta con ese correo.'
        : 'Error al enviar el correo. Intenta de nuevo.')
    } finally {
      setEnviandoRec(false)
    }
  }

  const handleAdminLogin = async () => {
    setMostrarAdmin(false); setError('')
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
      if (code !== 'auth/popup-closed-by-user') setError('Error al iniciar sesión con Google.')
    }
  }

  // ── Loading ──
  if (cargando) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#FAF7F2',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Playfair Display', serif",
          fontSize: '20px', fontWeight: '600', color: 'white',
          boxShadow: '0 6px 24px rgba(123,27,42,0.3)',
        }}>KL</div>
        <Spinner size={22} color="#7B1B2A" />
      </div>
    </div>
  )

  const canLogin = correo && password && !entrando

  return (
    <>
      {/* ── Estilos globales ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Lato:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin     { to { transform: rotate(360deg) } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideIn  { from { opacity:0; transform:translateX(-20px) } to { opacity:1; transform:translateX(0) } }
        @keyframes popIn    { from { opacity:0; transform:scale(0.96) translateY(6px) } to { opacity:1; transform:scale(1) translateY(0) } }

        html, body { height: 100%; }

        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #FDFAF7 inset !important;
          -webkit-text-fill-color: #2C1810 !important;
        }
        input::placeholder { color: #C9B8A8; }

        /* ── Layout raíz ── */
        .kl-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Lato', sans-serif;
          background: #FAF7F2;
        }

        /* ══ PANEL IZQUIERDO ══ */
        .kl-brand {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: 72px 68px;
          overflow: hidden;
          background: linear-gradient(150deg, #FDF0F0 0%, #F5E8E8 35%, #EDD5D5 70%, #E5C8C8 100%);
        }

        /* Círculos decorativos del brand panel (inspirados en el mockup de Stitch) */
        .kl-brand::before {
          content: '';
          position: absolute;
          width: 320px; height: 320px;
          border-radius: 50%;
          background: rgba(123,27,42,0.07);
          top: -80px; left: -80px;
        }
        .kl-brand::after {
          content: '';
          position: absolute;
          width: 260px; height: 260px;
          border-radius: 50%;
          background: rgba(123,27,42,0.05);
          bottom: -60px; right: 10%;
        }

        /* ══ PANEL DERECHO ══ */
        .kl-form-panel {
          width: 500px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 60px 52px;
          background: #ffffff;
          min-height: 100vh;
          position: relative;
          box-shadow: -4px 0 40px rgba(44,24,16,0.06);
        }

        /* ── Responsive móvil ── */
        @media (max-width: 860px) {
          .kl-brand { display: none; }
          .kl-form-panel {
            width: 100%; padding: 44px 28px;
            background: #FAF7F2;
            box-shadow: none;
          }
        }

        /* ── Botón CTA ── */
        .kl-cta {
          transition: all 0.25s ease;
        }
        .kl-cta:hover:not(:disabled) {
          background: linear-gradient(135deg, #5C1420 0%, #7B1B2A 100%) !important;
          box-shadow: 0 8px 28px rgba(123,27,42,0.4) !important;
          transform: translateY(-1px);
        }
        .kl-cta:active:not(:disabled) { transform: translateY(0); }

        /* ── Links ── */
        .kl-link { transition: color 0.2s; }
        .kl-link:hover { color: #8B6914 !important; }

        /* ── Admin panel ── */
        .kl-admin-trigger:hover { background: rgba(44,24,16,0.08) !important; }
      `}</style>

      <div className="kl-root">

        {/* ════════════════ BRAND PANEL ════════════════ */}
        <div className="kl-brand">

          {/* Línea decorativa tipo botanical (cruz/estrella como en el mockup) */}
          <svg
            viewBox="0 0 120 120"
            style={{
              position: 'absolute', width: '90px', height: '90px',
              bottom: '28%', left: '50%', transform: 'translateX(-50%)',
              opacity: 0.18,
            }}
          >
            <line x1="60" y1="10" x2="60" y2="110" stroke="#7B1B2A" strokeWidth="1.5" />
            <line x1="10" y1="60" x2="110" y2="60" stroke="#7B1B2A" strokeWidth="1.5" />
            <line x1="25" y1="25" x2="95" y2="95" stroke="#7B1B2A" strokeWidth="1" />
            <line x1="95" y1="25" x2="25" y2="95" stroke="#7B1B2A" strokeWidth="1" />
            <circle cx="60" cy="60" r="4" fill="#7B1B2A" />
          </svg>

          {/* Contenido brand */}
          <div style={{ position: 'relative', zIndex: 1, animation: 'slideIn 0.7s ease' }}>

            {/* Monograma */}
            <div style={{
              width: '76px', height: '76px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #7B1B2A 0%, #A63244 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '28px',
              boxShadow: '0 8px 32px rgba(123,27,42,0.3)',
            }}>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '28px', fontWeight: '600',
                color: 'white', letterSpacing: '-1px',
              }}>KL</span>
            </div>

            {/* Nombre clínica */}
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '38px', fontWeight: '500',
              color: '#2C1810', lineHeight: '1.15',
              marginBottom: '6px', letterSpacing: '-0.5px',
            }}>
              Karina Lara
            </h1>

            {/* Subtítulo en vino */}
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '15px', fontStyle: 'italic',
              color: '#7B1B2A', marginBottom: '24px', fontWeight: '400',
            }}>
              Nutrición Pediátrica · Neurodesarrollo
            </p>

            {/* Separador */}
            <div style={{
              width: '40px', height: '2px',
              background: 'linear-gradient(to right, #C4A35A, rgba(196,163,90,0.2))',
              marginBottom: '28px', borderRadius: '2px',
            }} />

            {/* Descripción */}
            <p style={{
              fontSize: '14px', color: '#6B4F3A',
              lineHeight: '1.75', maxWidth: '320px',
              fontWeight: '300',
            }}>
              Un espacio dedicado al crecimiento saludable de tu hijo, con atención especializada en nutrición clínica y salud intestinal.
            </p>

            {/* Pilares */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              gap: '14px', marginTop: '36px',
            }}>
              {[
                { icon: '🌿', label: 'Planes nutricionales personalizados' },
                { icon: '📊', label: 'Seguimiento del desarrollo infantil' },
                { icon: '🧠', label: 'Apoyo en neurodesarrollo y microbiota' },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <span style={{ fontSize: '15px' }}>{item.icon}</span>
                  <span style={{ fontSize: '13px', color: '#9B7B65', fontWeight: '400' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <p style={{
            position: 'absolute', bottom: '28px', left: '68px',
            fontSize: '11px', color: 'rgba(107,79,58,0.4)', letterSpacing: '0.3px',
            zIndex: 1,
          }}>
            © 2025 Clínica Karina Lara
          </p>
        </div>

        {/* ════════════════ FORM PANEL ════════════════ */}
        <div className="kl-form-panel">
          <div style={{
            width: '100%', maxWidth: '380px',
            animation: 'fadeUp 0.6s ease',
          }}>

            {/* Header del formulario */}
            <div style={{ marginBottom: '36px' }}>
              <p style={{
                fontSize: '11px', fontWeight: '700', letterSpacing: '2px',
                textTransform: 'uppercase', color: '#C4A35A', marginBottom: '10px',
              }}>
                Portal de Familias
              </p>

              <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '30px', fontWeight: '500',
                color: '#2C1810', lineHeight: '1.2', marginBottom: '10px',
              }}>
                {modoRecuperar ? 'Recuperar acceso' : 'Bienvenido'}
              </h2>

              <p style={{ fontSize: '14px', color: '#9B7B65', lineHeight: '1.6' }}>
                {modoRecuperar
                  ? 'Escribe tu correo y te enviaremos un enlace para restablecer tu contraseña.'
                  : 'Ingresa tus credenciales para acceder al portal de tu clínica.'}
              </p>
            </div>

            {/* ══ MODO RECUPERAR ══ */}
            {modoRecuperar ? (
              recuperarOk ? (
                <div style={{
                  background: '#F0FAF5', border: '1px solid #B7E3CA',
                  borderRadius: '14px', padding: '28px', textAlign: 'center',
                  animation: 'popIn 0.4s ease',
                }}>
                  <div style={{ fontSize: '38px', marginBottom: '12px' }}>📬</div>
                  <h3 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '18px', color: '#2D6A4F', marginBottom: '8px',
                  }}>
                    ¡Correo enviado!
                  </h3>
                  <p style={{ fontSize: '14px', color: '#52976A', lineHeight: '1.6', marginBottom: '20px' }}>
                    Revisa <strong>{correoRec}</strong> y sigue las instrucciones para crear tu nueva contraseña.
                  </p>
                  <button
                    onClick={() => { setModoRecuperar(false); setRecuperarOk(false); setCorreoRec('') }}
                    style={{
                      padding: '11px 24px', borderRadius: '10px', fontSize: '14px',
                      fontWeight: '600', border: 'none', cursor: 'pointer',
                      background: '#2D6A4F', color: 'white',
                      fontFamily: "'Lato', sans-serif",
                    }}
                  >
                    ← Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecuperar} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <Field
                    label="Tu correo electrónico"
                    type="email"
                    value={correoRec}
                    onChange={setCorreoRec}
                    placeholder="nombre@correo.com"
                    autoComplete="email"
                  />

                  {error && <ErrorBanner message={error} />}

                  <button
                    type="submit"
                    disabled={enviandoRec || !correoRec}
                    className="kl-cta"
                    style={{
                      width: '100%', padding: '15px', borderRadius: '12px',
                      fontSize: '15px', fontWeight: '700', border: 'none',
                      cursor: (enviandoRec || !correoRec) ? 'not-allowed' : 'pointer',
                      background: (enviandoRec || !correoRec) ? '#E8DDD0' : 'linear-gradient(135deg, #7B1B2A 0%, #A63244 100%)',
                      color: (enviandoRec || !correoRec) ? '#9B7B65' : 'white',
                      fontFamily: "'Lato', sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      boxShadow: (!enviandoRec && correoRec) ? '0 4px 18px rgba(123,27,42,0.3)' : 'none',
                    }}
                  >
                    {enviandoRec ? <><Spinner />&nbsp;Enviando...</> : '📧 Enviar instrucciones'}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setModoRecuperar(false); setError('') }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '13px', color: '#9B7B65',
                      fontFamily: "'Lato', sans-serif", textAlign: 'center',
                    }}
                  >
                    ← Volver al inicio de sesión
                  </button>
                </form>
              )
            ) : (
              /* ══ MODO LOGIN ══ */
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                <Field
                  label="Correo Electrónico"
                  type="email"
                  value={correo}
                  onChange={setCorreo}
                  placeholder="tu@email.com"
                  autoComplete="email"
                />

                <Field
                  label="Contraseña"
                  type={verPassword ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  rightEl={
                    <button
                      type="button"
                      onClick={() => setVerPassword(!verPassword)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#9B7B65', padding: 0,
                        display: 'flex', alignItems: 'center',
                      }}
                      title={verPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      <EyeIcon open={verPassword} />
                    </button>
                  }
                />

                {error && <ErrorBanner message={error} />}

                {/* Botón principal */}
                <button
                  type="submit"
                  disabled={!canLogin}
                  className="kl-cta"
                  style={{
                    width: '100%', padding: '15px', borderRadius: '12px',
                    fontSize: '15px', fontWeight: '700', border: 'none',
                    cursor: canLogin ? 'pointer' : 'not-allowed',
                    background: canLogin ? 'linear-gradient(135deg, #7B1B2A 0%, #A63244 100%)' : '#E8DDD0',
                    color: canLogin ? 'white' : '#9B7B65',
                    fontFamily: "'Lato', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    letterSpacing: '0.3px',
                    boxShadow: canLogin ? '0 4px 20px rgba(123,27,42,0.3)' : 'none',
                  }}
                >
                  {entrando ? (
                    <><Spinner />&nbsp;Entrando...</>
                  ) : (
                    <>
                      Entrar al Portal
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Link recuperar */}
                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => { setModoRecuperar(true); setError(''); setCorreoRec(correo) }}
                    className="kl-link"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '13px', color: '#C4A35A',
                      fontFamily: "'Lato', sans-serif", fontWeight: '600',
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* Divider */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  margin: '4px 0',
                }}>
                  <div style={{ flex: 1, height: '1px', background: '#F0E8E0' }} />
                  <span style={{ fontSize: '11px', color: '#C9B8A8', letterSpacing: '0.5px' }}>
                    ¿Necesitas ayuda?
                  </span>
                  <div style={{ flex: 1, height: '1px', background: '#F0E8E0' }} />
                </div>

                <p style={{
                  textAlign: 'center', fontSize: '12px',
                  color: '#C9B8A8', lineHeight: '1.6',
                }}>
                  Contacta a la clínica si tienes problemas para acceder a tu cuenta.
                </p>
              </form>
            )}
          </div>
        </div>

      </div>

      {/* ════════════════ BOTÓN ADMIN (discreto) ════════════════ */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 100 }}>
        {!mostrarAdmin ? (
          <button
            onClick={() => setMostrarAdmin(true)}
            title="Acceso administrador"
            className="kl-admin-trigger"
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(44,24,16,0.06)', border: '1px solid rgba(44,24,16,0.1)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B7B65" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        ) : (
          <div style={{
            background: 'white',
            border: '1px solid #E8DDD0',
            borderRadius: '16px', padding: '20px', width: '265px',
            animation: 'popIn 0.2s ease',
            boxShadow: '0 8px 40px rgba(44,24,16,0.12)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '14px',
            }}>
              <p style={{
                fontSize: '11px', fontWeight: '700', color: '#C4A35A',
                textTransform: 'uppercase', letterSpacing: '0.8px',
              }}>
                🔐 Administrador
              </p>
              <button
                onClick={() => setMostrarAdmin(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#C9B8A8', fontSize: '20px', lineHeight: 1, padding: 0,
                }}
              >×</button>
            </div>

            <button
              onClick={handleAdminLogin}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 14px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
                color: 'white', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: '600',
                fontFamily: "'Lato', sans-serif", width: '100%',
                transition: 'opacity 0.2s',
              }}
            >
              <GoogleIcon />
              Entrar con Google (Karina)
            </button>

            <p style={{
              fontSize: '11px', color: '#C9B8A8',
              marginTop: '10px', textAlign: 'center',
            }}>
              Solo para la Lic. Karina Lara
            </p>
          </div>
        )}
      </div>
    </>
  )
}
