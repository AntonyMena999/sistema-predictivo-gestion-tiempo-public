import { useLocation } from "react-router-dom"

const resolveTitle = (pathname: string) => {
  if (pathname.startsWith("/chat")) return "Asistente"
  if (pathname.startsWith("/calendario")) return "Calendario"
  if (pathname.startsWith("/dashboard")) return "Dashboard"
  return "Dashboard"
}

export default function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const location = useLocation()
  const title = resolveTitle(location.pathname)

  return (
    <header className="flex h-[76px] items-center justify-between border-b border-nexora-border bg-nexora-bg px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-nexora-text-tertiary transition-colors hover:bg-white/5 hover:text-nexora-text-secondary lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-[20px] font-semibold text-nexora-text">{title}</h1>
      </div>

    </header>
  )
}
