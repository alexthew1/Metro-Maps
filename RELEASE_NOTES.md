# MetroMaps v8.1: The "Reimagined" Update

We are thrilled to announce the release of **MetroMaps 8.1**, a complete overhaul that brings the beloved Metro design language to modern devices with production-grade power.

## 🌟 What's New

### The "Metro" Experience
- **Authentic Pivot Interface**: Swiping between About, Photos, and Reviews feels exactly like it did in 2014.
- **Typography-First Design**: Content is king. We've removed chrome, borders, and clutter, letting `Open Sans Light` take center stage.
- **Fluid Motion**: Every interaction, from sheet expansions to map tilts, is animated with custom bezier curves (`0.1, 0.9, 0.2, 1`) for that snappy "digital" feel.

### 🚗 Professional Navigation
- **Turn-by-Turn Guidance**: Drive confidently with real-time maneuvers, distance countdowns, and "Course Up" map orientation.
- **Multi-Mode Routing**: Seamlessly switch between **Car**, **Transit**, and **Walking**, with specific error handling for each.
- **Satellite Hybrid**: Switch to high-resolution satellite imagery with street labels for better context when off-road.

### 🌐 Google Power, Metro Soul
- **Rich Place Details**: We now pull photos, ratings, phone numbers, and reviews dynamically from the Google Places API.
- **Smart Search**: The new "curtain" search interface supports category chips (Food, Gas, Coffee) and prioritizes results based on your current map view.

### ⚙️ Under the Hood
- **Performance**: migrated to `react-native-reanimated` v3 for 60fps animations on the UI thread.
- **Efficiency**: "Locate Me" uses `expo-location` with optimized polling to save battery.
- **Architecture**: Clean component-based architecture with `react-native-safe-area-context` for perfect layout on notched devices (iPhone 14/15, Pixel 8).

---

*Rediscover the beauty of digital authenticity with MetroMaps 8.1.*
