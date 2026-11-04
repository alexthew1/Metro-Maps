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
import { api, RouteResult, SearchResult, setGoogleApiKey } from '../services/api';
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
import { useTheme } from '../contexts/ThemeContext';

export default function HomeScreen() {
    const { colors } = useTheme();
    // State
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number, heading?: number | null, speed?: number | null, accuracy?: number | null } | null>(null);

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
    const [mapTheme, setMapTheme] = useState<'light' | 'dark'>('light');
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
    const [transportMode, setTransportMode] = useState<'driving' | 'walking' | 'transit'>('driving');

    // Sheet States
    const [resultsState, setResultsState] = useState<'hidden' | 'peek' | 'expanded'>('hidden');
    const [navState, setNavState] = useState<'hidden' | 'peek' | 'expanded'>('hidden');

    // Data
    const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [routes, setRoutes] = useState<RouteResult[]>([]);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
    const route = routes[selectedRouteIndex] || null;
    const [routeError, setRouteError] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<SearchResult[]>([]);

    // Load Favorites
    useEffect(() => {
        loadFavorites();
    }, [pivotActive, favoritesState]);

    const loadFavorites = async () => {
        const favs = await FavoritesService.getFavorites();
        setFavorites(favs);
    };

    // Load persisted settings (units, last region, api key, zoom)
    useEffect(() => {
        SettingsService.getMapTheme().then(setMapTheme);
        SettingsService.getUnits().then(setUnits);
        SettingsService.getZoomControls().then(setShowZoomControls);
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

    const handleMapThemeChange = (theme: 'light' | 'dark') => {
        setMapTheme(theme);
        SettingsService.setMapTheme(theme);
    };

    const handleZoomControlsChange = (enabled: boolean) => {
        setShowZoomControls(enabled);
        SettingsService.setZoomControls(enabled);
    };

    // Auto-collapse App Bar when overlays are opened
    useEffect(() => {
        if (settingsVisible || aboutVisible || optionsActive || favoritesState !== 'hidden' || searchActive) {
            setAppMenuVisible(false);
        }
    }, [settingsVisible, aboutVisible, optionsActive, favoritesState, searchActive]);

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
        let disposed = false;
        let subscription: Location.LocationSubscription | undefined;
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
            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 1000,     // Avoid overlapping camera animations and excessive renders
                    distanceInterval: 1,
                },
                (location) => {
                    if (!disposed) setUserLocation(location.coords);
                }
            );

            if (disposed) subscription.remove();
        })().catch(error => console.warn('Location updates unavailable', error));
        return () => {
            disposed = true;
            subscription?.remove();
        };
    }, []);

    // Back Button Handling
    useEffect(() => {
        const backAction = () => {
            if (activeNavigation) {
                // Prevent accidental exit. User must press 'END' button.
                return true;
            }
            if (appMenuVisible) { setAppMenuVisible(false); return true; }
            if (settingsVisible) { setSettingsVisible(false); return true; }
            if (aboutVisible) { setAboutVisible(false); return true; }
            if (optionsActive) { setOptionsActive(false); return true; }
            if (favoritesState !== 'hidden') { setFavoritesState('hidden'); return true; }
            if (pivotActive) {
                setPivotActive(false);
                setSelectedPlace(null);
                setSearchResults([]); // Ensure map is clear
                setRoutes([]);
                return true;
            }
            if (searchActive) { setSearchActive(false); return true; }
            if (navState !== 'hidden') {
                setNavState('hidden');
                setRoutes([]);
                setSelectedPlace(null);
                setSearchResults([]); // Ensure map is clear
                setRouteError(null);
                return true;
            }
            if (resultsState !== 'hidden') {
                setResultsState('hidden');
                setSelectedPlace(null);
                setSearchResults([]);
                setRoutes([]);
                setRouteError(null);
                return true;
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [pivotActive, searchActive, navState, resultsState, optionsActive, activeNavigation, favoritesState, appMenuVisible, settingsVisible, aboutVisible]);


    const [startPlace, setStartPlace] = useState<SearchResult | null>(null);
    const [navStep, setNavStep] = useState<'setup' | 'routing'>('setup');
    const [searchTarget, setSearchTarget] = useState<'destination' | 'origin'>('destination');
    const [searchMode, setSearchMode] = useState<'explore' | 'directions'>('explore');

    // ...

    const routeRequestId = React.useRef(0);
    useEffect(() => {
        routeRequestId.current += 1;
    }, [selectedPlace, startPlace]);

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

            if (searchMode === 'directions') {
                setNavState('expanded');
                setNavStep('setup');
            } else {
                setResultsState('peek');
            }

            setSearchMode('explore'); // Reset check
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
        const requestId = ++routeRequestId.current;
        setPivotActive(false); // Close Pivot Screen
        setResultsState('hidden');
        setRouteError(null);

        // Always reset to Driving (Car View) first
        setTransportMode('driving');

        // Optimistic / Immediate Attempt
        if (userLocation && selectedPlace) {
            const fetchedRoutes = await api.getRoutes(
                { lat: userLocation.latitude, lon: userLocation.longitude },
                { lat: parseFloat(selectedPlace.lat), lon: parseFloat(selectedPlace.lon) },
                'driving'
            );

            if (requestId !== routeRequestId.current) return;
            if (fetchedRoutes && fetchedRoutes.length > 0) {
                // Success: Show Route immediately (Old Behavior)
                setRoutes(fetchedRoutes);
                setSelectedRouteIndex(0);
                setNavStep('routing');
                setNavState('peek');
            } else {
                // Failure: Show Setup Screen (New Behavior for "No Route")
                setRoutes([]);
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
        const requestId = ++routeRequestId.current;
        // Clear previous directions while the new route is calculated.
        setRoutes([]);
        setRouteError(null);
        setNavStep('routing'); // Switch view immediately (loading state?) - technically we should wait, but for now...

        const startCoords = startPlace
            ? { lat: parseFloat(startPlace.lat), lon: parseFloat(startPlace.lon) }
            : (userLocation ? { lat: userLocation.latitude, lon: userLocation.longitude } : null);

        const endCoords = selectedPlace
            ? { lat: parseFloat(selectedPlace.lat), lon: parseFloat(selectedPlace.lon) }
            : null;

        if (startCoords && endCoords) {
            const fetchedRoutes = await api.getRoutes(
                startCoords,
                endCoords,
                transportMode
            );
            if (requestId !== routeRequestId.current) return;
            if (fetchedRoutes && fetchedRoutes.length > 0) {
                setRoutes(fetchedRoutes);
                setSelectedRouteIndex(0);
            } else {
                setRoutes([]);
                setRouteError("No route found.");
            }
        } else {
            setRouteError("Location not available.");
        }
    };

    // Hijack handleTransportModeChange to just update state if in setup mode, or fetch if in routing
    const handleTransportModeChange = async (mode: 'driving' | 'walking' | 'transit') => {
        const requestId = ++routeRequestId.current;
        setTransportMode(mode);
        if (navStep === 'setup') return; // Just update state

        // If routing, re-fetch
        setRouteError(null);
        setRoutes([]);

        const startCoords = startPlace
            ? { lat: parseFloat(startPlace.lat), lon: parseFloat(startPlace.lon) }
            : (userLocation ? { lat: userLocation.latitude, lon: userLocation.longitude } : null);

        const endCoords = selectedPlace
            ? { lat: parseFloat(selectedPlace.lat), lon: parseFloat(selectedPlace.lon) }
            : null;

        if (startCoords && endCoords) {
            const fetchedRoutes = await api.getRoutes(startCoords, endCoords, mode);
            if (requestId !== routeRequestId.current) return;
            if (fetchedRoutes && fetchedRoutes.length > 0) {
                setRoutes(fetchedRoutes);
                setSelectedRouteIndex(0);
            } else {
                setRoutes([]);
                setRouteError(`No ${mode} route available.`);
            }
        }
    };

    const handleStartNavigation = () => {
        if (!route || !userLocation) return;
        setNavState('hidden');
        setActiveNavigation(true);
        setIsFollowing(true);
        setSearchResults([]); // Clear all markers except destination
        Speech.speak("Driving mode started.");
    };

    const navigationSession = React.useRef(0);
    useEffect(() => {
        return () => { navigationSession.current += 1; };
    }, [activeNavigation]);

    const handleRecalculate = async () => {
        const session = navigationSession.current;
        if (!userLocation || !selectedPlace) return;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
            const fetchedRoutes = await api.getRoutes(
                { lat: userLocation.latitude, lon: userLocation.longitude },
                { lat: parseFloat(selectedPlace.lat), lon: parseFloat(selectedPlace.lon) },
                transportMode,
                controller.signal
            );
            if (session === navigationSession.current && fetchedRoutes && fetchedRoutes.length > 0) {
                setRoutes(fetchedRoutes);
                setSelectedRouteIndex(0);
            }
        } finally {
            clearTimeout(timeout);
        }
    };

    const handleMapPress = () => {
        if (activeNavigation) return;

        // If we are currently in the routing or setup screen, don't clear the route.
        // Just collapse the sheet if it's expanded so they can see the map better.
        if (navState !== 'hidden') {
            if (navState === 'expanded') {
                setNavState('peek');
            }
            return;
        }

        // If results sheet is expanded, just peek it on map press
        if (resultsState === 'expanded') {
            setResultsState('peek');
            return;
        }

        setResultsState('hidden');
        setNavState('hidden');
        setSelectedPlace(null);
        setSearchResults([]);
        setRoutes([]);
        setPivotActive(false);
        setOptionsActive(false);
        setFavoritesState('hidden');
        setStartPlace(null); // Reset start place on clear
        setNavStep('setup'); // Reset step
    };



    const appBarHidden = searchActive || resultsState !== 'hidden' || navState !== 'hidden' || pivotActive || optionsActive || favoritesState !== 'hidden' || activeNavigation || appMenuVisible || settingsVisible || aboutVisible;

    if (!hasLoadedRegion) {
        return <View style={{ flex: 1, backgroundColor: colors.background }} />;
    }

    return (
        <View style={{ flex: 1 }}>
            <MapLayer
                userLocation={userLocation}
                destination={selectedPlace}
                results={searchResults}
                favorites={favorites}
                routes={routes}
                selectedRouteIndex={selectedRouteIndex}
                onSelectRoute={setSelectedRouteIndex}
                mapType={mapType}
                mapTheme={mapTheme}
                showLabels={showLabels}
                showsBuildings={showsBuildings}
                showZoomControls={showZoomControls}
                showUserLocation={showUserLocation}
                useMiles={units !== 'metric'}
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
                        setRoutes([]);
                        setSelectedPlace(null);
                        setSearchResults([]);
                        setNavState('hidden');
                        setResultsState('hidden');
                        setPivotActive(false);
                        setStartPlace(null);
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
                        routes={routes}
                        selectedRouteIndex={selectedRouteIndex}
                        onSelectRoute={setSelectedRouteIndex}
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
                        onDestinationPress={() => {
                            setSearchTarget('destination');
                            setSearchMode('directions');
                            setNavState('hidden');
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
                            mapTheme={mapTheme}
                        />
                    )}

                    <OptionsMenu
                        active={optionsActive}
                        onClose={() => setOptionsActive(false)}
                        showLabels={showLabels}
                        onShowLabelsChange={setShowLabels}
                        showsBuildings={showsBuildings}
                        onShowsBuildingsChange={setShowsBuildings}
                    />

                    <SettingsSheet
                        visible={settingsVisible}
                        onClose={() => setSettingsVisible(false)}
                        mapTheme={mapTheme}
                        onMapThemeChange={handleMapThemeChange}
                        units={units}
                        onUnitsChange={handleUnitsChange}
                        showZoomControls={showZoomControls}
                        onShowZoomControlsChange={handleZoomControlsChange}
                        showUserLocation={showUserLocation}
                        onShowUserLocationChange={setShowUserLocation}
                        onClearHistory={() => RecentsService.clearRecents()}
                    />

                    <FavoritesSheet
                        state={favoritesState}
                        onStateChange={setFavoritesState}
                        onFavoritesChange={loadFavorites}
                        onSelect={(item) => {
                            setFavoritesState('hidden');
                            setSelectedPlace(item);
                            loadFavorites();
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
                <View style={{ position: 'absolute', bottom: 145, right: 10, zIndex: 50, opacity: appBarHidden ? 0 : 1 }} pointerEvents={appBarHidden ? 'none' : 'auto'}>
                    <TouchableOpacity
                        onPress={() => setOptionsActive(true)}
                        activeOpacity={0.8}
                        style={{
                            width: 56, height: 56, borderRadius: 28,
                            backgroundColor: colors.appBarBg, // Use theme appBarBg
                            justifyContent: 'center', alignItems: 'center',
                            borderWidth: 1,
                            borderColor: colors.border
                        }}
                    >
                        <MaterialCommunityIcons name="layers-outline" size={28} color={colors.text} />
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
