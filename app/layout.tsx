import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import React from "react"
import { ProcessingProvider } from "@/contexts/ProcessingContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "테스트 케이스 생성기",
  description: "LLM 기반 테스트 케이스 생성 도구",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <ProcessingProvider>
            {children}
          </ProcessingProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
} 