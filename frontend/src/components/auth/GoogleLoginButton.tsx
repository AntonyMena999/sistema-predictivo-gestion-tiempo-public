import { Shield } from "lucide-react"

const API_BASE = ""

interface GoogleLoginButtonProps {
  onClick?: () => void
}

export default function GoogleLoginButton({ onClick }: GoogleLoginButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      window.location.href = `${API_BASE}/auth/google`
    }
  }

  return (
    <div className="flex w-full flex-col items-center">
      <button
        onClick={handleClick}
        className="group flex h-14 w-full cursor-pointer items-center justify-center gap-3.5 rounded-[14px] border border-[#DADCE0] bg-white px-5 transition-all duration-250 hover:border-[#C9CDD3] hover:bg-[#F8F9FA] hover:shadow-[0_8px_25px_rgba(0,0,0,.08)] min-[1440px]:h-16 min-[1440px]:gap-4 min-[1440px]:rounded-[16px] min-[1440px]:px-6"
      >
        <svg className="h-5 w-5 min-[1440px]:h-6 min-[1440px]:w-6" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span className="text-[16px] font-semibold text-[#202124] min-[1440px]:text-[18px]">
          Iniciar sesión con Google
        </span>
      </button>

      <div className="mt-12 flex items-center gap-2.5 text-[14px] text-[#9AA0A6] min-[1440px]:gap-3 min-[1440px]:text-[16px]">
        <Shield className="h-4 w-4 min-[1440px]:h-5 min-[1440px]:w-5" strokeWidth={1.5} />
        <span>Ingresa de forma segura con tu cuenta de Google</span>
      </div>
    </div>
  )
}
