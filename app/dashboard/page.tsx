"use client"

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import Header from '@/components/header'
import SimpleCards from '@/components/simple-cards'
import UserBooks from '@/components/user-books'

const Dashboard = () => {
  const { data: session, status } = useSession()
  const firstName = session?.user?.name ? session.user.name.split(' ')[0] : 'Creator'

  useEffect(() => {
    // Check for pending book after OAuth login
    if (status === 'authenticated') {
      const pendingBookData = sessionStorage.getItem('pendingBook')
      if (pendingBookData) {
        try {
          const { title, cover } = JSON.parse(pendingBookData)
          createPendingBook(title, cover)
          sessionStorage.removeItem('pendingBook')
        } catch (error) {
          console.error('Error parsing pending book data:', error)
          sessionStorage.removeItem('pendingBook')
        }
      }
    }
  }, [status])

  const createPendingBook = async (title: string, cover: string) => {
    try {
      console.log('Creating pending book:', { title, cover })
      const response = await fetch('/api/books/create-from-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          coverImage: cover,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Error creating pending book:', result)
      } else {
        console.log('Pending book created successfully:', result)
        // Refresh the page to show the new book
        window.location.reload()
      }
    } catch (error) {
      console.error('Error creating pending book:', error)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      {/* Dashboard Content */}
      <main className="pt-20 sm:pt-24 container mx-auto px-2">
        {/* Welcome Header */}
        <div className="mx-auto mb-1">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-3">
              Welcome back, {firstName}!
            </h1>
            <p className="text-muted-foreground">
              Create and manage your AI-powered books from your dashboard
            </p>
          </div>
        </div>
        <SimpleCards />

        {/* User Books Section */}
        <div className="mt-12">
          <UserBooks />
        </div>
      </main>
    </div>
  )
}

export default Dashboard