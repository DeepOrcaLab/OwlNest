import type { KnowledgeCard, KnowledgeCardQuery } from "@/types/knowledge"
import {
  clearAllKnowledge,
  createKnowledgeCard,
  deleteKnowledgeCard,
  exportKnowledgeJSON,
  exportKnowledgeMarkdown,
  getAllKnowledgeTags,
  getAllKnowledgeTopics,
  getKnowledgeCard,
  getKnowledgeCardCount,
  importKnowledgeJSON,
  queryKnowledgeCards,
  updateKnowledgeCard,
} from "@/utils/knowledge/knowledge-db"
import { logger } from "@/utils/logger"
import { onMessage } from "@/utils/message"

/** Register all knowledge base message handlers */
export function setupKnowledgeMessageHandlers(): void {
  const handle = onMessage as any

  handle("knowledge:create", async (message: any) => {
    const { card } = message.data as { card: Omit<KnowledgeCard, "id" | "createdAt" | "updatedAt"> }
    const record = await createKnowledgeCard(card)
    logger.info("[Knowledge] Created card:", record.id)
    return record
  })

  handle("knowledge:update", async (message: any) => {
    const { id, updates } = message.data as { id: string, updates: Partial<Omit<KnowledgeCard, "id" | "createdAt">> }
    await updateKnowledgeCard(id, updates)
    logger.info("[Knowledge] Updated card:", id)
    return { ok: true }
  })

  handle("knowledge:delete", async (message: any) => {
    const { id } = message.data as { id: string }
    await deleteKnowledgeCard(id)
    logger.info("[Knowledge] Deleted card:", id)
    return { ok: true }
  })

  handle("knowledge:get", async (message: any) => {
    const { id } = message.data as { id: string }
    return getKnowledgeCard(id)
  })

  handle("knowledge:query", async (message: any) => {
    const { query } = message.data as { query: KnowledgeCardQuery }
    return queryKnowledgeCards(query)
  })

  handle("knowledge:count", async () => {
    return getKnowledgeCardCount()
  })

  handle("knowledge:tags", async () => {
    return getAllKnowledgeTags()
  })

  handle("knowledge:topics", async () => {
    return getAllKnowledgeTopics()
  })

  handle("knowledge:exportJSON", async () => {
    return exportKnowledgeJSON()
  })

  handle("knowledge:exportMarkdown", async () => {
    return exportKnowledgeMarkdown()
  })

  handle("knowledge:importJSON", async (message: any) => {
    const { json } = message.data as { json: string }
    const count = await importKnowledgeJSON(json)
    logger.info("[Knowledge] Imported cards:", count)
    return { count }
  })

  handle("knowledge:clear", async () => {
    await clearAllKnowledge()
    logger.info("[Knowledge] Cleared all cards")
    return { ok: true }
  })
}
