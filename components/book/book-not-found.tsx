"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/header'

export default function BookNotFound() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 sm:pt-24 container mx-auto px-2">
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold mb-2">Book not found</h2>
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}