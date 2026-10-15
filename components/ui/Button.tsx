import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  // The one accent: the action you came to do (Save).
  primary: 'h-14 rounded-[18px] bg-apricot text-[17px] font-semibold text-ink shadow-[0_6px_18px_rgba(198,106,60,0.28)]',
  secondary: 'rounded-[14px] bg-mist-inset font-medium text-ink',
  // Text-only: small to look at, but min-h-11 below keeps a full 44px tap area.
  quiet: 'rounded-[12px] font-medium text-ink-2',
  // Same, in the alarm colour — destructive actions stay quiet until needed.
  danger: 'rounded-[12px] font-medium text-alarm',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`min-h-11 px-4 py-2 text-base transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-apricot-deep ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
