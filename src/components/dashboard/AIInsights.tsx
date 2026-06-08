'use client'

import { useEffect, useState } from 'react'
import { Sparkles, TrendingUp, Lightbulb } from 'lucide-react'

export function AIInsights() {
  const [insights, setInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch('/api/insights')
        const data = await res.json()
        if (data.insights && Array.isArray(data.insights)) {
          setInsights(data.insights)
        }
      } catch (error) {
        console.error("Failed to fetch insights", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchInsights()
  }, [])

  return (
    <div className="glass !rounded-[2rem] p-8 md:p-10 relative overflow-hidden bg-gradient-to-br from-indigo-50/30 to-purple-50/30 dark:from-indigo-500/5 dark:to-purple-500/5 border border-indigo-100/50 dark:border-indigo-500/10 shadow-xl shadow-indigo-500/5">
      {/* Decorative background blobs */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-400/10 dark:bg-indigo-500/10 blur-3xl rounded-full" />
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-400/10 dark:bg-purple-500/10 blur-3xl rounded-full" />
      
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 shadow-sm text-xs font-bold text-indigo-600 dark:text-indigo-300 mb-4 border border-indigo-100 dark:border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            AI Financial Insights
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Smart Analysis</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Personalized trends generated from your spending habits.</p>
        </div>
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 text-white rotate-3 hover:rotate-6 transition-transform">
          <Lightbulb className="w-6 h-6" />
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          // Shimmer Skeleton
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass !rounded-2xl p-6 border border-white/50 dark:border-white/5 bg-white/40 dark:bg-black/20 flex flex-col gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20" />
                <div className="flex flex-col gap-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-full" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </>
        ) : (
          // Real Insights
          insights.map((insight, index) => (
            <div key={index} className="group glass !rounded-2xl p-6 border border-white/50 dark:border-white/5 bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-white/5 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center mb-4 border border-indigo-200/50 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                "{insight}"
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
