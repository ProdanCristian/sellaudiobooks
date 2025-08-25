"use client"

import { Skeleton } from '@/components/ui/skeleton'
import Header from '@/components/layout/header'

export default function BookPageSkeleton() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20 sm:pt-24 container mx-auto px-2">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          {/* Left sidebar skeleton */}
          <div className="lg:col-span-1">
            {/* Book cover skeleton */}
            <div className="mb-6 space-y-4 text-center">
              <div className="flex justify-center">
                <div className="relative w-40 h-52 max-w-[160px] group">
                  <div className="border relative overflow-hidden rounded-2xl shadow-lg">
                    <div className="aspect-[3/4] w-full relative">
                      <div className="w-full h-full bg-muted/30"></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Book details skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4 mx-auto bg-muted/20" />
                <Skeleton className="h-4 w-16 mx-auto rounded-full bg-muted/20" />
              </div>
            </div>

            {/* Tabs skeleton */}
            <div className="space-y-2">
              <div className="space-y-1">
                <Skeleton className="h-9 w-full rounded-md bg-muted/20" />
                <Skeleton className="h-9 w-full rounded-md bg-muted/20" />
                <Skeleton className="h-9 w-full rounded-md bg-muted/20" />
              </div>
            </div>
          </div>

          {/* Main content skeleton */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {/* Header skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-7 w-32 bg-muted/20" />
                <Skeleton className="h-4 w-48 bg-muted/20" />
              </div>

              {/* Content area skeleton */}
              <Skeleton className="h-[360px] w-full rounded-lg bg-muted/20" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}