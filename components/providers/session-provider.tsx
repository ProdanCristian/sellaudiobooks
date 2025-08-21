"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "./theme-provider"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      forcedTheme="dark"
      disableTransitionOnChange
      suppressHydrationWarning
    >
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  )
} 