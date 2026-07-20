'use client'

import { useFormStatus } from 'react-dom'

import { Button } from './Button'

type SubmitButtonProps = {
  label: string
  pendingLabel: string
  variant?: 'primary' | 'secondary' | 'danger'
}

export function SubmitButton({ label, pendingLabel, variant }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} disabled={pending} className="w-full">
      {pending ? pendingLabel : label}
    </Button>
  )
}
