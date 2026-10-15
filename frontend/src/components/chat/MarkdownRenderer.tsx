import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        p({ children }) {
          return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
        },
        ul({ children }) {
          return <ul className="mb-3 list-disc pl-5">{children}</ul>
        },
        ol({ children }) {
          return <ol className="mb-3 list-decimal pl-5">{children}</ol>
        },
        li({ children }) {
          return <li className="mb-1">{children}</li>
        },
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "")
          if (match) {
            return (
              <code
                className="my-3 block overflow-x-auto rounded-xl bg-black/40 px-5 py-4 text-[13px] leading-relaxed"
                {...props}
              >
                {children}
              </code>
            )
          }
          return (
            <code
              className="rounded-md bg-white/10 px-1.5 py-0.5 text-[13px]"
              {...props}
            >
              {children}
            </code>
          )
        },
        pre({ children }) {
          return <pre className="my-3 min-w-0 overflow-x-auto">{children}</pre>
        },
        table({ children }) {
          return (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          )
        },
        th({ children }) {
          return (
            <th className="border border-nexora-border bg-white/5 px-4 py-2.5 text-left font-medium">
              {children}
            </th>
          )
        },
        td({ children }) {
          return (
            <td className="border border-nexora-border px-4 py-2.5">{children}</td>
          )
        },
        h1({ children }) {
          return <h1 className="mt-4 mb-2 text-[20px] font-bold">{children}</h1>
        },
        h2({ children }) {
          return <h2 className="mt-4 mb-2 text-[17px] font-semibold">{children}</h2>
        },
        h3({ children }) {
          return <h3 className="mt-4 mb-2 text-[15px] font-semibold">{children}</h3>
        },
        blockquote({ children }) {
          return (
            <blockquote className="my-3 border-l-2 border-nexora-red/40 pl-4 text-nexora-text-secondary">
              {children}
            </blockquote>
          )
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-nexora-red underline-offset-2 hover:underline"
            >
              {children}
            </a>
          )
        },
      }}
    >
      {content}
    </Markdown>
  )
}
