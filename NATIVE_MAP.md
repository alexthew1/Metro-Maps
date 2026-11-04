# Android map renderer

Android uses `components/MapLayer.android.tsx` to send scene data and receive map events. `plugins/native/MetroMapView.kt` owns the Google MapView, overlays, camera, native zoom buttons, location marker and lifecycle. iOS retains `components/MapLayer.tsx`.

The Expo config plugin copies the Kotlin source and navigation arrow image into the generated Android project. Edit the files under `plugins/native`, then run `npx expo prebuild --platform android --no-install`. Changes made only inside `android/` can be overwritten by prebuild.

## Styling

Without map IDs, `constants/MapStyles.ts` supplies the existing embedded basemap styles. Search results, favorites and destinations use standard Google SDK markers. Custom POI pins and the nearby-place replacement layer are disabled on Android. Route labels are drawn by Android Canvas in `MetroMapIcons.kt`.

For Google's built-in POI pin colors, use cloud-based styling:

1. In Google Cloud Maps Styles, import `assets/map-styles/metro-light.cloud.json` and `metro-dark.cloud.json` as separate light/dark styles and publish them.
2. Associate both published styles (light and dark) with the shared Android map ID.
3. Set `EXPO_PUBLIC_ANDROID_MAP_ID` in the local `.env` file, then rebuild. The app explicitly selects the light or dark color scheme on Maps SDK 19.2.0. Optional `EXPO_PUBLIC_ANDROID_MAP_ID_LIGHT` and `EXPO_PUBLIC_ANDROID_MAP_ID_DARK` override the shared ID when separate IDs are needed.

The cloud JSON includes `pinOutlineColor`, `pinFillColor`, and `pinGlyphColor`. These properties apply to Google's built-in POIs. The cloud POI styles apply to Google basemap POIs; explicitly placed search/favorite/destination markers use the standard Google marker. When a cloud map ID is configured, the native renderer uses that map ID, skips embedded styling, and leaves Google's POI layer visible. Without a map ID, embedded styling remains available; the app still uses Google's built-in POIs.

Reference: https://developers.google.com/maps/documentation/android-sdk/cloud-customization/json-reference

## Checks

- `npm test`
- `npx tsc --noEmit`
- From `android/`: `gradlew.bat :app:testReleaseUnitTest assembleRelease`

Device checks still needed: map startup, route alternatives and labels, portrait layout, zoom/pan/recenter, following GPS while navigating, returning from background, light/dark and satellite views, and place selection.
