import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

interface SpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export default function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <Loader2
      className={cn(
        "animate-spin text-[#F20530]",
        size === "sm" && "h-4 w-4",
        size === "md" && "h-6 w-6",
        size === "lg" && "h-8 w-8",
        className
      )}
    />
  )
}
