import type { KnowledgeCard, KnowledgeCardQuery } from "@/types/knowledge"
import { getRandomUUID } from "@/utils/crypto-polyfill"
import { db } from "@/utils/db/dexie/db"

/** Create a new knowledge card in the local IndexedDB */
export async function createKnowledgeCard(
  card: Omit<KnowledgeCard, "id" | "createdAt" | "updatedAt">,
): Promise<KnowledgeCard> {
  const now = Date.now()
  const record = {
    ...card,
    id: getRandomUUID(),
    createdAt: now,
    updatedAt: now,
  } as KnowledgeCard
  await db.knowledgeCards.put(record)
  return record
}

/** Update an existing knowledge card by id */
export async function updateKnowledgeCard(
  id: string,
  updates: Partial<Omit<KnowledgeCard, "id" | "createdAt">>,
): Promise<void> {
  await db.knowledgeCards.update(id, {
    ...updates,
    updatedAt: Date.now(),
  })
}

/** Delete a knowledge card by id */
export async function deleteKnowledgeCard(id: string): Promise<void> {
  await db.knowledgeCards.delete(id)
}

/** Get a single knowledge card by id */
export async function getKnowledgeCard(id: string): Promise<KnowledgeCard | undefined> {
  return db.knowledgeCards.get(id) as unknown as KnowledgeCard | undefined
}

/** Query knowledge cards with optional filters and sorting */
export async function queryKnowledgeCards(
  query: KnowledgeCardQuery = {},
): Promise<KnowledgeCard[]> {
  let collection = db.knowledgeCards.toCollection()

  // Apply text search across selectedText, resultText, topic
  if (query.searchText) {
    const search = query.searchText.toLowerCase()
    collection = collection.filter(card =>
      card.selectedText.toLowerCase().includes(search)
      || card.resultText?.toLowerCase().includes(search)
      || card.topic?.toLowerCase().includes(search)
      || (card.tags?.some(tag => tag.toLowerCase().includes(search)) ?? false),
    )
  }

  // Filter by page URL
  if (query.pageUrl) {
    collection = collection.filter(card => card.pageUrl === query.pageUrl)
  }

  // Filter by topic
  if (query.topic) {
    collection = collection.filter(card => card.topic === query.topic)
  }

  // Filter by source type
  if (query.sourceType) {
    collection = collection.filter(card => card.sourceType === query.sourceType)
  }

  // Filter by tags (any match)
  if (query.tags && query.tags.length > 0) {
    collection = collection.filter(card =>
      (card.tags?.some(tag => query.tags!.includes(tag)) ?? false),
    )
  }

  // Sort
  const sortField = query.sortBy ?? "createdAt"
  const results = await collection.sortBy(sortField) as unknown as KnowledgeCard[]

  // Apply sort direction
  if (query.sortDirection !== "asc") {
    results.reverse()
  }

  // Apply offset and limit
  if (query.offset || query.limit) {
    const start = query.offset ?? 0
    const end = query.limit ? start + query.limit : undefined
    return results.slice(start, end)
  }

  return results as unknown as KnowledgeCard[]
}

/** Get all unique tags from knowledge cards */
export async function getAllKnowledgeTags(): Promise<string[]> {
  const cards = await db.knowledgeCards.toArray() as unknown as KnowledgeCard[]
  const tagSet = new Set<string>()
  for (const card of cards) {
    card.tags?.forEach(tag => tagSet.add(tag))
  }
  return Array.from(tagSet).sort()
}

/** Get all unique topics from knowledge cards */
export async function getAllKnowledgeTopics(): Promise<string[]> {
  const cards = await db.knowledgeCards.toArray() as unknown as KnowledgeCard[]
  const topicSet = new Set<string>()
  for (const card of cards) {
    if (card.topic)
      topicSet.add(card.topic)
  }
  return Array.from(topicSet).sort()
}

/** Get total count of knowledge cards */
export async function getKnowledgeCardCount(): Promise<number> {
  return db.knowledgeCards.count()
}

/** Export all knowledge cards as JSON */
export async function exportKnowledgeJSON(): Promise<string> {
  const cards = await db.knowledgeCards.toArray() as unknown as KnowledgeCard[]
  return JSON.stringify(cards, null, 2)
}

/** Export all knowledge cards as Markdown */
export async function exportKnowledgeMarkdown(): Promise<string> {
  const cards = (await db.knowledgeCards.reverse().sortBy("createdAt")) as unknown as KnowledgeCard[]
  const header = [
    "# OwlNest Knowledge Export",
    "",
    `Exported at: ${new Date().toISOString().replace("T", " ").slice(0, 19)}`,
    `Total cards: ${cards.length}`,
    "",
    "---",
    "",
  ].join("\n")
  return header + cards.map((card) => {
    const parts: string[] = []
    parts.push(`## ${card.selectedText.slice(0, 80)}`)
    if (card.resultText)
      parts.push(`\n${card.resultText}`)
    parts.push(`\n- **Source**: \`${card.sourceType}\``)
    parts.push(`- **Provider**: ${card.provider}`)
    if (card.pageUrl)
      parts.push(`- **URL**: ${card.pageUrl}`)
    if (card.pageTitle)
      parts.push(`- **Page**: ${card.pageTitle}`)
    if (card.tags?.length)
      parts.push(`- **Tags**: ${card.tags.join(", ")}`)
    if (card.topic)
      parts.push(`- **Topic**: ${card.topic}`)
    parts.push(`- **Created**: ${new Date(card.createdAt).toISOString()}`)
    return parts.join("\n")
  }).join("\n\n---\n\n")
}

/** Import knowledge cards from a JSON string. Returns count of imported cards. */
export async function importKnowledgeJSON(json: string): Promise<number> {
  const parsed = JSON.parse(json) as KnowledgeCard[]
  if (!Array.isArray(parsed))
    throw new Error("Invalid knowledge export format: expected an array")

  let imported = 0
  for (const card of parsed) {
    if (!card.selectedText || !card.pageUrl)
      continue
    await db.knowledgeCards.put({
      ...card,
      id: card.id ?? getRandomUUID(),
      tags: card.tags ?? [],
      topic: card.topic ?? "",
      createdAt: card.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    } as KnowledgeCard)
    imported++
  }
  return imported
}

/** Clear all knowledge cards */
export async function clearAllKnowledge(): Promise<void> {
  await db.knowledgeCards.clear()
}
