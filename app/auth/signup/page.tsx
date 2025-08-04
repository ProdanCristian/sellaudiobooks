"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { SignupForm } from "@/components/signup-form"

import Logo from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"

export default function SignUp() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  if (status === "authenticated") {
    return null
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center p-6 md:p-10 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm md:max-w-3xl flex flex-col gap-4">
        <Logo />
        <SignupForm />
      </div>
    </div>
  )
} 