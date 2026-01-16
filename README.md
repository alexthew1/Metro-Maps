# MetroMaps 8.1

> **"Content before Chrome"**

MetroMaps 8.1 is a modern reimagining of the classic Windows Phone 8.1 maps experience, built with **React Native** and **Expo**. It combines the nostalgic, typography-led "Metro" design language with powerful, real-time navigation capabilities powered by Google and OSRM.

## ✨ Features

### 🎨 Iconic Metro Design
- **Authentic Aesthetic**: Full implementation of the "Metro" design language with `Open Sans` typography, 0px border radius, and fluid motion.
- **Pivot Experience**: Custom `PivotScreen` implementation with parallax headers and "bleed" animations.
- **Deep Theming**: Dark Mode by default, utilizing "Pitch Black" (#000) for OLED efficiency and "Accent Colors" for highlights.

### 🗺️ Powerful Maps & Navigation
- **Real-Time Navigation**: Turn-by-turn maneuvers, dynamic distance tracking, and location updates.
- **Smart Routing**: Support for **Driving**, **Walking**, and **Public Transit** modes via Google Directions API.
- **Vector Maps**: Custom-styled Google Maps renderer stripped of clutter to match the minimal UI.
- **Satellite & Traffic**: Toggleable map layers with authentic tile styling.

### 🔍 Intelligent Search
- **Universal Search**: Unified `SearchCurtain` for places, coordinates, and categories.
- **Rich Place Details**: Integrated **Google Places API** to show photos, reviews, phone numbers, and website info.
- **Local Context**: Search results are ranked by proximity to your current view.
- **Category Chips**: Quick access to Food, Coffee, and Gas nearby.

## 🛠️ Tech Stack

- **Core**: React Native, Expo SDK 52
- **Maps**: `react-native-maps` (Google Maps Provider)
- **Animations**: `react-native-reanimated` (v3), `react-native-gesture-handler`
- **Navigation**: Custom "Sheet-based" and "Pivot-based" navigation flow.
- **Services**:
    - **Google Places API** (Search & Details)
    - **Google Directions API** (Routing)
    - **OSRM** (Maneuver decoding)

## 🚀 Getting Started

### Prerequisites
- Node.js & npm/yarn
- Expo CLI
- Android Studio (for local builds) or Expo Go

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/MetroMaps8.1.git
   cd MetroMaps8.1
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file (or configure `app.json`) with your API Keys:
   - `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

4. **Run the App**
   ```bash
   npx expo start
   ```

## 🏗️ Building (Local)

To build the Android APK locally using JDK 17:

```bash
# Set Java 17
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"

# Run EAS Build Local
eas build --platform android --profile preview --local
```

See `BUILD_INSTRUCTIONS.md` for full details on setting up the Android SDK and environment.

## 📄 License

This project is licensed under the MIT License.
