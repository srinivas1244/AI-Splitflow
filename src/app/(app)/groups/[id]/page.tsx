'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { formatCurrency, formatRelativeDate } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  Receipt,
  Users,
  Crown,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  Calculator,
  ChevronDown,
  ChevronUp,
  History,
  PartyPopper,
  Loader2,
  Edit2,
  Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile, Group, GroupMember, Expense, ExpenseSplit, Settlement } from '@/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface MemberWithBalance extends GroupMember {
  profile: Profile
  balance: number
}

interface GroupExpense extends Expense {
  payer: Profile
  splits: (ExpenseSplit & { profile: Profile })[]
}

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<MemberWithBalance[]>([])
  const [expenses, setExpenses] = useState<GroupExpense[]>([])
  const [settlements, setSettlements] = useState<(Settlement & { payer: Profile; payee: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState<string | null>(null)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [newMemberSplitId, setNewMemberSplitId] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [showCalcDetail, setShowCalcDetail] = useState(false)
  const [showAllExpenses, setShowAllExpenses] = useState(false)
  const [showAllCalcExpenses, setShowAllCalcExpenses] = useState(false)
  const [showAllWhoPaid, setShowAllWhoPaid] = useState(false)

  const [editGroupOpen, setEditGroupOpen] = useState(false)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDesc, setEditGroupDesc] = useState('')
  const [updatingGroup, setUpdatingGroup] = useState(false)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)

    const { data: g } = await supabase.from('groups').select('*').eq('id', id).single()
    setGroup(g)

    const { data: mems } = await supabase
      .from('group_members')
      .select('*, profile:profiles(*)')
      .eq('group_id', id)

    const { data: exps } = await supabase
      .from('expenses')
      .select('*, payer:profiles!expenses_paid_by_fkey(*), splits:expense_splits(*, profile:profiles(*))')
      .eq('group_id', id)
      .order('date', { ascending: false })

    // Fetch settlement history for this group
    const { data: settleHistory } = await supabase
      .from('settlements')
      .select(`
        *,
        payer:profiles!settlements_payer_id_fkey(id, full_name, avatar_url),
        payee:profiles!settlements_payee_id_fkey(id, full_name, avatar_url)
      `)
      .eq('group_id', id)
      .order('created_at', { ascending: false })

    setSettlements(settleHistory || [])

    // Compute balances
    const balanceMap: Record<string, number> = {}
      ; (mems || []).forEach((m: MemberWithBalance) => { balanceMap[m.user_id] = 0 })
      ; (exps || []).forEach((exp: GroupExpense) => {
        exp.splits?.forEach((split) => {
          if (split.user_id !== exp.paid_by && !split.is_settled) {
            balanceMap[exp.paid_by] = (balanceMap[exp.paid_by] || 0) + split.amount
            balanceMap[split.user_id] = (balanceMap[split.user_id] || 0) - split.amount
          }
        })
      })

    setMembers(
      (mems || []).map((m: MemberWithBalance) => ({
        ...m,
        balance: balanceMap[m.user_id] || 0,
      }))
    )
    setExpenses(exps || [])
    setLoading(false)
  }

  async function addMember() {
    if (!newMemberSplitId.trim()) return
    setAddingMember(true)
    const { data: found } = await supabase
      .from('profiles')
      .select('*')
      .eq('split_id', newMemberSplitId.trim().toUpperCase())
      .single()

    if (!found) { toast.error('User not found'); setAddingMember(false); return }

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: id, user_id: found.id, role: 'member' })

    if (error) {
      toast.error(error.message.includes('unique') ? 'Already a member' : error.message)
    } else {
      toast.success(`${found.full_name} added to group!`)
      setAddMemberOpen(false)
      setNewMemberSplitId('')
      loadData()
    }
    setAddingMember(false)
  }

  async function removeMember(userId: string) {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', id)
      .eq('user_id', userId)
    if (!error) { toast.success('Member removed'); loadData() }
  }

  async function updateGroup() {
    if (!editGroupName.trim()) return
    setUpdatingGroup(true)
    const { error } = await supabase
      .from('groups')
      .update({ name: editGroupName.trim(), description: editGroupDesc.trim() })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Group updated!')
      setGroup({ ...group!, name: editGroupName.trim(), description: editGroupDesc.trim() })
      setEditGroupOpen(false)
    }
    setUpdatingGroup(false)
  }

  // ── Settle up between current user and another member ──
  async function settleUp(toUserId: string, amount: number, label: string) {
    if (!profile) return
    setSettling(toUserId)
    try {
      // 1. Record the settlement
      const { error: sErr } = await supabase
        .from('settlements')
        .insert({
          payer_id: profile.id,
          payee_id: toUserId,
          amount,
          group_id: id,
          note: `Settled in group via SplitFlow`,
        })
      if (sErr) throw sErr

      // 2. Mark all relevant unsettled splits as settled
      //    (splits where expense was paid by toUserId and user_id = me)
      const expenseIds = expenses
        .filter(e => e.paid_by === toUserId)
        .map(e => e.id)

      if (expenseIds.length > 0) {
        await supabase
          .from('expense_splits')
          .update({ is_settled: true })
          .in('expense_id', expenseIds)
          .eq('user_id', profile.id)
          .eq('is_settled', false)
      }

      toast.success(`Settled ${label}! Fresh start 🎉`)
      await loadData()
    } catch (err) {
      toast.error('Failed to record settlement')
    } finally {
      setSettling(null)
    }
  }

  // ── Export Detailed Financial Ledger to CSV ──
  async function exportToCSV() {
    if (!group) return
    const loadingToast = toast.loading('Generating detailed ledger...')

    try {
      const { data, error } = await supabase.rpc('get_group_financial_summary', { p_group_id: id })
      if (error) throw error

      // 1. Generate Summary Rows
      const summaryHeaders = [
        'User_Split_ID',
        'User_Name',
        'Total_Amount_Paid',
        'Total_Fair_Share',
        'Net_Balance',
        'Pending_Dues_To'
      ]

      // Calculate simplified debts directly from net balances to ensure 100% accuracy (ignores old missing is_settled flags)
      const debtors = data.filter((d: any) => d.net_balance < -0.01).map((d: any) => ({ ...d, balance: Math.abs(d.net_balance) })).sort((a: any, b: any) => b.balance - a.balance)
      const creditors = data.filter((d: any) => d.net_balance > 0.01).map((d: any) => ({ ...d, balance: d.net_balance })).sort((a: any, b: any) => b.balance - a.balance)

      const duesMap: Record<string, string[]> = {}
      data.forEach((d: any) => duesMap[d.user_id] = [])

      let dIdx = 0; let cIdx = 0;
      while (dIdx < debtors.length && cIdx < creditors.length) {
        const debtor = debtors[dIdx]
        const creditor = creditors[cIdx]
        const amount = Math.min(debtor.balance, creditor.balance)

        duesMap[debtor.user_id].push(`Owes ${creditor.user_split_id} (${creditor.user_name}): ₹${amount.toFixed(2)}`)

        debtor.balance -= amount
        creditor.balance -= amount

        if (debtor.balance < 0.01) dIdx++
        if (creditor.balance < 0.01) cIdx++
      }

      const summaryRows = (data || []).map((row: any) => {
        const pendingDuesStr = duesMap[row.user_id].length > 0 ? duesMap[row.user_id].join(' | ') : 'None'
        const safeName = `"${(row.user_name || '').replace(/"/g, '""')}"`
        const safeDues = `"${pendingDuesStr.replace(/"/g, '""')}"`

        return [
          row.user_split_id || '',
          safeName,
          Number(row.total_amount_paid || 0).toFixed(2),
          Number(row.total_fair_share || 0).toFixed(2),
          Number(row.net_balance || 0).toFixed(2),
          safeDues
        ]
      })

      // 2. Generate History Rows from the `expenses` state
      const historyHeaders = ['Date', 'Expense_Title', 'Category', 'Paid_By', 'Total_Amount', 'Split_Type', 'Split_Breakdown']
      const historyRows = expenses.map(e => {
        const splitDetails = e.splits?.map(s => `${s.profile?.full_name}: ₹${s.amount}`).join(' | ') || ''
        return [
          e.date || '',
          `"${e.title?.replace(/"/g, '""') || ''}"`,
          e.category || 'other',
          e.payer?.full_name || 'Unknown',
          e.amount.toString(),
          e.split_type || 'equal',
          `"${splitDetails.replace(/"/g, '""')}"`
        ]
      })

      // 3. Combine into a single ledger document
      const csvContent = [
        'GROUP FINANCIAL SUMMARY ',
        summaryHeaders.join(','),
        ...summaryRows.map((r: any) => r.join(',')),
        '',
        'COMPLETE EXPENSE',
        historyHeaders.join(','),
        ...historyRows.map((r: any) => r.join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${group.name.replace(/\\s+/g, '_')}_financial_ledger.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Detailed ledger exported successfully!', { id: loadingToast })
    } catch (err: any) {
      console.error('Export error:', err)
      toast.error('Failed to export CSV. Please run the SQL migration (008) in Supabase.', { id: loadingToast })
    }
  }

  const isAdmin = group?.created_by === profile?.id
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  // ── Per-person breakdown for the current user ─────────────────────────
  // owesMap[personId] = { profile, amount, items[] }  → I owe them
  // owedMap[personId] = { profile, amount, items[] }  → they owe me
  type BreakdownEntry = { profile: Profile; amount: number; items: { title: string; amount: number }[] }
  const owesMap: Record<string, BreakdownEntry> = {}
  const owedMap: Record<string, BreakdownEntry> = {}

  expenses.forEach((exp) => {
    exp.splits?.forEach((split) => {
      if (split.is_settled) return
      if (exp.paid_by !== profile?.id && split.user_id === profile?.id) {
        // I owe the payer
        const pid = exp.paid_by
        if (!owesMap[pid]) owesMap[pid] = { profile: exp.payer, amount: 0, items: [] }
        owesMap[pid].amount += split.amount
        owesMap[pid].items.push({ title: exp.title, amount: split.amount })
      } else if (exp.paid_by === profile?.id && split.user_id !== profile?.id) {
        // They owe me
        const pid = split.user_id
        const memberProfile = members.find(m => m.user_id === pid)?.profile
        if (!owedMap[pid]) owedMap[pid] = { profile: memberProfile as Profile, amount: 0, items: [] }
        owedMap[pid].amount += split.amount
        owedMap[pid].items.push({ title: exp.title, amount: split.amount })
      }
    })
  })

  const totalOwes = Object.values(owesMap).reduce((s, e) => s + e.amount, 0)
  const totalOwed = Object.values(owedMap).reduce((s, e) => s + e.amount, 0)
  const netBalance = totalOwed - totalOwes

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Group" profile={profile} />
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title={group?.name || 'Group'} subtitle={`${members.length} members · ${formatCurrency(totalExpenses)} total`} profile={profile} />

      <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-8 max-w-5xl mx-auto w-full">
        {/* Quick Actions & Nav */}
        <div className="flex items-center justify-between">
          <Link href="/groups">
            <Button variant="ghost" size="sm" className="rounded-full px-4"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          </Link>
          <div className="flex gap-3">
            {isAdmin && (
              <>
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditGroupName(group?.name || '')
                  setEditGroupDesc(group?.description || '')
                  setEditGroupOpen(true)
                }} className="rounded-full px-4 hidden sm:flex text-slate-500 hover:text-slate-900 dark:hover:text-white">
                  <Edit2 className="w-4 h-4 mr-1.5" />Edit Group
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setAddMemberOpen(true)} className="rounded-full px-4 shadow-sm hidden sm:flex">
                  <Plus className="w-4 h-4 mr-1.5" />Add Member
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={exportToCSV} className="rounded-full px-4 shadow-sm hidden md:flex" disabled={expenses.length === 0}>
              <Download className="w-4 h-4 mr-1.5" />Export CSV
            </Button>
            <Link href={`/expenses?group=${id}`}>
              <Button size="sm" className="rounded-full px-5 shadow-md shadow-indigo-500/20"><Plus className="w-4 h-4 mr-1.5" />Add Expense</Button>
            </Link>
          </div>
        </div>

        {/* The Bottom Line (Hero Section) */}
        {expenses.length > 0 && (totalOwes > 0 || totalOwed > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What you owe */}
            {Object.entries(owesMap).length > 0 && (
              <div className="glass !rounded-[2rem] p-6 md:p-8 bg-gradient-to-br from-rose-50/50 to-rose-100/30 dark:from-rose-500/10 dark:to-rose-500/5 border border-rose-100 dark:border-rose-500/20 relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-rose-400/10 blur-3xl rounded-full" />
                <p className="text-rose-500 dark:text-rose-400 font-bold tracking-widest text-xs uppercase mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  You Owe
                </p>
                <div className="flex flex-col gap-4 relative z-10">
                  {Object.entries(owesMap).map(([pid, entry]) => (
                    <div key={pid} className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-2xl bg-white/60 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Avatar src={entry.profile?.avatar_url} name={entry.profile?.full_name} size="md" />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{entry.profile?.full_name}</p>
                          <p className="text-xl font-black text-rose-600 dark:text-rose-400">{formatCurrency(entry.amount)}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => settleUp(pid, entry.amount, entry.profile?.full_name || '')}
                        disabled={settling === pid}
                        className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-4 shadow-md shadow-rose-500/20 w-full xl:w-auto shrink-0"
                      >
                        {settling === pid ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        {settling === pid ? 'Settling...' : 'Settle Up'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What you are owed */}
            {Object.entries(owedMap).length > 0 && (
              <div className="glass !rounded-[2rem] p-6 md:p-8 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-500/10 dark:to-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-400/10 blur-3xl rounded-full" />
                <p className="text-emerald-600 dark:text-emerald-400 font-bold tracking-widest text-xs uppercase mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  You Are Owed
                </p>
                <div className="flex flex-col gap-4 relative z-10">
                  {Object.entries(owedMap).map(([pid, entry]) => (
                    <div key={pid} className="flex items-center justify-between p-4 rounded-2xl bg-white/60 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Avatar src={entry.profile?.avatar_url} name={entry.profile?.full_name} size="md" />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{entry.profile?.full_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Waiting for payment...</p>
                        </div>
                      </div>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(entry.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* If you neither owe nor are owed but there are pending balances among others */}
            {Object.entries(owesMap).length === 0 && Object.entries(owedMap).length === 0 && (
              <div className="glass !rounded-[2rem] p-8 md:col-span-2 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-white/5 flex items-center justify-center mb-4 shadow-sm border border-slate-100 dark:border-white/5">
                  <CheckCircle2 className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">You're all settled!</p>
                <p className="text-sm text-slate-500 mt-2">You don't owe anyone and no one owes you.<br />Others in the group still have pending balances.</p>
              </div>
            )}
          </div>
        ) : expenses.length > 0 ? (
          /* ── FRESH START VIEW ── */
          <div className="glass !rounded-[2rem] p-10 flex flex-col items-center gap-4 text-center bg-gradient-to-br from-emerald-50/30 to-teal-50/30 dark:from-emerald-500/5 dark:to-teal-500/5 border border-emerald-100/50 dark:border-emerald-500/10">
            <div className="w-20 h-20 rounded-full bg-white dark:bg-emerald-500/20 shadow-xl shadow-emerald-500/10 flex items-center justify-center mb-2 relative">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping opacity-50" />
              <PartyPopper className="w-10 h-10 text-emerald-500 relative z-10" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">All settled! Fresh start 🎉</p>
              <p className="text-base text-slate-500 mt-2">No pending payments in this group right now.</p>
            </div>
          </div>
        ) : (
          <div className="glass !rounded-[2rem] p-12 text-center flex flex-col items-center border-dashed border-2 border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white mb-2">No expenses yet</p>
            <p className="text-slate-500 max-w-sm mb-6">Add an expense to start splitting costs with your group.</p>
            <Link href={`/expenses?group=${id}`}>
              <Button className="rounded-full shadow-lg shadow-indigo-500/20 px-8 py-6 text-base hover:scale-105 transition-transform"><Plus className="w-5 h-5 mr-2" />Add First Expense</Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
          {/* Members + Balances (Left Column - 5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4" /> Group Members
              </h2>
              {isAdmin && (
                <button onClick={() => setAddMemberOpen(true)} className="text-xs font-bold text-indigo-500 sm:hidden">
                  + Add
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {members.map((member) => (
                <div key={member.id} className="group glass !rounded-2xl p-4 flex items-center gap-4 transition-all hover:bg-white/60 dark:hover:bg-white/5 relative overflow-hidden">
                  <Avatar src={member.profile?.avatar_url} name={member.profile?.full_name} size="md" className="ring-2 ring-white dark:ring-slate-900 shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{member.profile?.full_name}</p>
                      {group?.created_by === member.user_id && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{member.profile?.split_id}</p>
                  </div>
                  <div className="text-right">
                    {member.balance === 0 ? (
                      <Badge variant="muted" className="bg-slate-100 dark:bg-white/5 text-slate-500">Settled</Badge>
                    ) : member.balance > 0 ? (
                      <div className="flex flex-col items-end">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Owed</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(member.balance)}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-0.5">Owes</p>
                        <p className="text-sm font-black text-rose-600 dark:text-rose-400">{formatCurrency(Math.abs(member.balance))}</p>
                      </div>
                    )}
                  </div>
                  {isAdmin && member.user_id !== profile?.id && (
                    <button
                      onClick={() => removeMember(member.user_id)}
                      className="absolute right-0 top-0 bottom-0 px-4 bg-rose-500 text-white translate-x-full group-hover:translate-x-0 transition-transform duration-300 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Expenses (Right Column - 7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4" /> Activity
              </h2>
              {expenses.length > 0 && (
                <button
                  onClick={() => setShowAllExpenses(!showAllExpenses)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                >
                  {showAllExpenses ? 'Hide Settled' : 'View History'}
                </button>
              )}
            </div>

            {(showAllExpenses ? expenses : expenses.filter(exp => exp.splits?.some(s => s.user_id !== exp.paid_by && !s.is_settled))).length === 0 ? (
              <div className="glass !rounded-2xl p-8 text-center flex flex-col items-center">
                <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No pending expenses</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {(showAllExpenses ? expenses : expenses.filter(exp => exp.splits?.some(s => s.user_id !== exp.paid_by && !s.is_settled))).map((expense) => (
                  <Link key={expense.id} href={`/expenses/${expense.id}`}>
                    <GlassCard variant="hover" className="!p-4 cursor-pointer !rounded-2xl transition-all hover:scale-[1.01]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                          {expense.category === 'food' ? '🍕' :
                            expense.category === 'transport' ? '🚗' :
                              expense.category === 'accommodation' ? '🏠' :
                                expense.category === 'entertainment' ? '🎬' :
                                  expense.category === 'utilities' ? '💡' : '💳'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base truncate">{expense.title}</p>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <Avatar src={expense.payer?.avatar_url} name={expense.payer?.full_name} size="xs" className="w-4 h-4" />
                            <span className="truncate">Paid by {expense.paid_by === profile?.id ? 'you' : expense.payer?.full_name}</span>
                            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                            <span className="hidden sm:inline">{formatRelativeDate(expense.date)}</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end justify-center">
                          <p className="font-black text-slate-900 dark:text-white text-base">{formatCurrency(expense.amount)}</p>
                          <Badge variant={expense.split_type === 'equal' ? 'default' : 'info'} className="text-[9px] mt-1 uppercase tracking-widest font-bold">
                            {expense.split_type}
                          </Badge>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={addMemberOpen} onClose={() => setAddMemberOpen(false)} title="Add Member" size="sm">
        <div className="flex flex-col gap-4">
          <Input
            label="Split ID"
            placeholder="SPL-XXXXXX"
            value={newMemberSplitId}
            onChange={(e) => setNewMemberSplitId(e.target.value.toUpperCase())}
            className="font-mono"
          />
          <Button fullWidth onClick={addMember} loading={addingMember}>Add Member</Button>
        </div>
      </Modal>

      <Modal isOpen={editGroupOpen} onClose={() => setEditGroupOpen(false)} title="Edit Group" size="sm">
        <div className="flex flex-col gap-4">
          <Input
            label="Group Name"
            placeholder="Trip to Paris"
            value={editGroupName}
            onChange={(e) => setEditGroupName(e.target.value)}
          />
          <Input
            label="Description (Optional)"
            placeholder="Summer 2024"
            value={editGroupDesc}
            onChange={(e) => setEditGroupDesc(e.target.value)}
          />
          <Button fullWidth onClick={updateGroup} loading={updatingGroup}>Save Changes</Button>
        </div>
      </Modal>
    </div>
  )
}
