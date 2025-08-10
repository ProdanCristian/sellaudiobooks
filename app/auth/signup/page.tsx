"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { SignupForm } from "@/components/signup-form"
import Logo from "@/components/logo"


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
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <Logo />
      <SignupForm />
    </div>

  )
} 