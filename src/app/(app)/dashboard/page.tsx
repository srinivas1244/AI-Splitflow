import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency, formatRelativeDate } from '@/lib/utils'
import {
  TrendingDown,
  TrendingUp,
  Receipt,
  UsersRound,
  MoreVertical,
  Calendar,
  Wallet,
  Activity,
  ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { AIInsights } from '@/components/dashboard/AIInsights'
import type { Profile, Expense, ExpenseSplit } from '@/types'

export const metadata = { title: 'Dashboard' }

async function getDashboardData(userId: string) {
  const supabase = await createClient()

  // Get recent expenses involving the user
  const { data: splits } = await supabase
    .from('expense_splits')
    .select(`
      *,
      expense:expenses(
        *,
        payer:profiles!expenses_paid_by_fkey(id, full_name, avatar_url, split_id),
        splits:expense_splits(*, profile:profiles(id, full_name, avatar_url))
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const { data: groupMemberships } = await supabase
    .from('group_members')
    .select('*, group:groups(*)')
    .eq('user_id', userId)
    .limit(6)

  let totalOwed = 0
  let totalOwedToMe = 0

  const expenses = splits?.map((s: ExpenseSplit & { expense: Expense & { payer: Profile } }) => s.expense) ?? []

  splits?.forEach((split: ExpenseSplit & { expense: Expense & { payer: Profile } }) => {
    if (!split.is_settled && split.expense) {
      if (split.expense.paid_by !== userId && split.user_id === userId) {
        totalOwed += split.amount
      }
    }
  })

  const { data: paidExpenses } = await supabase
    .from('expenses')
    .select('*, splits:expense_splits(*)')
    .eq('paid_by', userId)

  paidExpenses?.forEach((exp: Expense & { splits: ExpenseSplit[] }) => {
    exp.splits?.forEach((s: ExpenseSplit) => {
      if (s.user_id !== userId && !s.is_settled) {
        totalOwedToMe += s.amount
      }
    })
  })

  const groups = groupMemberships?.map((m: { group: { id: string; name: string; avatar_url?: string } }) => m.group) ?? []

  return {
    totalOwed,
    totalOwedToMe,
    recentExpenses: expenses.slice(0, 5),
    groups,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { totalOwed, totalOwedToMe, recentExpenses, groups } = await getDashboardData(user.id)
  const netBalance = totalOwedToMe - totalOwed

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard"
        subtitle="Main Dashboard"
        profile={profile}
      />

      <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-8 max-w-5xl mx-auto w-full">
        
        {/* STAT CARDS - Top Row */}
        <ScrollReveal animationClass="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Net Balance */}
          <div className="glass !rounded-[2rem] p-6 md:p-8 flex flex-col justify-between bg-gradient-to-br from-indigo-50/50 to-white/30 dark:from-indigo-500/10 dark:to-white/5 border border-indigo-100 dark:border-indigo-500/20 relative overflow-hidden h-40 group hover:shadow-lg transition-all duration-300">
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-indigo-400/10 blur-3xl rounded-full group-hover:bg-indigo-400/20 transition-colors" />
            <div className="relative z-10">
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {netBalance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(netBalance))}
              </p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Net Balance</p>
            </div>
            <Wallet className="w-16 h-16 text-indigo-500/10 dark:text-white/5 absolute -bottom-4 -right-4 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
          </div>

          {/* Card 2: You Owe */}
          <div className="glass !rounded-[2rem] p-6 md:p-8 flex flex-col justify-between bg-gradient-to-br from-rose-50/50 to-white/30 dark:from-rose-500/10 dark:to-white/5 border border-rose-100 dark:border-rose-500/20 relative overflow-hidden h-40 group hover:shadow-lg transition-all duration-300">
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-rose-400/10 blur-3xl rounded-full group-hover:bg-rose-400/20 transition-colors" />
            <div className="relative z-10">
              <p className="text-4xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                {formatCurrency(totalOwed)}
              </p>
              <p className="text-xs font-bold text-rose-400/70 uppercase tracking-widest mt-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />You Owe</p>
            </div>
            <TrendingDown className="w-16 h-16 text-rose-500/10 dark:text-rose-500/5 absolute -bottom-4 -right-4 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
          </div>

          {/* Card 3: Owed to You */}
          <div className="glass !rounded-[2rem] p-6 md:p-8 flex flex-col justify-between bg-gradient-to-br from-emerald-50/50 to-white/30 dark:from-emerald-500/10 dark:to-white/5 border border-emerald-100 dark:border-emerald-500/20 relative overflow-hidden h-40 group hover:shadow-lg transition-all duration-300">
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-400/10 blur-3xl rounded-full group-hover:bg-emerald-400/20 transition-colors" />
            <div className="relative z-10">
              <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formatCurrency(totalOwedToMe)}
              </p>
              <p className="text-xs font-bold text-emerald-400/70 uppercase tracking-widest mt-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Owed to You</p>
            </div>
            <TrendingUp className="w-16 h-16 text-emerald-500/10 dark:text-emerald-500/5 absolute -bottom-4 -right-4 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
          </div>
          </div>
        </ScrollReveal>

        {/* AI INSIGHTS SECTION */}
        <ScrollReveal animationClass="animate-fade-in-delay-1">
          <AIInsights />
        </ScrollReveal>

        {/* BOTTOM COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
          
          {/* Groups */}
          <ScrollReveal animationClass="animate-fade-in-delay-2">
            <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <UsersRound className="w-4 h-4" /> Your Groups
              </h3>
              <Link href="/groups" className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                + New
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {groups.length === 0 ? (
                <div className="glass !rounded-2xl p-8 text-center flex flex-col items-center border-dashed border-2 border-slate-200 dark:border-white/10">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No groups yet</p>
                </div>
              ) : (
                groups.map((group: { id: string; name: string }) => (
                  <Link key={group.id} href={`/groups/${group.id}`} className="group glass !rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-white/60 dark:hover:bg-white/5 hover:scale-[1.01]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center font-black text-xl text-indigo-500 shadow-sm">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900 dark:text-white">{group.name}</p>
                        <p className="text-xs font-medium text-slate-400">Group</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
          </ScrollReveal>

          {/* Recent Expenses */}
          <ScrollReveal animationClass="animate-fade-in-delay-3">
            <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Recent Expenses
              </h3>
              <Link href="/expenses" className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                View All
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {recentExpenses.length === 0 ? (
                <div className="glass !rounded-2xl p-8 text-center flex flex-col items-center border-dashed border-2 border-slate-200 dark:border-white/10">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No recent expenses</p>
                </div>
              ) : (
                recentExpenses.map((expense: Expense & { payer: Profile }) => (
                  <Link key={expense.id} href={`/expenses/${expense.id}`} className="glass !rounded-2xl p-4 flex flex-col gap-4 transition-all hover:bg-white/60 dark:hover:bg-white/5 hover:scale-[1.01]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-xl shadow-sm border border-slate-100 dark:border-white/10">
                        {expense.category === 'food' ? '🍕' :
                         expense.category === 'transport' ? '🚗' :
                         expense.category === 'accommodation' ? '🏠' :
                         expense.category === 'entertainment' ? '🎬' :
                         expense.category === 'utilities' ? '💡' : '💳'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-slate-900 dark:text-white truncate">{expense.title}</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    
                    <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl w-full ${expense.paid_by === profile?.id ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}`}>
                      <span className={`text-xs font-bold uppercase tracking-widest ${expense.paid_by === profile?.id ? 'text-emerald-500' : 'text-rose-500'}`}>{expense.paid_by === profile?.id ? 'You are owed' : 'You owe'}</span>
                      <span className={`text-sm font-black ${expense.paid_by === profile?.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatCurrency(expense.amount)}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
          </ScrollReveal>

        </div>
      </div>
    </div>
  )
}
