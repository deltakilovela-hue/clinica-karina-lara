import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Clínica Karina Lara',
  description: 'Nutrición Clínica Especializada — Neurodesarrollo y Salud Intestinal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Lato:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}