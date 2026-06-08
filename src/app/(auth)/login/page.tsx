'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) {
      // Supabase returns "Email not confirmed" or "Invalid login credentials"
      const msg = error.message.toLowerCase()
      if (msg.includes('email not confirmed')) {
        toast.error('Please confirm your email first — check your inbox for the verification link.', { duration: 6000 })
      } else if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
        toast.error('Wrong email or password. Please try again.', { duration: 4000 })
      } else {
        toast.error(error.message)
      }
      return
    }
    toast.success('Welcome back!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="animate-fade-in w-full max-w-md mx-auto">
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Welcome back</h2>
        <p className="text-slate-500 mt-2 font-medium">Sign in to your SplitFlow account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Input
          label="Email"
          type="email"
          id="login-email"
          placeholder="you@example.com"
          leftIcon={<Mail className="w-5 h-5 text-slate-400" />}
          error={errors.email?.message}
          className="h-14 text-base bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:border-slate-400 dark:focus:border-white/20 focus:ring-slate-400/10"
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          id="login-password"
          placeholder="••••••••"
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

        <div className="flex justify-end -mt-3">
          <Link
            href="/forgot-password"
            className="text-sm font-bold text-slate-900 dark:text-slate-300 hover:text-slate-600 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full flex items-center justify-center rounded-full py-4 text-lg font-bold shadow-sm mt-4 bg-[#FFD600] text-black hover:bg-[#F0C800] transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-10 text-center text-sm font-medium text-slate-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-bold text-slate-900 dark:text-white hover:text-slate-700 transition-colors">
          Create one
        </Link>
      </p>
    </div>
  )
}
