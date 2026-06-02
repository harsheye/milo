const BASE_URL = (import.meta.env.VITE_FUEL_API_BASE_URL || "https://fuel.indianapi.in").replace(/\/$/, "");
const API_KEY = import.meta.env.VITE_FUEL_API_KEY;
const CACHE_PREFIX = "vehiclelog-fuel-prices";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getCacheKey(fuelType) {
  return `${CACHE_PREFIX}:${fuelType.toLowerCase()}:${today()}`;
}

function parsePrices(data) {
  const rows = Array.isArray(data)
    ? data
    : data.value || data.data?.value || data.data || data.prices || [];
  return (Array.isArray(rows) ? rows : []).map((entry) => ({
    city: entry.city,
    price: Number.parseFloat(entry.price),
    change: Number.parseFloat(entry.change || "0"),
  })).filter((entry) => entry.city && Number.isFinite(entry.price));
}

function findCityPrice(prices, city) {
  const normalized = city.trim().toLowerCase();
  let match = prices.find((entry) => entry.city.toLowerCase() === normalized);
  if (!match) {
    match = prices.find((entry) => {
      const entryCity = entry.city.toLowerCase();
      return entryCity.includes(normalized) || normalized.includes(entryCity);
    });
  }
  return match;
}

export async function fetchDailyFuelPrice(fuelType, city) {
  if (!API_KEY) throw new Error("Fuel API key is not configured.");
  const key = getCacheKey(fuelType);
  let prices;
  let cached = false;
  const stored = localStorage.getItem(key);

  if (stored) {
    const daily = JSON.parse(stored);
    prices = Array.isArray(daily.prices) ? daily.prices : [];
    cached = true;
  } else {
    const url = `${BASE_URL}/live_fuel_price?fuel_type=${encodeURIComponent(fuelType.toLowerCase())}&location_type=city`;
    const response = await fetch(url, { headers: { "x-api-key": API_KEY } });
    if (!response.ok) throw new Error(`Fuel price service returned ${response.status}.`);
    prices = parsePrices(await response.json());
    if (!prices.length) throw new Error("Fuel price service returned no usable city rates.");
    localStorage.setItem(key, JSON.stringify({ fuelType: fuelType.toLowerCase(), prices }));
  }

  let result = findCityPrice(prices, city);
  let isFallback = false;
  if (!result) {
    result = findCityPrice(prices, "delhi");
    isFallback = true;
  }
  if (!result) throw new Error(`No live ${fuelType.toLowerCase()} price was found for ${city} or Delhi fallback.`);
  return { ...result, cached, source: BASE_URL, isFallback, originalCity: city };
}
