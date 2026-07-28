/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PDFX_AI_PROVIDER: string
  readonly PDFX_AI_MODEL: string
  readonly ANTHROPIC_API_KEY: string
  readonly OPENAI_API_KEY: string
  readonly GOOGLE_GENERATIVE_AI_API_KEY: string
  readonly VITE_PDFX_WEB?: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
