import { describe, expect, it, vi } from "vitest"
import { extractWeatherLocation, fetchWeatherContext } from "./weather"

describe("extractWeatherLocation", () => {
  it.each([
    ["查一下深圳天气", "深圳"],
    ["查询今天深圳天气", "深圳"],
    ["今天上海天气怎么样", "上海"],
    ["weather in London today", "London"],
  ])("extracts a location from %s", (query, expected) => {
    expect(extractWeatherLocation(query)).toBe(expected)
  })

  it.each(["现在天气如何", "查天气", "weather now"])("does not mistake time words for a city in %s", (query) => {
    expect(extractWeatherLocation(query)).toBeNull()
  })
})

describe("fetchWeatherContext", () => {
  it("returns a useful location error instead of silently failing", async () => {
    const result = await fetchWeatherContext("现在天气如何", vi.fn() as unknown as typeof fetch)

    expect(result.ok).toBe(false)
    expect(result.error).toContain("明确输入城市")
  })

  it("falls back to Open-Meteo when wttr.in fails", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [{ name: "Shenzhen", admin1: "Guangdong", country: "China", latitude: 22.55, longitude: 114.07 }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        current: {
          temperature_2m: 31,
          apparent_temperature: 35,
          relative_humidity_2m: 70,
          weather_code: 1,
          wind_speed_10m: 9,
        },
      }), { status: 200 })) as unknown as typeof fetch

    const result = await fetchWeatherContext("深圳天气怎么样", fetcher)

    expect(result.ok).toBe(true)
    expect(result.text).toContain("Location: Shenzhen, Guangdong, China")
    expect(result.text).toContain("Temperature: 31°C")
    expect(result.text).toContain("Source: Open-Meteo")
  })
})
