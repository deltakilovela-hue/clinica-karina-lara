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

const DIAGNOSTICOS_NUTRICIONALES = [
  'Peso adecuado para la edad',
  'Bajo peso',
  'Riesgo de bajo peso',
  'Sobrepeso',
  'Obesidad',
  'Talla baja',
  'Riesgo de talla baja',
  'Desnutrición aguda',
  'Desnutrición crónica',
]

const RESTRICCIONES_COMUNES = [
  'Sin gluten', 'Sin lactosa', 'Sin huevo', 'Sin nueces/cacahuates',
  'Sin mariscos', 'Sin soya', 'Sin azúcar añadida', 'Sin colorantes',
  'Sin conservadores', 'Sin picante', 'Dieta blanda', 'Sin fibra insoluble',
]

interface Diagnostico {
  id?: string
  fechaCreacion: Timestamp
  diagnosticoNeuropediatra: string
  diagnosticoNutricional: string | string[]   // string para compatibilidad con registros antiguos
  objetivosTratamiento: string
  restriccionesAlimentarias: string[]
  observacionesClinicas: string
}

export default function DiagnosticoPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
  const [modoEditar, setModoEditar] = useState(false)

  const [form, setForm] = useState({
    diagnosticoNeuropediatra: '',
    diagnosticoNutricional: [] as string[],
    objetivosTratamiento: '',
    restriccionesAlimentarias: [] as string[],
    observacionesClinicas: '',
  })
  const [inputPersonalizado, setInputPersonalizado] = useState('')
  const [mostrarConfirmHome, setMostrarConfirmHome] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      try {
        const p = await obtenerPaciente(id)
        setPaciente(p)
        await cargarDiagnosticos()
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router, id])

  const cargarDiagnosticos = async () => {
    const q = query(collection(db, `pacientes/${id}/diagnosticos`), orderBy('fechaCreacion', 'desc'))
    const snap = await getDocs(q)
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() } as Diagnostico))
    setDiagnosticos(lista)
    if (lista.length > 0) {
      const ultimo = lista[0]
      const diagNutricional = Array.isArray(ultimo.diagnosticoNutricional)
        ? ultimo.diagnosticoNutricional
        : ultimo.diagnosticoNutricional ? [ultimo.diagnosticoNutricional as string] : []
      setForm({
        diagnosticoNeuropediatra: ultimo.diagnosticoNeuropediatra || '',
        diagnosticoNutricional: diagNutricional,
        objetivosTratamiento: ultimo.objetivosTratamiento || '',
        restriccionesAlimentarias: ultimo.restriccionesAlimentarias || [],
        observacionesClinicas: ultimo.observacionesClinicas || '',
      })
    } else {
      setModoEditar(true)
    }
  }

  const toggleDiagnosticoNutricional = (d: string) => {
    setForm(prev => ({
      ...prev,
      diagnosticoNutricional: prev.diagnosticoNutricional.includes(d)
        ? prev.diagnosticoNutricional.filter(x => x !== d)
        : [...prev.diagnosticoNutricional, d]
    }))
  }

  const agregarPersonalizado = () => {
    const val = inputPersonalizado.trim()
    if (!val || form.diagnosticoNutricional.includes(val)) return
    setForm(prev => ({ ...prev, diagnosticoNutricional: [...prev.diagnosticoNutricional, val] }))
    setInputPersonalizado('')
  }

  const toggleRestriccion = (r: string) => {
    setForm(prev => ({
      ...prev,
      restriccionesAlimentarias: prev.restriccionesAlimentarias.includes(r)
        ? prev.restriccionesAlimentarias.filter(x => x !== r)
        : [...prev.restriccionesAlimentarias, r]
    }))
  }

  const guardar = async () => {
    if (form.diagnosticoNutricional.length === 0) return
    setGuardando(true)
    try {
      await addDoc(collection(db, `pacientes/${id}/diagnosticos`), {
        ...form,
        fechaCreacion: Timestamp.now(),
      })
      await cargarDiagnosticos()
      setModoEditar(false)
      setExito(true)
      setTimeout(() => setExito(false), 3000)
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  const ultimoDiag = diagnosticos[0]

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '10px', fontSize: '14px',
    border: '1.5px solid #E8DDD0', background: '#FAF7F2', color: '#2C1810',
    outline: 'none', fontFamily: "'Lato', sans-serif", boxSizing: 'border-box' as const,
  }

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Modal confirmación salir */}
      {mostrarConfirmHome && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '36px 32px', maxWidth: '400px', width: '90%', boxShadow: '0 8px 40px rgba(44,24,16,0.18)', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</p>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', marginBottom: '10px' }}>¿Salir sin guardar?</h3>
            <p style={{ fontSize: '14px', color: '#9B7B65', marginBottom: '28px', lineHeight: '1.6' }}>Si sales ahora, <strong>perderás los cambios</strong> que no hayas guardado.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setMostrarConfirmHome(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>Quedarme</button>
              <button onClick={() => router.push('/dashboard')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Lato', sans-serif" }}>Salir</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <button onClick={() => modoEditar ? setMostrarConfirmHome(true) : router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px 6px', borderRadius: '8px', lineHeight: 1 }} title="Inicio">🏠</button>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href={`/pacientes/${id}`} style={{ color: '#9B7B65', textDecoration: 'none' }}>{paciente?.nombre}</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <span style={{ color: '#2C1810', fontWeight: '600' }}>Diagnóstico</span>
          </div>
          {!modoEditar && ultimoDiag && (
            <button onClick={() => setModoEditar(true)} style={{
              padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
              background: 'linear-gradient(135deg, #7B1B2A, #A63244)', color: 'white',
              border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
            }}>
              ✏️ Actualizar Diagnóstico
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Título */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>
            Diagnóstico Clínico
          </h1>
          <p style={{ color: '#9B7B65', fontSize: '14px' }}>
            {paciente?.nombre} · {diagnosticos.length} registro{diagnosticos.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Éxito */}
        {exito && (
          <div style={{ padding: '14px 20px', borderRadius: '12px', marginBottom: '20px', background: '#E8F5E9', border: '1px solid #A5D6A7', color: '#2E7D32', fontSize: '14px', fontWeight: '600', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
            ✅ Diagnóstico guardado correctamente
          </div>
        )}

        {/* ── VISTA (solo lectura) ── */}
        {!modoEditar && ultimoDiag && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>

            {/* Diagnósticos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>🧠 Diagnóstico Neuropediatra</p>
                <p style={{ fontSize: '14px', color: ultimoDiag.diagnosticoNeuropediatra ? '#2C1810' : '#C9B8A8', lineHeight: '1.6' }}>
                  {ultimoDiag.diagnosticoNeuropediatra || 'No registrado'}
                </p>
              </div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>🥗 Diagnóstico Nutricional</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(Array.isArray(ultimoDiag.diagnosticoNutricional)
                    ? ultimoDiag.diagnosticoNutricional
                    : ultimoDiag.diagnosticoNutricional ? [ultimoDiag.diagnosticoNutricional as string] : []
                  ).map(d => (
                    <span key={d} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', background: '#F5E8EB', color: '#7B1B2A', border: '1px solid #D4A0AA' }}>{d}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Objetivos */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>🎯 Objetivos del Tratamiento</p>
              <p style={{ fontSize: '14px', color: ultimoDiag.objetivosTratamiento ? '#2C1810' : '#C9B8A8', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                {ultimoDiag.objetivosTratamiento || 'No registrado'}
              </p>
            </div>

            {/* Restricciones */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>🚫 Restricciones Alimentarias</p>
              {ultimoDiag.restriccionesAlimentarias?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ultimoDiag.restriccionesAlimentarias.map(r => (
                    <span key={r} style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '13px', background: '#FDECEA', color: '#9B2335', border: '1px solid #F5C2C7', fontWeight: '500' }}>{r}</span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '14px', color: '#C9B8A8' }}>Sin restricciones registradas</p>
              )}
            </div>

            {/* Observaciones */}
            {ultimoDiag.observacionesClinicas && (
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '24px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>📝 Observaciones Clínicas</p>
                <p style={{ fontSize: '14px', color: '#2C1810', lineHeight: '1.7', borderLeft: '3px solid #7B1B2A', paddingLeft: '14px', fontStyle: 'italic' }}>
                  {ultimoDiag.observacionesClinicas}
                </p>
              </div>
            )}

            {/* Historial */}
            {diagnosticos.length > 1 && (
              <div style={{ marginTop: '24px' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                  Historial de Diagnósticos
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {diagnosticos.slice(1).map((d, i) => (
                    <div key={d.id || i} style={{ background: 'white', borderRadius: '12px', border: '1px solid #E8DDD0', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#2C1810' }}>
                          {Array.isArray(d.diagnosticoNutricional)
                            ? d.diagnosticoNutricional.join(', ')
                            : d.diagnosticoNutricional as string}
                        </p>
                        {d.diagnosticoNeuropediatra && <p style={{ fontSize: '12px', color: '#9B7B65', marginTop: '2px' }}>{d.diagnosticoNeuropediatra}</p>}
                      </div>
                      <p style={{ fontSize: '12px', color: '#9B7B65', whiteSpace: 'nowrap' }}>
                        {d.fechaCreacion?.toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FORMULARIO ── */}
        {modoEditar && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>

            {/* Diagnóstico neuropediatra */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '28px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', color: '#2C1810', marginBottom: '20px' }}>
                🧠 Diagnóstico del Neuropediatra
              </h3>
              <textarea
                value={form.diagnosticoNeuropediatra}
                onChange={e => setForm(p => ({ ...p, diagnosticoNeuropediatra: e.target.value }))}
                placeholder="Ej: TEA nivel 1, Epilepsia focal, TDAH combinado..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Diagnóstico nutricional */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '28px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', color: '#2C1810', marginBottom: '6px' }}>
                🥗 Diagnóstico Nutricional *
              </h3>
              <p style={{ fontSize: '13px', color: '#9B7B65', marginBottom: '16px' }}>Selecciona una o varias opciones que apliquen</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                {DIAGNOSTICOS_NUTRICIONALES.map(d => (
                  <button key={d} onClick={() => toggleDiagnosticoNutricional(d)} style={{
                    padding: '7px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                    fontFamily: "'Lato', sans-serif",
                    background: form.diagnosticoNutricional.includes(d) ? '#7B1B2A' : 'white',
                    color: form.diagnosticoNutricional.includes(d) ? 'white' : '#6B4F3A',
                    border: form.diagnosticoNutricional.includes(d) ? '1.5px solid #7B1B2A' : '1.5px solid #E8DDD0',
                    fontWeight: form.diagnosticoNutricional.includes(d) ? '700' : '400',
                  }}>{form.diagnosticoNutricional.includes(d) ? '✓ ' : ''}{d}</button>
                ))}
              </div>
              {/* Seleccionados */}
              {form.diagnosticoNutricional.length > 0 && (
                <div style={{ background: '#FAF7F2', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px', border: '1px solid #E8DDD0' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Seleccionados ({form.diagnosticoNutricional.length})</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {form.diagnosticoNutricional.map(d => (
                      <span key={d} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: '#F5E8EB', color: '#7B1B2A', border: '1px solid #D4A0AA' }}>
                        {d}
                        <button onClick={() => toggleDiagnosticoNutricional(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', fontSize: '12px', color: '#7B1B2A', lineHeight: 1 }}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Agregar personalizado */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={inputPersonalizado}
                  onChange={e => setInputPersonalizado(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && agregarPersonalizado()}
                  placeholder="Agregar diagnóstico personalizado..."
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={agregarPersonalizado} type="button" style={{
                  padding: '12px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                  background: inputPersonalizado.trim() ? '#7B1B2A' : '#E8DDD0',
                  color: inputPersonalizado.trim() ? 'white' : '#9B7B65',
                  border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif", whiteSpace: 'nowrap',
                }}>+ Agregar</button>
              </div>
            </div>

            {/* Objetivos */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '28px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', color: '#2C1810', marginBottom: '6px' }}>
                🎯 Objetivos del Tratamiento
              </h3>
              <p style={{ fontSize: '13px', color: '#9B7B65', marginBottom: '14px' }}>Escribe los objetivos clínicos del tratamiento nutricional</p>
              <textarea
                value={form.objetivosTratamiento}
                onChange={e => setForm(p => ({ ...p, objetivosTratamiento: e.target.value }))}
                placeholder={`1. Reducir gases intestinales mediante eliminación de alimentos fermentativos\n2. Mantener peso saludable con control de porciones\n3. Expandir gradualmente la variedad alimentaria...`}
                rows={5}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Restricciones alimentarias */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '28px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', color: '#2C1810', marginBottom: '6px' }}>
                🚫 Restricciones Alimentarias
              </h3>
              <p style={{ fontSize: '13px', color: '#9B7B65', marginBottom: '16px' }}>Selecciona todas las que apliquen</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {RESTRICCIONES_COMUNES.map(r => (
                  <button key={r} onClick={() => toggleRestriccion(r)} style={{
                    padding: '7px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                    fontFamily: "'Lato', sans-serif",
                    background: form.restriccionesAlimentarias.includes(r) ? '#9B2335' : 'white',
                    color: form.restriccionesAlimentarias.includes(r) ? 'white' : '#6B4F3A',
                    border: form.restriccionesAlimentarias.includes(r) ? '1.5px solid #9B2335' : '1.5px solid #E8DDD0',
                  }}>{r}</button>
                ))}
              </div>
            </div>

            {/* Observaciones */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', padding: '28px', marginBottom: '24px', boxShadow: '0 2px 12px rgba(44,24,16,0.04)' }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '17px', color: '#2C1810', marginBottom: '6px' }}>
                📝 Observaciones Clínicas
              </h3>
              <p style={{ fontSize: '13px', color: '#9B7B65', marginBottom: '14px' }}>Notas adicionales del caso clínico</p>
              <textarea
                value={form.observacionesClinicas}
                onChange={e => setForm(p => ({ ...p, observacionesClinicas: e.target.value }))}
                placeholder="Observaciones relevantes, indicaciones especiales, contexto clínico..."
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {diagnosticos.length > 0 && (
                <button onClick={() => setModoEditar(false)} style={{
                  flex: 1, padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                  border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A',
                  cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                }}>Cancelar</button>
              )}
              <button
                onClick={guardar}
                disabled={guardando || form.diagnosticoNutricional.length === 0}
                style={{
                  flex: 2, padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '600',
                  border: 'none', cursor: (form.diagnosticoNutricional.length === 0 || guardando) ? 'not-allowed' : 'pointer',
                  background: (form.diagnosticoNutricional.length === 0 || guardando) ? '#E8DDD0' : 'linear-gradient(135deg, #7B1B2A, #A63244)',
                  color: (form.diagnosticoNutricional.length === 0 || guardando) ? '#9B7B65' : 'white',
                  fontFamily: "'Lato', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {guardando
                  ? <><div style={{ width: '16px', height: '16px', border: '2px solid #9B7B65', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Guardando...</>
                  : '💾 Guardar Diagnóstico'}
              </button>
            </div>
            {form.diagnosticoNutricional.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#9B7B65', marginTop: '8px' }}>
                * Selecciona al menos un diagnóstico nutricional
              </p>
            )}
          </div>
        )}

      </main>
    </div>
  )
}