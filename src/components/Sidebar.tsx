'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard',   icon: '⌂',  label: 'Dashboard' },
  { href: '/pacientes',   icon: '⊕',  label: 'Pacientes', exact: false },
  { href: '#historia',    icon: '≡',  label: 'Historia Clínica', disabled: false },
  { href: '#antro',       icon: '◎',  label: 'Antropometría', disabled: false },
  { href: '#plan',        icon: '✦',  label: 'Plan IA', disabled: false },
  { href: '#seguimiento', icon: '◈',  label: 'Seguimiento', disabled: false },
  { href: '#expediente',  icon: '▦',  label: 'Expediente', disabled: false },
]

interface SidebarProps {
  usuario?: string
}

export default function Sidebar({ usuario }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const cerrar = async () => { await signOut(auth); router.replace('/') }

  const isActive = (href: string, exact = true) => {
    if (href.startsWith('#')) return false
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside style={{
      width: '240px', minHeight: '100vh', background: 'white',
      borderRight: '1px solid #E8DDD0',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, bottom: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 20px 24px', borderBottom: '1px solid #F2EDE4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
            background: 'linear-gradient(135deg, #7B1B2A 0%, #A63244 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '15px', fontWeight: '700',
            fontFamily: "'Playfair Display', serif",
            boxShadow: '0 4px 12px rgba(123,27,42,0.3)',
          }}>KL</div>
          <div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: '600', fontSize: '14px', color: '#2C1810', lineHeight: 1.2 }}>Clínica</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: '600', fontSize: '14px', color: '#7B1B2A', lineHeight: 1.2 }}>Karina Lara</p>
            <p style={{ fontSize: '10px', color: '#C4A35A', fontWeight: '600', letterSpacing: '0.5px', marginTop: '2px' }}>NUTRICIÓN CLÍNICA</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: '#C4A35A', textTransform: 'uppercase', padding: '4px 8px 10px' }}>Menú principal</p>
        {NAV.map(item => {
          const active = isActive(item.href, item.exact ?? true)
          const disabled = item.href.startsWith('#')
          return (
            <Link
              key={item.href}
              href={disabled ? '#' : item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '14px', fontWeight: active ? '600' : '500',
                color: active ? '#7B1B2A' : disabled ? '#C9B8A8' : '#6B4F3A',
                background: active ? '#F5E8EB' : 'transparent',
                borderLeft: active ? '3px solid #7B1B2A' : '3px solid transparent',
                transition: 'all 0.15s ease',
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center', opacity: disabled ? 0.4 : 1 }}>{item.icon}</span>
              <span>{item.label}</span>
              {disabled && (
                <span style={{ marginLeft: 'auto', fontSize: '9px', background: '#F2EDE4', color: '#C9B8A8', padding: '2px 6px', borderRadius: '10px', fontWeight: '600', letterSpacing: '0.3px' }}>PRONTO</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid #F2EDE4' }}>
        {usuario && (
          <div style={{ padding: '8px 12px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B6914, #C4A35A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '12px', fontWeight: '700', flexShrink: 0,
              }}>
                {usuario.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#2C1810', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {usuario.split('@')[0]}
                </p>
                <p style={{ fontSize: '10px', color: '#9B7B65', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Administrador
                </p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={cerrar}
          style={{
            width: '100%', padding: '9px', borderRadius: '10px',
            border: '1.5px solid #E8DDD0', background: 'white',
            color: '#9B7B65', fontSize: '13px', fontWeight: '500',
            cursor: 'pointer', fontFamily: "'Lato', sans-serif",
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = '#FAF7F2'; (e.target as HTMLButtonElement).style.color = '#7B1B2A'; (e.target as HTMLButtonElement).style.borderColor = '#7B1B2A' }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'white'; (e.target as HTMLButtonElement).style.color = '#9B7B65'; (e.target as HTMLButtonElement).style.borderColor = '#E8DDD0' }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
