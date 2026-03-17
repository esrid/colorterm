import type { ColorScheme } from './types'
import { oklchToHex, hexToOklch, kelvinToHex, getAPCA, interferenceToHex, bezierInterpolate } from './colorUtils'

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
  { name: 'OLED', isDark: true, bgL: [0, 0.01], bgC: [0, 0], fgL: [0.9, 1.0], accentC: [0.2, 0.3], hueDrift: 0 },
  { name: 'Matrix', isDark: true, bgL: [0.01, 0.03], bgC: [0.02, 0.05], fgL: [0.8, 0.9], accentC: [0.2, 0.3], hueDrift: 1.0 } // All hues pulled to green
]

export type GenerationStrategy = 'tonal' | 'vibrant' | 'contrast' | 'minimal' | 'thermal' | 'bezier' | 'voronoi' | 'hueshift' | 'apca' | 'interference'

export function generateCoherentTheme(
  currentScheme: ColorScheme, 
  lockedColors: Set<string>,
  strategy: GenerationStrategy = 'tonal'
): ColorScheme {
  const seedHue = Math.floor(Math.random() * 360)
  const profile = PROFILES[Math.floor(Math.random() * PROFILES.length)]
  const isDark = profile.isDark

  const modes = ['balanced', 'vibrant', 'soft', 'monochrome', 'analogous', 'triadic', 'complementary']
  const mode = strategy === 'minimal' ? 'monochrome' : (strategy === 'vibrant' ? 'triadic' : modes[Math.floor(Math.random() * modes.length)])
  
  const rand = (range: [number, number]) => range[0] + Math.random() * (range[1] - range[0])
  
  let bgL = rand(profile.bgL)
  let bgC = rand(profile.bgC)
  let accentC = rand(profile.accentC)
  let accentL = isDark ? 0.65 + Math.random() * 0.15 : 0.35 + Math.random() * 0.15

  // Strategy Specific Adjustments
  switch (strategy) {
    case 'vibrant':
      accentC = Math.min(0.35, accentC * 1.8)
      bgC = Math.min(0.1, bgC * 2)
      break
    case 'minimal':
      accentC = accentC * 0.3
      bgC = bgC * 0.2
      break
    case 'contrast':
      bgL = isDark ? 0.01 : 0.99
      bgC = 0
      break
    case 'thermal':
      bgL = 0.02
      bgC = 0.01
      break
  }

  const theme: Partial<ColorScheme> = {
    background: oklchToHex(bgL, bgC, seedHue),
    mantle: oklchToHex(isDark ? Math.max(0, bgL - 0.03) : Math.min(1, bgL + 0.03), bgC, seedHue),
    crust: oklchToHex(isDark ? Math.max(0, bgL - 0.06) : Math.min(1, bgL + 0.06), bgC, seedHue),
    surface0: oklchToHex(isDark ? bgL + 0.1 : bgL - 0.1, bgC * 1.2, seedHue),
    surface1: oklchToHex(isDark ? bgL + 0.15 : bgL - 0.15, bgC * 1.4, seedHue),
    surface2: oklchToHex(isDark ? bgL + 0.2 : bgL - 0.2, bgC * 1.6, seedHue),
    foreground: oklchToHex(isDark ? 0.9 : 0.1, bgC * 0.5, seedHue),
    cursor: oklchToHex(accentL, accentC, seedHue),
    primary: oklchToHex(accentL, accentC, seedHue),
    secondary: oklchToHex(accentL, accentC * 0.8, (seedHue + 30) % 360),
    accent: oklchToHex(accentL, accentC, (seedHue + 180) % 360),
  }

  // Strategy Override: Bezier (Smooth Background Ramp)
  if (strategy === 'bezier') {
    const startColor = theme.background!
    const endColor = oklchToHex(isDark ? bgL + 0.3 : bgL - 0.3, accentC, seedHue)
    theme.mantle = bezierInterpolate(startColor, endColor, 0.1)
    theme.crust = bezierInterpolate(startColor, endColor, 0.2)
    theme.surface0 = bezierInterpolate(startColor, endColor, 0.4)
    theme.surface1 = bezierInterpolate(startColor, endColor, 0.6)
    theme.surface2 = bezierInterpolate(startColor, endColor, 0.8)
  }

  const ansiNames = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
  const baseHues = { red: 29, green: 145, yellow: 85, blue: 260, magenta: 320, cyan: 195, white: seedHue }

  theme.black = oklchToHex(isDark ? bgL + 0.10 : bgL - 0.10, bgC * 0.5, seedHue)
  theme.brightBlack = oklchToHex(isDark ? bgL + 0.25 : bgL - 0.25, bgC * 0.4, seedHue)

  let normalL = isDark ? 0.65 : 0.45
  let brightL = isDark ? 0.85 : 0.25

  if (strategy === 'contrast') {
    normalL = isDark ? 0.8 : 0.2
    brightL = isDark ? 0.95 : 0.05
  }

  // Voronoi relaxation points
  const voronoiPoints = strategy === 'voronoi' 
    ? Array.from({ length: 8 }, () => ({ h: Math.random() * 360, c: 0.1 + Math.random() * 0.2 }))
    : []

  ansiNames.forEach((name) => {
    let h = baseHues[name as keyof typeof baseHues]
    let c = strategy === 'vibrant' ? 0.3 : 0.15

    // 1. Voronoi logic
    if (strategy === 'voronoi') {
      const p = voronoiPoints.reduce((prev, curr) => Math.abs(curr.h - h) < Math.abs(prev.h - h) ? curr : prev)
      h = p.h
      c = p.c
    }
    
    // 2. Hue Drift & Harmony logic
    const diff = h - seedHue
    h = h - (diff * profile.hueDrift)

    if (mode === 'analogous') h = seedHue + (h - seedHue) * 0.2
    else if (mode === 'monochrome') h = seedHue
    else if (mode === 'triadic') {
      const triPoints = [seedHue, (seedHue + 120) % 360, (seedHue + 240) % 360]
      h = triPoints.reduce((prev, curr) => Math.abs(curr - h) < Math.abs(prev - h) ? curr : prev)
    }

    // 3. Strategy logic
    let finalHex = oklchToHex(normalL, c, h)
    let finalBrightHex = oklchToHex(brightL, c, h)

    if (strategy === 'thermal') {
      const temps: Record<string, number> = { red: 1500, yellow: 3000, green: 5000, cyan: 8000, blue: 15000, magenta: 20000, white: 6500 }
      finalHex = kelvinToHex(temps[name] || 5000)
      const { h: th, c: tc } = hexToOklch(finalHex)
      finalBrightHex = oklchToHex(brightL, tc, th)
    } else if (strategy === 'interference') {
      const thicknesses: Record<string, number> = { red: 750, yellow: 600, green: 520, cyan: 480, blue: 400, magenta: 350, white: 500 }
      finalHex = interferenceToHex(thicknesses[name] || 500)
      const { h: ih, c: ic } = hexToOklch(finalHex)
      finalBrightHex = oklchToHex(brightL, ic, ih)
    } else if (strategy === 'hueshift') {
      // Warm highlights (lighten), Cool shadows (darken)
      const shift = isDark ? -10 : 10 // Shift towards blue in dark, towards yellow in light
      h = (h + shift + 360) % 360
      finalHex = oklchToHex(normalL, c, h)
      finalBrightHex = oklchToHex(brightL, c, (h + 10) % 360)
    }

    // 4. Contrast enforcement
    if (strategy === 'apca' || strategy === 'contrast') {
      const targetLc = strategy === 'contrast' ? (isDark ? 75 : -85) : (isDark ? 60 : -70)
      const { c: finalC, h: finalH } = hexToOklch(finalHex)
      let bestL = isDark ? 0.7 : 0.3
      for (let i = 0; i < 10; i++) {
        const testHex = oklchToHex(bestL, finalC, finalH)
        const currentLc = getAPCA(testHex, theme.background!)
        if (isDark) {
          if (currentLc < targetLc) bestL += 0.05
          else break
        } else {
          if (currentLc > targetLc) bestL -= 0.05
          else break
        }
      }
      finalHex = oklchToHex(bestL, finalC, finalH)
      finalBrightHex = oklchToHex(Math.min(1, bestL + 0.15), finalC, finalH)
    }

    theme[name as keyof ColorScheme] = finalHex
    ;(theme as any)[`bright${name.charAt(0).toUpperCase() + name.slice(1)}`] = finalBrightHex
  })

  // Finalize shades
  theme.white = oklchToHex(isDark ? 0.92 : 0.15, bgC * 0.2, seedHue)
  theme.brightWhite = oklchToHex(isDark ? 0.98 : 0.05, bgC * 0.1, seedHue)

  // Map Base16
  theme.base00 = theme.background; theme.base01 = theme.mantle; theme.base02 = theme.surface0;
  theme.base03 = theme.brightBlack; theme.base04 = theme.surface1; theme.base05 = theme.foreground;
  theme.base06 = theme.foreground; theme.base07 = theme.foreground;
  theme.base08 = theme.red; theme.base09 = theme.brightRed; theme.base0A = theme.yellow;
  theme.base0B = theme.green; theme.base0C = theme.cyan; theme.base0D = theme.blue;
  theme.base0E = theme.magenta; theme.base0F = theme.brightMagenta;

  const mergeLocked = (newScheme: Partial<ColorScheme>) => {
    Object.keys(currentScheme).forEach(key => {
      if (lockedColors.has(key)) (newScheme as any)[key] = (currentScheme as any)[key]
    })
    return newScheme as ColorScheme
  }

  return mergeLocked(theme as ColorScheme)
}
