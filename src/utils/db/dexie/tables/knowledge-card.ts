import { Entity } from "dexie"

export default class KnowledgeCardEntity extends Entity {
  id!: string
  selectedText!: string
  resultText?: string
  pageUrl!: string
  pageTitle?: string
  sourceType!: string
  provider!: string
  tags!: string[]
  topic!: string
  createdAt!: number
  updatedAt!: number
}
