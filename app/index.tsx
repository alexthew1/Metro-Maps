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

export default function HomeScreen() {
    // State
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    // UI Modes
    const [searchActive, setSearchActive] = useState(false);
    const [pivotActive, setPivotActive] = useState(false);
    const [optionsActive, setOptionsActive] = useState(false);
    const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
    const [useMiles, setUseMiles] = useState(true); // true = miles, false = kilometers
    const [cameraTrigger, setCameraTrigger] = useState(0);
    const [mapRegion, setMapRegion] = useState<any>(null); // Track map region for search context
    const [activeNavigation, setActiveNavigation] = useState(false);

    // Sheet States
    const [resultsState, setResultsState] = useState<'hidden' | 'peek' | 'expanded'>('hidden');
    const [navState, setNavState] = useState<'hidden' | 'peek' | 'expanded'>('hidden');

    // Data
    const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [route, setRoute] = useState<RouteResult | null>(null);

    // --- Logic ---

    // Locations
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            // Watch position for updates
            Location.watchPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 2000,
                distanceInterval: 10
            }, (location) => {
                setUserLocation(location.coords);
            });
        })();
    }, []);

    // Back Button Handling
    useEffect(() => {
        const backAction = () => {
            if (activeNavigation) {
                setActiveNavigation(false);
                return true;
            }
            if (optionsActive) { setOptionsActive(false); return true; }
            if (pivotActive) {
                setPivotActive(false);
                setSelectedPlace(null); // Clear pin
                return true;
            }
            if (searchActive) { setSearchActive(false); return true; }
            if (navState !== 'hidden') {
                setNavState('hidden');
                setRoute(null); // Clear route from map
                setSelectedPlace(null); // Clear pin
                return true;
            }
            if (resultsState !== 'hidden') {
                setResultsState('hidden');
                setSelectedPlace(null);
                setSearchResults([]);
                setRoute(null);
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

        if (userLocation && selectedPlace) {
            const r = await api.getRoute(
                { lat: userLocation.latitude, lon: userLocation.longitude },
                { lat: parseFloat(selectedPlace.lat), lon: parseFloat(selectedPlace.lon) }
            );
            setRoute(r);
        }
    };

    const handleStartNavigation = () => {
        setNavState('hidden');
        setActiveNavigation(true);
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
            />

            {/* Active Navigation Overlay */}
            {activeNavigation && (
                <ActiveNavigation
                    route={route}
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
                    />

                    <ResultsSheet
                        selectedPlace={selectedPlace}
                        results={searchResults}
                        state={resultsState}
                        onStateChange={setResultsState}
                        onGetDirections={handleGetDirections}
                        onPlaceSelect={(place) => {
                            setSelectedPlace(place);
                        }}
                        userLocation={userLocation}
                        useMiles={useMiles}
                    />

                    <NavigationSheet
                        route={route}
                        state={navState}
                        onStateChange={setNavState}
                        onStartNavigation={handleStartNavigation}
                    />

                    <PivotScreen
                        item={selectedPlace}
                        active={pivotActive}
                        onClose={() => {
                            setPivotActive(false);
                            setSelectedPlace(null); // Remove pin when closing
                        }}
                        onGetDirections={handleGetDirections}
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
            />
        </View>
    );
}
