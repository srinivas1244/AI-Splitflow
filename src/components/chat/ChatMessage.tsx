'use client'

import { Bot } from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="chat-msg-user">
        <div className="chat-bubble-user">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-msg-assistant">
      <div className="chat-bot-avatar">
        <Bot className="w-3.5 h-3.5 text-indigo-400" />
      </div>
      <div className="chat-bubble-assistant">
        {content ? (
          <FormattedContent content={content} />
        ) : isStreaming ? (
          <div className="chat-typing-dots">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        {isStreaming && content && (
          <span className="chat-cursor" />
        )}
      </div>
    </div>
  )
}

function FormattedContent({ content }: { content: string }) {
  // Split into lines and render with basic markdown-like formatting
  const lines = content.split('\n')

  return (
    <div className="text-sm leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <p key={i} className="font-semibold text-white mt-2 mb-1">
              {line.replace('## ', '')}
            </p>
          )
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <p key={i} className="font-semibold text-slate-200">
              {line.replace(/\*\*/g, '')}
            </p>
          )
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
              <span className="text-slate-300 whitespace-pre-wrap">{formatInline(line.replace(/^[-•]\s/, ''))}</span>
            </div>
          )
        }
        if (line === '') {
          return <div key={i} className="h-1" />
        }
        return (
          <p key={i} className="text-slate-300 whitespace-pre-wrap">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function formatInline(text: string): React.ReactNode {
  // Bold text between **
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return text

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-white font-semibold">{part.replace(/\*\*/g, '')}</strong>
        }
        return part
      })}
    </>
  )
}
