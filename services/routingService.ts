// services/routingService.ts
// Standardized OSRM Driving Route and Distance calculation with Haversine fallback.
// Matches QineBackend (orders/services.py) and qine_frontend (useCheckoutData.ts).

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry?: any;
}

/**
 * Great-circle distance between two coordinates in kilometers using Haversine formula.
 * Earth radius = 6371.0 km.
 */
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371.0;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetch driving distance and optional GeoJSON route using OSRM HTTP API.
 * Uses lon,lat format required by OSRM.
 */
export async function fetchOSRMRoute(
  coords: Coordinate[],
  includeGeometry = false,
  timeoutMs = 4000,
): Promise<RouteResult> {
  if (!coords || coords.length < 2) {
    return { distanceKm: 0, durationMinutes: 0 };
  }

  // Fallback distance calculation using Haversine sum across all legs
  const fallbackKm = coords.reduce((sum, curr, idx) => {
    if (idx === 0) return 0;
    const prev = coords[idx - 1];
    return sum + calculateHaversineKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
  }, 0);

  try {
    const formatted = coords
      .map((c) => `${c.longitude},${c.latitude}`)
      .join(';');

    const url = includeGeometry
      ? `https://router.project-osrm.org/route/v1/driving/${formatted}?geometries=geojson&overview=full`
      : `https://router.project-osrm.org/route/v1/driving/${formatted}?overview=false`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const distanceKm = route.distance != null ? route.distance / 1000 : fallbackKm;
        const durationMinutes = route.duration != null ? Math.round(route.duration / 60) : Math.round(fallbackKm * 3);
        return {
          distanceKm: Number(distanceKm.toFixed(1)),
          durationMinutes,
          geometry: route.geometry,
        };
      }
    }
  } catch (err) {
    // Network failure, timeout, or OSRM rate limit -> fallback smoothly
  }

  return {
    distanceKm: Number(fallbackKm.toFixed(1)),
    durationMinutes: Math.round(fallbackKm * 3), // ~20 km/h average speed in city
  };
}
