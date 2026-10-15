import { useNavigate } from "react-router-dom"
import { Menu } from "lucide-react"

interface MobileHeaderProps {
  onMenuToggle?: () => void
}

export default function MobileHeader({ onMenuToggle }: MobileHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center border-b border-nexora-border bg-nexora-sidebar px-4 py-3 lg:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-nexora-text-tertiary transition-colors hover:bg-white/5"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3 text-left"
          aria-label="Ir al dashboard"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px]">
            <img
              src="/nexora-icon1.png"
              alt="Nexora"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="text-[15px] font-semibold text-nexora-text">Nexora</span>
        </button>
      </div>
    </div>
  )
}
