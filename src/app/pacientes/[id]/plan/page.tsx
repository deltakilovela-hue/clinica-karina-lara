'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPaciente, Paciente } from '@/lib/pacientes'
import { collection, addDoc, getDocs, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

interface Plan {
  id?: string
  texto: string
  fechaCreacion?: Timestamp
}

export default function PlanPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [planes, setPlanes] = useState<Plan[]>([])
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const [planActual, setPlanActual] = useState<string>('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      try {
        const p = await obtenerPaciente(id)
        setPaciente(p)
        await cargarPlanes()
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router, id])

  const cargarPlanes = async () => {
    const q = query(collection(db, `pacientes/${id}/planes`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    setPlanes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan)))
  }

  const generarPlan = async () => {
    if (!paciente) return
    setGenerando(true)
    setError('')
    setPlanActual('')

    try {
      // Obtener historia clínica más reciente
      const historiaSnap = await getDocs(
        query(collection(db, `pacientes/${id}/historiasClinicas`), orderBy('fechaCreacion', 'desc'))
      )
      const historia = historiaSnap.docs[0]?.data() || null

      // Obtener antropometría más reciente
      const antropoSnap = await getDocs(
        query(collection(db, `pacientes/${id}/antropometria`), orderBy('fechaCreacion', 'desc'))
      )
      const antropometria = antropoSnap.docs[0]?.data() || null

      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente, historia, antropometria }),
      })

      const data = await res.json()
      if (!res.ok) { setError('Error al generar el plan. Intenta de nuevo.'); return }

      setPlanActual(data.plan)

      // Guardar en Firestore
      await addDoc(collection(db, `pacientes/${id}/planes`), {
        texto: data.plan,
        fechaCreacion: Timestamp.now(),
      })
      await cargarPlanes()
    } catch (e) {
      setError('Error de conexión. Verifica tu internet.')
      console.error(e)
    } finally {
      setGenerando(false)
    }
  }

  const formatearPlan = (texto: string) => {
    const lineas = texto.split('\n')
    return lineas.map((linea, i) => {
      if (linea.startsWith('## ')) return (
        <h2 key={i} style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#2C1810', marginBottom: '20px', marginTop: '8px' }}>
          {linea.replace('## ', '')}
        </h2>
      )
      if (linea.startsWith('### ')) return (
        <h3 key={i} style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: '#7B1B2A', marginBottom: '10px', marginTop: '24px', paddingBottom: '6px', borderBottom: '1px solid #E8DDD0' }}>
          {linea.replace('### ', '')}
        </h3>
      )
      if (linea.startsWith('**') && linea.endsWith('**')) return (
        <p key={i} style={{ fontSize: '14px', fontWeight: '700', color: '#2C1810', marginBottom: '4px' }}>
          {linea.replace(/\*\*/g, '')}
        </p>
      )
      if (linea.includes('**')) return (
        <p key={i} style={{ fontSize: '14px', color: '#2C1810', marginBottom: '6px', lineHeight: '1.6' }}
          dangerouslySetInnerHTML={{ __html: linea.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      )
      if (linea.startsWith('- ') || linea.startsWith('* ')) return (
        <p key={i} style={{ fontSize: '14px', color: '#2C1810', marginBottom: '4px', paddingLeft: '16px', lineHeight: '1.6' }}>
          • {linea.replace(/^[-*] /, '')}
        </p>
      )
      if (linea.trim() === '') return <div key={i} style={{ height: '8px' }} />
      return (
        <p key={i} style={{ fontSize: '14px', color: '#2C1810', marginBottom: '6px', lineHeight: '1.6' }}>
          {linea}
        </p>
      )
    })
  }

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const planMostrado = planActual || (planes.length > 0 ? planes[0].texto : '')

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Link href="/dashboard" style={{ color: '#9B7B65', textDecoration: 'none' }}>Dashboard</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href="/pacientes" style={{ color: '#9B7B65', textDecoration: 'none' }}>Pacientes</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href={`/pacientes/${id}`} style={{ color: '#9B7B65', textDecoration: 'none' }}>{paciente?.nombre}</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <span style={{ color: '#2C1810', fontWeight: '600' }}>Plan Nutricional</span>
          </div>
          <button
            onClick={generarPlan}
            disabled={generando}
            style={{
              padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
              background: generando ? '#E8DDD0' : 'linear-gradient(135deg, #7B1B2A, #A63244)',
              color: generando ? '#9B7B65' : 'white',
              border: 'none', cursor: generando ? 'not-allowed' : 'pointer',
              fontFamily: "'Lato', sans-serif",
              boxShadow: generando ? 'none' : '0 2px 8px rgba(123,27,42,0.25)',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
            {generando ? (
              <>
                <div style={{ width: '14px', height: '14px', border: '2px solid #9B7B65', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Generando con IA...
              </>
            ) : '🧠 Generar Plan con IA'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>
            Plan Nutricional
          </h1>
          <p style={{ color: '#9B7B65', fontSize: '14px' }}>
            {paciente?.nombre} · {paciente?.edad} años · {planes.length} plan{planes.length !== 1 ? 'es' : ''} generado{planes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', background: '#FDECEA', border: '1px solid #F5C2C7', color: '#9B2335', fontSize: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Estado generando */}
        {generando && (
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8DDD0', padding: '48px', textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', marginBottom: '8px' }}>
              Generando plan nutricional...
            </p>
            <p style={{ color: '#9B7B65', fontSize: '14px' }}>
              Claude está analizando el caso clínico de {paciente?.nombre}
            </p>
          </div>
        )}

        {/* Plan generado */}
        {planMostrado && !generando && (
          <div>
            {planes.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
                {planes.map((p, i) => (
                  <button key={p.id} onClick={() => setPlanActual(p.texto)}
                    style={{
                      padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '500',
                      cursor: 'pointer', fontFamily: "'Lato', sans-serif', whiteSpace: 'nowrap",
                      background: planMostrado === p.texto ? '#7B1B2A' : 'white',
                      color: planMostrado === p.texto ? 'white' : '#6B4F3A',
                      border: planMostrado === p.texto ? '1.5px solid #7B1B2A' : '1.5px solid #E8DDD0',
                    }}>
                    Plan {planes.length - i} · {p.fechaCreacion?.toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </button>
                ))}
              </div>
            )}

            <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8DDD0', padding: '40px', boxShadow: '0 2px 16px rgba(44,24,16,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #E8DDD0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px' }}>🧠</div>
                  <div>
                    <p style={{ fontWeight: '600', color: '#2C1810', fontSize: '14px' }}>Generado con Claude AI</p>
                    <p style={{ fontSize: '12px', color: '#9B7B65' }}>Clínica Karina Lara · Nutrición Clínica Especializada</p>
                  </div>
                </div>
                <button
                  onClick={() => window.print()}
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>
                  🖨️ Imprimir
                </button>
              </div>
              <div>{formatearPlan(planMostrado)}</div>
            </div>
          </div>
        )}

        {/* Sin planes */}
        {!planMostrado && !generando && (
          <div style={{ background: 'white', borderRadius: '16px', border: '2px dashed #E8DDD0', padding: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', marginBottom: '8px' }}>
              Sin planes generados
            </p>
            <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '8px' }}>
              Claude generará un plan personalizado basado en:
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
              {['Historia clínica', 'Antropometría', 'Alergias y texturas', 'Diagnóstico'].map(item => (
                <span key={item} style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: '#F5E8EB', color: '#7B1B2A', fontWeight: '500' }}>{item}</span>
              ))}
            </div>
            <button onClick={generarPlan} style={{
              padding: '13px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: '600',
              background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white',
              border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
              boxShadow: '0 2px 12px rgba(123,27,42,0.3)'
            }}>🧠 Generar Primer Plan</button>
          </div>
        )}
      </main>
    </div>
  )
}