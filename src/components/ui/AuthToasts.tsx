'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import toast from 'react-hot-toast'

export function AuthToasts() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  // Use a ref to prevent strict mode from double-firing toasts
  const handled = useRef(false)

  useEffect(() => {
    // Only handle once
    if (handled.current) return

    const verified = searchParams.get('verified')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    let hasParams = false

    if (verified === 'true') {
      toast.success('Email confirmed successfully! Welcome to SplitFlow.')
      hasParams = true
    }
    
    if (error) {
      const msg = errorDescription || error.replace(/_/g, ' ')
      toast.error(`Authentication Error: ${msg}`)
      hasParams = true
    }

    // Clean up the URL if we showed a toast
    if (hasParams) {
      handled.current = true
      // Remove query params without triggering a full page reload
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('verified')
      newUrl.searchParams.delete('error')
      newUrl.searchParams.delete('error_description')
      
      // Update the URL
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams, router, pathname])

  return null
}
