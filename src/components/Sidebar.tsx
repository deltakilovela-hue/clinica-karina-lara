'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPacientes, Paciente } from '@/lib/pacientes'

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
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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

const NAV = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/pacientes', icon: 'pacientes', label: 'Pacientes', exact: false },
]

interface SidebarProps { usuario?: string }

export default function Sidebar({ usuario }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()

  // ── Búsqueda rápida ──────────────────────────────────────────────────────────
  const [query, setQuery]           = useState('')
  const [pacientes, setPacientes]   = useState<Paciente[]>([])
  const [abierto, setAbierto]       = useState(false)
  const searchRef                   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    obtenerPacientes().then(setPacientes).catch(() => {})
  }, [])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const resultados = query.trim().length >= 1
    ? pacientes.filter(p =>
        p.nombre.toLowerCase().includes(query.toLowerCase()) ||
        p.tutor.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : []

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

      {/* ── Buscador rápido de pacientes ── */}
      <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid #F2EDE4' }} ref={searchRef}>
        <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: '#C4A35A', textTransform: 'uppercase', padding: '0 4px 8px' }}>
          Buscar Paciente
        </p>

        <div style={{ position: 'relative' }}>
          {/* Input */}
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)',
              color: '#C9B8A8', display: 'flex', pointerEvents: 'none',
            }}>
              {Icons.search}
            </span>
            <input
              type="text"
              placeholder="Nombre o tutor..."
              value={query}
              onChange={e => { setQuery(e.target.value); setAbierto(true) }}
              onFocus={() => setAbierto(true)}
              style={{
                width: '100%', padding: '9px 12px 9px 32px',
                borderRadius: '9px', fontSize: '13px',
                border: '1.5px solid #E8DDD0',
                background: '#FAF7F2', color: '#2C1810',
                outline: 'none', fontFamily: "'Lato', sans-serif",
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocusCapture={e => {
                e.currentTarget.style.borderColor = '#7B1B2A'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(123,27,42,0.08)'
              }}
              onBlurCapture={e => {
                e.currentTarget.style.borderColor = '#E8DDD0'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            {/* Limpiar */}
            {query && (
              <button
                onClick={() => { setQuery(''); setAbierto(false) }}
                style={{
                  position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#C9B8A8', padding: '0', display: 'flex', lineHeight: 1,
                  fontSize: '16px',
                }}
              >×</button>
            )}
          </div>

          {/* Dropdown de resultados */}
          {abierto && resultados.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: 'white', borderRadius: '11px',
              border: '1px solid #E8DDD0',
              boxShadow: '0 8px 28px rgba(44,24,16,0.13)',
              zIndex: 100, overflow: 'hidden',
              animation: 'fadeIn 0.15s ease',
            }}>
              {resultados.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/pacientes/${p.id}`}
                  onClick={() => { setQuery(''); setAbierto(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', textDecoration: 'none',
                    borderBottom: i < resultados.length - 1 ? '1px solid #F2EDE4' : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAF7F2'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'white'}
                >
                  {/* Avatar mini */}
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '11px', fontWeight: '700',
                    fontFamily: "'Playfair Display', serif",
                  }}>
                    {p.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#2C1810', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.nombre}
                    </p>
                    <p style={{ fontSize: '11px', color: '#9B7B65', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.edad} años · {p.tutor}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Sin resultados */}
          {abierto && query.trim().length >= 1 && resultados.length === 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: 'white', borderRadius: '11px',
              border: '1px solid #E8DDD0',
              boxShadow: '0 8px 28px rgba(44,24,16,0.13)',
              zIndex: 100, padding: '14px 12px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '12px', color: '#C9B8A8' }}>Sin resultados para "{query}"</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Nav principal ── */}
      <nav style={{ padding: '14px 12px 4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: '#C4A35A', textTransform: 'uppercase', padding: '0 8px 10px' }}>
          Principal
        </p>
        {NAV.map(item => {
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
