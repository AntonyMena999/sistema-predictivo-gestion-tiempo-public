import { motion } from "framer-motion"
import { benefits } from "../../constants/benefits"

export default function BenefitsList() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex w-full max-w-[480px] flex-col"
    >
      {benefits.map((benefit, index) => (
        <div key={index}>
          <div className="flex items-center gap-4 py-4">
            <benefit.icon className="h-5 w-5 shrink-0 text-[#F20530]" strokeWidth={1.5} />
            <span className="text-[15px] font-normal text-[#A7A8AF]">
              {benefit.text}
            </span>
          </div>
          {index < benefits.length - 1 && (
            <div className="h-px w-full bg-white/5" />
          )}
        </div>
      ))}
    </motion.div>
  )
}
