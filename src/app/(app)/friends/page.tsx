'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { formatCurrency } from '@/lib/utils'
import {
  Search,
  UserPlus,
  Check,
  X,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'

interface FriendWithBalance {
  profile: Profile
  friendship: any
  balance: number // positive = they owe me, negative = I owe them
}

interface IncomingRequest {
  friendship: any
  requester: Profile
}

export default function FriendsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [friends, setFriends] = useState<FriendWithBalance[]>([])
  const [incoming, setIncoming] = useState<IncomingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<Profile | null>(null)
  const [searching, setSearching] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)

    // Load accepted friends
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const friendList: FriendWithBalance[] = (friendships || []).map((f: any) => {
      const friendProfile = f.requester_id === user.id ? f.addressee : f.requester
      return { profile: friendProfile as Profile, friendship: f, balance: 0 }
    })
    setFriends(friendList)

    // Load incoming pending requests
    const { data: pending } = await supabase
      .from('friendships')
      .select('*, requester:profiles!friendships_requester_id_fkey(*)')
      .eq('addressee_id', user.id)
      .eq('status', 'pending')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setIncoming((pending || []).map((f: any) => ({
      friendship: f,
      requester: f.requester as Profile,
    })))

    setLoading(false)
  }

  async function searchBySpitId() {
    if (!searchId.trim()) return
    setSearching(true)
    setSearchResult(null)

    const { data: found } = await supabase
      .from('profiles')
      .select('*')
      .eq('split_id', searchId.trim().toUpperCase())
      .single()

    if (found) {
      // Check if already friends or request sent
      setSearchResult(found)
    } else {
      toast.error('No user found with that Split ID')
    }
    setSearching(false)
  }

  async function sendRequest() {
    if (!searchResult || !profile) return
    if (searchResult.id === profile.id) {
      toast.error("You can't add yourself!")
      return
    }
    setSending(true)
    const { error } = await supabase.from('friendships').insert({
      requester_id: profile.id,
      addressee_id: searchResult.id,
      status: 'pending',
    })
    if (error) {
      toast.error(error.message.includes('unique') ? 'Friend request already sent' : error.message)
    } else {
      toast.success(`Friend request sent to ${searchResult.full_name}!`)
      setAddModalOpen(false)
      setSearchId('')
      setSearchResult(null)
    }
    setSending(false)
  }

  async function handleRequest(friendshipId: string, action: 'accepted' | 'rejected') {
    const { error } = await supabase
      .from('friendships')
      .update({ status: action })
      .eq('id', friendshipId)

    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(action === 'accepted' ? 'Friend request accepted!' : 'Request declined')
    loadData()
  }

  async function removeFriend(friendshipId: string) {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
    if (!error) {
      toast.success('Friend removed')
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Friends" profile={profile} />
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Friends"
        subtitle={`${friends.length} friend${friends.length !== 1 ? 's' : ''}`}
        profile={profile}
      />

      <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between animate-fade-in-delay-1">
           <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Your Network</h2>
          <Button onClick={() => setAddModalOpen(true)} className="rounded-full shadow-md shadow-indigo-500/20 px-6">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Friend
          </Button>
        </div>

        {/* Incoming Requests */}
        {incoming.length > 0 && (
          <div className="animate-fade-in-delay-2">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Requests ({incoming.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incoming.map(({ friendship, requester }) => (
                <GlassCard key={friendship.id} className="!p-5 !rounded-3xl border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5">
                  <div className="flex items-center gap-4">
                    <Avatar src={requester.avatar_url} name={requester.full_name} size="md" className="ring-4 ring-indigo-50 dark:ring-indigo-500/10 shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-lg truncate">{requester.full_name}</p>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Wants to connect</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRequest(friendship.id, 'accepted')}
                        className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/20"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRequest(friendship.id, 'rejected')}
                        className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Friends
          </h2>
          {friends.length === 0 ? (
            <div className="glass !rounded-[2rem] p-12 text-center flex flex-col items-center border-dashed border-2 border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 animate-fade-in">
               <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-6 shadow-sm border border-indigo-100 dark:border-indigo-500/20">
                 <Users className="w-10 h-10 text-indigo-500" />
               </div>
               <p className="text-2xl font-black text-slate-900 dark:text-white mb-2">Build your network</p>
               <p className="text-slate-500 max-w-sm mb-8 text-sm">Add friends using their Split ID to start splitting expenses easily.</p>
               <Button onClick={() => setAddModalOpen(true)} className="rounded-full shadow-lg shadow-indigo-500/20 px-8 py-6 text-base hover:scale-105 transition-transform"><UserPlus className="w-5 h-5 mr-2" />Add Your First Friend</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map(({ profile: fp, friendship, balance }) => (
                <ScrollReveal key={friendship.id} animationClass="animate-fade-in">
                <GlassCard variant="hover" className="!p-5 border-transparent shadow-sm !rounded-3xl group transition-all hover:scale-[1.02] hover:bg-white/60 dark:hover:bg-white/5 relative overflow-hidden flex flex-col h-full">
                  <div className="flex items-start gap-4 mb-6">
                    <Avatar src={fp.avatar_url} name={fp.full_name} size="lg" className="ring-2 ring-white dark:ring-slate-900 shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-lg truncate">{fp.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono font-bold tracking-widest uppercase bg-slate-100 dark:bg-white/5 inline-block px-2 py-0.5 rounded mt-1">{fp.split_id}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    {balance === 0 ? (
                      <div className="flex items-center justify-between px-4 py-3 rounded-2xl w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Settled up</span>
                        <Check className="w-4 h-4 text-slate-400" />
                      </div>
                    ) : balance > 0 ? (
                      <div className="flex items-center justify-between px-4 py-3 rounded-2xl w-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Owes you</span>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(balance)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-4 py-3 rounded-2xl w-full bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">You owe</span>
                        <span className="text-lg font-black text-rose-600 dark:text-rose-400">{formatCurrency(Math.abs(balance))}</span>
                      </div>
                    )}
                  </div>

                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => removeFriend(friendship.id)} className="p-2 rounded-xl bg-white dark:bg-[#242424] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shadow-sm border border-slate-100 dark:border-white/10">
                      <Minus className="w-3 h-3" />
                    </button>
                  </div>
                </GlassCard>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Friend Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); setSearchId(''); setSearchResult(null) }}
        title="Add Friend"
        description="Enter their Split ID to send a friend request"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="SPL-XXXXXX"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.toUpperCase())}
              className="font-mono"
              onKeyDown={(e) => e.key === 'Enter' && searchBySpitId()}
            />
            <Button onClick={searchBySpitId} loading={searching}>
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {searchResult && (
            <GlassCard variant="sm" className="!p-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar src={searchResult.avatar_url} name={searchResult.full_name} size="md" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{searchResult.full_name}</p>
                  <p className="text-xs text-slate-500 font-mono">{searchResult.split_id}</p>
                </div>
              </div>
              <Button fullWidth onClick={sendRequest} loading={sending}>
                <UserPlus className="w-4 h-4" />
                Send Friend Request
              </Button>
            </GlassCard>
          )}
        </div>
      </Modal>
    </div>
  )
}
