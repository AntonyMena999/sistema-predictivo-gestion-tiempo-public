import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { useAuth } from "../context/useAuth"
import { toast } from "sonner"
import AuthLayout from "../components/layout/AuthLayout"
import GoogleLoginButton from "../components/auth/GoogleLoginButton"
import BenefitsList from "../components/auth/BenefitsList"

function LeftPanel() {
  return (
    <div className="relative hidden flex-1 flex-col items-center justify-center lg:flex lg:basis-[65%] lg:min-w-0">
      <div className="absolute inset-0 bg-[#111116]" />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at center, rgba(255,255,255,.03), transparent 65%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="-mb-4 mt-10"
        >
          <img
            src="/nexora-icon1.png"
            alt="Nexora"
            className="h-20 w-20 object-contain"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-16 text-center"
        >
          <h1 className="text-[53px] font-bold leading-tight text-white">
            Nexora
          </h1>
          <p className="mt-1 text-[17px] font-medium tracking-[1px] text-[#6E7077]">
            Organiza tu vida academica sin esfuerzo
          </p>
        </motion.div>

        <BenefitsList />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="absolute bottom-8 text-[14px] text-[#5E6069]"
      >
        Nexora • Gestión del Tiempo
      </motion.p>
    </div>
  )
}

function RightPanel() {
  return (
    <div className="flex w-full items-center justify-center bg-white px-6 sm:px-10 lg:min-w-[320px] lg:basis-[35%] lg:px-8 min-[1440px]:px-[72px]">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex w-full flex-col items-center lg:max-w-[320px] min-[1440px]:max-w-[368px]"
      >
        <div className="mb-10 w-full">
          <h2 className="text-[38px] font-bold leading-tight text-[#202124] min-[1440px]:text-[46px]">
            Bienvenido a Nexora
          </h2>
          <p className="mt-3 text-[16px] text-[#6F7280] min-[1440px]:text-[18px]">
            Gestiona tu vida academica por categorias, facil y rapido
          </p>
        </div>

        <GoogleLoginButton />
      </motion.div>
    </div>
  )
}

export default function Login() {
  const { setToken, token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const urlToken = searchParams.get("token")
    const error = searchParams.get("error")

    if (error) {
      toast.error("Error de autenticación. Intenta de nuevo.")
      setSearchParams({})
    }

    if (urlToken) {
      setToken(urlToken)
      setSearchParams({})
    }
  }, [searchParams, setToken, setSearchParams])

  useEffect(() => {
    if (token) {
      window.location.href = "/dashboard"
    }
  }, [token])

  return (
    <AuthLayout
      leftPanel={<LeftPanel />}
      rightPanel={<RightPanel />}
    />
  )
}
