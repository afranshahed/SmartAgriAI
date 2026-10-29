import assert from "node:assert/strict";
import test from "node:test";
import {
  clearGardenWeatherCacheForTests,
  getGardenWeather,
  WeatherUnavailableError,
} from "../src/lib/weather";

const providerPayload = {
  current: {
    temperature_2m: 26.4,
    relative_humidity_2m: 72,
    precipitation: 1.2,
    weather_code: 61,
    wind_speed_10m: 13.6,
    uv_index: 5.4,
  },
  daily: {
    time: ["2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12"],
    temperature_2m_max: [28, 29, 30, 31],
    temperature_2m_min: [20, 21, 22, 23],
    weather_code: [61, 0, 3, 80],
    precipitation_sum: [1.2, 0, 0, 4],
    precipitation_probability_max: [60, 0, 20, 80],
    wind_speed_10m_max: [16, 12, 14, 20],
    uv_index_max: [6, 7, 5, 4],
  },
};

function successfulFetcher(requests: string[]) {
  return async (input: URL | RequestInfo) => {
    requests.push(String(input));
    return new Response(JSON.stringify(providerPayload), { status: 200 });
  };
}

test("different gardens issue different coordinate requests and never share cache entries", async () => {
  clearGardenWeatherCacheForTests();
  const requests: string[] = [];
  const fetcher = successfulFetcher(requests) as typeof fetch;
  const gardenA = { id: "garden-a", lat: 23.81, lng: 90.41 };
  const gardenB = { id: "garden-b", lat: 22.36, lng: 91.82 };

  await getGardenWeather(gardenA, { fetcher });
  await getGardenWeather(gardenB, { fetcher });
  await getGardenWeather(gardenA, { fetcher });

  assert.equal(requests.length, 2, "Garden A's second request must use only Garden A's cache");
  assert.match(requests[0], /latitude=23.81/);
  assert.match(requests[0], /longitude=90.41/);
  assert.match(requests[1], /latitude=22.36/);
  assert.match(requests[1], /longitude=91.82/);
});

test("provider failure returns stale data only for the same garden", async () => {
  clearGardenWeatherCacheForTests();
  const gardenA = { id: "garden-a", lat: 23.81, lng: 90.41 };
  const gardenB = { id: "garden-b", lat: 22.36, lng: 91.82 };
  await getGardenWeather(gardenA, { fetcher: successfulFetcher([]) as typeof fetch, ttlMs: 0 });
  const failingFetcher = async () => new Response("unavailable", { status: 503 });

  const stale = await getGardenWeather(gardenA, { fetcher: failingFetcher as typeof fetch });
  assert.equal(stale.isStale, true);
  await assert.rejects(
    () => getGardenWeather(gardenB, { fetcher: failingFetcher as typeof fetch }),
    WeatherUnavailableError,
  );
});
