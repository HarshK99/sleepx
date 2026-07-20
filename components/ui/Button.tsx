import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger'
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-blue-600 text-white active:bg-blue-700 disabled:bg-blue-300',
  secondary:
    'bg-gray-100 text-gray-900 active:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:active:bg-gray-700',
  danger: 'bg-red-600 text-white active:bg-red-700 disabled:bg-red-300',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`min-h-11 rounded-lg px-4 py-2 text-base font-medium disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
