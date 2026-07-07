import { buildSearchQuery } from "@/utils/agent/query-intent"

export interface WebSearchResult {
  title: string
  snippet: string
  url: string
  source: string
  publishedAt?: string
}

export interface WebSearchConfig {
  enabled: boolean
  provider: "brave" | "tavily" | "serpapi" | "bing" | "google" | "custom"
  apiKey?: string
  baseURL?: string
  maxResults: number
}

const WEATHER_KEYWORDS = [
  "天气", "weather", "气温", "下雨", "下雪", "台风", "阴天", "晴天",
  "多云", "湿度", "风力", "雾霾", "冰雹", "霜冻", "暴风雨", "雷阵雨",
  "temperature", "rain", "snow", "storm", "forecast", "humidity",
]

const NEWS_KEYWORDS = [
  "新闻", "news", "最新", "latest", "今天", "today", "刚刚", "刚刚发布",
  "recent", "breaking", "update",
]

const NEWS_QUERY_RE = /新闻|news|最新|latest|今天|today|刚刚|breaking|大事|动态|进展|发布|release|update/i
const SILICON_VALLEY_AI_RE = /硅谷|silicon valley|湾区|bay area/i
const AI_QUERY_RE = /\bAI\b|artificial intelligence|人工智能|大模型|模型|硅谷|silicon valley/i

const AI_NEWS_FEEDS = [
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "TechCrunch AI" },
  { url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", source: "The Verge AI" },
  { url: "https://feeds.arstechnica.com/arstechnica/technology-lab", source: "Ars Technica" },
]

/** Check if a query likely needs web search */
export function needsWebSearch(query: string): boolean {
  const lower = query.toLowerCase()
  return WEATHER_KEYWORDS.some(kw => lower.includes(kw))
    || NEWS_KEYWORDS.some(kw => lower.includes(kw))
    || /价格|price|股价|stock|汇率|rate|版本|version|发布|release|最新消息/.test(lower)
}

/** Simple fallback: open search in new tab */
export function openSearchFallback(query: string): void {
  const url = `https://www.google.com/search?q=${encodeURIComponent(buildSearchQuery(query))}`
  window.open(url, "_blank", "noopener,noreferrer")
}

/** Search via Brave Search API */
export async function braveSearch(query: string, apiKey: string, maxResults = 5): Promise<WebSearchResult[]> {
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`,
    {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    },
  )
  if (!response.ok)
    throw new Error(`Brave Search failed: ${response.status}`)
  const data = await response.json() as any
  return (data.web?.results ?? []).map((r: any) => ({
    title: r.title ?? "",
    snippet: r.description ?? "",
    url: r.url ?? "",
    source: "Brave Search",
    publishedAt: r.page_age,
  }))
}

/** Search via Tavily API */
export async function tavilySearch(query: string, apiKey: string, maxResults = 5): Promise<WebSearchResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults, include_answer: true }),
  })
  if (!response.ok)
    throw new Error(`Tavily Search failed: ${response.status}`)
  const data = await response.json() as any
  return (data.results ?? []).map((r: any) => ({
    title: r.title ?? "",
    snippet: r.content ?? "",
    url: r.url ?? "",
    source: "Tavily",
  }))
}

/** Search via DuckDuckGo Instant Answer API. This is not full web search, but gives a no-key fallback. */
export async function duckDuckGoInstantAnswerSearch(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const response = await fetchWithTimeout(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`)
  if (!response.ok)
    throw new Error(`DuckDuckGo Search failed: ${response.status}`)
  const data = await response.json() as any
  const results: WebSearchResult[] = []

  if (data.AbstractText || data.AbstractURL) {
    results.push({
      title: data.Heading || query,
      snippet: data.AbstractText || data.Abstract || "",
      url: data.AbstractURL || data.AbstractSource || "",
      source: "DuckDuckGo",
    })
  }

  const related = (data.RelatedTopics ?? [])
    .flatMap((item: any) => item.Topics ?? [item])
    .filter((item: any) => item.Text || item.FirstURL)
    .slice(0, maxResults)

  for (const item of related) {
    results.push({
      title: item.Text?.split(" - ")[0]?.slice(0, 90) || item.FirstURL || query,
      snippet: item.Text ?? "",
      url: item.FirstURL ?? "",
      source: "DuckDuckGo",
    })
  }

  return results.filter(result => result.title || result.snippet || result.url).slice(0, maxResults)
}

/** Search Google News RSS without an API key. */
export async function googleNewsRssSearch(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const rssUrl = new URL("https://news.google.com/rss/search")
  rssUrl.searchParams.set("q", query)
  rssUrl.searchParams.set("hl", "zh-CN")
  rssUrl.searchParams.set("gl", "US")
  rssUrl.searchParams.set("ceid", "US:zh-Hans")

  const response = await fetchWithTimeout(rssUrl.toString(), undefined, 4500)
  if (!response.ok)
    throw new Error(`Google News RSS failed: ${response.status}`)

  const xml = await response.text()
  const doc = new DOMParser().parseFromString(xml, "text/xml")
  const items = Array.from(doc.querySelectorAll("item")).slice(0, maxResults)

  return items.map((item) => {
    const title = item.querySelector("title")?.textContent?.trim() ?? ""
    const link = item.querySelector("link")?.textContent?.trim() ?? ""
    const description = item.querySelector("description")?.textContent?.trim() ?? ""
    const publishedAt = item.querySelector("pubDate")?.textContent?.trim() ?? undefined
    const source = item.querySelector("source")?.textContent?.trim()

    return {
      title: stripHtml(title),
      snippet: stripHtml(description),
      url: link,
      source: source ? `Google News: ${source}` : "Google News",
      publishedAt,
    }
  }).filter(result => result.title || result.snippet || result.url)
}

/** Pull recent items from well-known AI/tech RSS feeds without an API key. */
export async function aiNewsFeedSearch(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const queryTerms = buildFeedQueryTerms(query)
  const feedResults = await Promise.allSettled(
    AI_NEWS_FEEDS.map(async (feed) => {
      const response = await fetchWithTimeout(feed.url, undefined, 4500)
      if (!response.ok)
        throw new Error(`${feed.source} RSS failed: ${response.status}`)

      const xml = await response.text()
      const doc = new DOMParser().parseFromString(xml, "text/xml")
      const nodes = Array.from(doc.querySelectorAll("item, entry"))

      return nodes.map(node => parseFeedItem(node, feed.source))
    }),
  )

  return feedResults
    .flatMap(result => result.status === "fulfilled" ? result.value : [])
    .filter(result => isFeedResultRelevant(result, queryTerms))
    .sort((a, b) => getResultTime(b) - getResultTime(a))
    .slice(0, maxResults)
}

/** Search GDELT's public news index without an API key. */
export async function gdeltNewsSearch(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc")
  url.searchParams.set("query", normalizeNewsIndexQuery(query))
  url.searchParams.set("mode", "ArtList")
  url.searchParams.set("format", "json")
  url.searchParams.set("sort", "HybridRel")
  url.searchParams.set("maxrecords", String(maxResults))

  const response = await fetchWithTimeout(url.toString(), undefined, 4500)
  if (!response.ok)
    throw new Error(`GDELT Search failed: ${response.status}`)

  const data = await response.json() as any
  return (data.articles ?? []).map((article: any) => ({
    title: article.title ?? "",
    snippet: article.seendate ? `Seen: ${article.seendate}` : article.domain ?? "",
    url: article.url ?? "",
    source: article.sourcecountry ? `GDELT: ${article.domain ?? article.sourcecountry}` : "GDELT",
    publishedAt: article.seendate,
  })).filter((result: WebSearchResult) => result.title || result.snippet || result.url)
}

/** Search Hacker News Algolia without an API key. Useful for developer/AI startup news. */
export async function hackerNewsSearch(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const url = new URL("https://hn.algolia.com/api/v1/search_by_date")
  url.searchParams.set("query", query)
  url.searchParams.set("tags", "story")
  url.searchParams.set("hitsPerPage", String(maxResults))

  const response = await fetchWithTimeout(url.toString(), undefined, 4500)
  if (!response.ok)
    throw new Error(`Hacker News Search failed: ${response.status}`)

  const data = await response.json() as any
  return (data.hits ?? []).map((hit: any) => ({
    title: hit.title ?? hit.story_title ?? "",
    snippet: `Points: ${hit.points ?? 0}, comments: ${hit.num_comments ?? 0}`,
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    source: "Hacker News",
    publishedAt: hit.created_at,
  })).filter((result: WebSearchResult) => result.title || result.snippet || result.url)
}

async function noKeyFallbackSearch(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const queries = buildFallbackQueries(query)
  const results: WebSearchResult[] = []

  for (const searchQuery of queries) {
    if (results.length >= maxResults)
      break

    if (AI_QUERY_RE.test(query) && results.length < maxResults) {
      try {
        results.push(...await aiNewsFeedSearch(searchQuery, maxResults - results.length))
      }
      catch {
        // Fall through to the next no-key source.
      }
    }

    if (SILICON_VALLEY_AI_RE.test(query) && results.length < maxResults) {
      try {
        results.push(...await hackerNewsSearch(searchQuery, maxResults - results.length))
      }
      catch {
        // Fall through to the next no-key source.
      }
    }

    if (NEWS_QUERY_RE.test(query)) {
      try {
        results.push(...await googleNewsRssSearch(searchQuery, maxResults - results.length))
      }
      catch {
        // Fall through to the next no-key source.
      }

      if (results.length < maxResults) {
        try {
          results.push(...await gdeltNewsSearch(searchQuery, maxResults - results.length))
        }
        catch {
          // Fall through to the next no-key source.
        }
      }
    }

    if (results.length < maxResults) {
      try {
        results.push(...await duckDuckGoInstantAnswerSearch(searchQuery, maxResults - results.length))
      }
      catch {
        // No-key search is best-effort.
      }
    }
  }

  return sortSearchResultsByDate(dedupeSearchResults(results)).slice(0, maxResults)
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  }
  finally {
    globalThis.clearTimeout(timeout)
  }
}

/** Generic search function that picks the right provider */
export async function performWebSearch(
  query: string,
  config: WebSearchConfig,
): Promise<{ results: WebSearchResult[], fallbackUsed: boolean }> {
  const searchQuery = buildSearchQuery(query)

  if (!config.enabled || !config.apiKey) {
    const results = await noKeyFallbackSearch(query, config.maxResults)
    return { results, fallbackUsed: true }
  }

  try {
    let results: WebSearchResult[] = []
    switch (config.provider) {
      case "brave":
        results = await braveSearch(searchQuery, config.apiKey, config.maxResults)
        break
      case "tavily":
        results = await tavilySearch(searchQuery, config.apiKey, config.maxResults)
        break
      default:
        // Custom provider — try generic API
        if (config.baseURL) {
          const resp = await fetch(`${config.baseURL}?q=${encodeURIComponent(searchQuery)}&limit=${config.maxResults}`, {
            headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
          })
          if (resp.ok) {
            const data = await resp.json() as any
            results = (data.results ?? data ?? []).map((r: any) => ({
              title: r.title ?? r.name ?? "",
              snippet: r.snippet ?? r.description ?? r.content ?? "",
              url: r.url ?? r.link ?? "",
              source: "Web Search",
            }))
          }
        }
        break
    }
    return { results: sortSearchResultsByDate(results).slice(0, config.maxResults), fallbackUsed: false }
  }
  catch {
    const results = await noKeyFallbackSearch(query, config.maxResults)
    return { results, fallbackUsed: true }
  }
}

/** Format search results for AI context */
export function formatSearchResults(results: WebSearchResult[]): string {
  if (!results.length)
    return ""
  return sortSearchResultsByDate(results).map((r, i) =>
    `Latest available result ${i + 1}: ${r.title}\n   ${r.snippet}\n   URL: ${r.url}${r.source ? ` (${r.source})` : ""}${r.publishedAt ? `\n   Published: ${r.publishedAt}` : ""}`,
  ).join("\n\n")
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function dedupeSearchResults(results: WebSearchResult[]): WebSearchResult[] {
  const seen = new Set<string>()
  return results.filter((result) => {
    const key = result.url || `${result.title}:${result.snippet}`
    if (!key || seen.has(key))
      return false
    seen.add(key)
    return true
  })
}

function buildFallbackQueries(query: string): string[] {
  const cleaned = buildSearchQuery(query)
  const queries = [cleaned]
  const normalized = cleaned
    .replace(/美国/g, "US")
    .replace(/硅谷/g, "Silicon Valley")
    .replace(/湾区/g, "Bay Area")
    .replace(/今天/g, "latest")
    .replace(/大事/g, "news")
    .replace(/最新/g, "latest")
    .replace(/人工智能/g, "AI")

  queries.push(normalized)

  if (SILICON_VALLEY_AI_RE.test(query)) {
    queries.push(
      "Silicon Valley AI news",
      "latest Silicon Valley artificial intelligence",
      "US artificial intelligence startup news",
      "AI startup funding Silicon Valley",
      "AI regulation Silicon Valley technology news",
    )
  }

  if (/openai|anthropic|google|deepmind|meta|nvidia|苹果|apple|微软|microsoft|特斯拉|tesla/i.test(query)) {
    queries.push(`${normalized} AI news`)
  }

  return Array.from(new Set(queries.map(item => item.trim()).filter(Boolean))).slice(0, 6)
}

function normalizeNewsIndexQuery(query: string): string {
  return query
    .replace(/\bAI\b/gi, "artificial intelligence")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function sortSearchResultsByDate(results: WebSearchResult[]): WebSearchResult[] {
  return [...results].sort((a, b) => getResultTime(b) - getResultTime(a))
}

function getResultTime(result: WebSearchResult): number {
  if (!result.publishedAt)
    return 0
  const parsed = Date.parse(result.publishedAt)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseFeedItem(node: Element, source: string): WebSearchResult {
  const title = node.querySelector("title")?.textContent?.trim() ?? ""
  const description = node.querySelector("description")?.textContent?.trim()
    ?? node.querySelector("summary")?.textContent?.trim()
    ?? node.querySelector("content")?.textContent?.trim()
    ?? ""
  const linkNode = node.querySelector("link")
  const link = linkNode?.getAttribute("href") || linkNode?.textContent?.trim() || ""
  const publishedAt = node.querySelector("pubDate")?.textContent?.trim()
    ?? node.querySelector("published")?.textContent?.trim()
    ?? node.querySelector("updated")?.textContent?.trim()
    ?? undefined

  return {
    title: stripHtml(title),
    snippet: stripHtml(description).slice(0, 260),
    url: link,
    source,
    publishedAt,
  }
}

function buildFeedQueryTerms(query: string): string[] {
  const normalized = buildSearchQuery(query)
    .replace(/人工智能/g, "AI")
    .replace(/硅谷/g, "Silicon Valley")
    .toLowerCase()

  const terms = normalized
    .split(/[^a-z0-9]+/i)
    .map(term => term.trim())
    .filter(term => term.length > 2 && !["today", "latest", "news", "search", "silicon", "valley"].includes(term))

  if (AI_QUERY_RE.test(query))
    terms.push("ai", "artificial", "intelligence")

  return Array.from(new Set(terms))
}

function isFeedResultRelevant(result: WebSearchResult, queryTerms: string[]): boolean {
  if (queryTerms.length === 0)
    return true

  const text = `${result.title} ${result.snippet} ${result.source}`.toLowerCase()
  return queryTerms.some(term => text.includes(term))
}
