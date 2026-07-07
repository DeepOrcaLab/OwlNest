import type { EntityTable } from "dexie"
import type KnowledgeCardEntity from "./tables/knowledge-card"
import { upperCamelCase } from "case-anything"
import Dexie from "dexie"
import { APP_NAME } from "@/utils/constants/app"
import AiSegmentationCache from "./tables/ai-segmentation-cache"
import ArticleSummaryCache from "./tables/article-summary-cache"
import BatchRequestRecord from "./tables/batch-request-record"
import ChatConversationEntity from "./tables/chat-conversation"
import ChatMessageEntity from "./tables/chat-message"
import TranslationCache from "./tables/translation-cache"

export default class AppDB extends Dexie {
  translationCache!: EntityTable<
    TranslationCache,
    "key"
  >

  batchRequestRecord!: EntityTable<
    BatchRequestRecord,
    "key"
  >

  articleSummaryCache!: EntityTable<
    ArticleSummaryCache,
    "key"
  >

  aiSegmentationCache!: EntityTable<
    AiSegmentationCache,
    "key"
  >

  knowledgeCards!: EntityTable<
    KnowledgeCardEntity,
    "id"
  >

  chatConversations!: EntityTable<
    ChatConversationEntity,
    "id"
  >

  chatMessages!: EntityTable<
    ChatMessageEntity,
    "id"
  >

  constructor() {
    super(`${upperCamelCase(APP_NAME)}DB`)
    this.version(1).stores({
      translationCache: `
        key,
        translation,
        createdAt`,
    })
    this.version(2).stores({
      translationCache: `
        key,
        translation,
        createdAt`,
      batchRequestRecord: `
        key,
        createdAt,
        originalRequestCount,
        provider,
        model`,
    })
    this.version(3).stores({
      translationCache: `
        key,
        translation,
        createdAt`,
      batchRequestRecord: `
        key,
        createdAt,
        originalRequestCount,
        provider,
        model`,
      articleSummaryCache: `
        key,
        createdAt`,
    })
    this.version(4).stores({
      translationCache: `
        key,
        translation,
        createdAt`,
      batchRequestRecord: `
        key,
        createdAt,
        originalRequestCount,
        provider,
        model`,
      articleSummaryCache: `
        key,
        createdAt`,
      aiSegmentationCache: `
        key,
        createdAt`,
    })
    this.version(5).stores({
      translationCache: `
        key,
        translation,
        createdAt`,
      batchRequestRecord: `
        key,
        createdAt,
        originalRequestCount,
        provider,
        model`,
      articleSummaryCache: `
        key,
        createdAt`,
      aiSegmentationCache: `
        key,
        createdAt`,
      knowledgeCards: `
        id,
        selectedText,
        resultText,
        pageUrl,
        pageTitle,
        sourceType,
        provider,
        *tags,
        topic,
        createdAt,
        updatedAt`,
    })
    this.translationCache.mapToClass(TranslationCache)
    this.batchRequestRecord.mapToClass(BatchRequestRecord)
    this.articleSummaryCache.mapToClass(ArticleSummaryCache)
    this.aiSegmentationCache.mapToClass(AiSegmentationCache)
    this.version(6).stores({
      translationCache: `key, translation, createdAt`,
      batchRequestRecord: `key, createdAt, originalRequestCount, provider, model`,
      articleSummaryCache: `key, createdAt`,
      aiSegmentationCache: `key, createdAt`,
      knowledgeCards: `id, selectedText, resultText, pageUrl, pageTitle, sourceType, provider, *tags, topic, createdAt, updatedAt`,
      chatConversations: `id, pageUrl, createdAt, updatedAt`,
      chatMessages: `id, conversationId, role, createdAt`,
    })
    this.chatConversations.mapToClass(ChatConversationEntity)
    this.chatMessages.mapToClass(ChatMessageEntity)
  }
}
