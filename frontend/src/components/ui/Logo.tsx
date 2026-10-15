import { Clock } from "lucide-react"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export default function Logo({ size = "md", showText = true }: LogoProps) {
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
  }

  const containerSizes = {
    sm: "h-8 w-8 rounded-[10px]",
    md: "h-10 w-10 rounded-[12px]",
    lg: "h-16 w-16 rounded-[18px]",
  }

  const textSizes = {
    sm: "text-[14px]",
    md: "text-[15px]",
    lg: "text-[48px]",
  }

  const subtitleSizes = {
    sm: "text-[8px] tracking-[3px]",
    md: "text-[10px] tracking-[4px]",
    lg: "text-[15px] tracking-[8px]",
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex ${containerSizes[size]} items-center justify-center bg-[#F20530]`}
        style={{ boxShadow: "0 0 20px rgba(242,5,48,.2)" }}
      >
        <Clock className={`${iconSizes[size]} text-white`} strokeWidth={1.5} />
      </div>
      {showText && (
        <div>
          <p className={`${textSizes[size]} font-bold leading-tight text-white`}>
            Nexora
          </p>
          {size !== "lg" && (
            <p className={`${subtitleSizes[size]} font-medium text-[#6E7077]`}>
              {size === "sm" ? "GESTION DEL TIEMPO" : "GESTION DEL TIEMPO"}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
