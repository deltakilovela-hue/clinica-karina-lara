'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { TEXTURAS_DATA } from '../page'

export default function TexturaDetallePage() {
  const params = useParams()
  const tipo = params?.tipo as string

  const textura = TEXTURAS_DATA.find(t => t.id === tipo)

  if (!textura) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Lato', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤔</div>
          <p style={{ fontSize: '18px', color: '#6B4F3A', marginBottom: '24px' }}>No encontramos esa textura.</p>
          <Link href="/texturas" style={{ background: '#7B1B2A', color: 'white', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: '600' }}>
            ← Ver todas las texturas
          </Link>
        </div>
      </div>
    )
  }

  const otrasTexturas = TEXTURAS_DATA.filter(t => t.id !== textura.id)

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Lato:wght@400;600;700&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .alimento-card { transition: transform 0.15s, box-shadow 0.15s; animation: fadeUp 0.3s ease both; }
        .alimento-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(44,24,16,0.12) !important; }
        .back-btn:hover { background: rgba(255,255,255,0.2) !important; }
        .otra-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(44,24,16,0.1) !important; }
      `}</style>

      {/* ── Header con color de la textura ── */}
      <div style={{
        background: `linear-gradient(135deg, ${textura.color} 0%, ${textura.color}CC 100%)`,
        padding: '40px 24px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decoración de fondo */}
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px',
          width: '180px', height: '180px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-50px', left: '10%',
          width: '240px', height: '240px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '760px', margin: '0 auto', position: 'relative' }}>
          {/* Breadcrumb */}
          <Link
            href="/texturas"
            className="back-btn"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
              fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px',
              padding: '6px 12px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.12)',
              marginBottom: '24px', transition: 'background 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Todas las texturas
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Ícono grande */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '22px',
              background: 'rgba(255,255,255,0.18)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '40px',
              border: '2px solid rgba(255,255,255,0.25)', flexShrink: 0,
            }}>
              {textura.emoji}
            </div>

            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                Guía de Texturas · Clínica Karina Lara
              </p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '34px', fontWeight: '700', color: 'white', lineHeight: 1.15, margin: 0 }}>
                Textura {textura.label}
              </h1>
            </div>
          </div>

          {/* Descripción */}
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, maxWidth: '560px', marginTop: '20px', marginBottom: 0 }}>
            {textura.descripcion}
          </p>
        </div>
      </div>

      {/* ── Chip sensorial ── */}
      <div style={{ background: textura.bg, borderBottom: `1px solid ${textura.border}` }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: textura.color, letterSpacing: '0.5px' }}>
            🧠 Experiencia sensorial:
          </span>
          {textura.sensorial.split('·').map((s, i) => (
            <span key={i} style={{
              background: 'white', border: `1.5px solid ${textura.border}`,
              borderRadius: '20px', padding: '4px 12px',
              fontSize: '12px', color: textura.color, fontWeight: '600',
            }}>
              {s.trim()}
            </span>
          ))}
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '36px 24px' }}>

        {/* Título de sección */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: '700', color: '#2C1810', marginBottom: '6px' }}>
            Alimentos de textura {textura.label.toLowerCase()}
          </h2>
          <p style={{ fontSize: '14px', color: '#9B7B65', margin: 0 }}>
            Muéstrale estas imágenes a tu hijo/a y observa su reacción. ¿Los reconoce? ¿Los ha probado antes?
          </p>
        </div>

        {/* Grid de alimentos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px', marginBottom: '40px' }}>
          {textura.alimentos.map((alimento, i) => (
            <div
              key={i}
              className="alimento-card"
              style={{
                background: 'white', borderRadius: '16px',
                border: `2px solid ${textura.border}`,
                padding: '20px 14px', textAlign: 'center',
                boxShadow: '0 2px 10px rgba(44,24,16,0.05)',
                animationDelay: `${i * 40}ms`,
              }}
            >
              {/* Emoji grande como imagen */}
              <div style={{
                width: '64px', height: '64px', borderRadius: '18px',
                background: textura.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '34px', margin: '0 auto 12px',
                border: `1.5px solid ${textura.border}`,
              }}>
                {alimento.emoji}
              </div>

              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '14px', fontWeight: '700',
                color: '#2C1810', lineHeight: 1.3, marginBottom: '5px',
              }}>
                {alimento.nombre}
              </p>

              <p style={{
                fontSize: '11px', color: '#9B7B65',
                lineHeight: 1.4, fontStyle: 'italic',
              }}>
                {alimento.nota}
              </p>
            </div>
          ))}
        </div>

        {/* ── Bloque de ayuda para papás ── */}
        <div style={{
          background: 'white', borderRadius: '16px',
          border: `1px solid ${textura.border}`,
          padding: '24px', marginBottom: '40px',
          display: 'flex', gap: '16px', alignItems: 'flex-start',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '14px',
            background: textura.bg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0, fontSize: '22px',
            border: `1.5px solid ${textura.border}`,
          }}>
            💬
          </div>
          <div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '600', color: '#2C1810', marginBottom: '8px' }}>
              ¿Cómo explorar esta textura con tu hijo/a?
            </p>
            <p style={{ fontSize: '13px', color: '#6B4F3A', lineHeight: 1.75, margin: 0 }}>
              Señala cada alimento y pregúntale: <strong>"¿Conoces esto?"</strong> y <strong>"¿Lo has probado?"</strong>.
              Observa su lenguaje corporal: si se aleja, hace muecas o se muestra curioso. No hay respuestas
              correctas o incorrectas — esta información ayuda a la nutrióloga Karina a entender mejor el
              perfil sensorial de tu hijo/a y diseñar un plan progresivo y respetuoso.
            </p>
          </div>
        </div>

        {/* ── Navegación: otras texturas ── */}
        <div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: '700', color: '#2C1810', marginBottom: '16px' }}>
            Explorar otras texturas
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
            {otrasTexturas.map(t => (
              <Link
                key={t.id}
                href={`/texturas/${t.id}`}
                className="otra-card"
                style={{
                  background: 'white', borderRadius: '12px',
                  border: `2px solid ${t.border}`,
                  padding: '14px 10px', textDecoration: 'none',
                  textAlign: 'center', transition: 'transform 0.15s, box-shadow 0.15s',
                  boxShadow: '0 2px 8px rgba(44,24,16,0.05)',
                  display: 'block',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>{t.emoji}</div>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '12px', fontWeight: '700',
                  color: t.color, margin: 0, lineHeight: 1.3,
                }}>
                  {t.label}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Pie de página */}
        <div style={{ marginTop: '48px', textAlign: 'center', paddingTop: '24px', borderTop: '1px solid #E8DDD0' }}>
          <p style={{ fontSize: '12px', color: '#C4A882', lineHeight: 1.6 }}>
            Guía educativa · Clínica Karina Lara · Nutrición Pediátrica
          </p>
        </div>
      </div>
    </div>
  )
}
