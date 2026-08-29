# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **App Bar Animations:** Added custom animations for the application bar.
- **Turnstile Animation:** Added a classic Metro-style 3D swing turnstile animation to the `PivotScreen` component.

### Changed
- **Metro Button:** Redesigned and rewrote the core `MetroButton` component.
- **Slider:** Overhauled the slider control with a new Metro-inspired design and logic.
- **Animation Speed & Direction:** Reversed the `PivotScreen` turnstile animation to swing in from the left (matching the settings menu) and reduced the duration to 300ms (entering) and 250ms (exiting) for a snappier feel.

### Fixed
- **TypeScript Configuration:** Fixed a module resolution error by pointing the `tsconfig.json` `extends` field directly to `expo/tsconfig.base` instead of a local file path.
- **Animation Typings:** Fixed TypeScript linting errors (`TS2322`) related to the `easing` property in React Native Reanimated `Keyframe` steps by applying `@ts-ignore` to bridge the type gap while preserving the fluid curve.
