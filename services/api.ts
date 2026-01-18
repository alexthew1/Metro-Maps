import { decode } from '@mapbox/polyline';
import Constants from 'expo-constants';

// Read API key from environment (via app.config.js -> expo-constants)
const GOOGLE_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ||
    Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
    '';
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
    // Details loaded later
    phone?: string;
    website?: string;
    reviews?: any[];
    description?: string; // Derived from editorial_summary
    url?: string; // Google Maps URL
}

export interface RouteResult {
    distance: number; // meters
    duration: number; // seconds
    geometry: string; // polyline string
    coordinates: { latitude: number; longitude: number }[]; // decoded
    maneuvers: any[]; // refined later
    bounds?: { // Google Directions viewport bounds
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
    };
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
            const url = `${GOOGLE_BASE_URL}/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;

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

    // Routing via Google Directions API (High-fidelity step polylines)
    async getRoute(start: { lat: number; lon: number }, end: { lat: number; lon: number }, mode: 'driving' | 'walking' | 'transit' = 'driving'): Promise<RouteResult | null> {
        try {
            console.log(`Fetching Google Directions (${mode})...`);
            const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.lat},${start.lon}&destination=${end.lat},${end.lon}&mode=${mode}&key=${GOOGLE_API_KEY}`;
            const response = await fetch(url);
            const json = await response.json();

            if (json.status !== 'OK' || !json.routes || json.routes.length === 0) {
                console.error("Google Directions Error:", json.status);
                return null;
            }

            const route = json.routes[0];
            const leg = route.legs[0];
            const encodedPolyline = route.overview_polyline.points;
            const decodedPoints = decode(encodedPolyline);

            // Normalize Maneuvers
            const maneuvers = leg.steps.map((step: any) => {
                // Check for Transit Details
                if (step.travel_mode === 'TRANSIT' && step.transit_details) {
                    const line = step.transit_details.line;
                    const vehicle = line.vehicle.name || 'Transit';
                    const num = line.short_name || line.name || '';
                    const headsign = step.transit_details.headsign || '';

                    return {
                        name: `${vehicle} ${num} to ${headsign}`,
                        maneuver: {
                            location: [step.start_location.lng, step.start_location.lat],
                            type: 'transit',
                            modifier: vehicle.toLowerCase(), // 'bus', 'subway'
                        },
                        distance: step.distance.value,
                        duration: step.duration.value,
                    };
                }

                // Standard Driving/Walking
                const rawManeuver = step.maneuver || 'straight';
                let type = 'turn';
                let modifier = 'straight';

                if (rawManeuver.includes('left')) modifier = 'left';
                if (rawManeuver.includes('right')) modifier = 'right';
                if (rawManeuver.includes('sharp-left')) modifier = 'sharp left';
                if (rawManeuver.includes('sharp-right')) modifier = 'sharp right';
                if (rawManeuver.includes('uturn')) modifier = 'uturn';
                if (rawManeuver.includes('straight')) modifier = 'straight';
                if (rawManeuver.includes('exit') || rawManeuver.includes('ramp')) type = 'off ramp';

                // Fallback (Walking uses "turn-left" etc too)
                if ((!step.maneuver) && step.html_instructions?.toLowerCase().includes('left')) modifier = 'left';
                if ((!step.maneuver) && step.html_instructions?.toLowerCase().includes('right')) modifier = 'right';
                if (step.travel_mode === 'WALKING' && !modifier) type = 'walk';

                return {
                    name: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML
                    maneuver: {
                        location: [step.start_location.lng, step.start_location.lat], // [Lon, Lat]
                        type: type,
                        modifier: modifier,
                        icon: rawManeuver, // Store raw google maneuver string for icon fetching
                        bearing_after: 0,
                    },
                    distance: step.distance.value,
                    duration: step.duration.value,
                };
            });

            // Add destination arrival
            maneuvers.push({
                name: "Arrive at Destination",
                maneuver: {
                    location: [leg.end_location.lng, leg.end_location.lat],
                    type: 'arrive',
                    modifier: 'straight',
                }
            });

            // Concatenate all detailed polylines from steps for high fidelity
            const allCoordinates: { latitude: number; longitude: number }[] = [];

            leg.steps.forEach((step: any) => {
                const stepPoints = decode(step.polyline.points);
                stepPoints.forEach((point) => {
                    allCoordinates.push({
                        latitude: point[0],
                        longitude: point[1],
                    });
                });
            });

            return {
                distance: leg.distance.value,
                duration: leg.duration.value,
                geometry: route.overview_polyline.points, // Keep overview for fail-safe
                coordinates: allCoordinates, // Use detailed coordinates
                maneuvers: maneuvers,
                bounds: route.bounds, // Google Directions viewport bounds
            };
        } catch (error) {
            console.error('Routing failed:', error);
            return null;
        }
    },

    // Google Roads API - Speed Limits
    async getSpeedLimit(lat: number, lon: number): Promise<number | null> {
        try {
            // "path" parameter implies snapping, ensuring we get the road the user is ON.
            // Using a single point as a path.
            const url = `https://roads.googleapis.com/v1/speedLimits?path=${lat},${lon}&key=${GOOGLE_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.speedLimits && data.speedLimits.length > 0) {
                const limit = data.speedLimits[0].speedLimit; // KPH
                return limit;
            }
            return null;
        } catch (error) {
            console.error('Speed Limit fetch failed:', error);
            return null;
        }
    }
};

