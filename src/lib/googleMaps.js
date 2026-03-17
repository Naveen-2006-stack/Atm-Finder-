import { getEnv } from "@/lib/env";

function buildUrl(base, params) {
  const searchParams = new URLSearchParams(params);
  return `${base}?${searchParams.toString()}`;
}

export async function geocodePincode(pincode) {
  const env = getEnv();
  const url = buildUrl("https://maps.googleapis.com/maps/api/geocode/json", {
    address: pincode,
    key: env.googleMapsApiKey,
  });

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Geocoding API failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== "OK" || !data.results?.length) {
    throw new Error("Unable to geocode pincode");
  }

  const first = data.results[0];
  return {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
  };
}

export async function getNearbyAtms({ lat, lng, radius = 2000 }) {
  const env = getEnv();
  const url = buildUrl("https://maps.googleapis.com/maps/api/place/nearbysearch/json", {
    location: `${lat},${lng}`,
    radius: String(radius),
    type: "atm",
    key: env.googleMapsApiKey,
  });

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Places API failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places API error: ${data.status}`);
  }

  return data.results || [];
}
