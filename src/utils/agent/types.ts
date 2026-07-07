import type { WebSearchResult } from "@/utils/search/web-search"

export type AgentToolName
  = | "read_page"
    | "web_search"
    | "weather"
    | "search_knowledge"
    | "save_to_knowledge"

export type AgentToolStatus = "running" | "success" | "error" | "skipped"

export interface AgentToolEvent {
  id: string
  tool: AgentToolName
  label: string
  status: AgentToolStatus
  detail?: string
  createdAt: number
}

export interface AgentToolContextResult {
  context: string
  pageContent?: string
  pageTitle?: string
  pageUrl?: string
  webResults?: WebSearchResult[]
}

export type AgentToolEventListener = (event: AgentToolEvent) => void

export function createToolEvent(
  tool: AgentToolName,
  status: AgentToolStatus,
  label: string,
  detail?: string,
): AgentToolEvent {
  return {
    id: `${tool}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tool,
    status,
    label,
    detail,
    createdAt: Date.now(),
  }
}
