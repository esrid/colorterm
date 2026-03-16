import type { ColorScheme } from './types'
import { oklchToHex, deltaEOKLab, cubicBezier, hexToOklch } from './colorUtils'

type AestheticProfile = {
  name: string;
  isDark: boolean;
  bgL: [number, number];
  bgC: [number, number];
  fgL: [number, number];
  accentC: [number, number];
  hueDrift: number; // 0 to 1, how much ANSI hues are pulled towards seedHue
}

const PROFILES: AestheticProfile[] = [
  { name: 'Cyberpunk', isDark: true, bgL: [0.01, 0.05], bgC: [0.03, 0.06], fgL: [0.95, 1.0], accentC: [0.22, 0.28], hueDrift: 0.1 },
  { name: 'Nordic', isDark: true, bgL: [0.12, 0.18], bgC: [0.01, 0.03], fgL: [0.85, 0.92], accentC: [0.06, 0.12], hueDrift: 0.4 },
  { name: 'Retro', isDark: true, bgL: [0.08, 0.12], bgC: [0.02, 0.04], fgL: [0.80, 0.88], accentC: [0.12, 0.18], hueDrift: 0.6 },
  { name: 'Minimal', isDark: true, bgL: [0.03, 0.06], bgC: [0.00, 0.01], fgL: [0.90, 0.98], accentC: [0.08, 0.15], hueDrift: 0.8 },
  { name: 'Latte', isDark: false, bgL: [0.94, 0.99], bgC: [0.01, 0.04], fgL: [0.05, 0.15], accentC: [0.08, 0.18], hueDrift: 0.3 },
]

const HUE_SAFE_ZONES: Record<string, [number, number]> = {
  red: [20, 50],
  green: [120, 165],
  yellow: [70, 100],
  blue: [235, 285],
  magenta: [290, 335],
  cyan: [180, 225],
}

export function generateCoherentTheme(currentScheme: ColorScheme, lockedColors: Set<string>): ColorScheme {
  const seedHue = Math.floor(Math.random() * 360)
  const profile = PROFILES[Math.floor(Math.random() * PROFILES.length)]
  const isDark = profile.isDark

  const modes = ['balanced', 'vibrant', 'soft', 'monochrome', 'analogous', 'triadic', 'complementary']
  const mode = modes[Math.floor(Math.random() * modes.length)]
  
  // --- Profile-Based Value Selection ---
  const rand = (range: [number, number]) => range[0] + Math.random() * (range[1] - range[0])
  
  let bgL = rand(profile.bgL)
  let bgC = rand(profile.bgC)
  let fgL = rand(profile.fgL)
  let accentC = rand(profile.accentC)
  let accentL = isDark ? 0.65 + Math.random() * 0.15 : 0.35 + Math.random() * 0.15

  // Contrast Guard: Ensure FG vs BG is at least ~10:1 (perceptual)
  if (isDark && (fgL - bgL < 0.65)) fgL = Math.min(1, bgL + 0.75)
  if (!isDark && (bgL - fgL < 0.65)) fgL = Math.max(0, bgL - 0.75)

  // Surface Depth with Bezier Curves
  // We use a curve that creates more distinction for "higher" surfaces
  const getSurfaceL = (t: number) => {
    const maxOffset = 0.30
    const offset = cubicBezier(t, 0, 0, 0.2, 1) * maxOffset
    return isDark ? Math.min(0.95, bgL + offset) : Math.max(0.05, bgL - offset)
  }

  const theme: Partial<ColorScheme> = {
    background: oklchToHex(bgL, bgC, seedHue),
    mantle: oklchToHex(isDark ? Math.max(0, bgL - 0.03) : Math.min(1, bgL + 0.03), bgC * 1.1, seedHue),
    crust: oklchToHex(isDark ? Math.max(0, bgL - 0.05) : Math.min(1, bgL + 0.05), bgC * 1.2, seedHue),
    surface0: oklchToHex(getSurfaceL(0.2), bgC * 0.9, seedHue),
    surface1: oklchToHex(getSurfaceL(0.5), bgC * 0.8, seedHue),
    surface2: oklchToHex(getSurfaceL(0.9), bgC * 0.7, seedHue),
    foreground: oklchToHex(fgL, 0.01, seedHue),
    cursor: oklchToHex(accentL, accentC, seedHue),
    primary: oklchToHex(accentL, accentC, seedHue),
    secondary: oklchToHex(accentL, accentC * 0.8, (seedHue + 30 + (Math.random() * 20)) % 360),
    accent: oklchToHex(accentL, accentC, (seedHue + 180 + (Math.random() * 40 - 20)) % 360),
  }

  // ANSI Colors with Dynamic Hue Distribution
  const ansiNames = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
  const baseHues = { red: 29, green: 145, yellow: 85, blue: 260, magenta: 320, cyan: 195, white: seedHue }

  theme.black = oklchToHex(isDark ? bgL + 0.10 : bgL - 0.10, bgC * 0.5, seedHue)
  theme.brightBlack = oklchToHex(isDark ? bgL + 0.25 : bgL - 0.25, bgC * 0.4, seedHue)

  ansiNames.forEach((name) => {
    let h = baseHues[name as keyof typeof baseHues]
    
    // Global Tinting: pull towards seedHue based on profile drift
    const diff = h - seedHue
    h = h - (diff * profile.hueDrift) + (Math.random() * 6 - 3)

    // Semantic Hue Anchoring (Safe Zones)
    if (HUE_SAFE_ZONES[name]) {
      const [min, max] = HUE_SAFE_ZONES[name]
      if (h < min) h = min
      if (h > max) h = max
    }

    // Harmony Shifts (applied after safe zone anchoring to ensure it doesn't break semantics too much)
    if (mode === 'analogous') h = seedHue + (h - seedHue) * 0.3
    else if (mode === 'monochrome') h = seedHue + (Math.random() * 40 - 20)
    else if (mode === 'triadic') {
      const triPoints = [seedHue, (seedHue + 120) % 360, (seedHue + 240) % 360]
      h = triPoints.reduce((prev, curr) => Math.abs(curr - h) < Math.abs(prev - h) ? curr : prev)
    }

    // Perceptual ANSI Tuning
    const hNorm = h % 360
    let lBias = 0
    if (hNorm > 220 && hNorm < 300) lBias = 0.05 // Blue/Indigo boost
    if (hNorm > 50 && hNorm < 100) lBias = -0.05 // Yellow/Green nerf

    // Dynamic Pop and Muted logic
    const hueDist = Math.abs(((h - seedHue + 180 + 360) % 360) - 180) // 0 (same) to 180 (opposite)
    let chromaScale = 1.0
    if (hueDist < 45) chromaScale = 1.25 // "Hero" color closest to seed
    else if (hueDist > 135) chromaScale = 0.8 // Muted opposite colors

    const finalL = isDark ? accentL + lBias : accentL - lBias
    const finalC = accentC * chromaScale

    const hex = oklchToHex(finalL, finalC, h)
    const brightHex = oklchToHex(isDark ? Math.min(0.96, finalL + 0.15) : Math.max(0.04, finalL - 0.15), finalC * 1.15, h)
    
    ;(theme as any)[name] = hex
    ;(theme as any)[`bright${name.charAt(0).toUpperCase() + name.slice(1)}`] = brightHex
  })

  // Delta-E Accessibility Guard (Red/Green distance)
  // If Red and Green are too close perceptually, push them apart in lightness
  const redHex = theme.red!
  const greenHex = theme.green!
  const de = deltaEOKLab(redHex, greenHex)
  
  if (de < 0.12) {
    const red = hexToOklch(redHex)
    const green = hexToOklch(greenHex)
    
    // Push them apart: Lighten the lighter one, darken the darker one
    if (red.l > green.l) {
      theme.red = oklchToHex(Math.min(0.9, red.l + 0.1), red.c, red.h)
      theme.green = oklchToHex(Math.max(0.1, green.l - 0.1), green.c, green.h)
    } else {
      theme.green = oklchToHex(Math.min(0.9, green.l + 0.1), green.c, green.h)
      theme.red = oklchToHex(Math.max(0.1, red.l - 0.1), red.c, red.h)
    }
    // Update bright variants too
    theme.brightRed = oklchToHex(Math.min(0.98, hexToOklch(theme.red!).l + 0.15), hexToOklch(theme.red!).c * 1.15, hexToOklch(theme.red!).h)
    theme.brightGreen = oklchToHex(Math.min(0.98, hexToOklch(theme.green!).l + 0.15), hexToOklch(theme.green!).c * 1.15, hexToOklch(theme.green!).h)
  }

  // Mapping Base16 slots
  theme.base00 = theme.background; theme.base01 = theme.mantle; theme.base02 = theme.surface0;
  theme.base03 = theme.brightBlack; theme.base04 = theme.surface1; theme.base05 = theme.foreground;
  theme.base06 = theme.foreground; theme.base07 = theme.foreground;
  theme.base08 = theme.red; theme.base09 = theme.brightRed; theme.base0A = theme.yellow;
  theme.base0B = theme.green; theme.base0C = theme.cyan; theme.base0D = theme.blue;
  theme.base0E = theme.magenta; theme.base0F = theme.brightMagenta;

  theme.white = oklchToHex(isDark ? 0.90 : 0.10, 0.01, seedHue)
  theme.brightWhite = oklchToHex(isDark ? 0.99 : 0.01, 0.01, seedHue)

  const mergeLocked = (newScheme: Partial<ColorScheme>) => {
    Object.keys(currentScheme).forEach(key => {
      if (lockedColors.has(key)) (newScheme as any)[key] = (currentScheme as any)[key]
    })
    return newScheme as ColorScheme
  }

  return mergeLocked(theme as ColorScheme)
}
