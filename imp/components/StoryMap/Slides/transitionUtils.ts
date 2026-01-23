// ============ TYPES ============

export interface RoutePoint {
  lat: number;
  lng: number;
  distance: number;
}

// ============ EASING FUNCTIONS ============

export const EASING: Record<string, (t: number) => number> = {
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInCubic: (t) => t * t * t,
};

// ============ DISTANCE FUNCTIONS ============

// Haversine distance in km
export const getDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Haversine distance in meters
export const getDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  return getDistanceKm(lat1, lng1, lat2, lng2) * 1000;
};

// ============ BEARING & INTERPOLATION ============

// Calculate bearing from A to B
export const calculateBearing = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const x = Math.sin(dLng) * Math.cos(lat2Rad);
  const y =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
};

// Interpolate bearing (shortest path)
export const interpolateBearing = (
  start: number,
  end: number,
  t: number
): number => {
  let delta = end - start;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return (start + delta * t + 360) % 360;
};

// Linear interpolation
export const lerp = (start: number, end: number, t: number) =>
  start + (end - start) * t;

// Distance to zoom level for arc mode
export const distanceToZoom = (distanceKm: number): number => {
  if (distanceKm > 5000) return 2;
  if (distanceKm > 2000) return 3;
  if (distanceKm > 1000) return 4;
  if (distanceKm > 500) return 5;
  if (distanceKm > 200) return 6;
  if (distanceKm > 100) return 7;
  if (distanceKm > 50) return 8;
  if (distanceKm > 20) return 9;
  return 10;
};

// ============ ROAD ROUTING FUNCTIONS ============

export const fetchRoute = async (
  points: { lat: number; lng: number }[]
): Promise<RoutePoint[] | null> => {
  try {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
    console.log('Fetching route for coords:', coords);
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;

    const geometry = data.routes[0].geometry.coordinates;
    const routePoints: RoutePoint[] = [];
    let cumulativeDistance = 0;

    for (let i = 0; i < geometry.length; i++) {
      const [lng, lat] = geometry[i];
      if (i > 0) {
        cumulativeDistance += getDistanceMeters(
          routePoints[i - 1].lat,
          routePoints[i - 1].lng,
          lat,
          lng
        );
      }
      routePoints.push({ lat, lng, distance: cumulativeDistance });
    }
    return routePoints;
  } catch {
    return null;
  }
};

export const getPointAtDistance = (
  route: RoutePoint[],
  targetDistance: number
): { lat: number; lng: number } => {
  if (targetDistance <= 0) return { lat: route[0].lat, lng: route[0].lng };
  if (targetDistance >= route[route.length - 1].distance) {
    return {
      lat: route[route.length - 1].lat,
      lng: route[route.length - 1].lng,
    };
  }
  let low = 0,
    high = route.length - 1;
  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (route[mid].distance <= targetDistance) low = mid;
    else high = mid;
  }
  const p1 = route[low],
    p2 = route[high];
  const t =
    p2.distance - p1.distance > 0
      ? (targetDistance - p1.distance) / (p2.distance - p1.distance)
      : 0;
  return { lat: lerp(p1.lat, p2.lat, t), lng: lerp(p1.lng, p2.lng, t) };
};
