"use client"

import { Suspense } from "react"
import { SignupContent } from "./signup-content"

export default function SignUp() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignupContent />
    </Suspense>
  )
}