/** Type of source that generated this knowledge card */
export type KnowledgeSourceType = "selection" | "translation" | "dictionary" | "ai-action"

/** Knowledge Card — saved reading item stored in local IndexedDB */
export interface KnowledgeCard {
  id: string
  selectedText: string
  /** Translation / dictionary / AI explanation result (can be empty) */
  resultText?: string
  pageUrl: string
  pageTitle?: string
  sourceType: KnowledgeSourceType
  /** Provider display name e.g. "DeepSeek", "OpenAI", "Microsoft", "local" */
  provider: string
  tags: string[]
  topic: string
  createdAt: number
  updatedAt: number
}

/** Filter / search options for querying knowledge cards */
export interface KnowledgeCardQuery {
  searchText?: string
  tags?: string[]
  topic?: string
  pageUrl?: string
  sourceType?: KnowledgeSourceType
  sortBy?: "createdAt" | "updatedAt"
  sortDirection?: "asc" | "desc"
  limit?: number
  offset?: number
}
