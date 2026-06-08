'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ['confirm'],
})
type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Password updated! Please sign in.')
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <GlassCard className="animate-fade-in">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-100">Set new password</h2>
            <p className="text-slate-400 mt-1 text-sm">Choose a strong password for your account</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <Input
              label="New Password"
              type="password"
              id="reset-password"
              placeholder="Min 8 characters"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirm Password"
              type="password"
              id="reset-confirm"
              placeholder="Repeat new password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirm?.message}
              {...register('confirm')}
            />
            <Button type="submit" loading={isSubmitting} fullWidth size="lg">
              Update Password
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  )
}
