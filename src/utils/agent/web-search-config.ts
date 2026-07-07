import type { WebSearchConfig } from "@/utils/search/web-search"
import { browser } from "#imports"

const AGENT_WEB_SEARCH_CONFIG_KEY = "owlnestAgentWebSearchConfig"

export type AgentWebSearchConfig = Partial<WebSearchConfig> & {
  enabled?: boolean
}

export async function getAgentWebSearchConfig(): Promise<WebSearchConfig> {
  const stored = await browser.storage.local.get(AGENT_WEB_SEARCH_CONFIG_KEY) as Record<string, AgentWebSearchConfig | undefined>
  const config = stored[AGENT_WEB_SEARCH_CONFIG_KEY] ?? {}

  return {
    enabled: config.enabled ?? !!config.apiKey,
    provider: config.provider ?? "brave",
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    maxResults: Math.max(1, Math.min(config.maxResults ?? 5, 10)),
  }
}

export async function setAgentWebSearchConfig(config: AgentWebSearchConfig): Promise<void> {
  await browser.storage.local.set({ [AGENT_WEB_SEARCH_CONFIG_KEY]: config })
}
