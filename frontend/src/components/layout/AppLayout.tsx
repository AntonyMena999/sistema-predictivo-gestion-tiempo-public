import { useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import Header from "./Header"
import MobileHeader from "./MobileHeader"

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true"
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("sidebar-collapsed", String(next))
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-nexora-bg">
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={toggleCollapse} />
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <Sidebar
          collapsed={false}
          onToggle={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden ml-1 min-w-0">
        <div className="hidden lg:block">
          <Header onMenuToggle={() => setMobileOpen(true)} />
        </div>
        <MobileHeader onMenuToggle={() => setMobileOpen(true)} />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
