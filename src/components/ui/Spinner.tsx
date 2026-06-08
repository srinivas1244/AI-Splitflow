'use client'

import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <Loader2 className={cn('animate-spin text-blue-400', sizeMap[size], className)} />
  )
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  )
}
