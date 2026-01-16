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


    // Actions
    const handleSearchSelect = (result: SearchResult) => {
        setSelectedPlace(result);
        setSearchResults([]); // Clear list on specific select
        setSearchActive(false);
        setResultsState('peek');
        setPivotActive(true); // Also open pivot immediately for consistency
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
        setNavState('peek');
        setRouteError(null); // Clear previous errors

        // Always reset to Driving (Car View) first
        setTransportMode('driving');

        if (userLocation && selectedPlace) {
            const r = await api.getRoute(
                { lat: userLocation.latitude, lon: userLocation.longitude },
                { lat: parseFloat(selectedPlace.lat), lon: parseFloat(selectedPlace.lon) },
                'driving' // Explicitly use driving
            );
            if (r) {
                setRoute(r);
            } else {
                setRoute(null);
                setRouteError("No route found.");
            }
        }
    };

    const handleTransportModeChange = async (mode: 'driving' | 'walking' | 'transit') => {
        setTransportMode(mode);
        setRouteError(null);
        setRoute(null); // Clear old route while loading? Or keep it? keeping is better UX but loading indicator needed.
        // For simplicity, we keep old route until new one arrives, or error.

        if (userLocation && selectedPlace) {
            const r = await api.getRoute(
                { lat: userLocation.latitude, lon: userLocation.longitude },
                { lat: parseFloat(selectedPlace.lat), lon: parseFloat(selectedPlace.lon) },
                mode
            );
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
        setIsFollowing(true); // Ensure we start following
        Speech.speak("Driving mode started.");
    };

    const handleMapPress = () => {
        if (activeNavigation) return; // Don't allow map clicks during nav unless we want to show controls
        // Clear all sheets and selection
        setResultsState('hidden');
        setNavState('hidden');
        setSelectedPlace(null);
        setSearchResults([]);
        setRoute(null);
        setPivotActive(false);
        setOptionsActive(false);
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
                        setSearchResults([]); // Clear other pins so only the selected one remains
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
                            setSearchResults([]); // Clear list so only selected remains
                            setPivotActive(true); // Open pivot
                            setResultsState('hidden'); // Hide sheet since pivot covers it
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
