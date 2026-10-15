import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  htmlFor: string
  children: ReactNode
}

export function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
    </div>
  )
}
