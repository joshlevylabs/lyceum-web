/**
 * Lyceum Design Guide
 *
 * Futuristic Glassmorphism Design System with Electric Cyan Accents
 *
 * This file serves as the definitive reference for styling all pages
 * and components in the Lyceum platform.
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Primary - Electric Cyan
  primary: {
    50: "#ecfeff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#00d4ff", // Main primary color
    600: "#0ea5e9",
    700: "#0284c7",
    800: "#0369a1",
    900: "#075985",
  },

  // Semantic Colors
  success: {
    light: "#10b981",
    dark: "#34d399",
  },
  warning: {
    light: "#f59e0b",
    dark: "#fbbf24",
  },
  danger: {
    light: "#ef4444",
    dark: "#f87171",
  },
  info: {
    light: "#3b82f6",
    dark: "#60a5fa",
  },

  // Light Mode
  light: {
    background: "#f8fafc",
    foreground: "#171717",
    glassBg: "rgba(255, 255, 255, 0.7)",
    glassBgHover: "rgba(255, 255, 255, 0.85)",
    glassBorder: "rgba(0, 212, 255, 0.2)",
    glassBorderHover: "rgba(0, 212, 255, 0.35)",
  },

  // Dark Mode
  dark: {
    background: "#030712",
    foreground: "#ededed",
    glassBg: "rgba(15, 23, 42, 0.6)",
    glassBgHover: "rgba(15, 23, 42, 0.8)",
    glassBorder: "rgba(0, 212, 255, 0.15)",
    glassBorderHover: "rgba(0, 212, 255, 0.3)",
  },

  // Glow Effects
  glow: {
    cyan: "rgba(0, 212, 255, 0.3)",
    cyanStrong: "rgba(0, 212, 255, 0.5)",
    cyanSubtle: "rgba(0, 212, 255, 0.15)",
  },
};

// ============================================================================
// CSS CLASSES REFERENCE
// ============================================================================

/**
 * GLASSMORPHISM CLASSES
 *
 * Use these classes to apply the futuristic glass effect:
 *
 * .glass           - Base glass effect (use on static elements)
 * .glass-card      - Interactive glass card with hover effects
 * .glass-panel     - Navigation panels, sidebars
 * .glass-input     - Form inputs with glass styling
 */
export const glassClasses = {
  base: "glass",
  card: "glass-card",
  panel: "glass-panel",
  input: "glass-input",
};

/**
 * GLOW EFFECT CLASSES
 *
 * Add cyan glow effects to elements:
 *
 * .glow-cyan         - Standard cyan glow
 * .glow-cyan-strong  - Intense glow for focus/active states
 * .glow-cyan-border  - Subtle border glow
 * .text-glow-cyan    - Text shadow glow effect
 */
export const glowClasses = {
  standard: "glow-cyan",
  strong: "glow-cyan-strong",
  border: "glow-cyan-border",
  text: "text-glow-cyan",
};

/**
 * GRADIENT TEXT CLASSES
 *
 * Gradient text effects:
 *
 * .text-gradient-cyan        - Cyan gradient (primary)
 * .text-gradient-cyan-violet - Cyan to violet gradient
 */
export const gradientTextClasses = {
  cyan: "text-gradient-cyan",
  cyanViolet: "text-gradient-cyan-violet",
};

/**
 * BUTTON CLASSES
 *
 * Button styles:
 *
 * .btn-primary  - Cyan gradient button (main CTA)
 * .btn-ghost    - Transparent with cyan border
 * .btn-glass    - Glass effect button
 */
export const buttonClasses = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  glass: "btn-glass",
};

/**
 * NAVIGATION CLASSES
 *
 * Navigation styling:
 *
 * .nav-item        - Base nav item
 * .nav-item.active - Active state (adds cyan left border)
 */
export const navClasses = {
  item: "nav-item",
  itemActive: "nav-item active",
};

// ============================================================================
// COMPONENT PATTERNS
// ============================================================================

/**
 * STAT CARD PATTERN
 *
 * Use for dashboard statistics:
 *
 * <div className="glass-card overflow-hidden p-5">
 *   <div className="flex items-center">
 *     <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
 *       <Icon className="h-6 w-6 text-cyan-400" />
 *     </div>
 *     <div className="ml-5 w-0 flex-1">
 *       <dl>
 *         <dt className="truncate text-sm font-medium text-foreground/60">
 *           Label
 *         </dt>
 *         <dd className="mt-1 text-3xl font-bold tracking-tight text-gradient-cyan">
 *           Value
 *         </dd>
 *       </dl>
 *     </div>
 *   </div>
 * </div>
 *
 * Icon container color variants:
 * - Cyan:    bg-cyan-500/10 border-cyan-500/20, text-cyan-400
 * - Emerald: bg-emerald-500/10 border-emerald-500/20, text-emerald-400
 * - Amber:   bg-amber-500/10 border-amber-500/20, text-amber-400
 * - Rose:    bg-rose-500/10 border-rose-500/20, text-rose-400
 */

/**
 * ALERT PATTERN
 *
 * Use for notifications and alerts:
 *
 * <div className="glass-card border-l-4 border-{color}-500 p-4">
 *   <div className="flex">
 *     <div className="flex-shrink-0 p-2 rounded-lg bg-{color}-500/10">
 *       <Icon className="h-5 w-5 text-{color}-400" />
 *     </div>
 *     <div className="ml-3">
 *       <h3 className="text-sm font-semibold text-foreground">Title</h3>
 *       <p className="mt-1 text-sm text-foreground/70">Message</p>
 *     </div>
 *   </div>
 * </div>
 *
 * Color variants:
 * - Info:    border-cyan-500, bg-cyan-500/10, text-cyan-400
 * - Success: border-emerald-500, bg-emerald-500/10, text-emerald-400
 * - Warning: border-amber-500, bg-amber-500/10, text-amber-400
 * - Error:   border-rose-500, bg-rose-500/10, text-rose-400
 */

/**
 * TAB NAVIGATION PATTERN
 *
 * Use for tabbed interfaces:
 *
 * <div className="glass-card overflow-hidden">
 *   <div className="border-b border-cyan-500/10">
 *     <nav className="-mb-px flex space-x-8 px-6">
 *       <button
 *         className={`${
 *           isActive
 *             ? 'border-cyan-400 text-cyan-400'
 *             : 'border-transparent text-foreground/50 hover:border-cyan-500/30 hover:text-cyan-400'
 *         } flex whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium items-center transition-colors`}
 *       >
 *         <Icon className="h-5 w-5 mr-2" />
 *         Tab Label
 *       </button>
 *     </nav>
 *   </div>
 *   <div className="px-6 py-6">
 *     {content}
 *   </div>
 * </div>
 */

/**
 * LOADING SPINNER PATTERN
 *
 * Use for loading states:
 *
 * <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-400" />
 */

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font family
  fontFamily: {
    sans: 'Space Grotesk, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },

  // Heading patterns
  headings: {
    // Page title with gradient
    pageTitle: "text-2xl font-bold sm:text-3xl text-gradient-cyan",
    // Section title
    sectionTitle: "text-xl font-bold text-foreground",
    // Card title
    cardTitle: "text-lg font-semibold text-foreground",
    // Subsection
    subsection: "text-base font-medium text-foreground",
  },

  // Body text
  body: {
    default: "text-foreground",
    muted: "text-foreground/60",
    small: "text-sm text-foreground/70",
  },
};

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  // Page padding
  page: "px-4 sm:px-6 lg:px-8",
  // Section spacing
  section: "space-y-6",
  // Card padding
  card: "p-5",
  cardLarge: "p-6",
  // Grid gaps
  gridGap: "gap-5",
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  sm: "rounded-md", // 6px
  md: "rounded-lg", // 8px
  lg: "rounded-xl", // 12px
  full: "rounded-full",
  card: "rounded-xl", // Glass cards use 14px via CSS
};

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  default: "transition-all duration-200 ease-in-out",
  slow: "transition-all duration-300 ease-in-out",
  fast: "transition-all duration-150 ease-in-out",
  colors: "transition-colors duration-200",
};

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  // Glass shadows are handled via CSS variables
  // Use these for non-glass elements
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  glow: "shadow-lg shadow-cyan-500/25",
  glowStrong: "shadow-xl shadow-cyan-500/30",
};

// ============================================================================
// ICON GUIDELINES
// ============================================================================

/**
 * ICON USAGE
 *
 * Primary icons: Use @phosphor-icons/react
 *
 * Weight variants:
 * - regular:  Default state, inactive items
 * - duotone:  Active state, emphasis, featured items
 * - bold:     Strong emphasis, CTAs
 * - fill:     Solid icons when needed
 *
 * Size classes:
 * - Small:  h-4 w-4 (buttons, inline)
 * - Medium: h-5 w-5 (navigation, badges)
 * - Large:  h-6 w-6 (stat cards, headers)
 * - XLarge: h-8 w-8, h-10 w-10, h-12 w-12 (feature highlights, empty states)
 *
 * Color guidelines:
 * - Default: text-foreground/50
 * - Active:  text-cyan-400
 * - Success: text-emerald-400
 * - Warning: text-amber-400
 * - Error:   text-rose-400
 *
 * Common icons:
 * - House, Gear, Table, PuzzlePiece, User, ShieldCheck
 * - X, List, MagnifyingGlass, Plus, Pencil, Trash
 * - Calendar, Clock, Warning, CheckCircle, XCircle, Info
 * - ArrowRight, CaretLeft, CaretRight, Cloud, Desktop, Database
 */

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * EXAMPLE: Glass Card with Stat
 *
 * import { Table } from '@phosphor-icons/react'
 *
 * <div className="glass-card overflow-hidden p-5">
 *   <div className="flex items-center">
 *     <div className="flex-shrink-0 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
 *       <Table className="h-6 w-6 text-cyan-400" weight="duotone" />
 *     </div>
 *     <div className="ml-5 w-0 flex-1">
 *       <dl>
 *         <dt className="truncate text-sm font-medium text-foreground/60">
 *           Test Data Projects
 *         </dt>
 *         <dd className="mt-1 text-3xl font-bold tracking-tight text-gradient-cyan">
 *           42
 *         </dd>
 *       </dl>
 *     </div>
 *   </div>
 * </div>
 */

/**
 * EXAMPLE: Primary Button
 *
 * import { Plus } from '@phosphor-icons/react'
 *
 * <button className="btn-primary inline-flex items-center">
 *   <Plus className="h-5 w-5 mr-2" />
 *   Create New
 * </button>
 */

/**
 * EXAMPLE: Page Header
 *
 * <div>
 *   <h1 className="text-2xl font-bold sm:text-3xl">
 *     <span className="text-gradient-cyan">Welcome back,</span>{' '}
 *     <span className="text-foreground">Username!</span>
 *   </h1>
 *   <p className="mt-1 text-sm text-foreground/60">
 *     Description text here.
 *   </p>
 * </div>
 */

export default {
  colors,
  glassClasses,
  glowClasses,
  gradientTextClasses,
  buttonClasses,
  navClasses,
  typography,
  spacing,
  borderRadius,
  transitions,
  shadows,
};
