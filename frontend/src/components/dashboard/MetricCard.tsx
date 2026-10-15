import type { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  icon: LucideIcon
  title: string
  value: string | number
  description: string
  loading?: boolean
  className?: string
}

export default function MetricCard({
  icon: Icon,
  title,
  value,
  description,
  loading,
  className,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "group rounded-2xl border border-nexora-border bg-nexora-card p-7 transition-all duration-200 hover:ring-1 hover:ring-white/[0.08]",
        className
      )}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nexora-red/10">
          <Icon className="h-5 w-5 text-nexora-red" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-[13px] font-medium text-nexora-text-tertiary">{title}</p>
      <p className="mt-1 text-[28px] font-bold leading-tight text-nexora-text">
        {loading ? "—" : value}
      </p>
      <p className="mt-1 text-[12px] text-nexora-text-tertiary">{description}</p>
    </motion.div>
  )
}
