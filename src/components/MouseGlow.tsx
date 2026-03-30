'use client'

import { useEffect, useRef } from 'react'

export default function MouseGlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return
      ref.current.style.left = e.clientX + 'px'
      ref.current.style.top = e.clientY + 'px'
    }
    window.addEventListener('mousemove', handler, { passive: true })
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 0,
        width: '700px',
        height: '700px',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, var(--mouse-glow) 0%, transparent 65%)',
        filter: 'blur(48px)',
        willChange: 'left, top',
        transition: 'left 120ms ease-out, top 120ms ease-out',
      }}
    />
  )
}
