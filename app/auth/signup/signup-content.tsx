"use client"

import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { SignupForm } from "@/components/auth/signup-form"
import Logo from "@/components/layout/logo"
import BookCover from "@/components/book/book-cover"

export function SignupContent() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const bookTitle = searchParams.get('title')
  const bookCover = searchParams.get('cover')

  const createBookForAuthenticatedUser = async () => {
    if (!bookTitle) return
    
    try {
      await fetch('/api/books/create-from-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: bookTitle,
          coverImage: bookCover,
        }),
      })
      
      // Redirect to dashboard after creating the book
      router.push("/dashboard")
    } catch (error) {
      console.error('Error creating book for authenticated user:', error)
      // Still redirect to dashboard even if book creation fails
      router.push("/dashboard")
    }
  }

  useEffect(() => {
    if (status === "authenticated" && bookTitle) {
      // User is already authenticated but has book data, create the book
      createBookForAuthenticatedUser()
    } else if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router, bookTitle, bookCover])

  if (status === "authenticated") {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-6 py-4 pt-20 sm:pt-24">
      <Logo />
      
      {/* Book Preview Section */}
      {bookTitle && bookCover && (
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-muted-foreground">Your Book</h2>
            <h3 className="text-2xl font-bold">{bookTitle}</h3>
          </div>
          <div className="flex justify-center">
            <BookCover 
              imageSrc={bookCover} 
              alt={bookTitle} 
              className="max-w-xs scale-75"
            />
          </div>
        </div>
      )}
      
      <SignupForm />
    </div>
  )
}