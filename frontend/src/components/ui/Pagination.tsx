import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
      <p className="text-[12px] text-[#6E7077]">
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/5 transition-colors duration-200",
            page === 1
              ? "cursor-not-allowed text-[#6E7077]/30"
              : "text-[#A7A8AF] hover:bg-white/5 hover:text-white"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/5 transition-colors duration-200",
            page === totalPages
              ? "cursor-not-allowed text-[#6E7077]/30"
              : "text-[#A7A8AF] hover:bg-white/5 hover:text-white"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
