import { Entity } from "dexie"

export default class ChatMessageEntity extends Entity {
  id!: string
  conversationId!: string
  role!: string
  content!: string
  providerId?: string
  providerName?: string
  model?: string
  createdAt!: number
}
