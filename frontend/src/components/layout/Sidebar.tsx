import { useNavigate, useLocation, useParams } from "react-router-dom"
import {
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/context/useAuth"
import useChatHistory, { notifyChatHistoryChanged } from "@/hooks/useChatHistory"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import api from "@/services/api"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: CalendarDays, label: "Calendario", path: "/calendario" },
  { icon: MessageSquare, label: "Asistente", path: "/chat" },
]

const historyScrollbarStyles = `
  .nexora-history-scroll {
    scrollbar-width: thin;
    scrollbar-color: #F20530 rgba(255, 255, 255, 0.08);
  }

  .nexora-history-scroll::-webkit-scrollbar {
    width: 6px;
  }

  .nexora-history-scroll::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 9999px;
  }

  .nexora-history-scroll::-webkit-scrollbar-thumb {
    background: #F20530;
    border-radius: 9999px;
  }

  .nexora-history-scroll::-webkit-scrollbar-thumb:hover {
    background: #ff2b4e;
  }
`

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { sessionId: activeSessionId } = useParams<{ sessionId?: string }>()
  const { sessions, loading: historyLoading, refetch: refetchHistory } = useChatHistory()
  const isChatRoute = location.pathname.startsWith("/chat")


  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm("¿Deseas borrar este chat?")
    if (!confirmed) return

    try {
      await api.delete(`/api/chats/${sessionId}`)
      notifyChatHistoryChanged()
      refetchHistory()
      if (activeSessionId === sessionId) {
        navigate("/chat")
      }
    } catch (error) {
      console.error("Error ocultando sesión:", error)
    }
  }

  return (
    <>
      {!collapsed && <style>{historyScrollbarStyles}</style>}
      <aside
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden border-r border-nexora-border bg-nexora-sidebar transition-all duration-300",
          collapsed ? "w-[80px]" : "w-[280px]"
        )}
      >
        <div className="flex shrink-0 items-center justify-between px-5 py-7">
          {!collapsed && (
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
              <div>
                <p className="text-[14px] font-bold leading-tight text-white">Nexora</p>
                <p className="text-[8px] font-medium tracking-[3px] text-[#6E7077]">
                  GESTION DEL TIEMPO
                </p>
              </div>
            </button>
          )}
          {collapsed && (
            <div className="mx-auto">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                aria-label="Ir al dashboard"
              >
                <img
                  src="/nexora-icon1.png"
                  alt="Nexora"
                  className="h-full w-full object-contain"
                />
              </button>
            </div>
          )}
          <button
            onClick={onToggle}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-nexora-text-tertiary transition-colors hover:bg-white/5 hover:text-nexora-text-secondary"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <ChevronsLeft className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </div>

        <div className="mx-4 h-px shrink-0 bg-nexora-border" />

        <nav className="shrink-0 px-3 py-4 space-y-5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const button = (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-medium transition-all duration-200",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-nexora-red text-white"
                    : "text-nexora-text-tertiary hover:bg-white/[0.04] hover:text-nexora-text-secondary"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger render={button} />
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            }

            return button
          })}
        </nav>

        {!collapsed && isChatRoute && (
          <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => navigate("/chat")}
                className="mb-3 flex w-full items-center gap-3 rounded-xl border border-nexora-border bg-nexora-card px-3 py-2 text-[13px] font-medium text-nexora-text-secondary transition-all duration-200 hover:border-nexora-red/40 hover:text-nexora-text"
              >
                <Plus className="h-[18px] w-[18px] text-nexora-text-secondary" strokeWidth={1.5} />
                <span>Nuevo Chat</span>
              </button>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-nexora-text-tertiary">
                Historial
              </p>
            </div>
            <div className="mt-3 relative flex flex-1 min-h-0 flex-col">
              <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-3 nexora-history-scroll">
                {historyLoading ? (
                  <div className="space-y-2">
                    <div className="h-9 w-full animate-pulse rounded-2xl bg-white/5" />
                    <div className="h-9 w-full animate-pulse rounded-2xl bg-white/5" />
                    <div className="h-9 w-full animate-pulse rounded-2xl bg-white/5" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-[13px] text-nexora-text-tertiary">Sin conversaciones aún</p>
                ) : (
                  sessions.map((session) => {
                    const isActiveSession = session.sessionId === activeSessionId
                    return (
                      <div
                        key={session.sessionId}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium leading-snug transition-all duration-200",
                          isActiveSession
                            ? "bg-nexora-red text-white"
                            : "text-nexora-text-secondary hover:bg-white/[0.04]"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => navigate(`/chat/${session.sessionId}`)}
                          className="min-w-0 flex-1 overflow-hidden text-left"
                        >
                          <span className="block truncate">{session.titulo}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleDeleteSession(session.sessionId)
                          }}
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                            isActiveSession
                              ? "text-white/80 hover:bg-white/10"
                              : "text-nexora-text-tertiary hover:bg-white/5 hover:text-nexora-text"
                          )}
                          aria-label="Ocultar conversación"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto w-full">
          <div className="mx-4 h-px shrink-0 bg-nexora-border" />

          <div className="shrink-0 px-3 py-5">
            {!collapsed ? (
              <div className="flex items-center gap-3 px-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-nexora-text">
                    {user?.nombre || "Usuario"}
                  </p>
                  <p className="truncate text-[11px] text-nexora-text-tertiary">
                    {user?.email || ""}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-nexora-text-tertiary transition-colors hover:bg-white/5 hover:text-nexora-red"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={handleLogout}
                      className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-nexora-text-tertiary transition-colors hover:bg-white/5 hover:text-nexora-red"
                    >
                      <LogOut className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  }
                />
                <TooltipContent side="right">Cerrar sesión</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
