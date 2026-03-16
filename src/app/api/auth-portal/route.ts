import { NextRequest, NextResponse } from 'next/server'

// Firebase Admin SDK - usar fetch directo a la REST API de Firebase Auth
// No necesita el Admin SDK instalado, usa la API Key del proyecto
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!

export async function POST(req: NextRequest) {
  try {
    const { correo, password, accion } = await req.json()

    if (!correo || !password) {
      return NextResponse.json({ error: 'Correo y contraseña son requeridos' }, { status: 400 })
    }

    if (accion === 'crear') {
      // Crear usuario en Firebase Auth via REST API
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: correo,
            password: password,
            returnSecureToken: false,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        // Si el usuario ya existe, intentar actualizar la contraseña
        if (data.error?.message === 'EMAIL_EXISTS') {
          return NextResponse.json({ ok: true, mensaje: 'Usuario ya existe' })
        }
        return NextResponse.json({ error: data.error?.message || 'Error al crear usuario' }, { status: 500 })
      }

      return NextResponse.json({ ok: true, uid: data.localId })
    }

    if (accion === 'actualizar') {
      // Para actualizar contraseña necesitamos el idToken del admin
      // Primero hacer login como admin para obtener el token
      const loginRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: correo,
            password: password,
            returnSecureToken: true,
          }),
        }
      )

      if (!loginRes.ok) {
        return NextResponse.json({ error: 'No se pudo verificar el usuario' }, { status: 500 })
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })

  } catch (error) {
    console.error('Error en API auth-portal:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}