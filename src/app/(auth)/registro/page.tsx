'use client'

import dynamic from 'next/dynamic'

const RegisterForm = dynamic(() => import('@/components/auth/register-form'), { ssr: false })

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <RegisterForm />
    </div>
  )
}
