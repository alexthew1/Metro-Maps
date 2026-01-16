# MetroMaps 8.1.1 - Navigation Overhaul

**Release Date:** January 16, 2026

---

## 🆕 What's New

### Navigation Experience
- **Metro-Style Icons**: Replaced Google bitmap icons with crisp vector `MaterialCommunityIcons` for all maneuvers (turns, U-turns, ramps, merges).
- **Smart Arrow Fallback**: Generic "straight" instructions now show a dynamically rotating arrow based on route bearing.
- **Hysteresis Turn Triggers**: Navigation updates now fire *after* completing a turn (not before entering), preventing premature instruction changes.

### Map Enhancements
- **Route Snapping**: Your position smoothly "glides" along the route line, eliminating GPS jitter.
- **Heading-Locked Camera**: Map always faces the direction of the route (not raw compass), creating a stable "course up" experience.
- **Off-Road Guidance**: A dashed black & white "connection line" now shows how to get from your current position (e.g., parking lot) to the main route.
- **New Map Style**: Updated color palette with visible state borders and preserved business POI labels.

### Route Quality
- **High-Fidelity Polylines**: Routes now use detailed step-by-step coordinates instead of simplified overview paths.

### UI/UX Improvements
- **BottomSheet Height**: Expanded state now covers 90% of screen.
- **Recalculation Handler**: Automatic route re-fetching when you deviate from the path.

---

## 🔧 Technical
- Babel & TypeScript config cleanup
- APK build artifacts excluded from version control

---

*Built with React Native & Expo SDK 54*
