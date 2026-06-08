'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/utils'
import {
  ArrowLeft,
  Download,
  Trash2,
  CheckCircle2,
  Paperclip,
  Users,
  Calendar,
  Tag,
  DollarSign,
  HandCoins,
  Receipt,
  MessageCircle,
  History as HistoryIcon,
  Send
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile, Expense, ExpenseSplit, ExpenseComment, ExpenseHistory, ExpenseAttachment } from '@/types'
import Link from 'next/link'

interface ExpenseWithDetails extends Omit<Expense, 'group'> {
  payer: Profile
  splits: (ExpenseSplit & { profile: Profile })[]
  group: { id: string; name: string } | null
  attachments?: ExpenseAttachment[]
}

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [expense, setExpense] = useState<ExpenseWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [settleOpen, setSettleOpen] = useState(false)
  const [settleNote, setSettleNote] = useState('')
  const [settling, setSettling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [comments, setComments] = useState<(ExpenseComment & { profile: Profile })[]>([])
  const [history, setHistory] = useState<(ExpenseHistory & { profile: Profile })[]>([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)

    const { data: exp } = await supabase
      .from('expenses')
      .select('*, payer:profiles!expenses_paid_by_fkey(*), splits:expense_splits(*, profile:profiles(*)), group:groups(id, name), attachments:expense_attachments(*)')
      .eq('id', id)
      .single()

    const { data: comms } = await supabase
      .from('expense_comments')
      .select('*, profile:profiles(*)')
      .eq('expense_id', id)
      .order('created_at', { ascending: true })

    const { data: hist } = await supabase
      .from('expense_history')
      .select('*, profile:profiles(*)')
      .eq('expense_id', id)
      .order('created_at', { ascending: false })

    setComments(comms || [])
    setHistory(hist || [])
    setExpense(exp)
    setLoading(false)
  }

  async function settleSplit() {
    if (!profile || !expense) return
    setSettling(true)

    // Mark my split as settled
    await supabase
      .from('expense_splits')
      .update({ is_settled: true })
      .eq('expense_id', id)
      .eq('user_id', profile.id)

    const mySplit = expense.splits.find((s) => s.user_id === profile.id)
    if (mySplit && mySplit.amount > 0) {
      // Create settlement record
      await supabase.from('settlements').insert({
        payer_id: profile.id,
        payee_id: expense.paid_by,
        amount: mySplit.amount,
        group_id: expense.group_id,
        note: settleNote || null,
      })
      
      // Log history
      await supabase.from('expense_history').insert({
        expense_id: id,
        user_id: profile.id,
        action: 'settled their share',
        details: settleNote ? `Note: ${settleNote}` : null
      })
    }

    toast.success('Marked as settled!')
    setSettleOpen(false)
    loadData()
    setSettling(false)
  }

  async function deleteExpense() {
    if (!profile || !expense) return
    setDeleting(true)
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      setDeleting(false)
      return
    }
    toast.success('Expense deleted')
    window.history.back()
  }

  async function getAttachmentUrl(path: string) {
    const { data } = await supabase.storage
      .from('expense-attachments')
      .createSignedUrl(path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || !profile) return
    setPostingComment(true)
    const { data, error } = await supabase.from('expense_comments').insert({
      expense_id: id,
      user_id: profile.id,
      content: newComment.trim()
    }).select('*, profile:profiles(*)').single()

    if (error) {
      toast.error('Failed to post comment')
    } else {
      setComments([...comments, data])
      setNewComment('')
    }
    setPostingComment(false)
  }

  const mySplit = expense?.splits.find((s) => s.user_id === profile?.id)
  const iAmOwed = expense?.paid_by === profile?.id
  const iOweSomething = mySplit && !iAmOwed && mySplit.amount > 0

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Expense" profile={profile} />
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      </div>
    )
  }

  if (!expense) {
    return (
      <div className="flex flex-col">
        <Header title="Expense Not Found" profile={profile} />
        <div className="p-6">
          <GlassCard className="text-center py-12">
            <p className="text-slate-400">This expense could not be found.</p>
            <Link href="/expenses" className="inline-block mt-4">
              <Button variant="secondary">Back to Expenses</Button>
            </Link>
          </GlassCard>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Expense Details" profile={profile} />

      <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <Link href={expense.group ? `/groups/${expense.group.id}` : "/expenses"} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back
          </Link>
          {expense.created_by === profile?.id && (
            <Button variant="ghost" size="sm" onClick={deleteExpense} loading={deleting} className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10">
              <Trash2 className="w-4 h-4 mr-2" />Delete
            </Button>
          )}
        </div>

        {/* HERO SECTION */}
        <ScrollReveal animationClass="animate-fade-in">
          <div className="glass !rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden bg-gradient-to-br from-indigo-50/50 to-white/30 dark:from-indigo-500/10 dark:to-white/5 border border-indigo-100 dark:border-indigo-500/20 shadow-xl shadow-indigo-500/5 group">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-400/10 blur-3xl rounded-full group-hover:bg-indigo-400/20 transition-colors duration-700" />
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-violet-400/10 blur-3xl rounded-full group-hover:bg-violet-400/20 transition-colors duration-700" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-white dark:bg-[#1a1a1a] shadow-lg shadow-indigo-500/10 flex items-center justify-center text-5xl mb-6 border-4 border-indigo-50 dark:border-white/5 transform group-hover:scale-110 transition-transform duration-500">
                {expense.category === 'food' ? '🍕' :
                 expense.category === 'transport' ? '🚗' :
                 expense.category === 'accommodation' ? '🏠' :
                 expense.category === 'entertainment' ? '🎬' :
                 expense.category === 'utilities' ? '💡' : '💳'}
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{expense.title}</h1>
              {expense.description && <p className="text-slate-500 font-medium max-w-md">{expense.description}</p>}
              
              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/10 w-full flex flex-col items-center">
                 <p className="text-sm font-bold text-indigo-500/80 dark:text-indigo-400/80 uppercase tracking-widest mb-1">Total Amount</p>
                 <p className="text-5xl md:text-6xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{formatCurrency(expense.amount)}</p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 mt-8 w-full">
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/60 dark:bg-black/20 border border-slate-100 dark:border-white/5 backdrop-blur-sm">
                  <Tag className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">{expense.category}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/60 dark:bg-black/20 border border-slate-100 dark:border-white/5 backdrop-blur-sm">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tracking-widest">{formatDate(expense.date)}</span>
                </div>
                {expense.group && (
                  <Link href={`/groups/${expense.group.id}`} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/60 dark:bg-black/20 border border-slate-100 dark:border-white/5 backdrop-blur-sm hover:bg-white dark:hover:bg-white/10 transition-colors">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tracking-widest">{expense.group.name}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-4">
          {/* Left Column: Split Breakdown */}
          <div className="md:col-span-8 flex flex-col gap-6">
            <ScrollReveal animationClass="animate-fade-in-delay-1">
              <div className="flex items-center justify-between px-2 mb-4">
                 <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Users className="w-4 h-4" /> Split Breakdown
                 </h2>
                 <Badge variant={expense.split_type === 'equal' ? 'default' : 'info'} className="text-[10px] uppercase tracking-wider">{expense.split_type} Split</Badge>
              </div>

              <div className="glass !rounded-[2rem] p-6 relative overflow-hidden bg-white/40 dark:bg-black/20">
                <div className="flex flex-col gap-1">
                  {expense.splits.map((split) => {
                    const percentage = Math.round((split.amount / expense.amount) * 100);
                    return (
                      <div key={split.id} className="group flex flex-col gap-3 p-4 rounded-3xl hover:bg-white/60 dark:hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-4">
                          <Avatar src={split.profile?.avatar_url} name={split.profile?.full_name} size="md" className="ring-2 ring-white dark:ring-[#1a1a1a] shadow-sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-base font-bold text-slate-900 dark:text-white truncate">
                                {split.user_id === profile?.id ? 'You' : split.profile?.full_name}
                              </p>
                              {split.user_id === expense.paid_by && (
                                <Badge variant="success" className="text-[9px] px-1.5 py-0">Payer</Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${split.user_id === expense.paid_by ? 'bg-indigo-500' : split.is_settled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              {split.user_id === expense.paid_by ? 'Paid' : split.is_settled ? 'Settled' : 'Pending'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-black text-xl ${split.user_id === expense.paid_by ? 'text-indigo-600 dark:text-indigo-400' : split.is_settled ? 'text-emerald-600 dark:text-emerald-400' : split.user_id === profile?.id && !iAmOwed ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                              {formatCurrency(split.amount)}
                            </p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{percentage}% Share</span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden mt-1 shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${split.is_settled ? 'bg-emerald-500' : split.user_id === expense.paid_by ? 'bg-indigo-500' : 'bg-amber-500'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {iOweSomething && !mySplit?.is_settled && (
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
                    <Button fullWidth onClick={() => setSettleOpen(true)} className="rounded-2xl py-6 shadow-lg shadow-indigo-500/20 text-base">
                      <HandCoins className="w-5 h-5 mr-2" />
                      Mark My Share as Settled ({formatCurrency(mySplit.amount)})
                    </Button>
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column: Payer & Attachments */}
          <div className="md:col-span-4 flex flex-col gap-8">
            <ScrollReveal animationClass="animate-fade-in-delay-2">
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2">Paid By</h2>
                <div className="glass !rounded-[2rem] p-6 flex flex-col items-center text-center group hover:bg-white/60 dark:hover:bg-white/5 transition-all">
                  <div className="relative mb-4">
                     <Avatar src={expense.payer?.avatar_url} name={expense.payer?.full_name} size="xl" className="ring-4 ring-indigo-50 dark:ring-indigo-500/10 shadow-xl" />
                     <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center border-2 border-white dark:border-[#121212]">
                       <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                     </div>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{expense.payer?.id === profile?.id ? 'You' : expense.payer?.full_name}</p>
                  <p className="text-xs font-mono text-slate-500 mt-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">{expense.payer?.split_id}</p>
                </div>
              </div>
            </ScrollReveal>

            {expense.attachments && expense.attachments.length > 0 && (
              <ScrollReveal animationClass="animate-fade-in-delay-3">
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" /> Attachments
                  </h2>
                  <div className="glass !rounded-[2rem] p-4 flex flex-col gap-2">
                     {expense.attachments.map((file) => (
                       <button
                         key={file.id}
                         onClick={() => getAttachmentUrl(file.storage_path)}
                         className="flex items-center gap-3 p-3 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors text-left group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
                       >
                         <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-indigo-500 group-hover:bg-white dark:group-hover:bg-[#1a1a1a] shadow-sm transition-colors">
                           <Paperclip className="w-4 h-4" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{file.file_name}</p>
                           <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-0.5">{(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                         </div>
                         <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                       </button>
                     ))}
                  </div>
                </div>
              </ScrollReveal>
            )}
          </div>
        </div>

        {/* Discussion & Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
          
          {/* Comments */}
          <ScrollReveal animationClass="animate-fade-in-up">
            <div className="flex flex-col gap-4 h-full">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Discussion
              </h2>
              <div className="glass !rounded-[2rem] p-6 flex flex-col h-[400px] bg-white/40 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin flex flex-col mb-4">
                  {comments.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm">
                       <MessageCircle className="w-8 h-8 mb-2 opacity-20" />
                       <p>No comments yet. Start the conversation!</p>
                    </div>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className={`flex flex-col max-w-[85%] ${c.user_id === profile?.id ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                           {c.user_id !== profile?.id && <Avatar src={c.profile?.avatar_url} name={c.profile?.full_name} size="xs" />}
                           <span className="text-[10px] font-bold text-slate-400 uppercase">{c.user_id === profile?.id ? 'You' : c.profile?.full_name}</span>
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${c.user_id === profile?.id ? 'bg-indigo-500 text-white rounded-tr-sm' : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 rounded-tl-sm shadow-sm'}`}>
                          {c.comment}
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium mt-1">{new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    ))
                  )}
                </div>
                
                <form onSubmit={postComment} className="flex gap-2 mt-auto">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-white dark:bg-black/20 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-2 text-sm outline-none text-slate-900 dark:text-white transition-all shadow-sm"
                  />
                  <Button type="submit" disabled={!newComment.trim() || postingComment} size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-md shadow-indigo-500/20 px-3">
                    {postingComment ? <Spinner size="sm" className="text-white border-white" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </div>
          </ScrollReveal>

          {/* Activity History */}
          <ScrollReveal animationClass="animate-fade-in-up">
            <div className="flex flex-col gap-4 h-full">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                <HistoryIcon className="w-4 h-4" /> Activity Log
              </h2>
              <div className="glass !rounded-[2rem] p-6 flex flex-col h-[400px] bg-white/40 dark:bg-white/5 border border-slate-100 dark:border-white/10 overflow-hidden">
                 <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin relative before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-slate-200 dark:before:bg-white/10">
                   {history.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm relative z-10">
                        <HistoryIcon className="w-8 h-8 mb-2 opacity-20" />
                        <p>No activity recorded.</p>
                      </div>
                   ) : (
                     history.map((h) => (
                       <div key={h.id} className="relative flex gap-4 z-10">
                         <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-black/40 border-2 border-white dark:border-[#121212] flex items-center justify-center shrink-0 mt-0.5">
                           <Avatar src={h.profile?.avatar_url} name={h.profile?.full_name} size="xs" className="w-6 h-6" />
                         </div>
                         <div className="flex-1 flex flex-col">
                           <p className="text-sm text-slate-700 dark:text-slate-300">
                             <span className="font-bold text-slate-900 dark:text-white">{h.profile?.id === profile?.id ? 'You' : h.profile?.full_name}</span>{' '}
                             {h.action}
                           </p>
                           {h.changes && Object.keys(h.changes).length > 0 && (
                             <p className="text-xs text-slate-500 mt-1 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-slate-100 dark:border-white/5 inline-block self-start">
                               Updated: {Object.keys(h.changes).join(', ')}
                             </p>
                           )}
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">{formatRelativeDate(h.created_at)}</span>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Settle Modal */}
      <Modal isOpen={settleOpen} onClose={() => setSettleOpen(false)} title="Settle Up" size="sm">
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-emerald-300 font-medium">
              You&apos;re marking your share of {formatCurrency(mySplit?.amount || 0)} as settled with{' '}
              {iAmOwed ? 'yourself' : expense.payer?.full_name}.
            </p>
          </div>
          <Input
            label="Note (optional)"
            placeholder="Paid via bank transfer..."
            value={settleNote}
            onChange={(e) => setSettleNote(e.target.value)}
          />
          <Button fullWidth onClick={settleSplit} loading={settling} variant="success">
            <CheckCircle2 className="w-4 h-4" />
            Confirm Settlement
          </Button>
        </div>
      </Modal>
    </div>
  )
}
