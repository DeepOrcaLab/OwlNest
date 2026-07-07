import { getRandomUUID } from "@/utils/crypto-polyfill"
import { db } from "@/utils/db/dexie/db"

export interface ChatConversation {
  id: string
  pageUrl: string
  pageTitle?: string
  summary?: string
  createdAt: number
  updatedAt: number
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: "user" | "assistant" | "system"
  content: string
  providerId?: string
  providerName?: string
  model?: string
  createdAt: number
}

/** Get or create a conversation for a page URL */
export async function getOrCreateConversation(
  pageUrl: string,
  pageTitle?: string,
): Promise<ChatConversation> {
  const existing = await db.chatConversations
    .where("pageUrl")
    .equals(pageUrl)
    .first()

  if (existing)
    return existing as unknown as ChatConversation

  const now = Date.now()
  const conv = {
    id: getRandomUUID(),
    pageUrl,
    pageTitle,
    createdAt: now,
    updatedAt: now,
  } as ChatConversation
  await db.chatConversations.put(conv as any)
  return conv
}

/** Get messages for a conversation, ordered by time */
export async function getConversationMessages(
  conversationId: string,
  limit = 50,
): Promise<ChatMessage[]> {
  const msgs = await db.chatMessages
    .where("conversationId")
    .equals(conversationId)
    .sortBy("createdAt")
  return (msgs.slice(-limit) as unknown as ChatMessage[])
}

/** Add a message to a conversation */
export async function addChatMessage(
  msg: Omit<ChatMessage, "id" | "createdAt">,
): Promise<ChatMessage> {
  const record = {
    ...msg,
    id: getRandomUUID(),
    createdAt: Date.now(),
  } as ChatMessage
  await db.chatMessages.put(record as any)

  // Update conversation timestamp
  await db.chatConversations.update(msg.conversationId, {
    updatedAt: Date.now(),
  } as any)

  return record
}

/** Update conversation summary */
export async function updateConversationSummary(
  conversationId: string,
  summary: string,
): Promise<void> {
  await db.chatConversations.update(conversationId, {
    summary,
    updatedAt: Date.now(),
  } as any)
}

/** Clear all messages in a conversation */
export async function clearConversation(conversationId: string): Promise<void> {
  const msgs = await db.chatMessages
    .where("conversationId")
    .equals(conversationId)
    .toArray()
  const ids = msgs.map(m => m.id)
  await db.chatMessages.bulkDelete(ids)
  await db.chatConversations.update(conversationId, {
    summary: undefined,
    updatedAt: Date.now(),
  } as any)
}

/** List all conversations, newest first */
export async function listConversations(): Promise<ChatConversation[]> {
  return (await db.chatConversations
    .orderBy("updatedAt")
    .reverse()
    .toArray()) as unknown as ChatConversation[]
}

/** Delete a conversation and all its messages */
export async function deleteConversation(conversationId: string): Promise<void> {
  await clearConversation(conversationId)
  await db.chatConversations.delete(conversationId)
}
