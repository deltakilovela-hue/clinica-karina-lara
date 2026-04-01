'use client'

import Link from 'next/link'

export const TEXTURAS_DATA = [
  {
    id: 'crujiente',
    label: 'Crujiente',
    emoji: '🥨',
    color: '#C4831A',
    bg: '#FDF6E3',
    border: '#F0C060',
    descripcion: 'Alimentos que hacen sonido al morderlos. Resistentes y se fragmentan en piezas.',
    sensorial: 'Ruido al masticar · Sensación de quiebre · Superficie irregular',
    alimentos: [
      { nombre: 'Galletas saladas', emoji: '🍪', nota: 'Tipo Saladitas' },
      { nombre: 'Pan tostado', emoji: '🍞', nota: 'Bien dorado' },
      { nombre: 'Tostadas', emoji: '🫓', nota: 'Planas y crocantes' },
      { nombre: 'Papas fritas', emoji: '🍟', nota: 'Tipo Sabritas' },
      { nombre: 'Palomitas', emoji: '🍿', nota: 'Sin mantequilla' },
      { nombre: 'Zanahoria cruda', emoji: '🥕', nota: 'En bastones' },
      { nombre: 'Apio crudo', emoji: '🌿', nota: 'En tiras' },
      { nombre: 'Nueces/almendras', emoji: '🥜', nota: 'Enteras o picadas' },
    ],
  },
  {
    id: 'suave',
    label: 'Suave / Cremosa',
    emoji: '🥛',
    color: '#5C3D8F',
    bg: '#F3EEFB',
    border: '#C8A8E8',
    descripcion: 'Alimentos que se derriten o se extienden con facilidad. No requieren masticar.',
    sensorial: 'Sin resistencia · Se deshace en la boca · Temperatura fresca o tibia',
    alimentos: [
      { nombre: 'Yogurt natural', emoji: '🥛', nota: 'Sin trozos' },
      { nombre: 'Puré de papa', emoji: '🥔', nota: 'Bien batido' },
      { nombre: 'Aguacate/guacamole', emoji: '🥑', nota: 'Sin grumos' },
      { nombre: 'Queso crema', emoji: '🧀', nota: 'Untable' },
      { nombre: 'Mantequilla de maní', emoji: '🥜', nota: 'Cremosa' },
      { nombre: 'Helado', emoji: '🍦', nota: 'Sin trozos' },
      { nombre: 'Pudín/gelatina', emoji: '🍮', nota: 'Textura lisa' },
      { nombre: 'Hummus', emoji: '🫘', nota: 'Bien molido' },
    ],
  },
  {
    id: 'blanda',
    label: 'Blanda / Pastosa',
    emoji: '🍌',
    color: '#2D6A4F',
    bg: '#F0FAF5',
    border: '#95D5A8',
    descripcion: 'Alimentos que se aplastan fácilmente con la lengua o con poca presión.',
    sensorial: 'Cede al presionar · Compacto pero no duro · No hace ruido',
    alimentos: [
      { nombre: 'Plátano maduro', emoji: '🍌', nota: 'Bien maduro' },
      { nombre: 'Aguacate', emoji: '🥑', nota: 'En trozos' },
      { nombre: 'Tortilla de maíz', emoji: '🫓', nota: 'Suave y caliente' },
      { nombre: 'Pan de caja', emoji: '🍞', nota: 'Sin tostar' },
      { nombre: 'Papa cocida', emoji: '🥔', nota: 'En trozos blandos' },
      { nombre: 'Arroz bien cocido', emoji: '🍚', nota: 'Caldoso/pegajoso' },
      { nombre: 'Frijoles refritos', emoji: '🫘', nota: 'Bien molidos' },
      { nombre: 'Carne molida', emoji: '🥩', nota: 'Bien cocida' },
    ],
  },
  {
    id: 'fibrosa',
    label: 'Fibrosa',
    emoji: '🥦',
    color: '#1B4F8C',
    bg: '#EEF4FB',
    border: '#90B8E0',
    descripcion: 'Alimentos con hebras o fibras que requieren más masticación.',
    sensorial: 'Hebras al masticar · Requiere esfuerzo · Puede pegarse entre dientes',
    alimentos: [
      { nombre: 'Brócoli cocido', emoji: '🥦', nota: 'Bien suavizado' },
      { nombre: 'Pollo deshebrado', emoji: '🍗', nota: 'Jugoso' },
      { nombre: 'Carne de res cocida', emoji: '🥩', nota: 'En tiritas' },
      { nombre: 'Apio cocido', emoji: '🌿', nota: 'Suavizado' },
      { nombre: 'Ejotes cocidos', emoji: '🫛', nota: 'Tiernos' },
      { nombre: 'Espinaca', emoji: '🥬', nota: 'Cocida o cruda' },
      { nombre: 'Mango maduro', emoji: '🥭', nota: 'Fibroso natural' },
      { nombre: 'Piña', emoji: '🍍', nota: 'En trozos' },
    ],
  },
  {
    id: 'grumosa',
    label: 'Grumosa',
    emoji: '🫘',
    color: '#8B6914',
    bg: '#FDF6E3',
    border: '#D4A017',
    descripcion: 'Alimentos con pequeños trozos irregulares dentro de una base más suave.',
    sensorial: 'Sorpresas al masticar · Irregularidad de textura · Trozos inesperados',
    alimentos: [
      { nombre: 'Frijoles de olla', emoji: '🫘', nota: 'Enteros en caldo' },
      { nombre: 'Lentejas cocidas', emoji: '🟤', nota: 'Con o sin caldo' },
      { nombre: 'Arroz con verduras', emoji: '🍚', nota: 'Trozos de verdura' },
      { nombre: 'Requesón', emoji: '🧀', nota: 'Granuloso suave' },
      { nombre: 'Avena con frutas', emoji: '🥣', nota: 'Fruta en trozos' },
      { nombre: 'Sopa de pasta', emoji: '🍜', nota: 'Con caldo' },
      { nombre: 'Guacamole con jitomate', emoji: '🥑', nota: 'Con trozos' },
      { nombre: 'Yogurt con granola', emoji: '🥛', nota: 'Trozos crujientes' },
    ],
  },
  {
    id: 'pegajosa',
    label: 'Pegajosa',
    emoji: '🍯',
    color: '#9B2335',
    bg: '#FDF2F4',
    border: '#F5C2C7',
    descripcion: 'Alimentos que se adhieren al paladar, dientes o lengua.',
    sensorial: 'Se pega al paladar · Difícil de desprender · Sensación duradera',
    alimentos: [
      { nombre: 'Miel', emoji: '🍯', nota: 'Natural de abeja' },
      { nombre: 'Mantequilla de maní', emoji: '🥜', nota: 'Espesa' },
      { nombre: 'Arroz blanco', emoji: '🍚', nota: 'Muy cocido' },
      { nombre: 'Tamal', emoji: '🫔', nota: 'Masa suave' },
      { nombre: 'Gomitas/dulces', emoji: '🍬', nota: 'Masticables' },
      { nombre: 'Higo', emoji: '🫐', nota: 'Maduro muy dulce' },
      { nombre: 'Dátil', emoji: '🟫', nota: 'Muy dulce y denso' },
      { nombre: 'Plátano deshidratado', emoji: '🍌', nota: 'Chips pegajosos' },
    ],
  },
  {
    id: 'liquida',
    label: 'Líquida',
    emoji: '🥤',
    color: '#1B4F8C',
    bg: '#EEF4FB',
    border: '#90B8E0',
    descripcion: 'Consistencia que fluye sin necesitar masticación. Desde agua hasta caldos.',
    sensorial: 'Fluye solo · Sin masticación · Temperatura variable',
    alimentos: [
      { nombre: 'Agua natural', emoji: '💧', nota: 'Pura o con limón' },
      { nombre: 'Leche', emoji: '🥛', nota: 'Entera o descremada' },
      { nombre: 'Caldo de pollo', emoji: '🍲', nota: 'Solo el caldo' },
      { nombre: 'Jugos naturales', emoji: '🍊', nota: 'Sin colar o colados' },
      { nombre: 'Licuados', emoji: '🥤', nota: 'Frutas o verduras' },
      { nombre: 'Atole', emoji: '☕', nota: 'Aguado o espeso' },
      { nombre: 'Sopa de verduras', emoji: '🍵', nota: 'Solo el caldo' },
      { nombre: 'Bebidas de soya', emoji: '🌱', nota: 'Vegetales' },
    ],
  },
  {
    id: 'mixta',
    label: 'Mixta',
    emoji: '🍲',
    color: '#7B1B2A',
    bg: '#F5E8EB',
    border: '#D4A0A8',
    descripcion: 'Combinación de distintas texturas en un mismo alimento. La más retante para niños selectivos.',
    sensorial: 'Cambios de textura · Sólido en líquido · Impredecible',
    alimentos: [
      { nombre: 'Sopa de fideos', emoji: '🍜', nota: 'Fideos + caldo' },
      { nombre: 'Estofado', emoji: '🥘', nota: 'Carne + verduras + salsa' },
      { nombre: 'Cereal con leche', emoji: '🥣', nota: 'Se ablanda poco a poco' },
      { nombre: 'Tacos', emoji: '🌮', nota: 'Tortilla + relleno variado' },
      { nombre: 'Pizza', emoji: '🍕', nota: 'Masa + queso + toppings' },
      { nombre: 'Sándwich', emoji: '🥪', nota: 'Pan + proteína + vegetales' },
      { nombre: 'Arroz con leche', emoji: '🍚', nota: 'Granos en líquido espeso' },
      { nombre: 'Chilaquiles', emoji: '🫔', nota: 'Tostada + salsa = blando' },
    ],
  },
]

export default function TexturasIndexPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        .textura-card { animation: fadeUp 0.25s ease both; transition: transform 0.15s, box-shadow 0.15s; }
        .textura-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(44,24,16,0.12) !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #7B1B2A 0%, #A63244 100%)', padding: '48px 24px 40px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: '12px' }}>
            Clínica Karina Lara · Guía para Padres
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '36px', fontWeight: '700', color: 'white', lineHeight: 1.2, marginBottom: '12px' }}>
            Guía de Texturas Alimentarias
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, maxWidth: '520px' }}>
            Haz clic en cada textura para ver ejemplos de alimentos. Esta guía te ayudará a identificar qué texturas tolera mejor tu hijo/a.
          </p>
        </div>
      </div>

      {/* ── Grid de texturas ── */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          {TEXTURAS_DATA.map((t, i) => (
            <Link
              key={t.id}
              href={`/texturas/${t.id}`}
              className="textura-card"
              style={{
                background: 'white', borderRadius: '16px',
                border: `2px solid ${t.border}`,
                padding: '24px 16px', textDecoration: 'none',
                textAlign: 'center', animationDelay: `${i * 50}ms`,
                boxShadow: '0 2px 10px rgba(44,24,16,0.06)',
                display: 'block',
              }}
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: t.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '28px', margin: '0 auto 12px',
                border: `1.5px solid ${t.border}`,
              }}>
                {t.emoji}
              </div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '700', color: t.color, marginBottom: '6px' }}>
                {t.label}
              </p>
              <p style={{ fontSize: '12px', color: '#9B7B65', lineHeight: 1.4 }}>
                {t.descripcion.split('.')[0]}
              </p>
              <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: '700', color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                Ver alimentos
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Nota para papás */}
        <div style={{ marginTop: '40px', background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F5E8EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px' }}>💡</div>
          <div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: '600', color: '#2C1810', marginBottom: '6px' }}>¿Cómo usar esta guía?</p>
            <p style={{ fontSize: '13px', color: '#6B4F3A', lineHeight: 1.7 }}>
              Haz clic en cada textura para ver los alimentos de ese grupo. Puedes mostrarle las imágenes a tu hijo/a y observar su reacción: ¿los reconoce? ¿los ha probado? ¿qué cara hace al verlos? Esta información es muy útil para la nutrióloga Karina al momento de diseñar el plan alimentario.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
