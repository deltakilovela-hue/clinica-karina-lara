'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Paciente, actualizarPaciente } from '@/lib/pacientes'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

// ─── Constantes de días ───────────────────────────────────────────────────────
const DIAS_COMPLETOS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO']
const DIAS_CORTOS    = ['Lun',   'Mar',    'Mié',       'Jue',    'Vie',     'Sáb',    'Dom']
const DIAS_VARIANTES: Record<string, string> = {
  'MIERCOLES': 'MIÉRCOLES', 'SABADO': 'SÁBADO',
  'MIÉRCOLES': 'MIÉRCOLES', 'SÁBADO': 'SÁBADO',
}

// ─── Comidas con icono y color ────────────────────────────────────────────────
const COMIDAS = [
  { clave: 'desayuno',    label: 'Desayuno',    icon: '🌅', color: '#8B6914', bg: '#FDF6E3', patrones: ['Desayuno'] },
  { clave: 'colacion_am', label: 'Colación AM', icon: '🍎', color: '#2D6A4F', bg: '#F0FAF5', patrones: ['Colaci[oó]n AM', 'Colaci[oó]n Matutina', 'Colaci[oó]n de la ma'] },
  { clave: 'comida',      label: 'Comida',      icon: '🍽️', color: '#7B1B2A', bg: '#FDF0F2', patrones: ['Comida'] },
  { clave: 'colacion_pm', label: 'Colación PM', icon: '🥜', color: '#1B4F8C', bg: '#EEF4FB', patrones: ['Colaci[oó]n PM', 'Colaci[oó]n Vespertina', 'Colaci[oó]n de la tarde'] },
  { clave: 'cena',        label: 'Cena',        icon: '🌙', color: '#4A1B6B', bg: '#F5EEF8', patrones: ['Cena'] },
]

// ─── Parser de días ───────────────────────────────────────────────────────────
type DiaComidas = Record<string, string>
type PlanPorDia = Record<string, DiaComidas>

function parsearPlanPorDia(texto: string): PlanPorDia {
  const resultado: PlanPorDia = {}
  const patronDias = DIAS_COMPLETOS.map(d => d.replace('É', '[EÉ]').replace('Á', '[AÁ]')).join('|')
  const regex = new RegExp(
    `###\\s+(${patronDias})\\s*\\n([\\s\\S]*?)(?=###\\s+(?:${patronDias})|###\\s+RECOMENDAC|###\\s+ALIMENTO|###\\s+LISTA|###\\s+PRESUPUESTO|---\\s*$|$)`,
    'gi'
  )
  let match
  while ((match = regex.exec(texto)) !== null) {
    const diaRaw = match[1].toUpperCase().trim()
    const dia    = DIAS_VARIANTES[diaRaw] || diaRaw
    const bloque = match[2]
    const comidas: DiaComidas = {}
    for (const c of COMIDAS) {
      for (const pat of c.patrones) {
        const re = new RegExp(`\\*\\*${pat}[^*]*\\*\\*:?\\s*(.+?)(?=\\n\\*\\*|\\n###|$)`, 'si')
        const m = bloque.match(re)
        if (m) { comidas[c.clave] = m[1].trim().replace(/\n/g, ' '); break }
      }
      if (!comidas[c.clave]) comidas[c.clave] = ''
    }
    resultado[dia] = comidas
  }
  return resultado
}

// ─── Extrae sección del texto ──────────────────────────────────────────────────
function extraerSeccion(texto: string, desde: string, hasta?: string): string {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const textoN = norm(texto), desdeN = norm(desde)
  const ini = textoN.indexOf(desdeN)
  if (ini === -1) return ''
  const start = ini + desde.length
  if (!hasta) return texto.slice(start).trim()
  const fin = textoN.indexOf(norm(hasta), start)
  return fin === -1 ? texto.slice(start).trim() : texto.slice(start, fin).trim()
}

// ─── Render texto markdown simple ─────────────────────────────────────────────
function renderTexto(texto: string) {
  const lineas = texto.split('\n')
  const out: React.ReactNode[] = []
  let i = 0
  while (i < lineas.length) {
    const l = lineas[i].trim()
    // Tabla
    if (l.startsWith('|') && l.endsWith('|')) {
      const filas: string[][] = []
      while (i < lineas.length) {
        const f = lineas[i].trim()
        if (!f.startsWith('|')) break
        if (/^\|[\s\-|]+\|$/.test(f)) { i++; continue }
        filas.push(f.split('|').slice(1, -1).map(c => c.trim()))
        i++
      }
      if (filas.length > 0) out.push(
        <div key={`t${i}`} style={{ overflowX: 'auto', margin: '14px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#7B1B2A' }}>
                {filas[0].map((c, ci) => (
                  <th key={ci} style={{ padding: '9px 14px', color: 'white', fontWeight: '700', textAlign: 'left', fontSize: '13px' }}
                    dangerouslySetInnerHTML={{ __html: c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.slice(1).map((fila, fi) => (
                <tr key={fi} style={{ background: fi % 2 === 0 ? '#FAF7F2' : 'white', borderBottom: '1px solid #E8DDD0' }}>
                  {fila.map((c, ci) => (
                    <td key={ci} style={{ padding: '9px 14px', color: '#2C1810', lineHeight: '1.5', fontSize: '13px' }}
                      dangerouslySetInnerHTML={{ __html: c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }
    if (!l)              { out.push(<div key={i} style={{ height: '8px' }} />); i++; continue }
    if (l.startsWith('---')) { out.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #E8DDD0', margin: '14px 0' }} />); i++; continue }
    if (/^#{1,2} /.test(l))  { out.push(<h2 key={i} style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', fontWeight: '700', color: '#7B1B2A', margin: '20px 0 8px', paddingBottom: '6px', borderBottom: '1px solid #F0E4E7' }}>{l.replace(/^#{1,2} /, '')}</h2>); i++; continue }
    if (l.startsWith('### ')) { out.push(<h3 key={i} style={{ fontSize: '13px', fontWeight: '700', color: '#8B6914', margin: '16px 0 6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{l.replace('### ', '')}</h3>); i++; continue }
    if (l.startsWith('- ') || l.startsWith('* ')) {
      const txt = l.replace(/^[-*] /, '')
      const partes = txt.split(/\*\*(.*?)\*\*/g)
      out.push(
        <div key={i} style={{ display: 'flex', gap: '10px', margin: '4px 0' }}>
          <span style={{ color: '#A63244', fontWeight: '700', flexShrink: 0 }}>•</span>
          <p style={{ fontSize: '14px', color: '#2C1810', lineHeight: '1.6', margin: 0 }}>
            {partes.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
          </p>
        </div>
      ); i++; continue
    }
    if (/^\d+\. /.test(l)) {
      const num = l.match(/^(\d+)\./)?.[1]
      const cont = l.replace(/^\d+\. /, '')
      out.push(
        <div key={i} style={{ display: 'flex', gap: '8px', margin: '4px 0' }}>
          <span style={{ color: '#A63244', fontWeight: '700', flexShrink: 0, minWidth: '18px' }}>{num}.</span>
          <p style={{ fontSize: '14px', color: '#2C1810', lineHeight: '1.6', margin: 0 }}>{cont}</p>
        </div>
      ); i++; continue
    }
    const partes = l.split(/\*\*(.*?)\*\*/g)
    out.push(<p key={i} style={{ fontSize: '14px', color: '#2C1810', lineHeight: '1.65', margin: '3px 0' }}>
      {partes.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
    </p>)
    i++
  }
  return out
}

export default function PortalPage() {
  const router = useRouter()
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [usuarioEmail, setUsuarioEmail] = useState('')
  const [tab, setTab] = useState<'plan' | 'mediciones' | 'lista'>('plan')
  const [diaActivo, setDiaActivo] = useState(0)
  const [itemsChecked, setItemsChecked] = useState<Set<string>>(new Set())

  const [planActual, setPlanActual] = useState('')
  const [fechaPlan, setFechaPlan] = useState('')
  const [mediciones, setMediciones] = useState<Record<string, unknown>[]>([])

  // ── Cambio de contraseña ──────────────────────────────────────────────────
  const [passActual, setPassActual]     = useState('')
  const [passNueva, setPassNueva]       = useState('')
  const [passConfirmar, setPassConfirmar] = useState('')
  const [verPassActual, setVerPassActual] = useState(false)
  const [verPassNueva, setVerPassNueva]   = useState(false)
  const [cambiandoPass, setCambiandoPass] = useState(false)
  const [passExito, setPassExito]         = useState(false)
  const [passError, setPassError]         = useState('')

  const cambiarContrasena = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassError(''); setPassExito(false)
    if (passNueva.length < 6) { setPassError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (passNueva !== passConfirmar) { setPassError('Las contraseñas nuevas no coinciden.'); return }
    const user = auth.currentUser
    if (!user || !user.email) { setPassError('Sesión expirada. Recarga la página.'); return }
    setCambiandoPass(true)
    try {
      // Re-autenticar primero
      const cred = EmailAuthProvider.credential(user.email, passActual)
      await reauthenticateWithCredential(user, cred)
      // Cambiar en Firebase Auth
      await updatePassword(user, passNueva)
      // Guardar en Firestore para que Karina pueda verla
      if (paciente?.id) await actualizarPaciente(paciente.id, { passwordAcceso: passNueva })
      setPassExito(true)
      setPassActual(''); setPassNueva(''); setPassConfirmar('')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPassError('La contraseña actual es incorrecta.')
      } else if (code === 'auth/too-many-requests') {
        setPassError('Demasiados intentos. Espera unos minutos.')
      } else {
        setPassError('Error al cambiar la contraseña. Intenta de nuevo.')
      }
    } finally { setCambiandoPass(false) }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/'); return }
      if (ADMINS.includes(user.email ?? '')) { router.replace('/dashboard'); return }
      setUsuarioEmail(user.email || '')
      try {
        const q1 = query(collection(db, 'pacientes'), where('correoAcceso', '==', user.email))
        const q2 = query(collection(db, 'pacientes'), where('correo', '==', user.email))
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)])
        const snap = !snap1.empty ? snap1 : snap2
        if (!snap.empty) {
          const p = { id: snap.docs[0].id, ...snap.docs[0].data() } as Paciente
          setPaciente(p)
          await Promise.all([cargarPlan(p.id!), cargarMediciones(p.id!)])
        }
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router])

  const cargarPlan = async (pid: string) => {
    const q = query(collection(db, `pacientes/${pid}/planes`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const d = snap.docs[0].data()
      setPlanActual(d.texto || '')
      try { setFechaPlan(d.fechaCreacion?.toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) || '') } catch { setFechaPlan('') }
    }
  }

  const cargarMediciones = async (pid: string) => {
    const q = query(collection(db, `pacientes/${pid}/antropometria`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    setMediciones(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const cerrarSesion = async () => { await signOut(auth); router.push('/') }

  // ── Cargar items palomeados desde localStorage ─────────────────────────────
  useEffect(() => {
    if (!paciente?.id) return
    try {
      const saved = localStorage.getItem(`checked_${paciente.id}`)
      if (saved) setItemsChecked(new Set(JSON.parse(saved) as string[]))
    } catch { /* ignore */ }
  }, [paciente?.id])

  const toggleItem = (itemKey: string) => {
    setItemsChecked(prev => {
      const next = new Set(prev)
      if (next.has(itemKey)) next.delete(itemKey)
      else next.add(itemKey)
      try {
        if (paciente?.id) localStorage.setItem(`checked_${paciente.id}`, JSON.stringify([...next]))
      } catch { /* ignore */ }
      return next
    })
  }

  const limpiarChecked = () => {
    setItemsChecked(new Set())
    try {
      if (paciente?.id) localStorage.removeItem(`checked_${paciente.id}`)
    } catch { /* ignore */ }
  }

  const formatFecha = (ts: unknown) => {
    if (!ts) return '—'
    try { return (ts as { toDate: () => Date }).toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '—' }
  }

  if (cargando) return (
    <div className="loading-screen"><div className="spinner" /></div>
  )

  // ── Parsear plan ──────────────────────────────────────────────────────────
  const planPorDia = planActual ? parsearPlanPorDia(planActual) : {}
  const diasConDatos = DIAS_COMPLETOS.filter(d => planPorDia[d])

  // Intro (texto antes de ### LUNES)
  const LISTA_HEADERS = ['### LISTA DEL SÚPER', '### Lista del Súper', '## LISTA DEL SÚPER',
    '### LISTA DE SUPER', '### Lista de Super', 'LISTA DEL SÚPER', 'Lista del Súper',
    '### Lista de compras', '### LISTA DE COMPRAS']
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const encontrarHeader = (texto: string, posibles: string[]) =>
    posibles.find(h => extraerSeccion(texto, h) !== '') || ''

  const listaHeader = planActual ? encontrarHeader(planActual, LISTA_HEADERS) : ''

  // Intro: todo antes del primer ### DIA o ## PLAN
  const introTexto = (() => {
    if (!planActual) return ''
    const textoN = normalize(planActual)
    const patronDias = DIAS_COMPLETOS.map(d => d.replace('É', '[EÉ]').replace('Á', '[AÁ]')).join('|')
    const m = planActual.match(new RegExp(`###\\s+(${patronDias})`, 'i'))
    if (m?.index) return planActual.slice(0, m.index).trim()
    return ''
  })()

  // Lista del súper completa
  const listaSuper = planActual && listaHeader ? extraerSeccion(planActual, listaHeader) : ''

  // ── Parsear lista del súper en categorías ──────────────────────────────────
  // items = chips simples; rawLines = líneas originales (incluye tablas)
  type CategoriaLista = { titulo: string; items: string[]; rawLines: string[] }
  const parsearLista = (texto: string): CategoriaLista[] => {
    const cats: CategoriaLista[] = []
    let actual: CategoriaLista = { titulo: 'General', items: [], rawLines: [] }
    for (const linea of texto.split('\n')) {
      const l = linea.trim()
      if (!l) { actual.rawLines.push(''); continue }
      if (l.startsWith('### ') || l.startsWith('## ') || (l.startsWith('**') && l.endsWith('**') && !l.slice(2,-2).includes('**'))) {
        if (actual.items.length > 0 || actual.rawLines.some(r => r.startsWith('|'))) cats.push(actual)
        actual = { titulo: l.replace(/^#{1,3} /, '').replace(/\*\*/g, '').replace(/:$/, '').trim(), items: [], rawLines: [] }
      } else if (l.startsWith('|')) {
        // Fila de tabla — se guarda para renderTexto()
        actual.rawLines.push(linea)
      } else if (l.startsWith('- ') || l.startsWith('* ')) {
        const item = l.replace(/^[-*] /, '').replace(/\*\*(.*?)\*\*/g, '$1').trim()
        actual.items.push(item)
        actual.rawLines.push(linea)
      } else if (l.match(/^\d+\. /)) {
        const item = l.replace(/^\d+\. /, '').replace(/\*\*(.*?)\*\*/g, '$1').trim()
        actual.items.push(item)
        actual.rawLines.push(linea)
      } else if (l.length > 0) {
        actual.items.push(l.replace(/\*\*(.*?)\*\*/g, '$1').trim())
        actual.rawLines.push(linea)
      }
    }
    if (actual.items.length > 0 || actual.rawLines.some(r => r.startsWith('|'))) cats.push(actual)
    return cats
  }

  const listaCategorias = listaSuper ? parsearLista(listaSuper) : []

  const ultimaMed = mediciones[0] as Record<string, unknown> | undefined
  const diaActualKey = diasConDatos[diaActivo] || ''
  const comidaDia = planPorDia[diaActualKey] || {}
  const tieneDias = diasConDatos.length > 0

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header style={{
        background: 'white', borderBottom: '1px solid #E8DDD0',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 8px rgba(44,24,16,0.06)',
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '62px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '9px',
              background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '700', color: 'white',
              fontFamily: "'Playfair Display', serif",
              boxShadow: '0 3px 8px rgba(123,27,42,0.25)',
            }}>KL</div>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: '600', fontSize: '14px', color: '#2C1810', lineHeight: 1.2 }}>Clínica Karina Lara</p>
              <p style={{ fontSize: '10px', color: '#C4A35A', fontWeight: '600', letterSpacing: '0.5px' }}>PORTAL PARA PADRES</p>
            </div>
          </div>
          <button onClick={cerrarSesion} className="btn-ghost" style={{ fontSize: '12px', padding: '7px 14px' }}>Salir</button>
        </div>
      </header>

      {!paciente ? (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '18px' }}>🔍</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#2C1810', marginBottom: '10px' }}>Sin expediente asociado</h2>
          <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '6px' }}>{usuarioEmail}</p>
          <p style={{ color: '#C4A35A', fontSize: '13px' }}>Contacta a la Lic. Karina Lara para obtener acceso.</p>
        </div>
      ) : (
        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '28px 20px 64px' }}>

          {/* ── PERFIL ────────────────────────────────────────── */}
          <div className="card fade-in" style={{ marginBottom: '18px', overflow: 'hidden' }}>
            <div style={{ height: '5px', background: 'linear-gradient(90deg, #7B1B2A 0%, #A63244 40%, #C4A35A 100%)' }} />
            <div style={{ padding: '22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: ultimaMed ? '18px' : 0 }}>
                <div className="avatar" style={{ width: '52px', height: '52px', fontSize: '20px', borderRadius: '12px', flexShrink: 0 }}>
                  {paciente.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '19px', fontWeight: '600', color: '#2C1810', marginBottom: '4px', textTransform: 'capitalize' }}>{paciente.nombre}</h1>
                  <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#9B7B65' }}>{paciente.edad} años</span>
                    <span className="badge badge-muted" style={{ textTransform: 'capitalize', fontSize: '11px' }}>{paciente.sexo}</span>
                  </div>
                </div>
                <span className="badge badge-success">✓ Activo</span>
              </div>
              {ultimaMed && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '9px' }}>
                  {[
                    { label: 'Peso', valor: `${ultimaMed.peso} kg`, color: '#7B1B2A' },
                    { label: 'Talla', valor: `${ultimaMed.talla} cm`, color: '#2D6A4F' },
                    { label: 'IMC', valor: String(ultimaMed.imc), color: '#8B6914' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#FAF7F2', borderRadius: '10px', padding: '12px', textAlign: 'center', border: '1px solid #E8DDD0' }}>
                      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', fontWeight: '600', color: s.color, marginBottom: '3px' }}>{s.valor}</p>
                      <p style={{ fontSize: '10px', color: '#9B7B65', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── TABS PRINCIPALES ─────────────────────────────── */}
          <div className="tab-bar fade-in">
            {[
              { key: 'plan',       label: '🥗 Plan Semanal' },
              { key: 'lista',      label: '🛒 Lista del Súper' },
              { key: 'mediciones', label: '📏 Mediciones' },
            ].map(t => (
              <button
                key={t.key}
                className={`tab-item${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key as typeof tab)}
              >{t.label}</button>
            ))}
          </div>

          {/* ══════ TAB: PLAN SEMANAL ══════════════════════════ */}
          {tab === 'plan' && (
            <div className="fade-in">
              {!planActual ? (
                <div className="card" style={{ padding: '56px 24px', textAlign: 'center', border: '2px dashed #E8DDD0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>🥗</div>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', color: '#2C1810', marginBottom: '8px' }}>Sin plan generado aún</p>
                  <p style={{ color: '#9B7B65', fontSize: '14px' }}>La nutrióloga generará tu plan en la próxima consulta</p>
                </div>
              ) : !tieneDias ? (
                /* Plan viejo (sin formato de días) */
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(135deg,#7B1B2A,#A63244)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '17px', fontWeight: '600', color: 'white', marginBottom: '2px' }}>Plan de Alimentación</h2>
                      {fechaPlan && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>{fechaPlan}</p>}
                    </div>
                    <span style={{ padding: '3px 11px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>✓ Vigente</span>
                  </div>
                  <div style={{ padding: '24px 26px' }}>{renderTexto(planActual)}</div>
                </div>
              ) : (
                <>
                  {/* Header del plan */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', fontWeight: '600', color: '#2C1810' }}>Plan Nutricional Semanal</p>
                      {fechaPlan && <p style={{ fontSize: '12px', color: '#9B7B65' }}>Generado el {fechaPlan}</p>}
                    </div>
                    <span className="badge badge-success">✓ Vigente</span>
                  </div>

                  {/* Intro (objetivos, etc.) */}
                  {introTexto && (
                    <div className="card" style={{ padding: '18px 22px', marginBottom: '14px', borderLeft: '4px solid #7B1B2A' }}>
                      {renderTexto(introTexto)}
                    </div>
                  )}

                  {/* ── Navegación por día ────────────────────── */}
                  <div style={{
                    display: 'flex', gap: '6px', marginBottom: '16px',
                    background: 'white', borderRadius: '14px', padding: '6px',
                    border: '1px solid #E8DDD0', overflowX: 'auto',
                  }}>
                    {diasConDatos.map((dia, idx) => (
                      <button
                        key={dia}
                        onClick={() => setDiaActivo(idx)}
                        style={{
                          flex: 1, minWidth: '54px', padding: '9px 6px',
                          borderRadius: '9px', border: 'none', cursor: 'pointer',
                          fontFamily: "'Lato',sans-serif", transition: 'all 0.15s',
                          background: diaActivo === idx ? '#7B1B2A' : 'transparent',
                          color: diaActivo === idx ? 'white' : '#6B4F3A',
                        }}
                      >
                        <p style={{ fontSize: '12px', fontWeight: '700', margin: 0, lineHeight: 1.2 }}>
                          {DIAS_CORTOS[DIAS_COMPLETOS.indexOf(dia)] || dia.slice(0,3)}
                        </p>
                        <p style={{ fontSize: '9px', margin: 0, opacity: 0.7, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                          {dia.slice(0, 3)}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* ── Comidas del día ───────────────────────── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {COMIDAS.map(c => {
                      const contenido = comidaDia[c.clave]
                      if (!contenido) return null
                      return (
                        <div
                          key={c.clave}
                          style={{
                            background: 'white', borderRadius: '14px',
                            border: `1px solid ${c.color}22`,
                            overflow: 'hidden',
                          }}
                        >
                          {/* Header de comida */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '12px 18px',
                            background: c.bg,
                            borderBottom: `1px solid ${c.color}18`,
                          }}>
                            <span style={{ fontSize: '20px' }}>{c.icon}</span>
                            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '14px', fontWeight: '600', color: c.color, margin: 0 }}>{c.label}</p>
                          </div>
                          {/* Contenido */}
                          <div style={{ padding: '14px 18px' }}>
                            <p style={{ fontSize: '14px', color: '#2C1810', lineHeight: '1.65', margin: 0 }}>
                              {contenido.split(/\*\*(.*?)\*\*/g).map((parte, j) =>
                                j % 2 === 1 ? <strong key={j}>{parte}</strong> : parte
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Navegación rápida prev/next */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', gap: '10px' }}>
                    <button
                      onClick={() => setDiaActivo(d => Math.max(0, d - 1))}
                      disabled={diaActivo === 0}
                      className="btn-ghost"
                      style={{ flex: 1, opacity: diaActivo === 0 ? 0.4 : 1 }}
                    >← {diaActivo > 0 ? DIAS_CORTOS[diaActivo - 1] : 'Inicio'}</button>
                    <button
                      onClick={() => setDiaActivo(d => Math.min(diasConDatos.length - 1, d + 1))}
                      disabled={diaActivo === diasConDatos.length - 1}
                      className="btn-ghost"
                      style={{ flex: 1, opacity: diaActivo === diasConDatos.length - 1 ? 0.4 : 1 }}
                    >{diaActivo < diasConDatos.length - 1 ? DIAS_CORTOS[diaActivo + 1] : 'Fin'} →</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════ TAB: LISTA DEL SÚPER ═══════════════════════ */}
          {tab === 'lista' && (
            <div className="fade-in">
              {!listaSuper ? (
                <div className="card" style={{ padding: '56px 24px', textAlign: 'center', border: '2px dashed #E8DDD0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>🛒</div>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', color: '#2C1810', marginBottom: '8px' }}>Lista no disponible</p>
                  <p style={{ color: '#9B7B65', fontSize: '14px' }}>El plan aún no incluye lista de compras</p>
                </div>
              ) : (() => {
                  // ── Computa items y estado de palomeo ──────────────────────
                  const todosItems = listaCategorias.flatMap(c =>
                    c.rawLines.some(r => r.trim().startsWith('|')) ? [] : c.items
                  )
                  // Clave única por item: "categoria__item"
                  const mkKey = (catTitulo: string, item: string) => `${catTitulo}__${item}`
                  const uncheckedItems = listaCategorias.flatMap(c =>
                    c.rawLines.some(r => r.trim().startsWith('|'))
                      ? []
                      : c.items.filter(i => !itemsChecked.has(mkKey(c.titulo, i)))
                  )
                  const checkedCount = todosItems.length - uncheckedItems.length

                  const textoWhatsApp = encodeURIComponent(
                    `🛒 *Lista del Súper — ${paciente?.nombre}*\n_Plan nutricional ${fechaPlan}_\n` +
                    (checkedCount > 0 ? `_✓ Ya tienes ${checkedCount} ingredientes_\n` : '') +
                    `\n` +
                    listaCategorias
                      .filter(c => !c.rawLines.some(r => r.trim().startsWith('|')))
                      .map(c => {
                        const pendientes = c.items.filter(i => !itemsChecked.has(mkKey(c.titulo, i)))
                        if (pendientes.length === 0) return null
                        return `*${c.titulo}*\n${pendientes.map(i => `• ${i}`).join('\n')}`
                      })
                      .filter(Boolean)
                      .join('\n\n')
                  )

                  const copiarLista = () => {
                    const texto = listaCategorias
                      .filter(c => !c.rawLines.some(r => r.trim().startsWith('|')))
                      .map(c => {
                        const pendientes = c.items.filter(i => !itemsChecked.has(mkKey(c.titulo, i)))
                        if (pendientes.length === 0) return null
                        return `${c.titulo}:\n${pendientes.map(i => `• ${i}`).join('\n')}`
                      })
                      .filter(Boolean)
                      .join('\n\n')
                    navigator.clipboard.writeText(texto).then(() => {
                      alert('✅ Lista copiada al portapapeles')
                    })
                  }

                  return (
                    <>
                      {/* ── Encabezado + acciones ── */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', fontWeight: '600', color: '#2C1810' }}>Lista del Súper</p>
                            <p style={{ fontSize: '12px', color: '#9B7B65' }}>{todosItems.length} ingredientes · Plan {fechaPlan}</p>
                          </div>
                          {checkedCount > 0 && (
                            <button
                              onClick={limpiarChecked}
                              style={{
                                fontSize: '11px', color: '#9B7B65', background: 'none',
                                border: '1px solid #E8DDD0', borderRadius: '8px',
                                padding: '4px 10px', cursor: 'pointer', fontFamily: "'Lato',sans-serif",
                              }}
                            >↺ Limpiar</button>
                          )}
                        </div>

                        {/* ── Barra de progreso palomeo ── */}
                        {checkedCount > 0 && (
                          <div style={{ marginBottom: '12px', padding: '12px 16px', borderRadius: '12px', background: '#F0FAF5', border: '1px solid #A7D7BC' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                              <p style={{ fontSize: '13px', color: '#2D6A4F', fontWeight: '600', margin: 0 }}>
                                ✓ Ya tienes {checkedCount} de {todosItems.length} ingredientes
                              </p>
                              <p style={{ fontSize: '13px', color: '#7B1B2A', fontWeight: '600', margin: 0 }}>
                                {uncheckedItems.length} por comprar
                              </p>
                            </div>
                            <div style={{ height: '6px', borderRadius: '3px', background: '#D1FAE5', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: '3px',
                                background: 'linear-gradient(90deg, #2D6A4F, #48BB78)',
                                width: `${Math.round(checkedCount / todosItems.length * 100)}%`,
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                          </div>
                        )}

                        {/* Botones de acción */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {/* WhatsApp — solo items sin palomear */}
                          <a
                            href={`https://wa.me/?text=${textoWhatsApp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              padding: '9px 16px', borderRadius: '10px',
                              background: '#25D366', color: 'white',
                              textDecoration: 'none', fontSize: '13px', fontWeight: '600',
                              boxShadow: '0 2px 8px rgba(37,211,102,0.3)',
                            }}
                          >
                            💬 Enviar por WhatsApp
                            {checkedCount > 0 && (
                              <span style={{ fontSize: '11px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '1px 6px' }}>
                                {uncheckedItems.length}
                              </span>
                            )}
                          </a>

                          {/* Copiar — solo items sin palomear */}
                          <button
                            onClick={copiarLista}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              padding: '9px 16px', borderRadius: '10px',
                              background: 'white', color: '#6B4F3A',
                              border: '1.5px solid #E8DDD0', fontSize: '13px', fontWeight: '600',
                              cursor: 'pointer', fontFamily: "'Lato',sans-serif",
                            }}
                          >
                            📋 Copiar lista
                            {checkedCount > 0 && (
                              <span style={{ fontSize: '11px', background: '#FAF0E6', border: '1px solid #E8DDD0', borderRadius: '8px', padding: '1px 6px', color: '#9B7B65' }}>
                                {uncheckedItems.length}
                              </span>
                            )}
                          </button>

                          {/* Buscar en Walmart */}
                          <a
                            href={`https://super.walmart.com.mx/search?q=${encodeURIComponent((uncheckedItems.length > 0 ? uncheckedItems : todosItems).slice(0,3).join(' '))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              padding: '9px 16px', borderRadius: '10px',
                              background: '#0071CE', color: 'white',
                              textDecoration: 'none', fontSize: '13px', fontWeight: '600',
                              boxShadow: '0 2px 8px rgba(0,113,206,0.3)',
                            }}
                          >
                            🛒 Ver en Walmart
                          </a>
                        </div>
                      </div>

                      {/* ── Categorías ── */}
                      {listaCategorias.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {listaCategorias.map((cat, ci) => {
                            const tieneTabla = cat.rawLines.some(r => r.trim().startsWith('|'))
                            const catCheckedCount = tieneTabla ? 0 : cat.items.filter(i => itemsChecked.has(mkKey(cat.titulo, i))).length
                            const catAllChecked = !tieneTabla && cat.items.length > 0 && catCheckedCount === cat.items.length
                            return (
                              <div key={ci} className="card" style={{ padding: '0', overflow: 'hidden', opacity: catAllChecked ? 0.65 : 1, transition: 'opacity 0.2s' }}>
                                {/* Header categoría */}
                                <div style={{
                                  padding: '12px 20px',
                                  background: catAllChecked ? '#6B7280' : (ci % 2 === 0 ? '#2D6A4F' : '#1B5F8C'),
                                  display: 'flex', alignItems: 'center', gap: '10px',
                                  transition: 'background 0.2s',
                                }}>
                                  <span style={{ fontSize: '18px' }}>
                                    {catAllChecked ? '✅' : ['🥩','🥕','🌾','🥛','🫙','🧂','🍎','💰'][ci % 8]}
                                  </span>
                                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '14px', fontWeight: '600', color: 'white', margin: 0 }}>
                                    {cat.titulo}
                                    {catAllChecked && <span style={{ fontSize: '11px', fontWeight: '400', marginLeft: '6px', opacity: 0.8 }}>✓ completo</span>}
                                  </p>
                                  {!tieneTabla && cat.items.length > 0 && (
                                    <span style={{ marginLeft: 'auto', fontSize: '11px', background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                                      {catCheckedCount > 0 ? `${catCheckedCount}/${cat.items.length}` : cat.items.length}
                                    </span>
                                  )}
                                  {/* Link buscar categoría en Walmart */}
                                  {!tieneTabla && (
                                    <a
                                      href={`https://super.walmart.com.mx/search?q=${encodeURIComponent(cat.titulo)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      style={{
                                        fontSize: '11px', color: 'rgba(255,255,255,0.8)',
                                        textDecoration: 'none', background: 'rgba(0,113,206,0.5)',
                                        padding: '2px 8px', borderRadius: '8px', fontWeight: '600',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      🛒 Walmart
                                    </a>
                                  )}
                                </div>

                                {/* Items */}
                                <div style={{ padding: '14px 20px' }}>
                                  {tieneTabla ? (
                                    renderTexto(cat.rawLines.join('\n'))
                                  ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                                      {cat.items.map((item, ii) => {
                                        const itemKey = mkKey(cat.titulo, item)
                                        const checked = itemsChecked.has(itemKey)
                                        const nombre = item.split(/\s*[—–-]\s*/)[0].trim()
                                        return (
                                          <div
                                            key={ii}
                                            style={{
                                              display: 'inline-flex', alignItems: 'center', gap: '0',
                                              borderRadius: '20px',
                                              border: checked ? '1.5px solid #2D6A4F' : '1px solid #E8DDD0',
                                              overflow: 'hidden',
                                              transition: 'all 0.15s',
                                              background: checked ? '#F0FAF5' : '#FAF7F2',
                                            }}
                                          >
                                            {/* Toggle palomear */}
                                            <button
                                              onClick={() => toggleItem(itemKey)}
                                              title={checked ? 'Ya lo tengo ✓ (toca para desmarcar)' : 'Marcar como "ya lo tengo"'}
                                              style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '5px 10px 5px 12px',
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                fontFamily: "'Lato',sans-serif", fontSize: '13px',
                                                color: checked ? '#2D6A4F' : '#2C1810',
                                                fontWeight: checked ? '600' : '500',
                                                textDecoration: checked ? 'line-through' : 'none',
                                                textDecorationColor: '#2D6A4F',
                                              }}
                                            >
                                              <span style={{
                                                fontSize: '14px',
                                                color: checked ? '#2D6A4F' : '#D1C4B0',
                                                transition: 'color 0.15s',
                                              }}>
                                                {checked ? '✓' : '○'}
                                              </span>
                                              {item}
                                            </button>
                                            {/* Link Walmart — solo si no está palomeado */}
                                            {!checked && (
                                              <a
                                                href={`https://super.walmart.com.mx/search?q=${encodeURIComponent(nombre)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={`Buscar "${nombre}" en Walmart`}
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                  display: 'inline-flex', alignItems: 'center',
                                                  padding: '5px 10px 5px 6px',
                                                  color: '#9FAFBE', textDecoration: 'none', fontSize: '13px',
                                                  borderLeft: '1px solid #E8DDD0',
                                                }}
                                              >
                                                🛒
                                              </a>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="card" style={{ padding: '22px 24px' }}>
                          {renderTexto(listaSuper)}
                        </div>
                      )}

                      {/* Nota instrucciones */}
                      <div style={{ marginTop: '14px', padding: '12px 16px', borderRadius: '10px', background: '#EEF4FF', border: '1px solid #BFDBFE', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
                        <p style={{ fontSize: '12px', color: '#1E40AF', margin: 0, lineHeight: '1.5' }}>
                          Toca el <strong>nombre de un ingrediente</strong> para marcarlo como "ya lo tengo" ✓ — quedará tachado. El 🛒 abre <strong>Walmart Super</strong> para ese producto. Al compartir por WhatsApp o copiar, solo se incluyen los ingredientes que <em>aún necesitas comprar</em>.
                        </p>
                      </div>
                    </>
                  )
                })()
              }
            </div>
          )}

          {/* ══════ TAB: MEDICIONES ════════════════════════════ */}
          {tab === 'mediciones' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mediciones.length === 0 ? (
                <div className="card" style={{ padding: '56px 24px', textAlign: 'center', border: '2px dashed #E8DDD0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>📏</div>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '18px', color: '#2C1810' }}>Sin mediciones registradas</p>
                </div>
              ) : (mediciones as Record<string, unknown>[]).map((m, i) => (
                <div key={String(m.id)} className="card" style={{
                  overflow: 'hidden',
                  borderColor: i === 0 ? 'rgba(123,27,42,0.25)' : '#E8DDD0',
                  borderWidth: i === 0 ? '1.5px' : '1px',
                }}>
                  <div style={{
                    padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: i === 0 ? '#F5E8EB' : '#FFFAF7', borderBottom: '1px solid #E8DDD0',
                  }}>
                    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '14px', fontWeight: '600', color: '#2C1810' }}>
                      {formatFecha(m.fechaCreacion || m.fecha)}
                    </p>
                    {i === 0 && <span className="badge badge-vino">Más reciente</span>}
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px', marginBottom: (m.interpretacionPeso || m.interpretacionTalla) ? '12px' : 0 }}>
                      {[
                        { l: 'Peso',    v: `${m.peso} kg` },
                        { l: 'Talla',   v: `${m.talla} cm` },
                        { l: 'IMC',     v: String(m.imc) },
                        { l: 'P. Peso', v: `P${m.percentilPeso}` },
                        { l: 'P. Talla',v: `P${m.percentilTalla}` },
                      ].map(d => (
                        <div key={d.l} style={{ background: '#FAF7F2', borderRadius: '9px', padding: '10px 5px', textAlign: 'center', border: '1px solid #E8DDD0' }}>
                          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '14px', fontWeight: '600', color: '#7B1B2A', marginBottom: '2px' }}>{String(d.v)}</p>
                          <p style={{ fontSize: '10px', color: '#9B7B65', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{d.l}</p>
                        </div>
                      ))}
                    </div>
                    {(!!m.interpretacionPeso || !!m.interpretacionTalla) && (
                      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                        {!!m.interpretacionPeso && <span className="badge badge-vino">Peso: {String(m.interpretacionPeso)}</span>}
                        {!!m.interpretacionTalla && <span className="badge badge-success">Talla: {String(m.interpretacionTalla)}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── CAMBIAR CONTRASEÑA ─────────────────────────────── */}
          <div className="card fade-in" style={{ marginTop: '20px', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F2EDE4' }}>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '16px', fontWeight: '600', color: '#2C1810', marginBottom: '3px' }}>
                Cambiar contraseña
              </p>
              <p style={{ fontSize: '12px', color: '#9B7B65' }}>Actualiza la contraseña de acceso a tu portal</p>
            </div>

            <div style={{ padding: '22px 24px' }}>
              {passExito ? (
                <div style={{ background: '#F0FAF5', border: '1px solid #B7E3CA', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '24px', marginBottom: '8px' }}>✅</p>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '15px', color: '#2D6A4F', marginBottom: '6px' }}>¡Contraseña actualizada!</p>
                  <p style={{ fontSize: '13px', color: '#52976A' }}>Tu nueva contraseña ya está activa.</p>
                  <button
                    onClick={() => setPassExito(false)}
                    style={{ marginTop: '14px', fontSize: '12px', color: '#9B7B65', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Lato',sans-serif", textDecoration: 'underline' }}
                  >Cambiar de nuevo</button>
                </div>
              ) : (
                <form onSubmit={cambiarContrasena} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Contraseña actual */}
                  {[
                    { label: 'Contraseña actual', val: passActual, set: setPassActual, ver: verPassActual, setVer: setVerPassActual },
                    { label: 'Nueva contraseña', val: passNueva, set: setPassNueva, ver: verPassNueva, setVer: setVerPassNueva },
                    { label: 'Confirmar nueva contraseña', val: passConfirmar, set: setPassConfirmar, ver: verPassNueva, setVer: setVerPassNueva },
                  ].map((f, idx) => (
                    <div key={idx}>
                      <label style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', color: '#9B7B65', display: 'block', marginBottom: '6px' }}>
                        {f.label}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={f.ver ? 'text' : 'password'}
                          value={f.val}
                          onChange={e => f.set(e.target.value)}
                          required
                          minLength={idx === 0 ? 1 : 6}
                          placeholder={idx === 0 ? 'Tu contraseña actual' : '••••••••'}
                          style={{
                            width: '100%', padding: '11px 42px 11px 14px', borderRadius: '10px',
                            border: '1.5px solid #E8DDD0', background: '#FDFAF7',
                            fontSize: '14px', color: '#2C1810', outline: 'none',
                            fontFamily: "'Lato',sans-serif", boxSizing: 'border-box' as const,
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#7B1B2A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(123,27,42,0.08)' }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#E8DDD0'; e.currentTarget.style.boxShadow = 'none' }}
                        />
                        <button type="button" onClick={() => f.setVer(!f.ver)}
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9B7B65', padding: 0, display: 'flex' }}>
                          {f.ver
                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          }
                        </button>
                      </div>
                    </div>
                  ))}

                  {passError && (
                    <div style={{ padding: '11px 14px', borderRadius: '9px', background: '#FEF2F3', border: '1px solid #F5C5C9', color: '#9B2335', fontSize: '13px', display: 'flex', gap: '8px' }}>
                      <span>⚠️</span><span>{passError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={cambiandoPass || !passActual || !passNueva || !passConfirmar}
                    style={{
                      padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                      border: 'none', cursor: cambiandoPass ? 'not-allowed' : 'pointer',
                      background: (!passActual || !passNueva || !passConfirmar) ? '#E8DDD0' : 'linear-gradient(135deg, #7B1B2A, #A63244)',
                      color: (!passActual || !passNueva || !passConfirmar) ? '#9B7B65' : 'white',
                      fontFamily: "'Lato',sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      boxShadow: (passActual && passNueva && passConfirmar && !cambiandoPass) ? '0 4px 16px rgba(123,27,42,0.3)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {cambiandoPass
                      ? <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Actualizando...</>
                      : '🔒 Actualizar contraseña'
                    }
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '36px', padding: '14px 18px', borderRadius: '12px', background: '#FDF6E3', border: '1px solid #E8DDD0', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#8B6914', fontWeight: '600' }}>🌟 Clínica Karina Lara · Nutrición Clínica Especializada</p>
            <p style={{ fontSize: '11px', color: '#9B7B65', marginTop: '2px' }}>Para dudas, comunícate directamente con la nutrióloga</p>
          </div>
        </main>
      )}
    </div>
  )
}
