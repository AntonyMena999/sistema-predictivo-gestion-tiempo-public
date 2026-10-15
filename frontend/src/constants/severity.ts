import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  type LucideIcon,
  ShieldAlert,
  Info,
} from "lucide-react"

export type SeverityLevel = "urgent" | "highWarning" | "warning" | "info" | "ok"

export interface SeverityToken {
  level: SeverityLevel
  labelEs: string
  itemClassName: string
  iconClassName: string
  icon: LucideIcon
}

export const severityTokens: Record<SeverityLevel, SeverityToken> = {
  urgent: {
    level: "urgent",
    labelEs: "Urgente",
    itemClassName:
      "border-l-4 border-l-rose-500 bg-rose-500/10 border border-rose-500/30",
    iconClassName: "text-rose-300",
    icon: ShieldAlert,
  },
  highWarning: {
    level: "highWarning",
    labelEs: "Alta prioridad",
    itemClassName:
      "border-l-4 border-l-orange-500 bg-orange-500/10 border border-orange-500/30",
    iconClassName: "text-orange-300",
    icon: Flame,
  },
  warning: {
    level: "warning",
    labelEs: "Atención",
    itemClassName:
      "border-l-4 border-l-amber-500 bg-amber-500/10 border border-amber-500/30",
    iconClassName: "text-amber-300",
    icon: AlertTriangle,
  },
  info: {
    level: "info",
    labelEs: "Informativo",
    itemClassName:
      "border-l-4 border-l-sky-500 bg-sky-500/10 border border-sky-500/30",
    iconClassName: "text-sky-300",
    icon: Info,
  },
  ok: {
    level: "ok",
    labelEs: "Al día",
    itemClassName:
      "border-l-4 border-l-emerald-500 bg-emerald-500/10 border border-emerald-500/30",
    iconClassName: "text-emerald-300",
    icon: CheckCircle2,
  },
}

export const getSeverityToken = (level: SeverityLevel) => severityTokens[level]
