import type { ButtonHTMLAttributes } from 'react'

/** No default size/color here on purpose — every usage sets its own height, width, and background classes so instance classes never fight a conflicting base utility. */
export function IconButton({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`flex items-center justify-center rounded-full leading-none ${className}`}
      {...props}
    />
  )
}
