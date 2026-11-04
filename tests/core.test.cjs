const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

// Load pure TypeScript and storage services without starting the native runtime.
function load(relative, mocks = {}, cache = new Map()) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename);
    const module = { exports: {} };
    cache.set(filename, module.exports);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const requireLocal = name => {
        if (name in mocks) return mocks[name];
        if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.ts')), mocks, cache);
        return require(name);
    };
    new Function('require', 'module', 'exports', source)(requireLocal, module, module.exports);
    return module.exports;
}
const place = id => ({ place_id: id, display_name: id, lat: '40', lon: '-74', type: 'poi' });
function storage(initial) {
    const values = new Map(Object.entries(initial || {}));
    return {
        getItem: async key => { await new Promise(resolve => setImmediate(resolve)); return values.get(key) ?? null; },
        setItem: async (key, value) => { await new Promise(resolve => setImmediate(resolve)); values.set(key, value); },
        removeItem: async key => { values.delete(key); },
    };
}
test('sparse route segments, endpoints, duplicate vertices, and missing geometry', () => {
    const { distanceToRoute: distance } = load('utils/navigation.ts');
    const line = [{ latitude: 40, longitude: -74.01 }, { latitude: 40, longitude: -73.99 }];
    assert(distance({ latitude: 40, longitude: -74 }, line) < 0.001);
    assert(Math.abs(distance({ latitude: 40.001, longitude: -74 }, line) - 111.195) < 0.1);
    assert(distance({ latitude: 40, longitude: -73.98 }, line) > 800);
    assert.equal(distance(line[0], [line[0], line[0]]), 0);
    assert.equal(distance(line[0], []), Infinity);
});
test('stored records reject invalid coordinates and malformed regions', () => {
    const { isStoredPlace, isMapRegion } = load('utils/storedData.ts');
    assert(isStoredPlace(place('a')));
    for (const value of [null, {}, { ...place('a'), lat: '' }, { ...place('a'), lon: 'NaN' }, { ...place('a'), lat: '91' }]) assert.equal(isStoredPlace(value), false);
    assert(isMapRegion({ latitude: 40, longitude: -74, latitudeDelta: 0.1, longitudeDelta: 0.1 }));
    assert.equal(isMapRegion({ latitude: 40, longitude: -74, latitudeDelta: -1, longitudeDelta: 0.1 }), false);
    assert.equal(isMapRegion({ latitude: Infinity, longitude: -74, latitudeDelta: 1, longitudeDelta: 1 }), false);
});
test('concurrent favorite edits preserve both records and allow clearing aliases', async () => {
    const store = storage();
    const { FavoritesService: service } = load('services/favorites.ts', { '@react-native-async-storage/async-storage': store });
    await Promise.all([service.addFavorite(place('a'), 'Home'), service.addFavorite(place('b'))]);
    assert.deepEqual((await service.getFavorites()).map(p => p.place_id), ['a', 'b']);
    await Promise.all([service.removeFavorite('b'), service.addFavorite(place('a'), '')]);
    const favorites = await service.getFavorites();
    assert.equal(favorites.length, 1);
    assert.equal(favorites[0].alias, '');
});
test('recent writes preserve order and clearing waits for earlier writes', async () => {
    const store = storage();
    const { RecentsService: service } = load('services/recents.ts', { '@react-native-async-storage/async-storage': store });
    await Promise.all(Array.from({ length: 12 }, (_, i) => service.addRecent(place(String(i)))));
    assert.deepEqual((await service.getRecents()).map(p => p.place_id), ['11','10','9','8','7','6','5','4','3','2']);
    await Promise.all([service.addRecent(place('last')), service.clearRecents()]);
    assert.deepEqual(await service.getRecents(), []);
});
test('valid JSON with an unexpected storage shape loads as an empty list', async () => {
    const store = storage({ '@metromaps_favorites': '{}', metro_maps_recents: 'null' });
    const mocks = { '@react-native-async-storage/async-storage': store };
    assert.deepEqual(await load('services/favorites.ts', mocks).FavoritesService.getFavorites(), []);
    assert.deepEqual(await load('services/recents.ts', mocks).RecentsService.getRecents(), []);
});
test('a rejected queued operation does not block later operations', async () => {
    const run = load('utils/serialTaskQueue.ts').createSerialTaskQueue();
    await assert.rejects(run(async () => { throw new Error('failure'); }));
    assert.equal(await run(async () => 42), 42);
});


test('place categories prefer API types and distinguish fuel, parking and nightlife', () => {
    const { getPlaceCategory: category } = load('utils/placeMarkers.ts');
    assert.equal(category({ ...place('a'), display_name: 'Station Kitchen', types: ['restaurant'] }), 'food');
    assert.equal(category({ ...place('a'), type: 'gas_station' }), 'fuel');
    assert.equal(category({ ...place('a'), type: 'parking' }), 'parking');
    assert.equal(category({ ...place('a'), type: 'bar' }), 'bar');
    assert.equal(category({ ...place('a'), type: 'cafe' }), 'cafe');
    assert.equal(category({ ...place('a'), type: 'subway_station' }), 'train');
    assert.equal(category(place('a')), 'place');
});

test('nearby POIs exclude map regions and handle unavailable Places responses', async () => {
    const originalFetch = global.fetch;
    const { api } = load('services/api.ts', {
        '@mapbox/polyline': { decode: () => [] },
        'expo-constants': { expoConfig: { extra: {} } },
    });
    try {
        global.fetch = async () => ({ ok: true, json: async () => ({ status: 'OK', results: [
            { place_id: 'cafe', name: 'Cafe', geometry: { location: { lat: 40, lng: -74 } }, types: ['cafe'], vicinity: 'Main Street' },
            { place_id: 'town', name: 'Town', geometry: { location: { lat: 40, lng: -74 } }, types: ['locality', 'political'] },
            { place_id: 'bad', name: 'Bad', geometry: {} },
        ] }) });
        const results = await api.getNearbyPlaces(40, -74, 500);
        assert.equal(results.length, 1);
        assert.equal(results[0].place_id, 'cafe');
        assert.equal(results[0].lat, '40');
        assert.equal(results[0].type, 'cafe');
        global.fetch = async () => ({ ok: true, json: async () => ({ status: 'REQUEST_DENIED' }) });
        assert.equal(await api.getNearbyPlaces(40, -74, 500), null);
        global.fetch = async () => ({ ok: true, json: async () => ({ status: 'ZERO_RESULTS' }) });
        assert.deepEqual(await api.getNearbyPlaces(40, -74, 500), []);
        global.fetch = async () => { throw new Error('Aborted'); };
        assert.equal(await api.getNearbyPlaces(40, -74, 500), null);
    } finally { global.fetch = originalFetch; }
});

test('native map scene deduplicates places and preserves selected and saved state', () => {
    const build = load('utils/nativeMapScene.ts').buildNativeMapScene;
    const cafe = { ...place('cafe'), type: 'cafe' };
    const scene = build({ routes: [], selectedRouteIndex: 0, results: [cafe], favorites: [cafe], nearbyPlaces: [cafe],
        destination: { ...cafe, display_name: 'Selected cafe' }, navigating: false, useMiles: false });
    assert.equal(scene.markers.length, 1);
    assert.equal(scene.markers[0].title, 'Selected cafe');
    assert.equal(scene.markers[0].selected, true);
    assert.equal(scene.markers[0].saved, true);
    assert.equal(scene.markers[0].category, 'cafe');
});
test('native map scene keeps route indices and does not refit for nearby POI changes', () => {
    const build = load('utils/nativeMapScene.ts').buildNativeMapScene;
    const route = { geometry: 'route', coordinates: [{ latitude: 40, longitude: -74 }, { latitude: 40.1, longitude: -74 }],
        maneuvers: [], duration: 3660, distance: 1609.34 };
    const input = { routes: [{ ...route, coordinates: [] }, route], selectedRouteIndex: 1,
        results: [], favorites: [], nearbyPlaces: [], destination: null, navigating: false, useMiles: true };
    const before = build(input), after = build({ ...input, nearbyPlaces: [place('cafe')] });
    assert.equal(before.routes.length, 1);
    assert.equal(before.routes[0].index, 1);
    assert.equal(before.routes[0].time, '1H 1M');
    assert.equal(before.routes[0].distance, '1.0 mi');
    assert.equal(before.cameraKey, after.cameraKey);
    assert.deepEqual(before.cameraPoints, route.coordinates);
    assert.equal(build({ ...input, useMiles: false }).routes[0].distance, '1.6 km');
});
test('native map scene rejects invalid marker and route coordinates before crossing the bridge', () => {
    const build = load('utils/nativeMapScene.ts').buildNativeMapScene;
    const scene = build({ routes: [{ geometry: 'bad', coordinates: [{ latitude: NaN, longitude: 0 }, { latitude: 0, longitude: 0 }], maneuvers: [], distance: 10, duration: 5 }],
        selectedRouteIndex: 0, results: [{ ...place('bad'), lat: '91' }, { ...place('blank'), lon: '' }],
        favorites: [], nearbyPlaces: [], destination: null, navigating: false, useMiles: false });
    assert.deepEqual(scene.routes, []);
    assert.deepEqual(scene.markers, []);
});
