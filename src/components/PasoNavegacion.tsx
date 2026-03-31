'use client'

import Link from 'next/link'

// ─── Pasos del flujo clínico ────────────────────────────────────────────────
const PASOS = [
  {
    key: 'historia',
    label: 'Historia Clínica',
    short: 'Historia',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    key: 'antropometria',
    label: 'Antropometría',
    short: 'Antropometría',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    key: 'diagnostico',
    label: 'Diagnóstico',
    short: 'Diagnóstico',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    key: 'plan',
    label: 'Plan Nutricional IA',
    short: 'Plan IA',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
  },
]

interface PasoNavegacionProps {
  pacienteId: string
  pasoActual: 'historia' | 'antropometria' | 'diagnostico' | 'plan'
}

export default function PasoNavegacion({ pacienteId, pasoActual }: PasoNavegacionProps) {
  const indiceActual = PASOS.findIndex(p => p.key === pasoActual)
  const pasoPrev = indiceActual > 0 ? PASOS[indiceActual - 1] : null
  const pasoNext = indiceActual < PASOS.length - 1 ? PASOS[indiceActual + 1] : null

  const hrefPrev = pasoPrev ? `/pacientes/${pacienteId}/${pasoPrev.key}` : null
  const hrefNext = pasoNext ? `/pacientes/${pacienteId}/${pasoNext.key}` : null
  const hrefExpediente = `/pacientes/${pacienteId}`

  return (
    <div style={{
      background: 'white',
      border: '1px solid #E8DDD0',
      borderRadius: '16px',
      padding: '20px 24px',
      marginTop: '32px',
      boxShadow: '0 2px 12px rgba(44,24,16,0.05)',
    }}>
      {/* ── Stepper ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '0',
        marginBottom: '20px',
        overflowX: 'auto', padding: '4px 0',
      }}>
        {PASOS.map((paso, i) => {
          const activo = paso.key === pasoActual
          const completado = i < indiceActual
          return (
            <div key={paso.key} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Nodo */}
              <Link
                href={`/pacientes/${pacienteId}/${paso.key}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textDecoration: 'none', gap: '6px', minWidth: '80px',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: activo
                    ? 'linear-gradient(135deg, #7B1B2A, #A63244)'
                    : completado
                    ? '#D8F3DC'
                    : '#F2EDE4',
                  color: activo ? 'white' : completado ? '#2D6A4F' : '#9B7B65',
                  border: activo ? '2px solid #7B1B2A' : completado ? '2px solid #95D5A8' : '2px solid #E8DDD0',
                  boxShadow: activo ? '0 3px 10px rgba(123,27,42,0.25)' : 'none',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}>
                  {completado && !activo ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : paso.icon}
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: activo ? '700' : '500',
                  color: activo ? '#7B1B2A' : completado ? '#2D6A4F' : '#9B7B65',
                  textAlign: 'center', lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                }}>
                  {paso.short}
                </span>
              </Link>

              {/* Línea conectora */}
              {i < PASOS.length - 1 && (
                <div style={{
                  width: '40px', height: '2px', margin: '0 4px', marginBottom: '20px',
                  background: i < indiceActual ? '#95D5A8' : '#E8DDD0',
                  flexShrink: 0,
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Botones de navegación ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        {/* Anterior */}
        {hrefPrev ? (
          <Link href={hrefPrev} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '10px',
            border: '1.5px solid #E8DDD0', background: 'white',
            color: '#6B4F3A', fontSize: '14px', fontWeight: '600',
            textDecoration: 'none', transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#FAF7F2'
            el.style.borderColor = '#C9B8A8'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'white'
            el.style.borderColor = '#E8DDD0'
          }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            {pasoPrev!.short}
          </Link>
        ) : (
          <Link href={hrefExpediente} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '10px',
            border: '1.5px solid #E8DDD0', background: 'white',
            color: '#6B4F3A', fontSize: '14px', fontWeight: '600',
            textDecoration: 'none', transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#FAF7F2'
            el.style.borderColor = '#C9B8A8'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'white'
            el.style.borderColor = '#E8DDD0'
          }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Expediente
          </Link>
        )}

        {/* Centro: label del paso actual */}
        <p style={{ fontSize: '12px', color: '#9B7B65', textAlign: 'center', flex: 1 }}>
          Paso {indiceActual + 1} de {PASOS.length}
        </p>

        {/* Siguiente */}
        {hrefNext ? (
          <Link href={hrefNext} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #7B1B2A 0%, #A63244 100%)',
            color: 'white', fontSize: '14px', fontWeight: '600',
            textDecoration: 'none', border: 'none',
            boxShadow: '0 3px 10px rgba(123,27,42,0.25)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 5px 16px rgba(123,27,42,0.38)'
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 10px rgba(123,27,42,0.25)'
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
          }}
          >
            {pasoNext!.short}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        ) : (
          <Link href={hrefExpediente} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)',
            color: 'white', fontSize: '14px', fontWeight: '600',
            textDecoration: 'none', border: 'none',
            boxShadow: '0 3px 10px rgba(45,106,79,0.25)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 5px 16px rgba(45,106,79,0.38)'
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 10px rgba(45,106,79,0.25)'
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
          }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Ver Expediente
          </Link>
        )}
      </div>
    </div>
  )
}
