import { decode } from '@mapbox/polyline';
import Constants from 'expo-constants';

// Dynamic API Key that is set on app load, defaults to .env value in dev
let GOOGLE_API_KEY = process.env.EXPO_PUBLIC_RESTRICTED_API_KEY || Constants.expoConfig?.extra?.googleMapsApiKey || '';

export const setGoogleApiKey = (key: string) => {
    if (key) {
        GOOGLE_API_KEY = key;
    }
};
const GOOGLE_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

export interface SearchResult {
    place_id: string;
    lat: string;
    lon: string;
    display_name: string;
    type: string;
    types?: string[]; // All types for filtering
    address?: string; // Formatted address
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    photos?: any[];
    vicinity?: string;
    isOpen?: boolean;
    opening_hours?: string[];
    // Details loaded later
    phone?: string;
    website?: string;
    reviews?: any[];
    description?: string; // Derived from editorial_summary
    url?: string; // Google Maps URL
}

export interface TransitDetails {
    lineName: string;
    lineShortName?: string;
    color?: string;
    textColor?: string;
    vehicleType?: 'SUBWAY' | 'BUS' | 'TRAIN' | 'TRAM' | 'HEAVY_RAIL' | 'FERRY' | string;
    departureStop?: string;
    arrivalStop?: string;
    stopCount?: number;
    headsign?: string;
    departureTime?: string;
    arrivalTime?: string;
}

export interface RouteManeuver {
    name: string;
    maneuver: {
        location: [number, number]; // [Lon, Lat]
        type: string;
        modifier?: string;
        icon?: string;
        bearing_after?: number;
    };
    distance?: number;
    duration?: number;
    transitDetails?: TransitDetails;
}

export interface RouteResult {
    distance: number; // meters
    duration: number; // seconds
    geometry: string; // polyline string
    coordinates: { latitude: number; longitude: number }[]; // decoded
    maneuvers: RouteManeuver[];
    travelMode?: 'driving' | 'walking' | 'transit';
    transitLines?: { name: string; color?: string; vehicleType?: string }[];
    bounds?: { // Google Directions viewport bounds
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
    };
    speedReadingIntervals?: { startPolylinePointIndex: number; endPolylinePointIndex: number; speed: 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM' }[];
}

export const api = {
    // Helper to get Photo URL
    getPhotoUrl(reference: string, maxWidth: number = 400): string {
        return `${GOOGLE_BASE_URL}/photo?maxwidth=${maxWidth}&photo_reference=${reference}&key=${GOOGLE_API_KEY}`;
    },

    // Helper: Calculate Haversine Distance (in km)
    getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    // Text Search (Google Places) - With Pagination for More Results
    // Default radius: 50 miles = 80,467 meters
    // applyRadiusFilter: if true, filter out results beyond radius (for "near me" searches)
    //                   if false, just bias results but don't filter (for "in london" searches)
    async searchPlaces(query: string, location?: { lat: number; lon: number }, radius: number = 80467, applyRadiusFilter: boolean = true): Promise<SearchResult[]> {
        try {
            let url = `${GOOGLE_BASE_URL}/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
            if (location) {
                // Bias results to location (Google will return results near this location)
                url += `&location=${location.lat},${location.lon}&radius=${radius}`;
            }

            let allResults: SearchResult[] = [];
            let nextPageToken: string | null = null;
            let pageCount = 0;
            const maxPages = 3; // Google allows max 3 pages (60 results)

            do {
                let pageUrl = url;
                if (nextPageToken) {
                    pageUrl += `&pagetoken=${nextPageToken}`;
                }

                const response = await fetch(pageUrl);
                const data = await response.json();

                if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                    console.error('Google Places Error:', data.status, data.error_message);
                    break;
                }

                const pageResults = (data.results || []).map((item: any) => ({
                    place_id: item.place_id,
                    lat: item.geometry.location.lat.toString(),
                    lon: item.geometry.location.lng.toString(),
                    display_name: item.name,
                    type: item.types?.[0] || 'place',
                    types: item.types,
                    address: item.formatted_address || item.vicinity,
                    rating: item.rating,
                    user_ratings_total: item.user_ratings_total,
                    price_level: item.price_level,
                    photos: item.photos,
                    vicinity: item.vicinity || item.formatted_address,
                    isOpen: item.opening_hours?.open_now,
                }));

                allResults = [...allResults, ...pageResults];
                nextPageToken = data.next_page_token || null;
                pageCount++;

                // Google requires ~2 second delay before next_page_token is valid
                if (nextPageToken && pageCount < maxPages) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } while (nextPageToken && pageCount < maxPages);

            // Filter and sort by distance if location is available
            if (location) {
                // Only filter by radius for "near me" searches, not for "in london" searches
                if (applyRadiusFilter) {
                    const radiusKm = radius / 1000;
                    const LOCATION_TYPES = ['locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country', 'political'];

                    allResults = allResults.filter(r => {
                        // Exception: If it's a major location (city, state, country), show it regardless of distance
                        if (r.types?.some(t => LOCATION_TYPES.includes(t))) {
                            return true;
                        }

                        const dist = this.getDistance(location.lat, location.lon, parseFloat(r.lat), parseFloat(r.lon));
                        return dist <= radiusKm;
                    });
                }
                // Always sort by distance
                allResults.sort((a, b) => {
                    const distA = this.getDistance(location.lat, location.lon, parseFloat(a.lat), parseFloat(a.lon));
                    const distB = this.getDistance(location.lat, location.lon, parseFloat(b.lat), parseFloat(b.lon));
                    return distA - distB;
                });
            }

            return allResults;

        } catch (error) {
            console.error('Search failed:', error);
            return [];
        }
    },

    // Category Search (Mapped to Text Search for better relevance)
    // Default radius: 50 miles = ~80 km
    async searchByCategory(category: string, lat: number, lon: number, radiusKm: number = 80): Promise<SearchResult[]> {
        // "Italian restaurants near me" logic is handled well by Text Search with location bias
        // We append the category to "near me" or just use the category + location bias
        const query = category;
        return this.searchPlaces(query, { lat, lon }, radiusKm * 1000);
    },

    // Get Place Details (Photos, Reviews, specific info)
    async getPlaceDetails(placeId: string): Promise<SearchResult | null> {
        try {
            const fields = 'name,rating,formatted_phone_number,photos,reviews,website,opening_hours,geometry,formatted_address,user_ratings_total,price_level,url,editorial_summary';
            // Note: Google Places API hardcaps reviews at a maximum of 5.
            const url = `${GOOGLE_BASE_URL}/details/json?place_id=${placeId}&fields=${fields}&reviews_sort=most_relevant&key=${GOOGLE_API_KEY}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status !== 'OK') {
                return null;
            }

            const r = data.result;
            return {
                place_id: placeId,
                lat: r.geometry.location.lat.toString(),
                lon: r.geometry.location.lng.toString(),
                display_name: r.name,
                type: 'place',
                address: r.formatted_address,
                phone: r.formatted_phone_number,
                website: r.website,
                rating: r.rating,
                user_ratings_total: r.user_ratings_total,
                price_level: r.price_level,
                photos: r.photos,
                reviews: r.reviews,
                isOpen: r.opening_hours?.open_now,
                opening_hours: r.opening_hours?.weekday_text,
                description: r.editorial_summary?.overview,
                url: r.url,
            };
        } catch (error) {
            console.error('Get details failed:', error);
            return null;
        }
    },

    // Geocode (using Text Search as fallback or Geocoding API if strictly needed, but Text Search works for "London")
    async geocode(locationName: string): Promise<{ latitude: number; longitude: number } | null> {
        const results = await this.searchPlaces(locationName);
        if (results.length > 0) {
            return {
                latitude: parseFloat(results[0].lat),
                longitude: parseFloat(results[0].lon)
            };
        }
        return null;
    },

    // Routing via Google Routes API
    async getRoutes(start: { lat: number; lon: number }, end: { lat: number; lon: number }, mode: 'driving' | 'walking' | 'transit' = 'driving'): Promise<RouteResult[] | null> {
        try {
            console.log(`Fetching Google Routes API (${mode})...`);
            
            const routeMode = mode === 'driving' ? 'DRIVE' : mode === 'walking' ? 'WALK' : 'TRANSIT';
            
            const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
            
            const body: any = {
                origin: { location: { latLng: { latitude: start.lat, longitude: start.lon } } },
                destination: { location: { latLng: { latitude: end.lat, longitude: end.lon } } },
                travelMode: routeMode,
                computeAlternativeRoutes: true,
            };

            if (routeMode === 'DRIVE') {
                body.routingPreference = 'TRAFFIC_AWARE';
                body.extraComputations = ['TRAFFIC_ON_POLYLINE'];
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_API_KEY,
                    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.viewport,routes.travelAdvisory.speedReadingIntervals'
                },
                body: JSON.stringify(body)
            });

            const json = await response.json();

            if (json.error) {
                console.error("Google Routes Error:", json.error.message);
                return null;
            }

            if (!json.routes || json.routes.length === 0) {
                console.error("Google Routes Error: No routes found");
                return null;
            }

            const parsedRoutes: RouteResult[] = json.routes.map((route: any) => {
                const leg = route.legs[0];
                const encodedPolyline = route.polyline?.encodedPolyline;
                
                // Normalize Maneuvers
                const maneuvers = (leg.steps || []).map((step: any) => {
                    const nav = step.navigationInstruction || {};
                    
                    // Transit details are nested differently in Routes API
                    if (routeMode === 'TRANSIT' && step.transitDetails) {
                        const transit = step.transitDetails;
                        const line = transit.transitLine || {};
                        const vehicle = line.vehicle || {};
                        const stopDetails = transit.stopDetails || {};

                        const lineName = line.name || line.nameShort || 'Transit';
                        const lineShortName = line.nameShort || line.name || 'Transit';
                        const headsign = transit.headsign || '';
                        const departureStop = stopDetails.departureStop?.name || '';
                        const arrivalStop = stopDetails.arrivalStop?.name || '';
                        const stopCount = transit.stopCount || 0;
                        const vehicleType = (vehicle.type || 'SUBWAY').toUpperCase();
                        const color = line.color || (vehicleType === 'SUBWAY' ? '#0085d0' : vehicleType === 'BUS' ? '#27ae60' : '#e67e22');
                        const textColor = line.textColor || '#ffffff';

                        const transitInfo: TransitDetails = {
                            lineName: lineName,
                            lineShortName: lineShortName,
                            color: color,
                            textColor: textColor,
                            vehicleType: vehicleType,
                            departureStop: departureStop,
                            arrivalStop: arrivalStop,
                            stopCount: stopCount,
                            headsign: headsign,
                            departureTime: stopDetails.departureTime,
                            arrivalTime: stopDetails.arrivalTime,
                        };

                        let stepTitle = `${lineShortName}`;
                        if (headsign) stepTitle += ` to ${headsign}`;
                        if (departureStop) stepTitle += ` from ${departureStop}`;

                        return {
                            name: stepTitle,
                            maneuver: {
                                location: [step.startLocation?.latLng?.longitude || 0, step.startLocation?.latLng?.latitude || 0],
                                type: 'transit',
                                modifier: vehicleType.toLowerCase(),
                            },
                            distance: step.distanceMeters || 0,
                            duration: parseInt(step.staticDuration || '0'),
                            transitDetails: transitInfo,
                        };
                    }

                    // Standard Driving/Walking or Walking segment in transit route
                    const rawManeuver = (nav.maneuver || 'STRAIGHT').toLowerCase();
                    let type = 'turn';
                    let modifier = 'straight';

                    if (rawManeuver.includes('left')) modifier = 'left';
                    if (rawManeuver.includes('right')) modifier = 'right';
                    if (rawManeuver.includes('sharp_left')) modifier = 'sharp left';
                    if (rawManeuver.includes('sharp_right')) modifier = 'sharp right';
                    if (rawManeuver.includes('uturn')) modifier = 'uturn';
                    if (rawManeuver.includes('straight')) modifier = 'straight';
                    if (rawManeuver.includes('exit') || rawManeuver.includes('ramp')) type = 'off ramp';

                    const instructions = nav.instructions || rawManeuver.replace(/_/g, ' ');
                    if ((routeMode === 'WALK' || routeMode === 'TRANSIT') && !modifier) type = 'walk';

                    return {
                        name: instructions || (routeMode === 'TRANSIT' ? `Walk ${Math.round(step.distanceMeters || 0)}m` : 'Continue straight'),
                        maneuver: {
                            location: [step.startLocation?.latLng?.longitude || 0, step.startLocation?.latLng?.latitude || 0], // [Lon, Lat]
                            type: type,
                            modifier: modifier,
                            icon: rawManeuver, // Store raw google maneuver string for icon fetching
                            bearing_after: 0,
                        },
                        distance: step.distanceMeters || 0,
                        duration: parseInt(step.staticDuration || '0'),
                    };
                });

                // Add destination arrival
                maneuvers.push({
                    name: "Arrive at Destination",
                    maneuver: {
                        location: [leg.endLocation?.latLng?.longitude || 0, leg.endLocation?.latLng?.latitude || 0],
                        type: 'arrive',
                        modifier: 'straight',
                    }
                });

                // Extract unique transit lines used in this route
                const transitLines: { name: string; color?: string; vehicleType?: string }[] = [];
                const seenLines = new Set<string>();
                maneuvers.forEach((m: RouteManeuver) => {
                    if (m.transitDetails) {
                        const key = m.transitDetails.lineShortName || m.transitDetails.lineName;
                        if (!seenLines.has(key)) {
                            seenLines.add(key);
                            transitLines.push({
                                name: key,
                                color: m.transitDetails.color,
                                vehicleType: m.transitDetails.vehicleType,
                            });
                        }
                    }
                });

                // Decode the overall route polyline (matches speedReadingIntervals perfectly)
                const allCoordinates: { latitude: number; longitude: number }[] = [];
                if (encodedPolyline) {
                    const fullPoints = decode(encodedPolyline);
                    fullPoints.forEach((point) => {
                        allCoordinates.push({
                            latitude: point[0],
                            longitude: point[1],
                        });
                    });
                }
                
                const speedReadingIntervals = route.travelAdvisory?.speedReadingIntervals || [];

                return {
                    distance: route.distanceMeters,
                    duration: parseInt(route.duration || '0'),
                    geometry: encodedPolyline || Date.now().toString(), 
                    coordinates: allCoordinates, 
                    maneuvers: maneuvers,
                    travelMode: mode,
                    transitLines: transitLines,
                    speedReadingIntervals: speedReadingIntervals,
                    bounds: route.viewport ? { 
                        northeast: { lat: route.viewport.high.latitude, lng: route.viewport.high.longitude },
                        southwest: { lat: route.viewport.low.latitude, lng: route.viewport.low.longitude }
                    } : undefined,
                };
            });
            
            return parsedRoutes;
        } catch (error) {
            console.error('Routing failed:', error);
            return null;
        }
    },

    // OpenStreetMap Overpass API - Speed Limits
    // OpenStreetMap Overpass API - Speed Limits
    async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
        // Use a wider bounding box (approx +/- 0.002 deg is ~220m)
        const delta = 0.002;
        const south = lat - delta;
        const west = lon - delta;
        const north = lat + delta;
        const east = lon + delta;

        // Query all highways and request GEOMETRY to calculate distance
        const query = `
            [out:json][timeout:25];
            way["highway"](${south},${west},${north},${east});
            out geom;
        `;

        const servers = [
            'https://overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter',
        ];

        for (const server of servers) {
            try {
                const response = await fetch(server, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `data=${encodeURIComponent(query)}`,
                });

                if (!response.ok) continue;

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) continue;

                const data = await response.json();

                if (data.elements && data.elements.length > 0) {
                    let closestWay: any = null;
                    let minDistance = Infinity;

                    // Helper to calc distance squared from point P to segment AB
                    const getDistSqToSegment = (p: { lat: number, lon: number }, a: { lat: number, lon: number }, b: { lat: number, lon: number }) => {
                        const x = p.lon; const y = p.lat;
                        const x1 = a.lon; const y1 = a.lat;
                        const x2 = b.lon; const y2 = b.lat;

                        const A = x - x1;
                        const B = y - y1;
                        const C = x2 - x1;
                        const D = y2 - y1;

                        const dot = A * C + B * D;
                        const len_sq = C * C + D * D;
                        let param = -1;
                        if (len_sq !== 0) param = dot / len_sq;

                        let xx, yy;

                        if (param < 0) {
                            xx = x1; yy = y1;
                        } else if (param > 1) {
                            xx = x2; yy = y2;
                        } else {
                            xx = x1 + param * C;
                            yy = y1 + param * D;
                        }

                        const dx = x - xx;
                        const dy = y - yy;
                        return dx * dx + dy * dy;
                    };

                    for (const element of data.elements) {
                        if (!element.geometry) continue;

                        // Find min dist from user to this way
                        let wayMinDist = Infinity;
                        for (let i = 0; i < element.geometry.length - 1; i++) {
                            const p1 = element.geometry[i];
                            const p2 = element.geometry[i + 1];
                            const d = getDistSqToSegment({ lat, lon }, p1, p2);
                            if (d < wayMinDist) wayMinDist = d;
                        }

                        if (wayMinDist < minDistance) {
                            minDistance = wayMinDist;
                            closestWay = element;
                        }
                    }

                    if (closestWay) {
                        const tags = closestWay.tags || {};
                        const maxspeedStr = tags.maxspeed;

                        // Strict check: Only return if maxspeed is explicitly defined
                        if (maxspeedStr) {
                            const mphMatch = maxspeedStr.match(/(\d+)\s*mph/i);
                            if (mphMatch) {
                                return Math.round(parseInt(mphMatch[1], 10) * 1.60934);
                            }
                            const kphMatch = maxspeedStr.match(/(\d+)/);
                            if (kphMatch) {
                                return parseInt(kphMatch[1], 10);
                            }
                        }
                    }
                }
                return null;
            } catch (e) {
                // console.log('Overpass fetch error:', e);
                continue;
            }
        }
        return null;
    }
};

