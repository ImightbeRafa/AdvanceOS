'use client'

import dynamic from 'next/dynamic'

const LoginForm = dynamic(() => import('@/components/auth/login-form'), { ssr: false })

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <LoginForm />
    </div>
  )
}
