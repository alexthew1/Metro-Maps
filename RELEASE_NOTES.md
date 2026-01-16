# MetroMaps 8.1.1 - Navigation Overhaul

**Release Date:** January 16, 2026

---

## 🆕 What's New

### Navigation Experience
- **Voice Navigation**: Turn-by-turn voice guidance using `expo-speech` announces upcoming maneuvers.
- **Metro-Style Icons**: Crisp vector icons for all maneuvers (turns, U-turns, ramps, merges).
- **Smart Arrow Fallback**: Dynamically rotating arrow for generic "straight" instructions.
- **Hysteresis Turn Triggers**: Updates fire *after* completing turns, not before.

### Map Enhancements
- **Route Snapping**: Position smoothly glides along the route line.
- **Heading-Locked Camera**: Map faces the route direction, not raw compass.
- **Off-Road Guidance**: Dashed line shows path from parking lot to main route.
- **New Map Style**: State borders visible, business POI labels preserved.

### Route Quality
- **High-Fidelity Polylines**: Detailed step-by-step coordinates.
- **Auto-Recalculation**: Re-routes automatically when you deviate.

---

## 🔧 Technical
- Babel & TypeScript config cleanup
- APK artifacts excluded from git

---

*Built with React Native & Expo SDK 54*
