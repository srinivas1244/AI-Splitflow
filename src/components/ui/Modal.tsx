'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useCallback } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn(
          'relative w-full glass animate-fade-in',
          sizeMap[size],
          className
        )}
      >
        {(title || description) && (
          <div className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-white/10">
            {title && (
              <h2 id="modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h2>
            )}
            {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
