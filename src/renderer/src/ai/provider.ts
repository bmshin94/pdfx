import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import { createMockModel } from './mock-model'

export type AiProvider = 'anthropic' | 'openai' | 'google' | 'mock'

export interface AiConfig {
  provider: AiProvider
  model: string
  apiKey: string
  ready: boolean
}

export const PROVIDER_KEY_VARS: Record<Exclude<AiProvider, 'mock'>, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY'
}

const DEFAULT_MODELS: Record<Exclude<AiProvider, 'mock'>, string> = {
  anthropic: 'claude-opus-4-8',
  openai: 'gpt-5.2',
  google: 'gemini-3.1-flash'
}

const PROVIDER_OVERRIDE_KEY = 'pdfx-ai-provider'

const env = (value: string | undefined): string => (value ?? '').trim()

const providerKey = (provider: Exclude<AiProvider, 'mock'>): string => {
  if (provider === 'openai') return env(import.meta.env.OPENAI_API_KEY)
  if (provider === 'google') return env(import.meta.env.GOOGLE_GENERATIVE_AI_API_KEY)
  return env(import.meta.env.ANTHROPIC_API_KEY)
}

export function resolveAiConfig(): AiConfig {
  const override = env(window.localStorage.getItem(PROVIDER_OVERRIDE_KEY) ?? undefined)
  const requested = override || env(import.meta.env.PDFX_AI_PROVIDER) || 'anthropic'
  if (requested === 'mock') {
    return { provider: 'mock', model: 'pdfx-mock', apiKey: '', ready: true }
  }
  const provider: Exclude<AiProvider, 'mock'> =
    requested === 'openai' || requested === 'google' ? requested : 'anthropic'
  const apiKey = providerKey(provider)
  const model = env(import.meta.env.PDFX_AI_MODEL) || DEFAULT_MODELS[provider]
  return { provider, model, apiKey, ready: apiKey.length > 0 }
}

export function createAiModel(config: AiConfig): LanguageModel {
  if (config.provider === 'mock') return createMockModel()
  if (config.provider === 'openai') {
    return createOpenAI({ apiKey: config.apiKey })(config.model)
  }
  if (config.provider === 'google') {
    return createGoogleGenerativeAI({ apiKey: config.apiKey })(config.model)
  }
  return createAnthropic({
    apiKey: config.apiKey,
    headers: { 'anthropic-dangerous-direct-browser-access': 'true' }
  })(config.model)
}
