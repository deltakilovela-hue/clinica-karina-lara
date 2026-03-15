'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPacientes, Paciente } from '@/lib/pacientes'
import Link from 'next/link'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

export default function PacientesPage() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      try {
        const lista = await obtenerPacientes()
        setPacientes(lista)
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router])

  const filtrados = pacientes.filter(p =>
    p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    p.tutor.toLowerCase().includes(filtro.toLowerCase()) ||
    p.motivoConsulta.toLowerCase().includes(filtro.toLowerCase())
  )

  if (cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Link href="/dashboard" style={{ color: '#9B7B65', textDecoration: 'none' }}>← Dashboard</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <span style={{ color: '#2C1810', fontWeight: '600' }}>Pacientes</span>
          </div>
          <Link href="/pacientes/nuevo" style={{
            padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
            background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
            color: 'white', textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(123,27,42,0.25)'
          }}>+ Nuevo Paciente</Link>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '30px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>
            Gestión de <span style={{ color: '#7B1B2A' }}>Pacientes</span>
          </h1>
          <p style={{ color: '#9B7B65', fontSize: '14px' }}>
            {pacientes.length} paciente{pacientes.length !== 1 ? 's' : ''} registrado{pacientes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Buscador */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="🔍  Buscar por nombre, tutor o motivo de consulta..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            style={{
              width: '100%', padding: '12px 18px', borderRadius: '12px', fontSize: '14px',
              border: '1.5px solid #E8DDD0', background: 'white', color: '#2C1810',
              outline: 'none', fontFamily: "'Lato', sans-serif"
            }}
          />
        </div>

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '16px', border: '2px dashed #E8DDD0',
            padding: '60px', textAlign: 'center'
          }}>
            <p style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: '#2C1810', marginBottom: '8px' }}>
              No se encontraron pacientes
            </p>
            {!filtro && (
              <Link href="/pacientes/nuevo" style={{
                display: 'inline-block', marginTop: '16px', padding: '11px 24px',
                borderRadius: '10px', background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
                color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: '600'
              }}>+ Crear Primer Paciente</Link>
            )}
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E8DDD0', overflow: 'hidden' }}>
            {filtrados.map((p, i) => (
              <Link key={p.id} href={`/pacientes/${p.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 24px', textDecoration: 'none',
                borderBottom: i < filtrados.length - 1 ? '1px solid #F2EDE4' : 'none',
                background: 'white', transition: 'background 0.15s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: '#F5E8EB', color: '#7B1B2A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', fontWeight: '700', fontFamily: "'Playfair Display', serif",
                    flexShrink: 0
                  }}>{p.nombre.charAt(0).toUpperCase()}</div>
                  <div>
                    <p style={{ fontWeight: '600', color: '#2C1810', fontSize: '15px', marginBottom: '3px' }}>{p.nombre}</p>
                    <p style={{ fontSize: '13px', color: '#9B7B65', marginBottom: '2px' }}>
                      {p.edad} años · {p.sexo} · Tutor: {p.tutor}
                    </p>
                    <p style={{ fontSize: '12px', color: '#C9B8A8' }}>{p.motivoConsulta.substring(0, 60)}{p.motivoConsulta.length > 60 ? '...' : ''}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '13px', color: '#6B4F3A', marginBottom: '4px' }}>{p.telefono}</p>
                  {p.fechaCreacion && (
                    <p style={{ fontSize: '12px', color: '#C9B8A8' }}>
                      {p.fechaCreacion.toDate().toLocaleDateString('es-MX')}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}