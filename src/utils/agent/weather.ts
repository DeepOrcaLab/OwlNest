export interface WeatherLookupResult {
  ok: boolean
  text: string
  error?: string
}

interface WeatherLocation {
  name: string
  latitude: number
  longitude: number
  admin1?: string
  country?: string
}

const WEATHER_WORDS = /天气|气温|温度|weather|temperature|forecast/gi
const CHINESE_PREFIXES = /^(?:请问|请|帮我|帮忙|告诉我|查询|查一下|查查|查|看看|看下|今天|明天|后天|现在|当前|当地)+/
const CHINESE_SUFFIXES = /(?:今天|明天|后天|现在|当前|怎么样|如何|怎样|情况|预报|多少度|多少|[呢吗呀啊])+$/

export function extractWeatherLocation(query: string): string | null {
  const compact = query.replace(/\s+/g, "")
  const chineseCandidate = compact
    .replace(CHINESE_PREFIXES, "")
    .replace(WEATHER_WORDS, "")
    .replace(CHINESE_SUFFIXES, "")
    .replace(/的$/g, "")
    .trim()

  if (/[\u3400-\u9FFF]/.test(query))
    return isUsefulLocation(chineseCandidate) ? chineseCandidate : null

  const lower = query.toLowerCase()
  const weatherWord = ["weather", "forecast", "temperature"].find(word => lower.includes(word))
  if (!weatherWord)
    return null

  const weatherIndex = lower.indexOf(weatherWord)
  const before = query.slice(0, weatherIndex).trim()
  const after = query.slice(weatherIndex + weatherWord.length).trim()
  const rawCandidate = before || after.replace(/^(?:in|for|at)\s+/i, "")
  const englishCandidate = rawCandidate.replace(/\b(?:today|tomorrow|now|please)\b/gi, "").trim()

  return englishCandidate && isUsefulLocation(englishCandidate) ? englishCandidate : null
}

export async function fetchWeatherContext(
  query: string,
  fetcher: typeof fetch = fetch,
): Promise<WeatherLookupResult> {
  const location = extractWeatherLocation(query)
  if (!location) {
    return {
      ok: false,
      text: "",
      error: "没有识别到城市，请明确输入城市，例如“深圳天气怎么样”。",
    }
  }

  const errors: string[] = []

  try {
    const wttr = await fetchWttrWeather(location, fetcher)
    if (wttr)
      return { ok: true, text: wttr }
    errors.push("wttr.in 未返回当前天气")
  }
  catch (error) {
    errors.push(`wttr.in：${getErrorMessage(error)}`)
  }

  try {
    const openMeteo = await fetchOpenMeteoWeather(location, fetcher)
    if (openMeteo)
      return { ok: true, text: openMeteo }
    errors.push("Open-Meteo 未找到该地点")
  }
  catch (error) {
    errors.push(`Open-Meteo：${getErrorMessage(error)}`)
  }

  return {
    ok: false,
    text: "",
    error: `天气数据源均不可用：${errors.join("；")}`,
  }
}

async function fetchWttrWeather(location: string, fetcher: typeof fetch): Promise<string> {
  const response = await fetcher(`https://wttr.in/${encodeURIComponent(location)}?format=j1&lang=zh`)
  if (!response.ok)
    throw new Error(`HTTP ${response.status}`)

  const data = await response.json() as any
  const current = data.current_condition?.[0]
  if (!current)
    return ""

  const area = data.nearest_area?.[0]
  return formatWeather({
    source: "wttr.in",
    place: area?.areaName?.[0]?.value ?? location,
    description: current.lang_zh?.[0]?.value ?? current.weatherDesc?.[0]?.value ?? "",
    temperature: current.temp_C,
    feelsLike: current.FeelsLikeC,
    humidity: current.humidity,
    windSpeed: current.windspeedKmph,
  })
}

async function fetchOpenMeteoWeather(location: string, fetcher: typeof fetch): Promise<string> {
  const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search")
  geocodingUrl.searchParams.set("name", location)
  geocodingUrl.searchParams.set("count", "1")
  geocodingUrl.searchParams.set("language", "zh")
  geocodingUrl.searchParams.set("format", "json")

  const geocodingResponse = await fetcher(geocodingUrl)
  if (!geocodingResponse.ok)
    throw new Error(`地名查询 HTTP ${geocodingResponse.status}`)
  const geocodingData = await geocodingResponse.json() as { results?: WeatherLocation[] }
  const place = geocodingData.results?.[0]
  if (!place)
    return ""

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast")
  forecastUrl.searchParams.set("latitude", String(place.latitude))
  forecastUrl.searchParams.set("longitude", String(place.longitude))
  forecastUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m")
  forecastUrl.searchParams.set("timezone", "auto")

  const forecastResponse = await fetcher(forecastUrl)
  if (!forecastResponse.ok)
    throw new Error(`天气查询 HTTP ${forecastResponse.status}`)
  const forecast = await forecastResponse.json() as any
  const current = forecast.current
  if (!current)
    return ""

  return formatWeather({
    source: "Open-Meteo",
    place: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
    description: describeWeatherCode(current.weather_code),
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
  })
}

function formatWeather(data: {
  source: string
  place: string
  description: string
  temperature: unknown
  feelsLike: unknown
  humidity: unknown
  windSpeed: unknown
}): string {
  return [
    `Location: ${data.place}`,
    `Weather: ${data.description}`,
    `Temperature: ${data.temperature}°C`,
    `Feels like: ${data.feelsLike}°C`,
    `Humidity: ${data.humidity}%`,
    `Wind: ${data.windSpeed} km/h`,
    `Source: ${data.source}`,
  ].join("\n")
}

function describeWeatherCode(code: number): string {
  if (code === 0)
    return "晴"
  if (code <= 3)
    return "多云"
  if (code <= 48)
    return "雾"
  if (code <= 67)
    return "雨"
  if (code <= 77)
    return "雪"
  if (code <= 82)
    return "阵雨"
  if (code <= 86)
    return "阵雪"
  if (code <= 99)
    return "雷暴"
  return "未知"
}

function isUsefulLocation(value: string): boolean {
  return value.length >= 2 && !/^(?:天气|气温|温度|现在|当前|当地|今天|明天|后天|怎么样|如何)$/.test(value)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
