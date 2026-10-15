import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[22px] bg-mist-strong p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.5)_inset,0_8px_28px_rgba(46,42,58,0.1)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}
