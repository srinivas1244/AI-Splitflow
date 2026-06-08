'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useState } from 'react'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <GlassCard className="animate-fade-in text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Check your email</h2>
        <p className="text-slate-400 text-sm mb-8">
          We&apos;ve sent a password reset link to your email address. The link expires in 1 hour.
        </p>
        <Link href="/login">
          <Button variant="secondary" fullWidth>
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Button>
        </Link>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-100">Reset your password</h2>
        <p className="text-slate-400 mt-1 text-sm">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Input
          label="Email"
          type="email"
          id="forgot-email"
          placeholder="you@example.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" loading={isSubmitting} fullWidth size="lg">
          Send Reset Link
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Sign In
        </Link>
      </div>
    </GlassCard>
  )
}
