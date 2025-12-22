# Lyceum Design Guidelines

A comprehensive design system for the Lyceum industrial analytics platform, featuring a futuristic glassmorphism aesthetic with electric cyan accents.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Iconography](#iconography)
5. [Glassmorphism Effects](#glassmorphism-effects)
6. [Components](#components)
7. [Layout Patterns](#layout-patterns)
8. [Animation & Transitions](#animation--transitions)
9. [Dark & Light Mode](#dark--light-mode)
10. [Accessibility](#accessibility)
11. [Desktop App Considerations](#desktop-app-considerations)

---

## Design Philosophy

Lyceum's design language embodies a **futuristic, professional aesthetic** suitable for industrial and technical applications. Key principles:

- **Glassmorphism**: Frosted glass effects with subtle transparency and blur
- **Minimal Color Palette**: 3 colors only (Cyan, Emerald, Gray)
- **Clean Typography**: Modern, readable fonts with technical precision
- **Subtle Glow Effects**: Cyan accents that suggest advanced technology
- **Purposeful Animation**: Smooth transitions that enhance UX without distraction

---

## Color Palette

### Primary: Electric Cyan
The signature color representing technology, precision, and innovation.

| Token | Hex | Usage |
|-------|-----|-------|
| `cyan-50` | `#ecfeff` | Subtle backgrounds |
| `cyan-100` | `#cffafe` | Light accents |
| `cyan-200` | `#a5f3fc` | Hover states (light mode) |
| `cyan-300` | `#67e8f9` | Secondary highlights |
| `cyan-400` | `#22d3ee` | Active states, icons |
| `cyan-500` | `#00d4ff` | **Primary accent** |
| `cyan-600` | `#0ea5e9` | Primary buttons |
| `cyan-700` | `#0284c7` | Button hover |
| `cyan-800` | `#0369a1` | Dark accents |
| `cyan-900` | `#075985` | Deep accents |

### Secondary: Emerald
Used for success states, positive indicators, and secondary accents.

| Token | Hex | Usage |
|-------|-----|-------|
| `emerald-400` | `#34d399` | Success icons, positive states |
| `emerald-500` | `#10b981` | Success backgrounds |
| `emerald-600` | `#059669` | Success hover |

### Neutral: Gray
For text, backgrounds, and structural elements.

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| Background | `#f8fafc` | `#030712` | Page background |
| Foreground | `#171717` | `#ededed` | Primary text |
| Muted | `foreground/60` | `foreground/60` | Secondary text |
| Subtle | `foreground/40` | `foreground/40` | Tertiary text, placeholders |

### Status Colors
Use sparingly for semantic meaning:

| Status | Color | Tailwind Class |
|--------|-------|----------------|
| Success | Emerald | `text-emerald-500` |
| Warning | Amber | `text-amber-500` |
| Error | Red | `text-red-500` |
| Info | Cyan | `text-cyan-500` |

### CSS Variables

```css
:root {
  --background: #f8fafc;
  --foreground: #171717;
  --glass-bg: rgba(255, 255, 255, 0.7);
  --glass-border: rgba(0, 212, 255, 0.2);
  --glow-cyan: rgba(0, 212, 255, 0.3);
}

.dark {
  --background: #030712;
  --foreground: #ededed;
  --glass-bg: rgba(15, 23, 42, 0.6);
  --glass-border: rgba(0, 212, 255, 0.15);
}
```

---

## Typography

### Font Families

| Font | Variable | Usage |
|------|----------|-------|
| **Space Grotesk** | `--font-space-grotesk` | Primary UI text, headings |
| **JetBrains Mono** | `--font-jetbrains-mono` | Code, technical data, monospace |

### Type Scale

| Element | Size | Weight | Class |
|---------|------|--------|-------|
| H1 | 2.25rem (36px) | Bold (700) | `text-4xl font-bold` |
| H2 | 1.875rem (30px) | Bold (700) | `text-3xl font-bold` |
| H3 | 1.5rem (24px) | Semibold (600) | `text-2xl font-semibold` |
| H4 | 1.25rem (20px) | Semibold (600) | `text-xl font-semibold` |
| Body | 1rem (16px) | Regular (400) | `text-base` |
| Small | 0.875rem (14px) | Regular (400) | `text-sm` |
| XSmall | 0.75rem (12px) | Medium (500) | `text-xs font-medium` |

### Gradient Text
For emphasis on headings and important labels:

```css
.text-gradient-cyan {
  background: linear-gradient(135deg, #00d4ff 0%, #0ea5e9 50%, #22d3ee 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**Usage:** `<h1 className="text-gradient-cyan">Dashboard</h1>`

---

## Iconography

### Icon Library: Phosphor Icons

We use [Phosphor Icons](https://phosphoricons.com/) for all UI icons. This library provides a modern, consistent icon set with multiple weight variants.

**Installation:**
```bash
npm install @phosphor-icons/react
```

### Icon Weights

| Weight | Usage | Example |
|--------|-------|---------|
| `regular` | Default state, inactive items | Navigation items |
| `duotone` | Active state, emphasis, featured | Active nav, stat cards |
| `bold` | Strong emphasis, CTAs | Close buttons |
| `fill` | Solid icons when needed | Selected states |

### Usage Pattern

```tsx
import { House, Gear, Table } from '@phosphor-icons/react'

// Inactive navigation item
<House className="h-5 w-5 text-foreground/50" weight="regular" />

// Active navigation item
<House className="h-5 w-5 text-cyan-400" weight="duotone" />

// Stat card icon (always duotone)
<Table className="h-6 w-6 text-cyan-400" weight="duotone" />

// Close button (bold for emphasis)
<X className="h-5 w-5" weight="bold" />
```

### Icon Sizes

| Context | Size | Class |
|---------|------|-------|
| Navigation | 20px | `h-5 w-5` |
| Stat cards | 24px | `h-6 w-6` |
| Empty states | 48px | `h-12 w-12` |
| Inline with text | 16px | `h-4 w-4` |

### Common Icon Mappings

| Concept | Icon | Import |
|---------|------|--------|
| Dashboard/Home | House | `House` |
| Settings | Gear | `Gear` |
| Data/Table | Table | `Table` |
| Plugins | PuzzlePiece | `PuzzlePiece` |
| User | User | `User` |
| Admin | ShieldCheck | `ShieldCheck` |
| Close | X | `X` |
| Menu | List | `List` |
| Search | MagnifyingGlass | `MagnifyingGlass` |
| Add/Create | Plus | `Plus` |
| Edit | Pencil | `Pencil` |
| Delete | Trash | `Trash` |
| Calendar | Calendar | `Calendar` |
| Clock/Time | Clock | `Clock` |
| Warning | Warning | `Warning` |
| Success | CheckCircle | `CheckCircle` |
| Error | XCircle | `XCircle` |
| Info | Info | `Info` |
| Download | DownloadSimple | `DownloadSimple` |
| Upload | UploadSimple | `UploadSimple` |
| Refresh | ArrowsClockwise | `ArrowsClockwise` |
| Arrow Right | ArrowRight | `ArrowRight` |
| Chevron Left | CaretLeft | `CaretLeft` |
| Chevron Right | CaretRight | `CaretRight` |
| Cloud | Cloud | `Cloud` |
| Desktop/Local | Desktop | `Desktop` |
| Database | Database | `Database` |
| Video | VideoCamera | `VideoCamera` |
| Groups | UsersThree | `UsersThree` |

---

## Glassmorphism Effects

### Glass Card
Interactive cards with hover states:

```css
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  box-shadow: var(--glass-shadow);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
  box-shadow: var(--glass-shadow-hover);
  transform: translateY(-2px);
}
```

**Tailwind Usage:**
```tsx
<div className="glass-card p-6">
  {/* Card content */}
</div>
```

### Glass Panel
For sidebars and navigation (no hover transform):

```css
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border);
}
```

### Glass Input
For form fields:

```css
.glass-input {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid var(--glass-border);
  transition: all 0.2s ease;
}

.glass-input:focus {
  background: rgba(255, 255, 255, 0.15);
  border-color: #00d4ff;
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.15);
  outline: none;
}
```

### Glow Effects

```css
/* Subtle glow */
.glow-cyan {
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3), 0 0 40px rgba(0, 212, 255, 0.15);
}

/* Strong glow for focus/active */
.glow-cyan-strong {
  box-shadow: 0 0 25px rgba(0, 212, 255, 0.5), 0 0 50px rgba(0, 212, 255, 0.3);
}

/* Border glow */
.glow-cyan-border {
  box-shadow: 0 0 0 1px rgba(0, 212, 255, 0.15), 0 0 15px rgba(0, 212, 255, 0.15);
}
```

---

## Components

### Buttons

#### Primary Button
```tsx
<button className="btn-primary">
  Get Started
</button>
```

```css
.btn-primary {
  background: linear-gradient(135deg, #00d4ff 0%, #0ea5e9 100%);
  color: #000000;
  font-weight: 600;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  border: none;
  box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #22d3ee 0%, #00d4ff 100%);
  box-shadow: 0 6px 20px rgba(0, 212, 255, 0.4);
  transform: translateY(-1px);
}
```

#### Ghost Button
```tsx
<button className="btn-ghost">
  Learn More
</button>
```

```css
.btn-ghost {
  background: transparent;
  color: #00d4ff;
  font-weight: 500;
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 212, 255, 0.3);
  transition: all 0.2s ease;
}

.btn-ghost:hover {
  background: rgba(0, 212, 255, 0.1);
  border-color: rgba(0, 212, 255, 0.5);
}
```

#### Glass Button
```tsx
<button className="btn-glass">
  Cancel
</button>
```

### Navigation Items

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--foreground);
  opacity: 0.7;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(0, 212, 255, 0.08);
  opacity: 1;
  color: #00d4ff;
}

.nav-item.active {
  background: rgba(0, 212, 255, 0.12);
  color: #00d4ff;
  opacity: 1;
  border-left: 2px solid #00d4ff;
  padding-left: calc(0.875rem - 2px);
}
```

### Stat Cards

```tsx
<div className="glass-card overflow-hidden p-5">
  <div className="flex items-center">
    <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
      <Table className="h-6 w-6 text-cyan-400" weight="duotone" />
    </div>
    <div className="ml-5 w-0 flex-1">
      <dl>
        <dt className="truncate text-sm font-medium text-foreground/60">
          Test Data Projects
        </dt>
        <dd className="mt-1 text-3xl font-bold tracking-tight text-gradient-cyan">
          42
        </dd>
      </dl>
    </div>
  </div>
</div>
```

### Tabs

```tsx
<nav className="flex space-x-8 border-b border-cyan-500/10">
  <button
    className={`${
      activeTab === 'tab1'
        ? 'border-cyan-400 text-cyan-400'
        : 'border-transparent text-foreground/50 hover:border-cyan-500/30 hover:text-cyan-400'
    } flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium items-center transition-colors`}
  >
    <Icon className="h-5 w-5 mr-2" weight={activeTab === 'tab1' ? 'duotone' : 'regular'} />
    Tab Label
  </button>
</nav>
```

### Empty States

```tsx
<div className="text-center py-12">
  <Newspaper className="mx-auto h-12 w-12 text-foreground/40" weight="duotone" />
  <h3 className="mt-2 text-sm font-medium text-foreground">No items yet</h3>
  <p className="mt-1 text-sm text-foreground/60">
    Get started by creating your first item.
  </p>
  <div className="mt-6">
    <button className="btn-primary inline-flex items-center">
      <Plus className="h-4 w-4 mr-2" />
      Create New
    </button>
  </div>
</div>
```

### Modals

```tsx
<Dialog className="relative z-50">
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <Dialog.Panel className="glass-card w-full max-w-md p-6">
      <div className="flex items-center justify-between mb-4">
        <Dialog.Title className="text-lg font-semibold text-foreground">
          Modal Title
        </Dialog.Title>
        <button className="p-2 rounded-lg text-foreground/50 hover:text-cyan-400 hover:bg-cyan-500/10">
          <X className="h-5 w-5" weight="bold" />
        </button>
      </div>
      {/* Modal content */}
    </Dialog.Panel>
  </div>
</Dialog>
```

### Badges/Pills

```tsx
// Status badge
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
  Active
</span>

// Priority badge
<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
  Critical
</span>
```

### Form Inputs

```tsx
<input
  type="text"
  className="w-full px-4 py-2.5 rounded-xl glass-input text-foreground placeholder-foreground/40"
  placeholder="Enter value..."
/>

<select className="w-full px-4 py-2.5 rounded-xl glass-input text-foreground">
  <option>Select option</option>
</select>
```

---

## Layout Patterns

### Dashboard Layout

```
+------------------+------------------------------------------+
|                  |  Top Bar (glass-panel, h-16)             |
|   Sidebar        +------------------------------------------+
|   (glass-panel)  |                                          |
|   w-72           |  Main Content Area                       |
|                  |  (px-4 sm:px-6 lg:px-8, py-6)            |
|   - Logo         |                                          |
|   - Navigation   |                                          |
|   - User Section |                                          |
|                  |                                          |
+------------------+------------------------------------------+
```

### Grid Layouts

```tsx
// Stats grid
<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

// Card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Form layout
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Tight grouping |
| `gap-2` | 8px | Related items |
| `gap-3` | 12px | List items |
| `gap-4` | 16px | Card sections |
| `gap-5` | 20px | Grid gaps |
| `gap-6` | 24px | Section spacing |
| `gap-8` | 32px | Major sections |

---

## Animation & Transitions

### Standard Transitions

```css
/* Default transition */
transition: all 0.2s ease;

/* Card hover */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Fast micro-interactions */
transition: all 0.15s ease;
```

### Loading States

```tsx
// Spinner
<div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500" />

// Full-page loading
<div className="min-h-screen flex items-center justify-center bg-background">
  <div className="flex flex-col items-center gap-4">
    <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500" />
    <span className="text-sm text-foreground/60">Loading...</span>
  </div>
</div>
```

### Glow Pulse Animation

```css
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.15); }
  50% { box-shadow: 0 0 30px rgba(0, 212, 255, 0.3); }
}

.animate-glow-pulse {
  animation: glow-pulse 2s ease-in-out infinite;
}
```

---

## Dark & Light Mode

### Theme Detection

The application uses CSS custom properties that automatically adapt to the user's system preference or manual selection.

```tsx
// Theme classes on <html> element
<html className="light"> // Light mode
<html className="dark">  // Dark mode
```

### Color Adjustments

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `#f8fafc` | `#030712` |
| Glass bg | `rgba(255,255,255,0.7)` | `rgba(15,23,42,0.6)` |
| Glass border | `rgba(0,212,255,0.2)` | `rgba(0,212,255,0.15)` |
| Text primary | `#171717` | `#ededed` |
| Shadows | Lighter, cyan-tinted | Darker, with cyan glow |

### Dark Mode Background

```css
.dark body {
  background: linear-gradient(135deg, #030712 0%, #0a0a0a 50%, #030712 100%);
  background-attachment: fixed;
}
```

---

## Accessibility

### Focus States

All interactive elements must have visible focus states:

```css
*:focus-visible {
  outline: 2px solid #00d4ff;
  outline-offset: 2px;
}
```

### Color Contrast

- Primary text on backgrounds: Minimum 4.5:1 contrast ratio
- Large text (18px+ or 14px+ bold): Minimum 3:1 contrast ratio
- Interactive elements: Clear visual distinction

### Screen Reader Support

```tsx
// Always include sr-only labels for icon-only buttons
<button>
  <span className="sr-only">Close dialog</span>
  <X className="h-5 w-5" />
</button>

// Use aria-hidden for decorative icons
<Warning className="h-5 w-5" aria-hidden="true" />
```

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Desktop App Considerations

When implementing this design system in the Tauri/Electron desktop application:

### Window Chrome

- Use custom title bar with `glass-panel` styling
- Integrate window controls (minimize, maximize, close) with the design
- Consider frameless window with custom drag regions

### Native Feel

- Respect OS-level dark/light mode settings
- Use native context menus where appropriate
- Implement proper keyboard shortcuts

### Performance

- Backdrop blur can be expensive - use sparingly in desktop app
- Consider reducing blur radius (`blur(8px)` instead of `blur(16px)`) for better performance
- Use GPU-accelerated animations

### Offline Indicators

```tsx
// Connection status indicator
<div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
  isOnline
    ? 'bg-emerald-500/10 text-emerald-400'
    : 'bg-red-500/10 text-red-400'
}`}>
  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
  {isOnline ? 'Connected' : 'Offline'}
</div>
```

### Desktop-Specific Components

- System tray icon (use the L lettermark)
- Native notifications
- File drag-and-drop zones
- Progress indicators for long operations

---

## Quick Reference

### Import Statement

```tsx
import {
  House, Gear, Table, PuzzlePiece, User, ShieldCheck,
  X, List, MagnifyingGlass, Plus, Pencil, Trash,
  Calendar, Clock, Warning, CheckCircle, XCircle, Info,
  ArrowRight, CaretLeft, CaretRight, Cloud, Desktop, Database
} from '@phosphor-icons/react'
```

### Common Patterns

```tsx
// Page container
<div className="space-y-6">

// Section heading
<h2 className="text-xl font-semibold text-foreground">Section Title</h2>

// Muted text
<p className="text-sm text-foreground/60">Description text</p>

// Cyan accent text
<span className="text-cyan-400">Highlighted</span>

// Emerald success text
<span className="text-emerald-400">Success</span>

// Icon button
<button className="p-2 rounded-lg text-foreground/50 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
  <Icon className="h-5 w-5" />
</button>
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12 | Initial design system documentation |

---

*This design guide is a living document and should be updated as the design system evolves.*
