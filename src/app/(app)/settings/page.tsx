'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Shield, AlertTriangle, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const passwordSchema = z.object({
  current: z.string().min(1, 'Required'),
  newPass: z.string().min(8, 'Min 8 characters'),
  confirm: z.string(),
}).refine((d) => d.newPass === d.confirm, { message: "Passwords don't match", path: ['confirm'] })

type PasswordForm = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  async function changePassword(data: PasswordForm) {
    const { error } = await supabase.auth.updateUser({ password: data.newPass })
    if (error) { toast.error(error.message); return }
    toast.success('Password updated!')
    reset()
  }

  async function signOut() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sections = [
    {
      icon: <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: 'Change Password',
      content: (
        <form onSubmit={handleSubmit(changePassword)} className="flex flex-col gap-4">
          <Input label="Current Password" type="password" id="current-password" placeholder="••••••••" error={errors.current?.message} {...register('current')} />
          <Input label="New Password" type="password" id="new-password" placeholder="Min 8 characters" error={errors.newPass?.message} {...register('newPass')} />
          <Input label="Confirm New Password" type="password" id="confirm-password" placeholder="Repeat new password" error={errors.confirm?.message} {...register('confirm')} />
          <Button type="submit" loading={isSubmitting}>Update Password</Button>
        </form>
      ),
    },
    {
      icon: <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />,
      title: 'Security',
      content: (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-white/5">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">Two-Factor Authentication</p>
              <p className="text-xs text-slate-500">Add an extra layer of security</p>
            </div>
            <Button variant="secondary" size="sm">Enable</Button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-white/5">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">Active Sessions</p>
              <p className="text-xs text-slate-500">Manage your active sessions</p>
            </div>
            <Button variant="secondary" size="sm">View</Button>
          </div>
        </div>
      ),
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      title: 'Danger Zone',
      content: (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/15 transition-all hover:bg-rose-100 dark:hover:bg-rose-500/10">
            <div>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">Sign Out Everywhere</p>
              <p className="text-xs text-rose-500 dark:text-rose-400/70">Log out from all devices</p>
            </div>
            <Button variant="danger" size="sm" onClick={signOut} loading={loggingOut}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/15 transition-all hover:bg-rose-100 dark:hover:bg-rose-500/10">
            <div>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">Delete Account</p>
              <p className="text-xs text-rose-500 dark:text-rose-400/70">Permanently delete your account and data</p>
            </div>
            <Button variant="danger" size="sm">Delete</Button>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col">
      <Header title="Settings" profile={null} />

      <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-8 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-12 lg:col-span-8 flex flex-col gap-8">
            {sections.map(({ icon, title, content }) => (
              <div key={title} className="flex flex-col gap-4">
                 <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                   {icon} {title}
                 </h2>
                 <div className="glass !rounded-[2rem] p-6 md:p-8 bg-white/40 dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm transition-all hover:bg-white/60 dark:hover:bg-white/10">
                   {content}
                 </div>
              </div>
            ))}
          </div>
          
          <div className="md:col-span-12 lg:col-span-4 flex flex-col gap-6">
             <div className="glass !rounded-[2rem] p-6 md:p-8 bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-center">
                <Shield className="w-12 h-12 text-indigo-500 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Privacy & Security</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">We take your privacy seriously. All your data is encrypted and stored securely.</p>
                <Button variant="secondary" fullWidth className="rounded-2xl">Read Privacy Policy</Button>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
