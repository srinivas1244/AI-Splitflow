'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  animationClass?: string
  threshold?: number
}

export function ScrollReveal({ 
  children, 
  className = '', 
  animationClass = 'animate-fade-in', 
  threshold = 0.1 
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (ref.current) observer.unobserve(ref.current)
        }
      },
      {
        threshold,
        rootMargin: '50px',
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(ref.current)
      }
    }
  }, [threshold])

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? animationClass : 'opacity-0'}`}
    >
      {children}
    </div>
  )
}
