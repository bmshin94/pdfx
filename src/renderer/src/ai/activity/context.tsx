import { createContext, useContext } from 'react'

export interface AiActivityView {
  active: ReadonlySet<string>
  flash: ReadonlySet<string>
}

const AiActivityContext = createContext<AiActivityView>({ active: new Set(), flash: new Set() })

export const AiActivityProvider = AiActivityContext.Provider

export function useAiActivePages(): ReadonlySet<string> {
  return useContext(AiActivityContext).active
}

export function useAiFlashPages(): ReadonlySet<string> {
  return useContext(AiActivityContext).flash
}
