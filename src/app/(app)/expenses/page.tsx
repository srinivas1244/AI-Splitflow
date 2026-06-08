'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Input, TextArea } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatRelativeDate } from '@/lib/utils'
import { Plus, Receipt, Upload, X, Paperclip, Equal, Sliders, Tag, Users, CheckCircle2, Sparkles, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile, Expense, ExpenseSplit, Group, GroupMember, ExpenseAttachment } from '@/types'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ScrollReveal } from '@/components/ui/ScrollReveal'

interface ExpenseWithDetails extends Expense {
  payer: Profile
  splits: (ExpenseSplit & { profile: Profile })[]
  attachments?: ExpenseAttachment[]
}

interface SplitEntry {
  user: Profile
  amount: number
}

interface GroupWithMembers extends Group {
  members?: (GroupMember & { profile: Profile })[]
}

export default function ExpensesPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const preselectedGroup = searchParams.get('group')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([])
  const [friends, setFriends] = useState<Profile[]>([])
  const [groups, setGroups] = useState<GroupWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'percentage' | 'shares' | 'itemized'>('equal')
  const [category, setCategory] = useState('other')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [groupId, setGroupId] = useState(preselectedGroup || '')
  
  // Conversational AI pre-fill
  const createParam = searchParams.get('create')
  const titleParam = searchParams.get('title')
  const amountParam = searchParams.get('amount')
  const categoryParam = searchParams.get('category')
  const [splitEntries, setSplitEntries] = useState<SplitEntry[]>([])
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [percentageAmounts, setPercentageAmounts] = useState<Record<string, string>>({})
  const [shareAmounts, setShareAmounts] = useState<Record<string, string>>({})
  const [itemizedItems, setItemizedItems] = useState<Array<{id: string, name: string, amount: string, assigned_to: string}>>([])
  const [attachments, setAttachments] = useState<File[]>([])
  const [creating, setCreating] = useState(false)
  const [scanning, setScanning] = useState(false)

  // Derived available users based on selected group
  const selectedGroup = groups.find(g => g.id === groupId)
  const availableToSplitWith = selectedGroup 
    ? (selectedGroup.members?.map(m => m.profile).filter(p => p.id !== profile?.id) || [])
    : friends

  const availablePayers = profile 
    ? [{ id: profile.id, full_name: 'You', avatar_url: profile.avatar_url } as Profile] 
    : []

  useEffect(() => { loadData() }, [])

  // Auto-populate split entries when a group is selected
  useEffect(() => {
    if (groupId && groups.length > 0 && profile) {
      const g = groups.find(g => g.id === groupId)
      if (g && g.members) {
        const otherMembers = g.members.map(m => m.profile).filter(p => p.id !== profile.id)
        
        // Auto-select all other group members by default
        setSplitEntries(otherMembers.map(user => ({ user, amount: 0 })))
        
        // Ensure paidBy is a valid group member, else default to self
        if (!g.members.find(m => m.profile.id === paidBy)) {
          setPaidBy(profile.id)
        }
      }
    } else if (!groupId) {
      // If group is cleared, clear splits
      setSplitEntries([])
      if (profile) setPaidBy(profile.id)
    }
  }, [groupId, groups, profile])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    setPaidBy(user.id)

    // My expenses (as payer or split member)
    const { data: splitData } = await supabase
      .from('expense_splits')
      .select('expense_id')
      .eq('user_id', user.id)
      
    const splitIds = splitData?.map(s => s.expense_id) || []
    
    let query = supabase
      .from('expenses')
      .select('*, payer:profiles!expenses_paid_by_fkey(*), splits:expense_splits(*, profile:profiles(*)), attachments:expense_attachments(*)')
      .order('date', { ascending: false })
      
    if (splitIds.length > 0) {
      query = query.or(`paid_by.eq.${user.id},created_by.eq.${user.id},id.in.(${splitIds.join(',')})`)
    } else {
      query = query.or(`paid_by.eq.${user.id},created_by.eq.${user.id}`)
    }
    
    const { data: myExpenses } = await query

    setExpenses(myExpenses || [])

    // Friends for split
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const friendProfiles: Profile[] = (friendships || []).map((f: any) => {
      return f.requester?.id === user.id ? f.addressee : f.requester
    }).filter(Boolean)
    setFriends(friendProfiles)

    // My groups
    const { data: gMem } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
    const gIds = (gMem || []).map((g: { group_id: string }) => g.group_id)
    if (gIds.length > 0) {
      const { data: gs } = await supabase.from('groups').select('*, members:group_members(*, profile:profiles(*))').in('id', gIds)
      setGroups(gs || [])
    }

    setLoading(false)
  }

  // Handle conversational AI pre-fill
  useEffect(() => {
    if (createParam === 'true') {
      if (titleParam) setTitle(titleParam)
      if (amountParam) setAmount(amountParam)
      if (categoryParam) setCategory(categoryParam)
      setCreateOpen(true)
      
      // Clean URL
      window.history.replaceState({}, '', '/expenses')
    }
  }, [createParam, titleParam, amountParam, categoryParam])

  function toggleSplitMember(friend: Profile) {
    const exists = splitEntries.find((e) => e.user.id === friend.id)
    if (exists) {
      setSplitEntries(splitEntries.filter((e) => e.user.id !== friend.id))
    } else {
      setSplitEntries([...splitEntries, { user: friend, amount: 0 }])
    }
  }

  function getEqualSplit(): number {
    const total = parseFloat(amount) || 0
    const count = splitEntries.length + 1 // +1 for payer
    return count > 0 ? total / count : 0
  }

  async function createExpense() {
    if (!title.trim() || !amount || !paidBy || !profile) return

    setCreating(true)
    const totalAmount = parseFloat(amount)

    // Validate amounts based on split type
    if (splitType === 'custom') {
      const sum = Object.values(customAmounts).reduce((a, b) => a + parseFloat(b || '0'), 0)
      if (Math.abs(sum - totalAmount) > 0.01) {
        toast.error(`Custom amounts must sum to ${formatCurrency(totalAmount)}`)
        setCreating(false)
        return
      }
    } else if (splitType === 'percentage') {
      const sum = Object.values(percentageAmounts).reduce((a, b) => a + parseFloat(b || '0'), 0)
      if (Math.abs(sum - 100) > 0.01) {
        toast.error(`Percentages must sum to 100%`)
        setCreating(false)
        return
      }
    } else if (splitType === 'shares') {
      const sum = Object.values(shareAmounts).reduce((a, b) => a + parseInt(b || '0', 10), 0)
      if (sum <= 0) {
        toast.error(`Total shares must be greater than 0`)
        setCreating(false)
        return
      }
    } else if (splitType === 'itemized') {
      const sum = itemizedItems.reduce((a, b) => a + parseFloat(b.amount || '0'), 0)
      if (Math.abs(sum - totalAmount) > 0.01) {
        toast.error(`Itemized amounts must sum to ${formatCurrency(totalAmount)}`)
        setCreating(false)
        return
      }
      if (itemizedItems.some(i => !i.assigned_to)) {
        toast.error(`All items must be assigned to someone`)
        setCreating(false)
        return
      }
    }

    const baseExpenseData = {
      title: title.trim(),
      description: description.trim() || null,
      amount: totalAmount,
      paid_by: paidBy,
      group_id: groupId || null,
      created_by: profile.id,
    }

    // Try full schema first
    let { data: expense, error } = await supabase
      .from('expenses')
      .insert({ ...baseExpenseData, split_type: splitType, category: category, date: date })
      .select()
      .single()

    // Fallback if columns don't exist
    if (error && error.message && error.message.toLowerCase().includes('column')) {
      // Try without category and split_type
      const res2 = await supabase
        .from('expenses')
        .insert({ ...baseExpenseData, date: date })
        .select()
        .single()
      expense = res2.data
      error = res2.error

      if (error && error.message && error.message.toLowerCase().includes('column')) {
        // Try with expense_date
        const res3 = await supabase
          .from('expenses')
          .insert({ ...baseExpenseData, expense_date: date })
          .select()
          .single()
        expense = res3.data
        error = res3.error
      }
    }

    if (error || !expense) {
      toast.error(error?.message || 'Failed to create expense')
      console.error('Expense Insert Error:', error)
      setCreating(false)
      return
    }

    // Calculate user amounts
    let userAmounts: Record<string, number> = {}
    const participants = [paidBy, ...splitEntries.map(e => e.user.id)]

    if (splitType === 'equal') {
      const equalAmount = getEqualSplit()
      participants.forEach(id => userAmounts[id] = equalAmount)
    } else if (splitType === 'custom') {
      participants.forEach(id => userAmounts[id] = parseFloat(customAmounts[id] || '0'))
    } else if (splitType === 'percentage') {
      participants.forEach(id => {
        const pct = parseFloat(percentageAmounts[id] || '0')
        userAmounts[id] = (pct / 100) * totalAmount
      })
    } else if (splitType === 'shares') {
      const totalShares = Object.values(shareAmounts).reduce((a, b) => a + parseInt(b || '0', 10), 0)
      participants.forEach(id => {
        const shares = parseInt(shareAmounts[id] || '0', 10)
        userAmounts[id] = totalShares > 0 ? (shares / totalShares) * totalAmount : 0
      })
    } else if (splitType === 'itemized') {
      participants.forEach(id => userAmounts[id] = 0)
      itemizedItems.forEach(item => {
        if (item.assigned_to) {
           userAmounts[item.assigned_to] += parseFloat(item.amount || '0')
        }
      })
    }

    // Create splits
    const splits = participants.map(userId => ({
        expense_id: expense.id,
        user_id: userId,
        amount: userAmounts[userId] || 0,
    })).filter(s => s.amount > 0 || s.user_id === paidBy) // ensure payer is always included

    await supabase.from('expense_splits').insert(splits)

    // Create itemized records if applicable
    if (splitType === 'itemized' && itemizedItems.length > 0) {
      await supabase.from('expense_items').insert(
        itemizedItems.map(item => ({
          expense_id: expense.id,
          name: item.name,
          amount: parseFloat(item.amount || '0'),
          assigned_to: item.assigned_to
        }))
      )
    }

    // Upload attachments
    for (const file of attachments) {
      const path = `${profile.id}/${expense.id}/${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('expense-attachments')
        .upload(path, file)
      if (!uploadError) {
        await supabase.from('expense_attachments').insert({
          expense_id: expense.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: path,
          uploaded_by: profile.id,
        })
      }
    }

    toast.success('Expense created!')
    setCreateOpen(false)
    resetForm()
    loadData()
    setCreating(false)
  }

  async function handleScanReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    const formData = new FormData()
    formData.append('receipt', file)

    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to scan receipt')
      
      const parsed = data.data
      
      // Auto-fill form
      setAmount(parsed.total?.toString() || '')
      if (parsed.category && categoryOptions.some(c => c.value === parsed.category.toLowerCase())) {
        setCategory(parsed.category.toLowerCase())
      }
      
      // Switch to itemized
      if (parsed.items && parsed.items.length > 0) {
        setSplitType('itemized')
        setItemizedItems(parsed.items.map((item: any) => ({
          id: crypto.randomUUID(),
          name: item.name || '',
          amount: item.amount?.toString() || '',
          assigned_to: ''
        })))
        toast.success(`Scanned ${parsed.items.length} items! Please assign them.`)
      } else {
        toast.success('Scanned receipt total!')
      }

    } catch (err: any) {
      toast.error(err.message || 'Error scanning receipt')
    } finally {
      setScanning(false)
    }
  }

  function resetForm() {
    setTitle(''); setDescription(''); setAmount(''); setSplitType('equal')
    setCategory('other'); setDate(new Date().toISOString().split('T')[0])
    setGroupId(preselectedGroup || ''); setSplitEntries([]); 
    setCustomAmounts({}); setPercentageAmounts({}); setShareAmounts({}); setItemizedItems([]);
    setAttachments([])
  }

  const categoryOptions = [
    { value: 'food', label: '🍕 Food & Drink' },
    { value: 'transport', label: '🚗 Transport' },
    { value: 'accommodation', label: '🏠 Accommodation' },
    { value: 'entertainment', label: '🎬 Entertainment' },
    { value: 'utilities', label: '💡 Utilities' },
    { value: 'other', label: '💳 Other' },
  ]

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Expenses" profile={profile} />
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      </div>
    )
  }

  const activeExpenses = expenses.filter(exp => {
    const otherSplits = exp.splits?.filter(s => s.user_id !== exp.paid_by) || []
    if (otherSplits.length === 0) return true // Keep personal expenses
    return otherSplits.some(s => !s.is_settled) // Keep if there's any unsettled split
  })

  return (
    <div className="flex flex-col">
      <Header title="Expenses" subtitle={`${activeExpenses.length} expense${activeExpenses.length !== 1 ? 's' : ''}`} profile={profile} />

      <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between animate-fade-in-delay-1">
           <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Recent Activity</h2>
          <Button onClick={() => setCreateOpen(true)} className="rounded-full shadow-md shadow-indigo-500/20 px-6">
            <Plus className="w-4 h-4 mr-2" />Add Expense
          </Button>
        </div>

        {activeExpenses.length === 0 ? (
          <div className="glass !rounded-[2rem] p-12 text-center flex flex-col items-center border-dashed border-2 border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 animate-fade-in">
             <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-6 shadow-sm border border-indigo-100 dark:border-indigo-500/20">
               <Receipt className="w-10 h-10 text-indigo-500" />
             </div>
             <p className="text-2xl font-black text-slate-900 dark:text-white mb-2">No pending expenses</p>
             <p className="text-slate-500 max-w-sm mb-8 text-sm">Add your first expense to start tracking and splitting costs with your friends.</p>
             <Button onClick={() => setCreateOpen(true)} className="rounded-full shadow-lg shadow-indigo-500/20 px-8 py-6 text-base hover:scale-105 transition-transform"><Plus className="w-5 h-5 mr-2" />Create First Expense</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activeExpenses.map((expense) => {
              const iPaid = expense.payer?.id === profile?.id
              const mySplit = expense.splits?.find(s => s.user_id === profile?.id)
              
              let displayAmount = 0
              let displayLabel = ''
              
              if (iPaid) {
                const othersUnsettled = expense.splits?.filter(s => s.user_id !== profile?.id && !s.is_settled) || []
                displayAmount = othersUnsettled.reduce((sum, s) => sum + s.amount, 0)
                displayLabel = 'You are owed'
              } else {
                if (mySplit && !mySplit.is_settled) {
                  displayAmount = mySplit.amount
                  displayLabel = 'You owe'
                } else {
                  displayLabel = 'Settled'
                  displayAmount = 0
                }
              }

              const isPersonal = expense.splits?.filter(s => s.user_id !== expense.paid_by).length === 0
              if (isPersonal) {
                displayLabel = 'Personal'
                displayAmount = expense.amount
              }

              const isOwed = displayLabel === 'You are owed' || displayLabel === 'Personal' || displayLabel === 'Settled'

              return (
              <ScrollReveal key={expense.id} animationClass="animate-fade-in">
              <Link href={`/expenses/${expense.id}`}>
                <GlassCard variant="hover" className="!p-5 cursor-pointer group !rounded-3xl transition-all hover:scale-[1.01] hover:bg-white/60 dark:hover:bg-white/5 relative overflow-hidden">
                  <div className="flex items-start md:items-center flex-col md:flex-row gap-4 mb-4">
                    <div className="flex items-center gap-4 flex-1 w-full">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-md">
                        {expense.category === 'food' ? '🍕' :
                         expense.category === 'transport' ? '🚗' :
                         expense.category === 'accommodation' ? '🏠' :
                         expense.category === 'entertainment' ? '🎬' :
                         expense.category === 'utilities' ? '💡' : '💳'
                         }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate text-lg md:text-xl">{expense.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar src={expense.payer?.avatar_url} name={expense.payer?.full_name} size="xs" className="w-5 h-5 ring-2 ring-white dark:ring-slate-900" />
                          <p className="text-sm text-slate-500 font-medium truncate flex items-center gap-1.5">
                            <span className="text-slate-700 dark:text-slate-300 font-bold">{expense.payer?.id === profile?.id ? 'You' : expense.payer?.full_name}</span> paid
                            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                            <span className="hidden sm:inline">{formatRelativeDate(expense.date)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-white/10 mt-2 md:mt-0">
                      {expense.attachments && expense.attachments.length > 0 && (
                        <Badge variant="muted" className="text-[10px] hidden md:flex">
                          <Paperclip className="w-2.5 h-2.5 mr-1" /> Attached
                        </Badge>
                      )}
                      <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${isOwed ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-rose-50/50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20'}`}>
                        <div className="flex flex-col items-start md:items-end">
                           <span className={`text-[10px] font-bold uppercase tracking-widest ${isOwed ? 'text-emerald-500' : 'text-rose-500'}`}>{displayLabel}</span>
                           <span className={`text-base md:text-lg font-black ${isOwed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatCurrency(displayAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {expense.splits && expense.splits.length > 0 && (
                    <div className="flex items-center justify-between mt-4 p-3 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-1">
                        <div className="flex -space-x-2">
                          {expense.splits.slice(0, 5).map((s) => (
                            <Avatar key={s.id} src={s.profile?.avatar_url} name={s.profile?.full_name} size="xs" className="ring-2 ring-white dark:ring-slate-900 shadow-sm" />
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 font-medium ml-3 flex items-center gap-1.5">
                           Split <Badge variant={expense.split_type === 'equal' ? 'default' : 'info'} className="text-[9px] uppercase tracking-wider px-1.5 py-0">{expense.split_type}</Badge> among {expense.splits.length} people
                        </p>
                      </div>
                    </div>
                  )}
                </GlassCard>
              </Link>
            </ScrollReveal>
            )})}
          </div>
        )}
      </div>

      {/* Create Expense Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); resetForm() }}
        title="Add New Expense"
        size="lg"
      >
        <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-2 scrollbar-thin">
          
          {/* AI Scan Receipt */}
          <div className="glass !rounded-3xl p-5 bg-gradient-to-br from-indigo-50/50 to-white/30 dark:from-indigo-500/10 dark:to-white/5 border-indigo-100 dark:border-indigo-500/20 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-indigo-700 dark:text-indigo-300 text-sm flex items-center gap-2"><Sparkles className="w-4 h-4"/> AI Receipt Scanner</h3>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-0.5">Upload a photo to auto-fill items and totals</p>
            </div>
            <label className="relative cursor-pointer">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanReceipt} disabled={scanning} />
              <div className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 ${scanning ? 'bg-indigo-200 text-indigo-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 hover:scale-[1.02]'}`}>
                {scanning ? <Spinner size="sm" /> : <Receipt className="w-4 h-4" />}
                {scanning ? 'Scanning...' : 'Scan Receipt'}
              </div>
            </label>
          </div>

          {/* Basic Info */}
          <div className="flex flex-col gap-4 glass !rounded-3xl p-5 bg-white/40 dark:bg-white/5 border-slate-100 dark:border-white/10 shadow-sm">
            <Input label="Title" placeholder="Dinner at the restaurant" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Amount (USD)" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <TextArea label="Description (optional)" placeholder="Any notes about this expense..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          {/* Category */}
          <div className="glass !rounded-3xl p-5 bg-white/40 dark:bg-white/5 border-slate-100 dark:border-white/10 shadow-sm">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Tag className="w-4 h-4"/> Category</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categoryOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`p-3 rounded-2xl text-sm font-bold text-left transition-all ${category === opt.value ? 'bg-indigo-50 dark:bg-indigo-500/20 border-2 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-md shadow-indigo-500/20 scale-[1.02]' : 'bg-white dark:bg-black/20 border-2 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Group */}
          {groups.length > 0 && (
            <div className="glass !rounded-3xl p-5 bg-white/40 dark:bg-white/5 border-slate-100 dark:border-white/10 shadow-sm">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Users className="w-4 h-4"/> Group (optional)</label>
              <select
                className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold bg-white dark:bg-black/20 border-2 border-transparent text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all shadow-sm cursor-pointer appearance-none"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                <option value="">No group — personal expense</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          {/* Paid By */}
          <div className="glass !rounded-3xl p-5 bg-white/40 dark:bg-white/5 border-slate-100 dark:border-white/10 shadow-sm">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Paid By</label>
            <div className="flex flex-wrap gap-2">
              {availablePayers.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPaidBy(f.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${paidBy === f.id ? 'bg-indigo-50 dark:bg-indigo-500/20 border-2 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-md shadow-indigo-500/20 scale-[1.02]' : 'bg-white dark:bg-black/20 border-2 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10'}`}
                >
                  <Avatar src={f.avatar_url} name={f.id === profile?.id ? 'You' : f.full_name} size="sm" className="ring-2 ring-white dark:ring-black/20" />
                  {f.id === profile?.id ? 'You' : f.full_name}
                </button>
              ))}
            </div>
          </div>

          {/* Split With */}
          <div className="glass !rounded-3xl p-5 bg-white/40 dark:bg-white/5 border-slate-100 dark:border-white/10 shadow-sm">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Users className="w-4 h-4"/> Split With</label>
            <div className="flex flex-wrap gap-2 mb-6">
              {availableToSplitWith.length === 0 ? (
                <p className="text-sm font-medium text-slate-500 py-2">No friends to split with.</p>
              ) : availableToSplitWith.map((f) => {
                const isSelected = splitEntries.find((e) => e.user.id === f.id)
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleSplitMember(f)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${isSelected ? 'bg-emerald-50 dark:bg-emerald-500/20 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-md shadow-emerald-500/20 scale-[1.02]' : 'bg-white dark:bg-black/20 border-2 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10'}`}
                  >
                    <Avatar src={f.avatar_url} name={f.full_name} size="sm" className="ring-2 ring-white dark:ring-black/20" />
                    {f.full_name}
                  </button>
                )
              })}
            </div>

            {/* Split Type Toggle */}
            {splitEntries.length > 0 && (
              <div className="bg-white/60 dark:bg-black/20 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
                <div className="flex gap-2 mb-4 bg-slate-50 dark:bg-black/40 p-1.5 rounded-xl flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSplitType('equal')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${splitType === 'equal' ? 'bg-white dark:bg-indigo-500 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    <Equal className="w-4 h-4" />Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('custom')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${splitType === 'custom' ? 'bg-white dark:bg-violet-500 text-violet-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    <Sliders className="w-4 h-4" />Custom
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('percentage')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${splitType === 'percentage' ? 'bg-white dark:bg-amber-500 text-amber-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('shares')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${splitType === 'shares' ? 'bg-white dark:bg-emerald-500 text-emerald-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Shares
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('itemized')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${splitType === 'itemized' ? 'bg-white dark:bg-rose-500 text-rose-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    <Receipt className="w-4 h-4" />Itemized
                  </button>
                </div>

                {splitType === 'equal' && amount && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Each person pays</span>
                    <span className="text-lg font-black text-indigo-700 dark:text-indigo-400">{formatCurrency(getEqualSplit())} <span className="text-xs font-medium opacity-70 block text-right">({splitEntries.length + 1} people)</span></span>
                  </div>
                )}

                {splitType === 'custom' && (
                  <div className="flex flex-col gap-3">
                    {[{ id: profile?.id || '', full_name: 'You', avatar_url: profile?.avatar_url } as Profile, ...splitEntries.map((e) => e.user)].map((u) => (
                      <div key={u.id} className="flex items-center gap-4 p-2">
                        <Avatar src={u.avatar_url} name={u.full_name} size="sm" className="ring-2 ring-white dark:ring-black/20" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex-1">{u.id === profile?.id ? 'You' : u.full_name}</span>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                           <input
                             type="number"
                             placeholder="0.00"
                             value={customAmounts[u.id] || ''}
                             onChange={(e) => setCustomAmounts({ ...customAmounts, [u.id]: e.target.value })}
                             className="w-32 text-right pl-8 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-violet-500 focus:bg-white dark:focus:bg-black/40 text-slate-900 dark:text-white font-black outline-none transition-all"
                           />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {splitType === 'percentage' && (
                  <div className="flex flex-col gap-3">
                    {[{ id: profile?.id || '', full_name: 'You', avatar_url: profile?.avatar_url } as Profile, ...splitEntries.map((e) => e.user)].map((u) => (
                      <div key={u.id} className="flex items-center gap-4 p-2">
                        <Avatar src={u.avatar_url} name={u.full_name} size="sm" className="ring-2 ring-white dark:ring-black/20" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex-1">{u.id === profile?.id ? 'You' : u.full_name}</span>
                        <div className="relative">
                           <input
                             type="number"
                             placeholder="0"
                             value={percentageAmounts[u.id] || ''}
                             onChange={(e) => setPercentageAmounts({ ...percentageAmounts, [u.id]: e.target.value })}
                             className="w-24 text-right pr-8 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-amber-500 focus:bg-white dark:focus:bg-black/40 text-slate-900 dark:text-white font-black outline-none transition-all"
                           />
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {splitType === 'shares' && (
                  <div className="flex flex-col gap-3">
                    {[{ id: profile?.id || '', full_name: 'You', avatar_url: profile?.avatar_url } as Profile, ...splitEntries.map((e) => e.user)].map((u) => (
                      <div key={u.id} className="flex items-center gap-4 p-2">
                        <Avatar src={u.avatar_url} name={u.full_name} size="sm" className="ring-2 ring-white dark:ring-black/20" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex-1">{u.id === profile?.id ? 'You' : u.full_name}</span>
                        <input
                          type="number"
                          placeholder="1"
                          value={shareAmounts[u.id] || ''}
                          onChange={(e) => setShareAmounts({ ...shareAmounts, [u.id]: e.target.value })}
                          className="w-24 text-center py-2 rounded-xl bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-black/40 text-slate-900 dark:text-white font-black outline-none transition-all"
                        />
                        <span className="text-xs font-bold text-slate-400">shares</span>
                      </div>
                    ))}
                  </div>
                )}

                {splitType === 'itemized' && (
                  <div className="flex flex-col gap-3">
                    {itemizedItems.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => {
                             const newItems = [...itemizedItems];
                             newItems[idx].name = e.target.value;
                             setItemizedItems(newItems);
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-rose-500"
                        />
                        <input
                          type="number"
                          placeholder="0.00"
                          value={item.amount}
                          onChange={(e) => {
                             const newItems = [...itemizedItems];
                             newItems[idx].amount = e.target.value;
                             setItemizedItems(newItems);
                          }}
                          className="w-24 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-rose-500 text-right"
                        />
                        <select
                          value={item.assigned_to || ''}
                          onChange={(e) => {
                             const newItems = [...itemizedItems];
                             newItems[idx].assigned_to = e.target.value;
                             setItemizedItems(newItems);
                          }}
                          className="w-32 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm outline-none focus:border-rose-500"
                        >
                          <option value="">Assign to...</option>
                          <option value={profile?.id}>You</option>
                          {splitEntries.map((e) => (
                            <option key={e.user.id} value={e.user.id}>{e.user.full_name}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => setItemizedItems(itemizedItems.filter((_, i) => i !== idx))} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setItemizedItems([...itemizedItems, { id: crypto.randomUUID(), name: '', amount: '', assigned_to: '' }])} className="text-sm font-bold text-rose-500 self-start mt-2">+ Add Item</button>
                  </div>
                )}

              </div>
            )}
          </div>

          <Button
            fullWidth
            size="lg"
            onClick={createExpense}
            loading={creating}
            disabled={!title.trim() || !amount}
            className="rounded-2xl py-6 text-base shadow-xl shadow-indigo-500/20 mt-2"
          >
            Create Expense
          </Button>
        </div>
      </Modal>
    </div>
  )
}
