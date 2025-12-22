/**
 * HeroUI Theme Configuration
 *
 * Futuristic Glassmorphism theme with Electric Cyan accent colors
 * Supports both light and dark modes
 */

export const lyceumTheme = {
  themes: {
    light: {
      layout: {
        radius: {
          small: "6px",
          medium: "10px",
          large: "14px",
        },
        borderWidth: {
          small: "1px",
          medium: "1.5px",
          large: "2px",
        },
      },
      colors: {
        // Primary - Electric Cyan
        primary: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#00d4ff",
          600: "#0ea5e9",
          700: "#0284c7",
          800: "#0369a1",
          900: "#075985",
          DEFAULT: "#00d4ff",
          foreground: "#000000",
        },
        // Secondary - Sky Blue
        secondary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          DEFAULT: "#0ea5e9",
          foreground: "#ffffff",
        },
        // Success - Emerald
        success: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
        },
        // Warning - Amber
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#000000",
        },
        // Danger - Red
        danger: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        // Focus
        focus: "#00d4ff",
        // Background and surfaces
        background: "#f8fafc",
        foreground: "#171717",
        // Glass surfaces - Light mode
        content1: "#ffffff",
        content2: "#f1f5f9",
        content3: "#e2e8f0",
        content4: "#cbd5e1",
        // Divider
        divider: "rgba(0, 212, 255, 0.15)",
      },
    },
    dark: {
      layout: {
        radius: {
          small: "6px",
          medium: "10px",
          large: "14px",
        },
        borderWidth: {
          small: "1px",
          medium: "1.5px",
          large: "2px",
        },
      },
      colors: {
        // Primary - Electric Cyan (same in dark mode for consistency)
        primary: {
          50: "#0a1929",
          100: "#0d2137",
          200: "#0f2942",
          300: "#123456",
          400: "#1565c0",
          500: "#00d4ff",
          600: "#22d3ee",
          700: "#67e8f9",
          800: "#a5f3fc",
          900: "#cffafe",
          DEFAULT: "#00d4ff",
          foreground: "#000000",
        },
        // Secondary - Lighter Cyan for dark mode
        secondary: {
          50: "#0c4a6e",
          100: "#075985",
          200: "#0369a1",
          300: "#0284c7",
          400: "#0ea5e9",
          500: "#38bdf8",
          600: "#7dd3fc",
          700: "#bae6fd",
          800: "#e0f2fe",
          900: "#f0f9ff",
          DEFAULT: "#22d3ee",
          foreground: "#000000",
        },
        // Success - Emerald
        success: {
          DEFAULT: "#10b981",
          foreground: "#000000",
        },
        // Warning - Amber
        warning: {
          DEFAULT: "#fbbf24",
          foreground: "#000000",
        },
        // Danger - Red
        danger: {
          DEFAULT: "#f87171",
          foreground: "#000000",
        },
        // Focus
        focus: "#00d4ff",
        // Background - Deep space black
        background: "#030712",
        foreground: "#ededed",
        // Glass surfaces - Dark mode (slate tones)
        content1: "#0f172a",
        content2: "#1e293b",
        content3: "#334155",
        content4: "#475569",
        // Divider with cyan glow
        divider: "rgba(0, 212, 255, 0.1)",
      },
    },
  },
};

// Color constants for use in components
export const colors = {
  // Primary Electric Cyan
  cyan: {
    50: "#ecfeff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#00d4ff",
    600: "#0ea5e9",
    700: "#0284c7",
    800: "#0369a1",
    900: "#075985",
  },
  // Glass effect colors
  glass: {
    light: {
      bg: "rgba(255, 255, 255, 0.7)",
      bgHover: "rgba(255, 255, 255, 0.85)",
      border: "rgba(0, 212, 255, 0.2)",
      borderHover: "rgba(0, 212, 255, 0.35)",
    },
    dark: {
      bg: "rgba(15, 23, 42, 0.6)",
      bgHover: "rgba(15, 23, 42, 0.8)",
      border: "rgba(0, 212, 255, 0.15)",
      borderHover: "rgba(0, 212, 255, 0.3)",
    },
  },
  // Glow effects
  glow: {
    cyan: "rgba(0, 212, 255, 0.3)",
    cyanStrong: "rgba(0, 212, 255, 0.5)",
    cyanSubtle: "rgba(0, 212, 255, 0.15)",
  },
};

// Typography scale
export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
};

// Spacing scale
export const spacing = {
  px: "1px",
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
};

export default lyceumTheme;
