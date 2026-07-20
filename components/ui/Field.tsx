import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  htmlFor: string
  children: ReactNode
}

export function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
    </div>
  )
}
