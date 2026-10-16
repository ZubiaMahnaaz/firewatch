---
name: Thermal Intelligence Console
colors:
  surface: '#101418'
  surface-dim: '#101418'
  surface-bright: '#363a3e'
  surface-container-lowest: '#0b0f12'
  surface-container-low: '#181c20'
  surface-container: '#1c2024'
  surface-container-high: '#262a2f'
  surface-container-highest: '#31353a'
  on-surface: '#e0e3e8'
  on-surface-variant: '#d6c4af'
  inverse-surface: '#e0e3e8'
  inverse-on-surface: '#2d3135'
  outline: '#9e8e7c'
  outline-variant: '#514535'
  surface-tint: '#ffb955'
  primary: '#ffd9ab'
  on-primary: '#452b00'
  primary-container: '#ffb547'
  on-primary-container: '#704800'
  inverse-primary: '#835500'
  secondary: '#88ceff'
  on-secondary: '#00344d'
  secondary-container: '#006c9b'
  on-secondary-container: '#cce8ff'
  tertiary: '#ffd6d0'
  on-tertiary: '#690003'
  tertiary-container: '#ffafa5'
  on-tertiary-container: '#a5030a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb4'
  primary-fixed-dim: '#ffb955'
  on-primary-fixed: '#291800'
  on-primary-fixed-variant: '#633f00'
  secondary-fixed: '#c8e6ff'
  secondary-fixed-dim: '#88ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4aa'
  on-tertiary-fixed: '#410001'
  on-tertiary-fixed-variant: '#930006'
  background: '#101418'
  on-background: '#e0e3e8'
  surface-variant: '#31353a'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-dense: 0.5rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system serves high-stakes satellite operations, disaster response coordinators, and geospatial analysts triaging orbital thermal data. The interface prioritizes rapid situational assessment, high visual signal-to-noise ratio, and operational stamina under low-light control room environments.

The visual direction combines technical minimalism with functional cartographic utility. It relies on crisp spatial segmentation, strict border delineation, and selective emission of high-wavelength thermal indicators (amber and critical infrared red). Visual effects such as diffuse blurs, purple gradients, and decorative glow treatments are strictly prohibited to preserve radiometric legibility and minimize cognitive fatigue during prolonged operational shifts.

## Colors

The palette models thermal imaging sensors (Short-Wave Infrared / Mid-Wave Infrared) overlaid on deep orbital backgrounds:

- **Base Canvas (`#15191D`)**: Deep charcoal viewport providing an unlit, contrast-safe ground layer for satellite imagery, vector maps, and analytical windows.
- **Surface Layer 1 (`#1D2328`)**: Primary panel backdrops, sidebars, and docking areas.
- **Surface Layer 2 (`#252C32`)**: Elevated card containers, operational toolbars, tabular cells, and floating HUD elements.
- **Structural Borders (`#323B43`)**: Uniform 1px dividers defining layout boundaries without visual heaviness.
- **Text & Foreground**:
  - High-Contrast Primary: `#F4F1E9` (Warm Ivory) for critical metrics, active toggles, and headers.
  - Secondary Data: `#9BA3AF` (Muted Slate) for regular data readouts, table headers, and neutral labels.
  - Tertiary Metadata: `#5F6B76` (Deep Slate) for inactive coordinates, grid lines, and passive timestamps.
- **Diagnostic & Thermal Accents**:
  - `Thermal Amber` (`#FFB547`): Primary target acquisitions, elevated sensor heat signatures, and user-initiated system actions.
  - `Thermal Red` (`#F04438`): Critical thermal anomalies, uncontrolled fire perimeters, and system-level alerts.
  - `Warning Amber` (`#E7B94F`): Unverified anomalies, borderline confidence detections, and thermal sensor saturation warnings.
  - `Telemetry Blue` (`#68B5E8`): Satellite trajectory vectors, orbital passes, calibration statuses, and telemetry readouts.
  - `Operational Green` (`#55B887`): Containment lines, nominal sensor statuses, and confirmed false-positive resolutions.

## Typography

The typographic hierarchy separates structural headlines, qualitative narrative text, and precise quantitative telemetry.

- **Display & Section Titles (Space Grotesk)**: Chosen for its calculated geometry and clean spatial rhythm. Used strictly for dashboard section headers, panel titles, and high-level module labeling.
- **Narrative & System Copy (Manrope)**: Delivers clear, neutral legibility for field observations, analytical reports, inspector notes, and standard operational instructions.
- **Telemetry, Coordinates, & Metrics (JetBrains Mono)**: Applied to all lat/long coordinates, radiometric temperature readings (Kelvin/Celsius), radiometric fire radiative power (FRP in MW), timestamps (UTC), and confidence percentages. Monospaced tabular alignment ensures zero layout jitter when live satellite feeds stream streaming data.

## Layout & Spacing

The layout is built as a tiled viewport console optimized for dense multivariant telemetry and interactive GIS viewports:

- **Spatial Model**: Fixed viewport dashboard pattern (`100vh` application shell) utilizing a multi-pane grid. Left panel houses the anomaly triage queue (collapsible, 320px–380px fixed width). The central region hosts the primary interactive geospatial raster map. The right dock displays active hotspot telemetry and payload controls (360px–420px width). The bottom shelf hosts satellite pass schedules and timeline scrubbers.
- **Grid & Gutters**: Uses tight `0.5rem` (8px) gutters between internal control modules and `1rem` (16px) margins around master screen viewports to prioritize analytical density over expansive whitespace.
- **Responsive Adaptations**:
  - **Desktop (1440px+)**: Tri-pane layout visible simultaneously with persistent telemetry readouts.
  - **Medium Screens / Tablets (768px - 1439px)**: Side panels collapse into contextual slide-out drawers (`z-index: 20`); map maintains dominance.
  - **Mobile Form Factors (<768px)**: Triage workflow switches to single-focus stacked cards with a bottom navigation switch between List, Telemetry, and Geospatial viewports.

## Elevation & Depth

Visual depth is achieved through **tonal layering and razor-sharp border delineation** rather than soft ambient drop shadows:

- **Base Layer (0dp)**: `#15191D` represents raw canvas and foundational GIS map viewport.
- **Structural Panels (1dp)**: `#1D2328` paired with a uniform `1px solid #323B43` perimeter. This outlines persistent navigation, sidebars, and control decks.
- **Interactive Surfaces (2dp)**: `#252C32` with `1px solid #323B43` border. Applied to triage items, metric cards, modal inspectors, and popover tooltips.
- **Active Focus & Critical Elevation (3dp)**: Maintained at `#252C32`, but the boundary upgrades from `#323B43` to an accented edge:
  - Critical Anomaly: `1px solid #F04438`
  - Selected Inspection: `1px solid #FFB547`
  - Telemetry Tracked: `1px solid #68B5E8`
- **Shadows**: Shadows are avoided across panels to prevent blur contamination over complex satellite spectral bands. For floating HUD tooltips over the map canvas only, use a directional cut shadow: `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6)`.

## Shapes

The interface employs a **Soft Technical (`roundedness: 1`)** geometry:

- **Panels, Windows, and Cards**: Standard corner radius of `4px` (`0.25rem`). This preserves an instrumentation-grade hardware silhouette without the extreme visual fatigue of zero-radius brutalism.
- **Buttons, Form Inputs, and Chips**: Standard corner radius of `4px` (`0.25rem`).
- **Data Badges and Status Dots**: Retain square-cut or pill-based indicators depending on functional categorization (e.g., operational status indicators use 2px rounded tags; circular indicator dots maintain pure 50% radius).
- **Interactive Overlays & Drawer Terminals**: Fixed at `4px` corner beveling to maintain alignment with 1px border intersections.

## Components

### Buttons
- **Primary Action (Acknowledge, Deploy Resource)**: Filled `#FFB547` with `#15191D` text (Space Grotesk, 600 weight). Hover state transitions to `#E69E35`. Focus ring: `1px solid #F4F1E9`.
- **Secondary / Telemetry Action (Calibrate, Filter)**: Background `#252C32`, border `1px solid #323B43`, text `#F4F1E9`. Hover state shifts border to `#68B5E8` and text to `#68B5E8`.
- **Destructive / Urgent Action (Declare Wildfire, Evacuate Sector)**: Background `transparent`, border `1px solid #F04438`, text `#F04438`. Hover state fills with `#F04438` and changes text to `#15191D`.
- **Ghost Action**: Transparent background, `#9BA3AF` text, no border. Hover state renders background `#1D2328` and text `#F4F1E9`.

### Chips & Status Badges
- **Thermal Critical**: Background `rgba(240, 68, 56, 0.12)`, border `1px solid rgba(240, 68, 56, 0.4)`, text `#F04438`. JetBrains Mono 10px uppercase with a flashing or static 6px indicator pip.
- **Thermal Advisory**: Background `rgba(255, 181, 71, 0.12)`, border `1px solid rgba(255, 181, 71, 0.4)`, text `#FFB547`.
- **Telemetry Valid**: Background `rgba(104, 181, 232, 0.12)`, border `1px solid rgba(104, 181, 232, 0.4)`, text `#68B5E8`.
- **Resolved / Controlled**: Background `rgba(85, 184, 135, 0.12)`, border `1px solid rgba(85, 184, 135, 0.4)`, text `#55B887`.

### Cards & Triage Feed Elements
- Container: `#252C32` surface with `1px solid #323B43` border.
- Layout: Dense header featuring UTC timestamp (JetBrains Mono, `#9BA3AF`) and Confidence Score (e.g., `94.2% CRIT`).
- Inner Dividers: `1px solid #1D2328`.
- Selected State: Replaces default border with `1px solid #FFB547` and adds a 2px left-side active accent rail.

### Input Fields & Selectors
- Standard State: `#1D2328` background, `1px solid #323B43` border, text `#F4F1E9` (Manrope 14px), placeholder `#5F6B76`.
- Focus State: Border transitions to `1px solid #68B5E8`. No soft drop shadow or glowing halos.
- Monospace Data Inputs (Lat/Long, Radiance thresholds): Font swaps to JetBrains Mono with unit suffix badges (`MW`, `K`, `°N`) anchored to the inside-right edge.

### Checkboxes & Switches
- Checkbox: 16x16px box, `#1D2328` surface, `1px solid #323B43` border, 2px corner radius. Checked state uses `#FFB547` background with a `#15191D` micro-checkmark.
- Toggle Switches: 32x18px track in `#1D2328` with `1px solid #323B43`. Thumb is a 12x12px square-round slider (`#9BA3AF`). Active state turns track border to `#FFB547` and thumb to `#FFB547`.

### Satellite-Specific Domain Components
- **Radiometric Histogram Bar**: Compact inline horizontal distribution visualizer (8px height) rendering temperature spectrum bins from `#1D2328` through `#FFB547` to `#F04438`.
- **Orbital Track Pill**: Segmented badge displaying satellite identifier (`SENTINEL-2A`, `VIIRS-NOAA20`), latency marker (`-00:14:22 UTC`), and radiometric sensor state.
- **Spatial Coordinate HUD**: Floating glass-free panel anchored to map corners displaying current crosshair cursor position (`WGS 84: 37°46'29"N 119°35'43"W`) and ground sample elevation.