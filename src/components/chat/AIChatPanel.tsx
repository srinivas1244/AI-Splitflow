'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Bot, Sparkles, RotateCcw } from 'lucide-react'
import { ChatMessage } from './ChatMessage'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  { label: '💸 Who do I owe?', prompt: 'Who do I owe money to, and how much?' },
  { label: '💰 Who owes me?', prompt: 'Who owes me money? Give me a full breakdown.' },
  { label: '📊 Spending summary', prompt: 'Summarize my recent spending and give me insights.' },
  { label: '🤝 Settle up', prompt: 'Suggest the best order to settle my debts to minimize transactions.' },
  { label: '📈 Net balance', prompt: 'What is my current net balance?' },
  { label: '👥 Group activity', prompt: 'What groups am I in and what\'s the activity?' },
]

interface AIChatPanelProps {
  onClose: () => void
}

export function AIChatPanel({ onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your SplitFlow AI assistant 👋\n\nI can see your expenses, balances, and groups in real-time. Ask me anything!",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    // Auto-focus input when panel opens
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setStreamingContent('')

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error('Failed to get response')
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setStreamingContent(accumulated.split('\n\n__ACTION_REQUIRED__')[0])
      }

      // Handle server-side function execution commands
      if (accumulated.includes('__ACTION_REQUIRED__: create_expense:')) {
        const actionStr = accumulated.split('__ACTION_REQUIRED__: create_expense:')[1]
        try {
          const args = JSON.parse(actionStr)
          accumulated = accumulated.split('\n\n__ACTION_REQUIRED__')[0]
          
          // Navigate to expenses page with pre-filled data
          const params = new URLSearchParams({
             create: 'true',
             title: args.title || '',
             amount: args.amount?.toString() || '',
             category: args.category || 'other'
          })
          window.location.href = `/expenses?${params.toString()}`
        } catch (e) {
          console.error("Failed to parse action args", e)
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: accumulated },
      ])
      setStreamingContent('')
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please check your Groq API key or try again.',
        },
      ])
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  const handleReset = () => {
    abortRef.current?.abort()
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm your SplitFlow AI assistant 👋\n\nI can see your expenses, balances, and groups in real-time. Ask me anything!",
      },
    ])
    setStreamingContent('')
    setIsLoading(false)
    setInput('')
  }

  const showQuickPrompts = messages.length <= 1

  return (
    <div className="chat-panel" role="dialog" aria-label="AI Chat Assistant">
      {/* Header */}
      <div className="chat-panel-header">
        <div className="flex items-center gap-3">
          <div className="chat-panel-avatar">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">SplitFlow AI</p>
            <p className="text-xs text-slate-400">Powered by Groq · llama-3.3-70b</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            className="chat-icon-btn"
            title="New conversation"
            aria-label="Reset conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="chat-icon-btn"
            title="Close"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" id="chat-messages-list">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}

        {/* Streaming message */}
        {isLoading && (
          <ChatMessage
            role="assistant"
            content={streamingContent}
            isStreaming
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {showQuickPrompts && !isLoading && (
        <div className="chat-quick-prompts">
          <p className="text-xs text-slate-500 mb-2 px-1">Quick questions</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.prompt}
                onClick={() => handleQuickPrompt(q.prompt)}
                className="chat-quick-chip"
                id={`quick-prompt-${q.label.replace(/\s+/g, '-').toLowerCase()}`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-container">
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your expenses, balances..."
            className="chat-textarea"
            rows={1}
            disabled={isLoading}
            aria-label="Chat input"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="chat-send-btn"
            id="chat-send-button"
            aria-label="Send message"
          >
            {isLoading ? (
              <Bot className="w-4 h-4 animate-pulse" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
