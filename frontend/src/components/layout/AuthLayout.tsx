import type { ReactNode } from "react"

interface AuthLayoutProps {
  leftPanel: ReactNode
  rightPanel: ReactNode
}

export default function AuthLayout({ leftPanel, rightPanel }: AuthLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {leftPanel}
      {rightPanel}
    </div>
  )
}
