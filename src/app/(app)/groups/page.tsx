'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Users, Plus, Search, X, Crown, Trash2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile, Group, GroupMember } from '@/types'
import Link from 'next/link'
import { ScrollReveal } from '@/components/ui/ScrollReveal'

interface GroupWithMembers extends Group {
  members: (GroupMember & { profile: Profile })[]
}

export default function GroupsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [groups, setGroups] = useState<GroupWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [splitIdInput, setSplitIdInput] = useState('')
  const [memberSearchResults, setMemberSearchResults] = useState<Profile[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)

    const groupIds = (memberships || []).map((m: { group_id: string }) => m.group_id)
    if (groupIds.length === 0) { setGroups([]); setLoading(false); return }

    const { data: groupData } = await supabase
      .from('groups')
      .select('*, members:group_members(*, profile:profiles(*))')
      .in('id', groupIds)

    setGroups(groupData || [])
    setLoading(false)
  }

  async function addMemberBySpitId() {
    if (!splitIdInput.trim()) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('split_id', splitIdInput.trim().toUpperCase())
      .single()
    if (data) {
      if (!memberIds.includes(data.id)) {
        setMemberIds([...memberIds, data.id])
        setMemberSearchResults([...memberSearchResults, data])
        setSplitIdInput('')
        toast.success(`Added ${data.full_name}`)
      } else {
        toast.error('Already added')
      }
    } else {
      toast.error('User not found')
    }
  }

  async function createGroup() {
    if (!name.trim() || !profile) return
    setCreating(true)

    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name: name.trim(), description: description.trim() || null, created_by: profile.id })
      .select()
      .single()

    if (error || !group) {
      toast.error('Failed to create group')
      setCreating(false)
      return
    }

    // Add creator as admin
    const members = [
      { group_id: group.id, user_id: profile.id, role: 'admin' },
      ...memberIds.map((id) => ({ group_id: group.id, user_id: id, role: 'member' })),
    ]
    await supabase.from('group_members').insert(members)

    toast.success(`Group "${name}" created!`)
    setCreateOpen(false)
    setName('')
    setDescription('')
    setMemberIds([])
    setMemberSearchResults([])
    loadData()
    setCreating(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Groups" profile={profile} />
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Groups" subtitle={`${groups.length} group${groups.length !== 1 ? 's' : ''}`} profile={profile} />

      <div className="p-6 flex flex-col gap-6">
        <div className="flex justify-end animate-fade-in-delay-1">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            Create Group
          </Button>
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="No groups yet"
            description="Create a group to split expenses with multiple people at once"
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" />
                Create Your First Group
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <ScrollReveal key={group.id} animationClass="animate-fade-in">
              <Link href={`/groups/${group.id}`}>
                <GlassCard variant="hover" className="cursor-pointer h-full group !p-4 border-transparent shadow-sm rounded-3xl bg-white dark:bg-[#242424]">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#1a1a1a] flex items-center justify-center text-white font-black text-xl shadow-sm transition-transform duration-300 group-hover:scale-110">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <Badge variant="muted">{group.members?.length || 0} members</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-1">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{group.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex -space-x-2">
                      {group.members?.slice(0, 4).map((m) => (
                        <Avatar key={m.id} src={m.profile?.avatar_url} name={m.profile?.full_name} size="xs" className="ring-2 ring-white dark:ring-[#242424]" />
                      ))}
                      {(group.members?.length || 0) > 4 && (
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 border-2 border-white dark:border-[#242424] flex items-center justify-center text-[10px] text-slate-400 font-bold">
                          +{(group.members?.length || 0) - 4}
                        </div>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-orange-100 dark:group-hover:bg-white/10 transition-colors">
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 dark:group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </ScrollReveal>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setName(''); setDescription(''); setMemberIds([]); setMemberSearchResults([]) }}
        title="Create Group"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <Input label="Group Name" placeholder="Weekend Trip, Roommates..." value={name} onChange={(e) => setName(e.target.value)} />
          <TextArea label="Description (optional)" placeholder="What is this group for?" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Add Members by Split ID</label>
            <div className="flex gap-2">
              <Input
                placeholder="SPL-XXXXXX"
                value={splitIdInput}
                onChange={(e) => setSplitIdInput(e.target.value.toUpperCase())}
                className="font-mono"
                onKeyDown={(e) => e.key === 'Enter' && addMemberBySpitId()}
              />
              <Button onClick={addMemberBySpitId} variant="secondary">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {memberSearchResults.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-500">Members to add:</p>
              {memberSearchResults.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-100 dark:bg-white/5">
                  <Avatar src={m.avatar_url} name={m.full_name} size="sm" />
                  <span className="text-sm text-slate-800 dark:text-slate-200 flex-1">{m.full_name}</span>
                  <button
                    onClick={() => {
                      setMemberIds(memberIds.filter((id) => id !== m.id))
                      setMemberSearchResults(memberSearchResults.filter((r) => r.id !== m.id))
                    }}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button fullWidth onClick={createGroup} loading={creating} disabled={!name.trim()}>
            Create Group
          </Button>
        </div>
      </Modal>
    </div>
  )
}
