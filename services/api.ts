import { decode } from '@mapbox/polyline';

const OSM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_BASE_URL = 'http://router.project-osrm.org/route/v1/driving';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Category to OSM tag mappings
const CATEGORY_TAGS: { [key: string]: string } = {
    'restaurants': 'amenity=restaurant',
    'coffee': 'amenity=cafe',
    'gas station': 'amenity=fuel',
    'hotel': 'tourism=hotel',
    'parking': 'amenity=parking',
    'pizza': 'cuisine=pizza',
    'bank': 'amenity=bank',
    'pharmacy': 'amenity=pharmacy',
    'grocery': 'shop=supermarket',
    'bar': 'amenity=bar',
    'hospital': 'amenity=hospital',
    'atm': 'amenity=atm',
};

export interface SearchResult {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    type: string;
    extratags?: {
        phone?: string;
        website?: string;
        opening_hours?: string;
        description?: string;
        [key: string]: string | undefined;
    };
    address?: any;
}

export interface RouteResult {
    distance: number; // meters
    duration: number; // seconds
    geometry: string; // polyline string
    coordinates: { latitude: number; longitude: number }[]; // decoded
    maneuvers: any[]; // refined later
}

export const api = {
    // Text-based search using Nominatim
    async searchPlaces(query: string, viewbox?: string): Promise<SearchResult[]> {
        try {
            let url = `${OSM_BASE_URL}?q=${encodeURIComponent(query)}&format=json&addressdetails=1&extratags=1&limit=50`;
            if (viewbox) {
                url += `&viewbox=${viewbox}&bounded=1`;
            }

            const response = await fetch(url, {
                headers: { 'User-Agent': 'MetroMap8.1/1.0' },
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Search failed:', error);
            return [];
        }
    },

    // Geocode a location name to coordinates
    async geocode(locationName: string): Promise<{ latitude: number; longitude: number } | null> {
        try {
            const url = `${OSM_BASE_URL}?q=${encodeURIComponent(locationName)}&format=json&limit=1`;
            const response = await fetch(url, {
                headers: { 'User-Agent': 'MetroMap8.1/1.0' },
            });
            if (!response.ok) return null;
            const data = await response.json();
            if (data.length > 0) {
                return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
            }
            return null;
        } catch (error) {
            console.error('Geocode failed:', error);
            return null;
        }
    },

    // Category-based search using Overpass API
    async searchByCategory(category: string, lat: number, lon: number, radiusKm: number = 25): Promise<SearchResult[]> {
        try {
            const tag = CATEGORY_TAGS[category.toLowerCase()] || `amenity=${category.toLowerCase().replace(' ', '_')}`;
            const [key, value] = tag.includes('=') ? tag.split('=') : ['amenity', category.toLowerCase()];
            const radiusMeters = radiusKm * 1000;

            // Overpass QL query - fetch nodes and ways with metadata
            const query = `
[out:json][timeout:30];
(
  node["${key}"="${value}"](around:${radiusMeters},${lat},${lon});
  way["${key}"="${value}"](around:${radiusMeters},${lat},${lon});
);
out center body;
`;

            console.log('Overpass query:', query);

            const response = await fetch(OVERPASS_URL, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Overpass error response:', errorText);
                throw new Error(`Overpass request failed: ${response.status}`);
            }

            const data = await response.json();

            if (!data.elements || data.elements.length === 0) {
                console.log('No results from Overpass');
                return [];
            }

            // Transform Overpass elements to SearchResult format
            return data.elements.map((el: any) => {
                const elLat = el.lat || el.center?.lat;
                const elLon = el.lon || el.center?.lon;
                const tags = el.tags || {};

                return {
                    place_id: el.id,
                    lat: String(elLat),
                    lon: String(elLon),
                    display_name: tags.name || tags['name:en'] || category,
                    type: tags.amenity || tags.tourism || tags.shop || category,
                    extratags: {
                        phone: tags.phone || tags['contact:phone'],
                        website: tags.website || tags['contact:website'],
                        opening_hours: tags.opening_hours,
                        description: tags.description || tags['description:en'],
                    },
                    address: {
                        road: tags['addr:street'],
                        house_number: tags['addr:housenumber'],
                        city: tags['addr:city'],
                        postcode: tags['addr:postcode'],
                    },
                };
            }).filter((r: SearchResult) => r.lat && r.lon);
        } catch (error) {
            console.error('Category search failed:', error);
            return [];
        }
    },

    async getRoute(start: { lat: number; lon: number }, end: { lat: number; lon: number }): Promise<RouteResult | null> {
        try {
            const url = `${OSRM_BASE_URL}/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=polyline&steps=true`;
            const response = await fetch(url);
            const json = await response.json();

            if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
                return null;
            }

            const route = json.routes[0];
            const encodedPolyline = route.geometry;
            const decodedPoints = decode(encodedPolyline);
            const coordinates = decodedPoints.map((point) => ({
                latitude: point[0],
                longitude: point[1],
            }));

            return {
                distance: route.distance,
                duration: route.duration,
                geometry: encodedPolyline,
                coordinates: coordinates,
                maneuvers: route.legs[0].steps,
            };
        } catch (error) {
            console.error('Routing failed:', error);
            return null;
        }
    },
};

