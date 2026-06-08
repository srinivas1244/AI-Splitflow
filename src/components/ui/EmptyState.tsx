'use client'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-3xl mb-5 shadow-[0_0_20px_rgba(99,102,241,0.15)] relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 dark:from-indigo-500/20 to-transparent rounded-2xl opacity-50" />
          <div className="relative z-10 text-indigo-600 dark:text-indigo-400">
            {icon}
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-xs">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
