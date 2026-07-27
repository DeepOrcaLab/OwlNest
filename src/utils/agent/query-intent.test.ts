import { describe, expect, it } from "vitest"
import { buildKnowledgeSearchTerms, isKnowledgeQuery, shouldReadCurrentPage, shouldReadCurrentVideo } from "./query-intent"

describe("agent query intent", () => {
  it("recognizes advanced reading requests", () => {
    expect(shouldReadCurrentPage("深度阅读这篇文章并给出证据")).toBe(true)
    expect(shouldReadCurrentPage("create study cards from this page")).toBe(true)
  })

  it("recognizes knowledge-linking requests", () => {
    expect(isKnowledgeQuery("把这篇文章和我之前保存的笔记比较一下")).toBe(true)
    expect(isKnowledgeQuery("connect this page with my saved notes")).toBe(true)
  })

  it("recognizes video summary requests", () => {
    expect(shouldReadCurrentVideo("总结一下这个视频讲了什么")).toBe(true)
    expect(shouldReadCurrentVideo("summarize this video")).toBe(true)
    expect(shouldReadCurrentVideo("总结这篇文章")).toBe(false)
  })

  it("extracts useful knowledge terms and includes the page title", () => {
    expect(buildKnowledgeSearchTerms(
      "帮我在知识库里查找 transformer 架构的笔记",
      "Attention Is All You Need",
    )).toEqual(["transformer", "架构的笔记", "Attention Is All You Need"])
  })
})
