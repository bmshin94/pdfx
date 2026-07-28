import { resolve } from 'path'
import { defineConfig, loadEnv, type HtmlTagDescriptor } from 'vite'
import react from '@vitejs/plugin-react'
import type { AtRule } from 'postcss'
import { devVarsDefine } from './dev-vars'

const siteTags = (siteUrl: string): HtmlTagDescriptor[] => [
  { tag: 'meta', attrs: { property: 'og:url', content: `${siteUrl}/` }, injectTo: 'head' },
  {
    tag: 'meta',
    attrs: { property: 'og:image', content: `${siteUrl}/og-image.jpg` },
    injectTo: 'head'
  },
  { tag: 'meta', attrs: { property: 'og:image:type', content: 'image/jpeg' }, injectTo: 'head' },
  { tag: 'meta', attrs: { property: 'og:image:width', content: '512' }, injectTo: 'head' },
  { tag: 'meta', attrs: { property: 'og:image:height', content: '512' }, injectTo: 'head' }
]

export default defineConfig(({ mode, command }) => {
  const siteUrl = loadEnv(mode, __dirname, 'PDFX_').PDFX_SITE_URL?.replace(/\/+$/, '')
  return {
    root: resolve(__dirname, 'src/renderer'),
    publicDir: resolve(__dirname, 'resources'),
    define: {
      'import.meta.env.VITE_PDFX_WEB': 'true',
      ...devVarsDefine(__dirname, command)
    },
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        'tesseract.js': 'tesseract.js'
      }
    },
    optimizeDeps: {
      include: [
        'ai',
        'ai/test',
        '@ai-sdk/anthropic',
        '@ai-sdk/openai',
        '@ai-sdk/google',
        'zod',
        'pdfjs-dist/build/pdf.worker.min.mjs',
        'tesseract.js'
      ]
    },
    worker: {
      format: 'es' as const
    },
    css: {
      postcss: {
        plugins: [
          {
            postcssPlugin: 'enforce-dark-scheme',
            AtRule: {
              media(rule: AtRule) {
                if (rule.params.includes('prefers-color-scheme: light')) rule.remove()
                else if (rule.params.includes('prefers-color-scheme: dark'))
                  rule.replaceWith(...(rule.nodes ?? []))
              }
            }
          }
        ]
      }
    },
    plugins: [
      react(),
      {
        name: 'web-html',
        transformIndexHtml: (html: string) => ({
          html: html.replace("connect-src 'self'", "connect-src 'self' https://api.github.com"),
          tags: siteUrl ? siteTags(siteUrl) : []
        })
      }
    ],
    build: {
      outDir: resolve(__dirname, 'out/web'),
      emptyOutDir: true
    }
  }
})
