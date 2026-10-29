// Weather is deliberately keyed by garden ID. Never use a user-wide or
// default-location cache for garden data.

export interface WeatherForecastDay {
  day: string;
  high: number;
  low: number;
  description: string;
  rain: number;
  rainProb: number;
  windSpeed: number;
  uvIndex: number | null;
}

export interface WeatherResult {
  current: {
    temp: number;
    description: string;
    humidity: number;
    rain: number;
    rainProb: number;
    windSpeed: number;
    uvIndex: number | null;
  };
  forecast: WeatherForecastDay[];
  fetchedAt: string;
  isStale: boolean;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    uv_index?: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    uv_index_max?: number[];
  };
}

interface CacheEntry {
  lat: number;
  lng: number;
  expiresAt: number;
  weather: WeatherResult;
}

export class WeatherUnavailableError extends Error {}

const gardenWeatherCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

function cacheTtlMs() {
  const seconds = Number(process.env.WEATHER_CACHE_TTL_SECONDS ?? "600");
  return Number.isFinite(seconds) && seconds > 0
    ? seconds * 1000
    : DEFAULT_CACHE_TTL_MS;
}

function descriptionFor(code: number) {
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

function round(value: number) {
  return Math.round(value);
}

function toWeatherResult(data: OpenMeteoResponse): WeatherResult {
  return {
    current: {
      temp: round(data.current.temperature_2m),
      description: descriptionFor(data.current.weather_code),
      humidity: data.current.relative_humidity_2m,
      rain: data.current.precipitation,
      rainProb: data.daily.precipitation_probability_max[0] ?? 0,
      windSpeed: round(data.current.wind_speed_10m),
      uvIndex: data.current.uv_index ?? null,
    },
    forecast: data.daily.time.slice(1, 4).map((time, index) => {
      const dayIndex = index + 1;
      return {
        day: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
          new Date(`${time}T12:00:00Z`),
        ),
        high: round(data.daily.temperature_2m_max[dayIndex]),
        low: round(data.daily.temperature_2m_min[dayIndex]),
        description: descriptionFor(data.daily.weather_code[dayIndex]),
        rain: data.daily.precipitation_sum[dayIndex] ?? 0,
        rainProb: data.daily.precipitation_probability_max[dayIndex] ?? 0,
        windSpeed: round(data.daily.wind_speed_10m_max[dayIndex]),
        uvIndex: data.daily.uv_index_max?.[dayIndex] ?? null,
      };
    }),
    fetchedAt: new Date().toISOString(),
    isStale: false,
  };
}

export async function getGardenWeather(
  garden: { id: string; lat: number; lng: number },
  options: { fetcher?: typeof fetch; ttlMs?: number } = {},
): Promise<WeatherResult> {
  const now = Date.now();
  const cached = gardenWeatherCache.get(garden.id);
  if (cached && cached.lat === garden.lat && cached.lng === garden.lng && cached.expiresAt > now) {
    return cached.weather;
  }

  const url = new URL(process.env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(garden.lat));
  url.searchParams.set("longitude", String(garden.lng));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,uv_index");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max");
  url.searchParams.set("timezone", "auto");

  try {
    const response = await (options.fetcher ?? fetch)(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
    const weather = toWeatherResult((await response.json()) as OpenMeteoResponse);
    gardenWeatherCache.set(garden.id, {
      lat: garden.lat,
      lng: garden.lng,
      expiresAt: now + (options.ttlMs ?? cacheTtlMs()),
      weather,
    });
    return weather;
  } catch (error) {
    // Last-known data is returned only for the identical garden and coordinates.
    if (cached && cached.lat === garden.lat && cached.lng === garden.lng) {
      return { ...cached.weather, isStale: true };
    }
    throw new WeatherUnavailableError("Weather data is temporarily unavailable", { cause: error });
  }
}

export function clearGardenWeatherCacheForTests() {
  gardenWeatherCache.clear();
}
