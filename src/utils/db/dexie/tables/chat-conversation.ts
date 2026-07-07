import { Entity } from "dexie"

export default class ChatConversationEntity extends Entity {
  id!: string
  pageUrl!: string
  pageTitle?: string
  summary?: string
  createdAt!: number
  updatedAt!: number
}
