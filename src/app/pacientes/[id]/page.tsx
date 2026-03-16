'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { obtenerPaciente, eliminarPaciente, Paciente } from '@/lib/pacientes'
import Link from 'next/link'

const ADMINS = ['Ln.karynalaras@gmail.com', 'deltakilo.vela@gmail.com', 'admin@clinicakarina.app', 'deltakilo.gemini@gmail.com']

export default function DetallePacientePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [inicializando, setInicializando] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setInicializando(false)
      if (!user || !ADMINS.includes(user.email ?? '')) { router.replace('/'); return }
      try {
        const p = await obtenerPaciente(id)
        setPaciente(p)
      } catch (e) { console.error(e) }
      finally { setCargando(false) }
    })
    return () => unsub()
  }, [router, id])

  const handleEliminar = async () => {
    try { await eliminarPaciente(id); router.push('/pacientes') }
    catch (e) { console.error(e) }
  }

  if (inicializando || cargando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #E8DDD0', borderTopColor: '#7B1B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!paciente) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#FAF7F2' }}>
      <p style={{ color: '#6B4F3A', fontFamily: "'Lato', sans-serif" }}>Paciente no encontrado</p>
      <Link href="/pacientes" style={{ color: '#7B1B2A', fontSize: '14px', fontFamily: "'Lato', sans-serif" }}>← Volver</Link>
    </div>
  )

  const modulos = [
    { nombre: 'Historia Clínica', icono: '📋', href: `/pacientes/${id}/historia`, listo: true },
    { nombre: 'Antropometría', icono: '📏', href: `/pacientes/${id}/antropometria`, listo: true },
    { nombre: 'Diagnóstico', icono: '🩺', href: `/pacientes/${id}/diagnostico`, listo: true },
    { nombre: 'Plan Nutricional IA', icono: '🧠', href: `/pacientes/${id}/plan`, listo: true },
    { nombre: 'Seguimiento', icono: '📊', href: `/pacientes/${id}/seguimiento`, listo: true },
    { nombre: 'Expediente Completo', icono: '🗂️', href: `/pacientes/${id}/expediente`, listo: true },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', fontFamily: "'Lato', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <header style={{ background: 'white', borderBottom: '1px solid #E8DDD0', padding: '0 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Link href="/dashboard" style={{ color: '#9B7B65', textDecoration: 'none' }}>Dashboard</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <Link href="/pacientes" style={{ color: '#9B7B65', textDecoration: 'none' }}>Pacientes</Link>
            <span style={{ color: '#C9B8A8' }}>/</span>
            <span style={{ color: '#2C1810', fontWeight: '600' }}>{paciente.nombre}</span>
          </div>
          <button onClick={() => setConfirmDelete(true)} style={{
            padding: '7px 16px', borderRadius: '8px', fontSize: '13px',
            border: '1.5px solid #F5C2C7', background: 'white',
            color: '#9B2335', cursor: 'pointer', fontFamily: "'Lato', sans-serif"
          }}>Eliminar</button>
        </div>
      </header>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Perfil */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #E8DDD0', padding: '32px', marginBottom: '24px', boxShadow: '0 2px 16px rgba(44,24,16,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '24px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #7B1B2A, #A63244)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '26px', fontWeight: '700',
              fontFamily: "'Playfair Display', serif"
            }}>{paciente.nombre.charAt(0).toUpperCase()}</div>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>
                {paciente.nombre}
              </h1>
              <p style={{ color: '#9B7B65', fontSize: '14px', marginBottom: '16px' }}>
                {paciente.edad} años · {paciente.sexo} · {paciente.fechaNacimiento && new Date(paciente.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {[['Tutor', paciente.tutor], ['Teléfono', paciente.telefono], ['Correo', paciente.correo || 'No registrado']].map(([l, v]) => (
                  <div key={l}>
                    <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#8B6914', marginBottom: '4px' }}>{l}</p>
                    <p style={{ fontSize: '14px', color: '#2C1810' }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: '#FAF7F2', borderRadius: '12px', padding: '18px', border: '1px solid #E8DDD0' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#8B6914', marginBottom: '8px' }}>Motivo de Consulta</p>
            <p style={{ fontSize: '14px', color: '#2C1810', lineHeight: '1.6' }}>{paciente.motivoConsulta}</p>
          </div>

          {paciente.correoAcceso && (
            <div style={{ marginTop: '16px', background: '#F0FAF4', borderRadius: '12px', padding: '18px', border: '1px solid #95D5A8' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#2D6A4F', marginBottom: '10px' }}>Acceso Portal Padres</p>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <p style={{ fontSize: '12px', color: '#6B4F3A', marginBottom: '4px' }}>Usuario</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#2C1810', userSelect: 'all' }}>{paciente.correoAcceso}</p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#6B4F3A', marginBottom: '4px' }}>Contraseña</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#2C1810', userSelect: 'all' }}>{paciente.passwordAcceso}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Módulos */}
        <div>
          <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#8B6914', marginBottom: '16px' }}>
            Módulos Clínicos
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {modulos.map(mod => (
              <Link key={mod.nombre} href={mod.listo ? mod.href : '#'}
                style={{
                  background: 'white', borderRadius: '14px', border: '1px solid #E8DDD0',
                  padding: '22px', textDecoration: 'none', display: 'block',
                  opacity: mod.listo ? 1 : 0.5, cursor: mod.listo ? 'pointer' : 'not-allowed'
                }}>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '10px' }}>{mod.icono}</span>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: '600', color: '#2C1810', marginBottom: '4px' }}>{mod.nombre}</p>
                <p style={{ fontSize: '12px', color: mod.listo ? '#2D6A4F' : '#9B7B65', fontWeight: '500' }}>
                  {mod.listo ? '✓ Disponible' : 'Próximamente'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Modal eliminar */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '100%', boxShadow: '0 8px 40px rgba(44,24,16,0.2)' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', color: '#2C1810', marginBottom: '10px' }}>¿Eliminar expediente?</h3>
            <p style={{ color: '#6B4F3A', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Se eliminará permanentemente el expediente de <strong>{paciente.nombre}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmDelete(false)} style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px',
                border: '1.5px solid #E8DDD0', background: 'white', color: '#6B4F3A',
                cursor: 'pointer', fontFamily: "'Lato', sans-serif", fontWeight: '600'
              }}>Cancelar</button>
              <button onClick={handleEliminar} style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px',
                background: '#9B2335', color: 'white', border: 'none',
                cursor: 'pointer', fontFamily: "'Lato', sans-serif", fontWeight: '600'
              }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}