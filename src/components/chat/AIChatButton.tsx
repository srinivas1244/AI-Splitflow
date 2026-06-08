'use client'

import { useState, useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'
import { AIChatPanel } from './AIChatPanel'

export function AIChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!mounted) return null

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="chat-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Chat Panel */}
      {isOpen && <AIChatPanel onClose={() => setIsOpen(false)} />}

      {/* Floating Button */}
      <button
        id="ai-chat-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`chat-fab ${isOpen ? 'chat-fab-open' : ''}`}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
        title="AI Chat Assistant"
      >
        <div className="chat-fab-ring" />
        {isOpen ? (
          <X className="w-5 h-5 text-white relative z-10" />
        ) : (
          <Sparkles className="w-5 h-5 text-white relative z-10" />
        )}
      </button>
    </>
  )
}
