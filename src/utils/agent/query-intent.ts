const WEB_KEYWORDS = [
  "新闻",
  "最新",
  "今天",
  "实时",
  "搜索",
  "上网",
  "联网",
  "查一下",
  "news",
  "latest",
  "today",
  "search",
  "web",
  "current",
]

export function shouldReadCurrentPage(query: string): boolean {
  return /左侧|左边|旁边|当前页|当前网页|打开的页面|正在看的|这个网页|这个页面|页面内容|这篇|本文|this page|current page|active tab|current tab|summari[sz]e|总结|概括|提炼|深度阅读|精读|论点|证据|学习卡|闪卡|read deeply|key points|evidence|study cards|flashcards/i.test(query)
}

export function shouldReadCurrentVideo(query: string): boolean {
  return /视频|影片|字幕|转录|讲了什么|说了什么|video|subtitles?|captions?|transcript|what.*(?:video|clip).*(?:about|say)|summari[sz]e.*(?:video|clip)/i.test(query)
}

export function isSaveToKnowledgeQuery(query: string): boolean {
  return /保存这个|保存当前|保存到知识|save this|save current|save to knowledge|收藏这个/i.test(query)
}

export function isKnowledgeQuery(query: string): boolean {
  return /知识巢|知识库|以前保存|之前保存|我的笔记|历史笔记|关联旧|对比旧|已有知识|knowledge|saved notes?|my notes?|previous notes?|connect.*notes?|compare.*notes?/i.test(query)
}

export function buildKnowledgeSearchTerms(query: string, pageTitle?: string): string[] {
  const cleaned = query
    .replace(/请|帮我|一下|看看|查找|搜索|检索|关联|对比|比较|知识巢|知识库|以前保存|之前保存|我的笔记|历史笔记|已有知识/g, " ")
    .replace(/please|help me|search|find|look up|connect|compare|knowledge|saved notes?|my notes?|previous notes?/gi, " ")

  const terms = cleaned
    .split(/[\s,，。！？!?、:：;；()[\]{}"'“”‘’/\\]+/)
    .map(term => term.trim())
    .filter(term => term.length >= 2)

  if (pageTitle?.trim())
    terms.push(pageTitle.trim())

  return [...new Set(terms)].slice(0, 8)
}

export function isWeatherQuery(query: string): boolean {
  return /天气|气温|下雨|下雪|weather|temperature|forecast|rain|snow/i.test(query)
}

export function shouldSearchWeb(query: string): boolean {
  const lower = query.toLowerCase()
  return WEB_KEYWORDS.some(keyword => lower.includes(keyword))
    || /价格|price|股价|stock|汇率|rate|版本|version|发布|release|最新消息/.test(lower)
}

export function isExplicitWebSearchQuery(query: string): boolean {
  return /查询|搜索|搜一下|查一下|查一查|上网|联网|新闻|最新|今天.*大事|实时|帮我搜|search|look up|web search|latest|today.*news|breaking/i.test(query)
}

export function buildSearchQuery(userQuery: string): string {
  return userQuery
    .replace(/^(?:请|帮我|帮我搜索|搜索|查一下|查一查|告诉我|what is|tell me about|search for|look up)\s*/i, "")
    .trim()
}
