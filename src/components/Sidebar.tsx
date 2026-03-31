'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

// ─── Íconos SVG ───────────────────────────────────────────────────────────────
const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  pacientes: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  historia: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  antropometria: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
    </svg>
  ),
  plan: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  seguimiento: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  ),
  expediente: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

const NAV_PRINCIPAL = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/pacientes', icon: 'pacientes', label: 'Pacientes', exact: false },
]

const NAV_PACIENTE = [
  { icon: 'historia',      label: 'Historia Clínica' },
  { icon: 'antropometria', label: 'Antropometría' },
  { icon: 'plan',          label: 'Plan Nutricional IA' },
  { icon: 'seguimiento',   label: 'Seguimiento' },
  { icon: 'expediente',    label: 'Expediente' },
]

interface SidebarProps { usuario?: string }

export default function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()

  const cerrar = async () => { await signOut(auth); router.replace('/') }

  const isActive = (href: string, exact = true) =>
    exact ? pathname === href : pathname.startsWith(href)

  const iniciales = usuario
    ? (usuario.includes(' ')
        ? usuario.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : usuario.charAt(0).toUpperCase())
    : 'K'

  const nombreCorto = usuario
    ? (usuario.includes('@') ? usuario.split('@')[0] : usuario.split(' ')[0])
    : 'Karina'

  return (
    <aside style={{
      width: '248px', minHeight: '100vh',
      background: 'white', borderRight: '1px solid #E8DDD0',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, bottom: 0,
      zIndex: 50, overflowY: 'auto',
    }}>

      {/* ── Branding ── */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid #F2EDE4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0,
            background: 'linear-gradient(135deg, #7B1B2A 0%, #A63244 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '14px', fontWeight: '700',
            fontFamily: "'Playfair Display', serif",
            boxShadow: '0 3px 10px rgba(123,27,42,0.28)',
          }}>KL</div>
          <div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: '600', fontSize: '14px', color: '#2C1810', lineHeight: 1.25 }}>
              Karina Lara
            </p>
            <p style={{ fontSize: '10px', color: '#C4A35A', fontWeight: '700', letterSpacing: '0.6px', textTransform: 'uppercase', marginTop: '2px' }}>
              Nutrición Clínica
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav principal ── */}
      <nav style={{ padding: '14px 12px 4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: '#C4A35A', textTransform: 'uppercase', padding: '0 8px 10px' }}>
          Principal
        </p>
        {NAV_PRINCIPAL.map(item => {
          const active = isActive(item.href, item.exact ?? true)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '9px',
                textDecoration: 'none', fontSize: '14px',
                fontWeight: active ? '600' : '500',
                color: active ? '#7B1B2A' : '#6B4F3A',
                background: active ? '#F5E8EB' : 'transparent',
                borderLeft: `3px solid ${active ? '#7B1B2A' : 'transparent'}`,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = '#F2EDE4'
                  el.style.color = '#2C1810'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = 'transparent'
                  el.style.color = '#6B4F3A'
                }
              }}
            >
              <span style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#7B1B2A' : '#9B7B65', flexShrink: 0 }}>
                {Icons[item.icon as keyof typeof Icons]}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* ── Sección expediente (inactivo hasta seleccionar paciente) ── */}
      <div style={{ padding: '12px 12px 4px', borderTop: '1px solid #F2EDE4', marginTop: '8px' }}>
        <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: '#C9B8A8', textTransform: 'uppercase', padding: '0 8px 10px' }}>
          Expediente del Paciente
        </p>
        {NAV_PACIENTE.map(item => (
          <div
            key={item.label}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 12px', borderRadius: '9px',
              fontSize: '13px', fontWeight: '400',
              color: '#C9B8A8', cursor: 'default',
            }}
          >
            <span style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DDD0C4', flexShrink: 0 }}>
              {Icons[item.icon as keyof typeof Icons]}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            <span style={{
              fontSize: '9px', background: '#F5EDE4', color: '#C9B8A8',
              padding: '2px 7px', borderRadius: '999px', fontWeight: '700', letterSpacing: '0.3px',
            }}>
              PRONTO
            </span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* ── Usuario + Cerrar sesión ── */}
      <div style={{ padding: '12px 14px 20px', borderTop: '1px solid #F2EDE4' }}>
        {usuario && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: '10px',
            background: '#FAF7F2', marginBottom: '10px',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #8B6914, #C4A35A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '12px', fontWeight: '700',
              fontFamily: "'Playfair Display', serif",
            }}>
              {iniciales}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#2C1810', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                {nombreCorto}
              </p>
              <p style={{ fontSize: '10px', color: '#C4A35A', fontWeight: '600', letterSpacing: '0.3px' }}>
                Administrador
              </p>
            </div>
          </div>
        )}

        <button
          onClick={cerrar}
          style={{
            width: '100%', padding: '9px 14px', borderRadius: '9px',
            border: '1.5px solid #E8DDD0', background: 'white',
            color: '#9B7B65', fontSize: '13px', fontWeight: '500',
            cursor: 'pointer', fontFamily: "'Lato', sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.background = '#FAF7F2'
            el.style.color = '#7B1B2A'
            el.style.borderColor = '#7B1B2A'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.background = 'white'
            el.style.color = '#9B7B65'
            el.style.borderColor = '#E8DDD0'
          }}
        >
          {Icons.logout}
          Cerrar sesión
        </button>
      </div>

    </aside>
  )
}
