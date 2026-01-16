import React, { useState, useEffect } from 'react';
import { View, BackHandler } from 'react-native';
import { MapLayer } from '../components/MapLayer';
import { AppBar } from '../components/AppBar';
import { SearchCurtain } from '../components/SearchCurtain';
import { ResultsSheet } from '../components/ResultsSheet';
import { NavigationSheet } from '../components/NavigationSheet';
import { PivotScreen } from '../components/PivotScreen';
import { OptionsMenu } from '../components/OptionsMenu';
import { api, RouteResult, SearchResult } from '../services/api';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';

import { ActiveNavigation } from '../components/ActiveNavigation';
import { FavoritesService } from '../services/favorites';

export default function HomeScreen() {
    // State
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number, heading?: number | null } | null>(null);

    // UI Modes
    const [searchActive, setSearchActive] = useState(false);
    const [pivotActive, setPivotActive] = useState(false);
    const [optionsActive, setOptionsActive] = useState(false);
    const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
    const [showLabels, setShowLabels] = useState(true);
    const [useMiles, setUseMiles] = useState(true); // true = miles, false = kilometers
    const [cameraTrigger, setCameraTrigger] = useState(0);
    const [mapRegion, setMapRegion] = useState<any>(null); // Track map region for search context
    const [activeNavigation, setActiveNavigation] = useState(false);
    const [isFollowing, setIsFollowing] = useState(true); // Track if camera follows user
    const [mapHeading, setMapHeading] = useState(0);
    const [transportMode, setTransportMode] = useState<'driving' | 'walking' | 'transit'>('driving');

    // Sheet States
    const [resultsState, setResultsState] = useState<'hidden' | 'peek' | 'expanded'>('hidden');
    const [navState, setNavState] = useState<'hidden' | 'peek' | 'expanded'>('hidden');

    // Data
    const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [route, setRoute] = useState<RouteResult | null>(null);
    const [routeError, setRouteError] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<SearchResult[]>([]);

    // Load Favorites
    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        const favs = await FavoritesService.getFavorites();
        setFavorites(favs);
    };

    const handleToggleFavorite = async (place: SearchResult) => {
        const isFav = await FavoritesService.isFavorite(place.place_id);
        if (isFav) {
            await FavoritesService.removeFavorite(place.place_id);
        } else {
            await FavoritesService.addFavorite(place);
        }
        await loadFavorites(); // Reload state
    };

    // --- Logic ---

    // Locations
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            // Simple Polling Loop (Robustness > Efficiency for Prototype)
            const interval = setInterval(async () => {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.BestForNavigation
                });
                setUserLocation(location.coords);
            }, 1000);

            return () => clearInterval(interval);
        })();
    }, []);

    // Back Button Handling
    useEffect(() => {
        const backAction = () => {
            if (activeNavigation) {
                // Prevent accidental exit. User must press 'END' button.
                return true;
            }
            if (optionsActive) { setOptionsActive(false); return true; }
            if (pivotActive) {
                setPivotActive(false);
                setSelectedPlace(null);
                setSearchResults([]); // Ensure map is clear
                setRoute(null);
                return true;
            }
            if (searchActive) { setSearchActive(false); return true; }
            if (navState !== 'hidden') {
                setNavState('hidden');
                setRoute(null);
                setSelectedPlace(null);
                setSearchResults([]); // Ensure map is clear
                setRouteError(null);
                return true;
            }
            if (resultsState !== 'hidden') {
                setResultsState('hidden');
                setSelectedPlace(null);
                setSearchResults([]);
                setRoute(null);
                setRouteError(null);
                return true;
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [pivotActive, searchActive, navState, resultsState, optionsActive, activeNavigation]);


    const [startPlace, setStartPlace] = useState<SearchResult | null>(null);
    const [navStep, setNavStep] = useState<'setup' | 'routing'>('setup');
    const [searchTarget, setSearchTarget] = useState<'destination' | 'origin'>('destination');

    // ...

    // Actions
    const handleSearchSelect = (result: SearchResult) => {
        if (searchTarget === 'origin') {
            setStartPlace(result);
            setSearchActive(false);
            // Don't change sheets, just stay in setup or wherever we were
            // But we need to make sure we go back to the setup view if we were there
            setNavState('expanded');
            setSearchTarget('destination'); // Reset
        } else {
            // Destination selection (Standard)
            setSelectedPlace(result);
            setSearchResults([]);
            setSearchActive(false);
            setResultsState('peek');
        }
    };

    const handleCategoryResults = (results: SearchResult[]) => {
        setSearchResults(results);
        setSelectedPlace(null);
        setSearchActive(false);
        setResultsState('peek');
    };

    const handleGetDirections = async () => {
        setPivotActive(false); // Close Pivot Screen
        setResultsState('hidden');
        setRouteError(null);

        // Always reset to Driving (Car View) first
        setTransportMode('driving');

        // Optimistic / Immediate Attempt
        if (userLocation && selectedPlace) {
            const r = await api.getRoute(
                { lat: userLocation.latitude, lon: userLocation.longitude },
                { lat: parseFloat(selectedPlace.lat), lon: parseFloat(selectedPlace.lon) },
                'driving'
            );

            if (r) {
                // Success: Show Route immediately (Old Behavior)
                setRoute(r);
                setNavStep('routing');
                setNavState('peek');
            } else {
                // Failure: Show Setup Screen (New Behavior for "No Route")
                setRoute(null);
                setNavStep('setup');
                setRouteError("No route found."); // Will trigger "NO ROUTE FOUND" in UI
                setTimeout(() => {
                    setNavState('expanded');
                }, 50);
            }
        } else {
            // No location data logic? Fallback to setup.
            setNavStep('setup');
            setTimeout(() => {
                setNavState('expanded');
            }, 50);
        }
    };

    const handleCalculateRoute = async () => {
        // Perform the actual route fetch
        setRouteError(null);
        setNavStep('routing'); // Switch view immediately (loading state?) - technically we should wait, but for now...

        const startCoords = startPlace
            ? { lat: parseFloat(startPlace.lat), lon: parseFloat(startPlace.lon) }
            : (userLocation ? { lat: userLocation.latitude, lon: userLocation.longitude } : null);

        const endCoords = selectedPlace
            ? { lat: parseFloat(selectedPlace.lat), lon: parseFloat(selectedPlace.lon) }
            : null;

        if (startCoords && endCoords) {
            const r = await api.getRoute(
                startCoords,
                endCoords,
                transportMode
            );
            if (r) {
                setRoute(r);
            } else {
                setRoute(null);
                setRouteError("No route found.");
            }
        } else {
            setRouteError("Location not available.");
        }
    };

    // Hijack handleTransportModeChange to just update state if in setup mode, or fetch if in routing
    const handleTransportModeChange = async (mode: 'driving' | 'walking' | 'transit') => {
        setTransportMode(mode);
        if (navStep === 'setup') return; // Just update state

        // If routing, re-fetch
        setRouteError(null);
        setRoute(null);

        const startCoords = startPlace
            ? { lat: parseFloat(startPlace.lat), lon: parseFloat(startPlace.lon) }
            : (userLocation ? { lat: userLocation.latitude, lon: userLocation.longitude } : null);

        const endCoords = selectedPlace
            ? { lat: parseFloat(selectedPlace.lat), lon: parseFloat(selectedPlace.lon) }
            : null;

        if (startCoords && endCoords) {
            const r = await api.getRoute(startCoords, endCoords, mode);
            if (r) {
                setRoute(r);
            } else {
                setRoute(null);
                setRouteError(`No ${mode} route available.`);
            }
        }
    };

    const handleStartNavigation = () => {
        setNavState('hidden');
        setActiveNavigation(true);
        setIsFollowing(true);
        Speech.speak("Driving mode started.");
    };

    const handleRecalculate = async () => {
        if (userLocation && selectedPlace) {
            const r = await api.getRoute(
                { lat: userLocation.latitude, lon: userLocation.longitude },
                { lat: parseFloat(selectedPlace.lat), lon: parseFloat(selectedPlace.lon) },
                transportMode
            );
            if (r) {
                setRoute(r);
                // ActiveNavigation will detect route change and reset stepIndex automatically
            }
        }
    };

    const handleMapPress = () => {
        if (activeNavigation) return;
        setResultsState('hidden');
        setNavState('hidden');
        setSelectedPlace(null);
        setSearchResults([]);
        setRoute(null);
        setPivotActive(false);
        setOptionsActive(false);
        setStartPlace(null); // Reset start place on clear
        setNavStep('setup'); // Reset step
    };

    const appBarHidden = searchActive || resultsState !== 'hidden' || navState !== 'hidden' || pivotActive || optionsActive || activeNavigation;

    return (
        <View style={{ flex: 1 }}>
            <MapLayer
                userLocation={userLocation}
                destination={selectedPlace}
                results={searchResults}
                route={route}
                mapType={mapType}
                showLabels={showLabels}
                onMapPress={handleMapPress}
                onPinPress={(item) => {
                    if (item) {
                        setSelectedPlace(item);
                        setPivotActive(true); // Open FULL Pivot Info
                        setResultsState('hidden'); // Ensure results sheet is hidden/peek only if needed
                    }
                }}
                cameraTrigger={cameraTrigger}
                onRegionChange={setMapRegion}
                cameraMode={activeNavigation ? 'navigation' : 'default'}
                isFollowing={isFollowing}
                onFollowChange={setIsFollowing}
                onHeadingChange={setMapHeading}
            />

            {/* Active Navigation Overlay */}
            {activeNavigation && (
                <ActiveNavigation
                    route={route}
                    userLocation={userLocation}
                    isFollowing={isFollowing}
                    onRecenter={() => setIsFollowing(true)}
                    mapHeading={mapHeading}
                    useMiles={useMiles}
                    onStopConfig={() => {
                        setActiveNavigation(false);
                        setRoute(null);
                        setSelectedPlace(null);
                        setSearchResults([]);
                    }}
                    onRecalculate={handleRecalculate}
                />
            )}

            {!activeNavigation && (
                <>
                    <SearchCurtain
                        active={searchActive}
                        onClose={() => setSearchActive(false)}
                        onResultSelected={handleSearchSelect}
                        onCategorySearch={handleCategoryResults}
                        region={mapRegion}
                        userLocation={userLocation}
                        favorites={favorites}
                    />

                    <ResultsSheet
                        selectedPlace={selectedPlace}
                        results={searchResults}
                        state={resultsState}
                        onStateChange={setResultsState}
                        onGetDirections={handleGetDirections}
                        onPlaceSelect={(place) => {
                            setSelectedPlace(place);
                            setSearchResults([]); // Hide other pins
                        }}
                        userLocation={userLocation}
                        useMiles={useMiles}
                    />

                    <NavigationSheet
                        route={route}
                        state={navState}
                        onStateChange={setNavState}
                        onStartNavigation={handleStartNavigation}
                        transportMode={transportMode}
                        onModeChange={handleTransportModeChange}
                        error={routeError}
                        useMiles={useMiles}
                        step={navStep}
                        destination={selectedPlace}
                        startLocation={startPlace}
                        onStartLocationPress={() => {
                            setSearchTarget('origin');
                            setNavState('hidden'); // Hide sheet temporarily or keep it? search curtain overlays anyway
                            setSearchActive(true);
                        }}
                        onCalculateRoute={handleCalculateRoute}
                    />

                    {pivotActive && (
                        <PivotScreen
                            item={selectedPlace}
                            onClose={() => {
                                setPivotActive(false);
                                setSelectedPlace(null); // Remove pin when closing
                            }}
                            onGetDirections={handleGetDirections}
                            isFavorite={selectedPlace ? favorites.some(f => f.place_id === selectedPlace.place_id) : false}
                            onToggleFavorite={() => selectedPlace && handleToggleFavorite(selectedPlace)}
                        />
                    )}

                    <OptionsMenu
                        active={optionsActive}
                        onClose={() => setOptionsActive(false)}
                        useMiles={useMiles}
                        onUseMilesChange={setUseMiles}
                        mapType={mapType}
                        onMapTypeChange={setMapType}
                        showLabels={showLabels}
                        onShowLabelsChange={setShowLabels}
                    />
                </>
            )}

            <AppBar
                hidden={appBarHidden}
                onSearchPress={() => setSearchActive(true)}
                onLocatePress={async () => {
                    let location = await Location.getCurrentPositionAsync({});
                    setUserLocation(location.coords);
                    setCameraTrigger(prev => prev + 1);
                }}
                onLayersPress={() => setOptionsActive(true)}
            />
        </View>
    );
}
