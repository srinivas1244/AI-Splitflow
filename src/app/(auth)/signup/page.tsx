'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Mail, Lock, User, Eye, EyeOff, Sparkles, Copy, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [splitId, setSplitId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    if (!authData.user) {
      toast.error('Signup failed — please try again.')
      return
    }

    // Check if the user already exists (Supabase returns identities = [] for existing users to prevent email enumeration)
    if (authData.user.identities && authData.user.identities.length === 0) {
      toast.error('An account with this email already exists. Please sign in instead.', { duration: 5000 })
      return
    }

    // Case 1: Email confirmation required — no session yet.
    // The profile trigger still ran, but we can't read it without auth.
    // Show "check your email" state instead.
    if (!authData.session) {
      toast.success('Verification email sent! Please check your inbox.', { duration: 5000 })
      setConfirmationSent(true)
      return
    }

    // Case 2: Auto-confirmed (email confirmation disabled in Supabase).
    // User is authenticated — fetch the generated Split ID.
    const fetchSplitId = async (retries = 5): Promise<void> => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('split_id')
        .eq('id', authData.user!.id)
        .single()

      if (profile?.split_id) {
        setSplitId(profile.split_id)
      } else if (retries > 0) {
        // Trigger may need a moment — retry
        await new Promise((r) => setTimeout(r, 800))
        await fetchSplitId(retries - 1)
      } else {
        // Fallback: show success without Split ID (visible on Profile page)
        setSplitId('Check your Profile page')
      }
    }

    await fetchSplitId()
  }

  async function copyToClipboard() {
    if (!splitId) return
    await navigator.clipboard.writeText(splitId)
    setCopied(true)
    toast.success('Split ID copied!')
    setTimeout(() => setCopied(false), 2000)
  }

      <div className="animate-fade-in w-full max-w-md mx-auto text-center">
        <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto mb-8 shadow-sm">
          <Mail className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-4 tracking-tight">Check your inbox! 📬</h2>
        <p className="text-slate-500 font-medium text-lg mb-10 leading-relaxed">
          We&apos;ve sent a confirmation link to your email. Click it to activate your account
          and reveal your unique Split ID.
        </p>
        <div className="p-8 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 mb-10 text-left shadow-sm">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">After confirming:</p>
          <ol className="text-base font-medium text-slate-700 dark:text-slate-300 space-y-4 list-decimal list-inside">
            <li>Click the link in your email</li>
            <li>Sign in with your credentials</li>
            <li>Your Split ID will be on the Profile page</li>
          </ol>
        </div>
        <Link href="/login">
          <button className="w-full rounded-full py-4 text-lg font-bold shadow-sm bg-[#FFD600] text-black hover:bg-[#F0C800] transition-colors">
            Go to Sign In
          </button>
        </Link>
      </div>

  // Split ID reveal state (auto-confirmed flow)
  if (splitId) {
    return (
      <div className="animate-fade-in w-full max-w-md mx-auto text-center">
        <div className="w-24 h-24 rounded-full bg-[#FFD600] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-[#FFD600]/40">
          <Sparkles className="w-10 h-10 text-black" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-4 tracking-tight">Account Created! 🎉</h2>
        <p className="text-slate-500 font-medium text-lg mb-10">
          Check your email to verify your account. Here&apos;s your unique Split ID:
        </p>

        <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-3xl p-8 mb-10 shadow-sm">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Your Split ID</p>
          <p className="text-4xl font-black font-mono tracking-widest text-slate-800 dark:text-slate-200 mb-6 bg-white dark:bg-black/20 py-3 rounded-2xl border border-slate-100 dark:border-white/10 shadow-inner select-all">{splitId}</p>
          <p className="text-sm font-medium text-slate-500 mb-8">
            Share this ID with friends so they can add you on SplitFlow
          </p>
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center justify-center gap-3 w-full px-4 py-4 rounded-full bg-white dark:bg-indigo-500/10 border border-slate-200 dark:border-indigo-500/20 text-base font-bold text-slate-800 dark:text-indigo-300 hover:bg-slate-50 dark:hover:bg-indigo-500/20 transition-all shadow-sm"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy ID
              </>
            )}
          </button>
        </div>

        <Link href="/login">
          <button className="w-full rounded-full py-4 text-lg font-bold shadow-sm bg-[#FFD600] text-black hover:bg-[#F0C800] transition-colors">
            Go to Sign In
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in w-full max-w-md mx-auto">
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Create your account</h2>
        <p className="text-slate-500 mt-2 font-medium">
          Join SplitFlow and start splitting expenses effortlessly
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Input
          label="Full Name"
          type="text"
          id="signup-name"
          placeholder="John Doe"
          leftIcon={<User className="w-5 h-5 text-slate-400" />}
          error={errors.full_name?.message}
          className="h-14 text-base bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:border-slate-400 dark:focus:border-white/20 focus:ring-slate-400/10"
          {...register('full_name')}
        />

        <Input
          label="Email"
          type="email"
          id="signup-email"
          placeholder="you@example.com"
          leftIcon={<Mail className="w-5 h-5 text-slate-400" />}
          error={errors.email?.message}
          className="h-14 text-base bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:border-slate-400 dark:focus:border-white/20 focus:ring-slate-400/10"
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          id="signup-password"
          placeholder="Min 8 characters"
          leftIcon={<Lock className="w-5 h-5 text-slate-400" />}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          }
          error={errors.password?.message}
          className="h-14 text-base bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:border-slate-400 dark:focus:border-white/20 focus:ring-slate-400/10"
          {...register('password')}
        />

        <Input
          label="Confirm Password"
          type="password"
          id="signup-confirm-password"
          placeholder="Repeat password"
          leftIcon={<Lock className="w-5 h-5 text-slate-400" />}
          error={errors.confirm_password?.message}
          className="h-14 text-base bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:border-slate-400 dark:focus:border-white/20 focus:ring-slate-400/10"
          {...register('confirm_password')}
        />

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-full py-4 text-lg font-bold shadow-sm mt-4 bg-[#FFD600] text-black hover:bg-[#F0C800] transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Creating account...' : (
             <>
               <Sparkles className="w-5 h-5" />
               Create Account
             </>
          )}
        </button>
      </form>

      <p className="mt-10 text-center text-sm font-medium text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-slate-900 dark:text-white hover:text-slate-700 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
