'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Copy, CheckCircle2, User, Mail, Calendar, Sparkles, Camera, Settings, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'
import { formatDate } from '@/lib/utils'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [fullName, setFullName] = useState('')
  const [copied, setCopied] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [stats, setStats] = useState({ expenses: 0, groups: 0, friends: 0 })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    setFullName(p?.full_name || '')

    const [{ count: expenses }, { count: groups }, { count: friends }] = await Promise.all([
      supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('created_by', user.id),
      supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('friendships').select('*', { count: 'exact', head: true }).or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq('status', 'accepted'),
    ])
    setStats({ expenses: expenses || 0, groups: groups || 0, friends: friends || 0 })
    setLoading(false)
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', profile.id)
    if (error) toast.error(error.message)
    else toast.success('Profile updated!')
    setSaving(false)
    loadData()
  }

  async function signOut() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function copySpitId() {
    if (!profile?.split_id) return
    await navigator.clipboard.writeText(profile.split_id)
    setCopied(true)
    toast.success('Split ID copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploadingAvatar(true)
      if (!event.target.files || event.target.files.length === 0 || !profile) {
        return
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${profile.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      toast.success('Avatar updated!')
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error uploading avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Profile" profile={null} />
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Profile" profile={profile} />

      <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-8 max-w-4xl mx-auto w-full">
        {/* Profile Card */}
        <div className="glass !rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden bg-gradient-to-br from-indigo-50/30 to-white/10 dark:from-indigo-500/10 dark:to-white/5 border border-indigo-100 dark:border-indigo-500/20 shadow-xl shadow-indigo-500/5 group">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-400/10 blur-3xl rounded-full group-hover:bg-indigo-400/20 transition-colors duration-700" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-violet-400/10 blur-3xl rounded-full group-hover:bg-violet-400/20 transition-colors duration-700" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative group/avatar cursor-pointer shrink-0">
              <label className={`block relative ${uploadingAvatar ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <Avatar src={profile?.avatar_url} name={profile?.full_name} size="xl" className="w-32 h-32 ring-8 ring-white dark:ring-[#1a1a1a] shadow-xl transform group-hover/avatar:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                  {uploadingAvatar ? <Spinner size="md" /> : <Camera className="w-8 h-8 text-white" />}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>
            
            <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{profile?.full_name || 'Your Name'}</h2>
              <p className="text-slate-500 font-medium mb-6 px-4 py-1.5 rounded-full bg-white/60 dark:bg-black/20 border border-slate-100 dark:border-white/5 backdrop-blur-sm inline-flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-500" /> {profile?.email}
              </p>
              
              {/* Split ID */}
              <div className="bg-white/80 dark:bg-black/40 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 md:p-6 w-full max-w-sm flex flex-col items-center md:items-start shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-bold">Your Split ID</p>
                </div>
                <p className="text-2xl font-black font-mono tracking-widest text-slate-800 dark:text-slate-200 mb-3 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10 select-all">
                  {profile?.split_id}
                </p>
                <button
                  onClick={copySpitId}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-sm font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-95"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied to Clipboard!' : 'Copy ID to Share'}
                </button>
              </div>
            </div>
          </div>

          {/* Stats & Meta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-200 dark:border-white/10 relative z-10">
            {[
              { label: 'Expenses', value: stats.expenses },
              { label: 'Groups', value: stats.groups },
              { label: 'Friends', value: stats.friends },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/60 dark:bg-black/20 border border-slate-100 dark:border-white/5 backdrop-blur-sm hover:scale-105 transition-transform">
                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{value}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{label}</p>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/60 dark:bg-black/20 border border-slate-100 dark:border-white/5 backdrop-blur-sm hover:scale-105 transition-transform">
              <Calendar className="w-6 h-6 text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{profile?.created_at ? formatDate(profile.created_at) : '—'}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Joined</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Edit Profile */}
          <div className="md:col-span-7 lg:col-span-8">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 mb-4 flex items-center gap-2">
               <User className="w-4 h-4" /> Personal Information
            </h2>
            <div className="glass !rounded-[2rem] p-6 md:p-8 bg-white/40 dark:bg-white/5">
              <div className="flex flex-col gap-6">
                <Input
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  leftIcon={<User className="w-4 h-4 text-slate-500" />}
                />
                <Input
                  label="Email"
                  value={profile?.email || ''}
                  disabled
                  leftIcon={<Mail className="w-4 h-4" />}
                  hint="Email cannot be changed here"
                />
                <Button onClick={saveProfile} loading={saving} disabled={!fullName.trim()} className="rounded-2xl py-6 text-base shadow-lg shadow-indigo-500/20 mt-2">
                  Save Changes
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="md:col-span-5 lg:col-span-4">
             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 mb-4 flex items-center gap-2">
               <Settings className="w-4 h-4" /> Quick Actions
             </h2>
             <div className="flex flex-col gap-3">
               <Link href="/settings" className="w-full">
                 <div className="glass !rounded-2xl p-4 flex items-center gap-4 bg-white/40 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors border border-slate-100 dark:border-white/10 group cursor-pointer">
                   <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-black/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Settings className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                   </div>
                   <div className="flex-1">
                     <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Account Settings</p>
                     <p className="text-xs text-slate-500">Security & passwords</p>
                   </div>
                 </div>
               </Link>
               
               <button onClick={signOut} disabled={loggingOut} className="w-full">
                 <div className="glass !rounded-2xl p-4 flex items-center gap-4 bg-rose-50/50 dark:bg-rose-500/5 hover:bg-rose-100 dark:hover:bg-rose-500/10 transition-colors border border-rose-100 dark:border-rose-500/10 group cursor-pointer text-left">
                   <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                     {loggingOut ? <Spinner size="sm" className="text-rose-500" /> : <LogOut className="w-5 h-5 text-rose-500 dark:text-rose-400" />}
                   </div>
                   <div className="flex-1">
                     <p className="text-sm font-bold text-rose-600 dark:text-rose-300">Sign Out</p>
                     <p className="text-xs text-rose-500/70 dark:text-rose-400/70">End your session</p>
                   </div>
                 </div>
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
