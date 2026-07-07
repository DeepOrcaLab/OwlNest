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
  return /左侧|左边|旁边|当前页|当前网页|打开的页面|正在看的|这个网页|这个页面|页面内容|这篇|本文|this page|current page|active tab|current tab|summari[sz]e|总结|概括|提炼|read page/i.test(query)
}

export function isSaveToKnowledgeQuery(query: string): boolean {
  return /保存这个|保存当前|保存到知识|save this|save current|save to knowledge|收藏这个/i.test(query)
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
