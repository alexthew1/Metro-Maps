import React, { useState, useEffect } from 'react';
import { View, BackHandler, TouchableOpacity } from 'react-native';
import { MapLayer } from '../components/MapLayer';
import { AppBar } from '../components/AppBar';
import { SearchCurtain } from '../components/SearchCurtain';
import { ResultsSheet } from '../components/ResultsSheet';
import { NavigationSheet } from '../components/NavigationSheet';
import { PivotScreen } from '../components/PivotScreen';
import { OptionsMenu } from '../components/OptionsMenu';
import { SettingsSheet } from '../components/SettingsSheet';
import { api, RouteResult, SearchResult } from '../services/api';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ActiveNavigation } from '../components/ActiveNavigation';
import { FavoritesService, Favorite } from '../services/favorites';
import { RecentsService } from '../services/recents';
import { FavoritesSheet } from '../components/FavoritesSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UnitsType } from '../components/SettingsSheet';
import { AboutSheet } from '../components/AboutSheet';
import { SettingsService } from '../services/settings';

export default function HomeScreen() {
    // State
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number, heading?: number | null, speed?: number | null } | null>(null);

    // UI Modes
    const [searchActive, setSearchActive] = useState(false);
    const [pivotActive, setPivotActive] = useState(false);
    const [optionsActive, setOptionsActive] = useState(false);
    const [appMenuVisible, setAppMenuVisible] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [aboutVisible, setAboutVisible] = useState(false);
    const [favoritesState, setFavoritesState] = useState<'hidden' | 'peek' | 'expanded'>('hidden');
    const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
    const [showLabels, setShowLabels] = useState(true);
    const [showsBuildings, setShowsBuildings] = useState(true);
    const [units, setUnits] = useState<UnitsType>('metric'); // Will be loaded from storage
    const [showZoomControls, setShowZoomControls] = useState(false);
    const [showUserLocation, setShowUserLocation] = useState(true);
    const [cameraTrigger, setCameraTrigger] = useState(0);
    const [mapRegion, setMapRegion] = useState<any>(null); // Track map region for search context
    const [initialRegion, setInitialRegion] = useState<any>(null); // Loaded from persistence
    const [hasLoadedRegion, setHasLoadedRegion] = useState(false); // Flag to check if persistence load is done
    const [activeNavigation, setActiveNavigation] = useState(false);
    const [isFollowing, setIsFollowing] = useState(true); // Track if camera follows user
    const [mapHeading, setMapHeading] = useState(0);
    const [transportMode, setTransportMode] = useState<'driving' | 'walking'>('driving');

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

    // Load units preference from storage (auto-detects from locale if not set)
    // Load persisted settings (units, last region)
    useEffect(() => {
        SettingsService.getUnits().then(setUnits);
        SettingsService.getLastRegion().then((region) => {
            if (region) {
                setInitialRegion(region);
                setMapRegion(region);
            }
            setHasLoadedRegion(true);
        });
    }, []);

    // Save units preference when changed
    const handleUnitsChange = (newUnits: UnitsType) => {
        setUnits(newUnits);
        SettingsService.setUnits(newUnits);
    };

    // Auto-collapse App Bar when overlays are opened
    useEffect(() => {
        if (settingsVisible || aboutVisible || optionsActive || favoritesState !== 'hidden' || searchActive) {
            setAppMenuVisible(false);
        }
    }, [settingsVisible, aboutVisible, optionsActive, favoritesState, searchActive]);

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
            // Check if Location Services are enabled at system level
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                console.log('Location Services disabled in Settings - app will work without location');
                return;
            }

            // Check current permission status first (without prompting)
            let { status } = await Location.getForegroundPermissionsAsync();

            // Only request if not yet determined (first launch)
            if (status === 'undetermined') {
                const result = await Location.requestForegroundPermissionsAsync();
                status = result.status;
            }

            // If denied, don't keep asking - just exit gracefully
            if (status !== 'granted') {
                console.log('Location permission denied - app will work without location');
                return;
            }

            // Use watchPositionAsync for better accuracy and efficiency
            const subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 500,      // Update every 500ms
                    distanceInterval: 1,    // Update every 1 meter moved
                },
                (location) => {
                    setUserLocation(location.coords);
                }
            );

            return () => subscription.remove();
        })();
    }, []);

    // Back Button Handling
    useEffect(() => {
        const backAction = () => {
            if (activeNavigation) {
                // Prevent accidental exit. User must press 'END' button.
                return true;
            }
            if (activeNavigation) {
                // Prevent accidental exit. User must press 'END' button.
                return true;
            }
            if (appMenuVisible) { setAppMenuVisible(false); return true; }
            if (settingsVisible) { setSettingsVisible(false); return true; }
            if (optionsActive) { setOptionsActive(false); return true; }
            if (favoritesState !== 'hidden') { setFavoritesState('hidden'); return true; }
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
    }, [pivotActive, searchActive, navState, resultsState, optionsActive, activeNavigation, favoritesState, appMenuVisible, settingsVisible]);


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
            RecentsService.addRecent(result); // Track recent
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
    const handleTransportModeChange = async (mode: 'driving' | 'walking') => {
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
        setFavoritesState('hidden');
        setStartPlace(null); // Reset start place on clear
        setNavStep('setup'); // Reset step
    };



    const appBarHidden = searchActive || resultsState !== 'hidden' || navState !== 'hidden' || pivotActive || optionsActive || favoritesState !== 'hidden' || activeNavigation || appMenuVisible || settingsVisible;

    if (!hasLoadedRegion) {
        return <View style={{ flex: 1, backgroundColor: '#000' }} />;
    }

    return (
        <View style={{ flex: 1 }}>
            <MapLayer
                userLocation={userLocation}
                destination={selectedPlace}
                results={searchResults}
                route={route}
                mapType={mapType}
                showLabels={showLabels}
                showsBuildings={showsBuildings}
                showZoomControls={showZoomControls}
                showUserLocation={showUserLocation}
                onMapPress={handleMapPress}
                onPinPress={(item) => {
                    if (item) {
                        setSelectedPlace(item);
                        setPivotActive(true); // Open FULL Pivot Info
                        setResultsState('hidden'); // Ensure results sheet is hidden/peek only if needed
                        RecentsService.addRecent(item);
                    }
                }}
                cameraTrigger={cameraTrigger}
                onRegionChange={(region) => {
                    setMapRegion(region);
                    SettingsService.setLastRegion(region);
                }}
                cameraMode={activeNavigation ? 'navigation' : 'default'}
                isFollowing={isFollowing}
                onFollowChange={setIsFollowing}
                onHeadingChange={setMapHeading}
                initialRegion={initialRegion}
            />

            {/* Active Navigation Overlay */}
            {activeNavigation && (
                <ActiveNavigation
                    route={route}
                    userLocation={userLocation}
                    isFollowing={isFollowing}
                    onRecenter={() => setIsFollowing(true)}
                    mapHeading={mapHeading}
                    useMiles={units !== 'metric'}
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
                            RecentsService.addRecent(place);
                        }}
                        userLocation={userLocation}
                        useMiles={units !== 'metric'}
                    />

                    <NavigationSheet
                        route={route}
                        state={navState}
                        onStateChange={setNavState}
                        onStartNavigation={handleStartNavigation}
                        transportMode={transportMode}
                        onModeChange={handleTransportModeChange}
                        error={routeError}
                        useMiles={units !== 'metric'}
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
                        mapType={mapType}
                        onMapTypeChange={setMapType}
                        showLabels={showLabels}
                        onShowLabelsChange={setShowLabels}
                        showsBuildings={showsBuildings}
                        onShowsBuildingsChange={setShowsBuildings}
                    />

                    <SettingsSheet
                        visible={settingsVisible}
                        onClose={() => setSettingsVisible(false)}
                        units={units}
                        onUnitsChange={handleUnitsChange}
                        showZoomControls={showZoomControls}
                        onShowZoomControlsChange={setShowZoomControls}
                        showUserLocation={showUserLocation}
                        onShowUserLocationChange={setShowUserLocation}
                        onClearHistory={() => RecentsService.clearRecents()}
                    />

                    <FavoritesSheet
                        state={favoritesState}
                        onStateChange={setFavoritesState}
                        onSelect={(item) => {
                            setFavoritesState('hidden');
                            setSelectedPlace(item);
                            setPivotActive(item.place_id !== 'dummy'); // Only pivot if valid
                            // Pivot logic needs ensuring valid item or just re-using same logic
                            setPivotActive(true);
                            setMapRegion({
                                latitude: parseFloat(item.lat),
                                longitude: parseFloat(item.lon),
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            });
                            setCameraTrigger(prev => prev + 1);

                            // Also track this as a recent interaction
                            RecentsService.addRecent(item);
                        }}
                    />
                </>
            )}

            {!activeNavigation && (
                <View style={{ position: 'absolute', bottom: 145, right: 20, zIndex: 50, opacity: appBarHidden ? 0 : 1 }} pointerEvents={appBarHidden ? 'none' : 'auto'}>
                    <TouchableOpacity
                        onPress={() => setOptionsActive(true)}
                        activeOpacity={0.8}
                        style={{
                            width: 56, height: 56, borderRadius: 28,
                            backgroundColor: 'rgba(0,0,0,0.6)', // Semi-transparent
                            justifyContent: 'center', alignItems: 'center',
                            // No border
                        }}
                    >
                        <MaterialCommunityIcons name="layers-outline" size={28} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            <AppBar
                hidden={appBarHidden && !appMenuVisible} // If menu is open, don't hide bar even if "hidden" logic applies (though menu overlaps anyway)
                expanded={appMenuVisible}
                onExpandChange={setAppMenuVisible}
                onSearchPress={() => setSearchActive(true)}
                onLocatePress={async () => {
                    let location = await Location.getCurrentPositionAsync({});
                    setUserLocation(location.coords);
                    setCameraTrigger(prev => prev + 1);
                }}
                onFavoritesPress={() => setFavoritesState('peek')}
                onSettingsPress={() => setSettingsVisible(true)}
                onAboutPress={() => setAboutVisible(true)}
                onDirectionsPress={() => {
                    // Open NavigationSheet in setup mode with empty from/to
                    setSelectedPlace(null);
                    setStartPlace(null);
                    setNavStep('setup');
                    setNavState('expanded');
                }}
            />

            <AboutSheet
                visible={aboutVisible}
                onClose={() => setAboutVisible(false)}
            />
        </View>
    );
}
