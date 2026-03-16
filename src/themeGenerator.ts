import type { ColorScheme } from './types'
import { oklchToHex } from './colorUtils'

export function generateCoherentTheme(currentScheme: ColorScheme, lockedColors: Set<string>): ColorScheme {
  const seedHue = Math.floor(Math.random() * 360)
  
  // Default to dark terminal tone
  const isDark = true
  
  const modes = [
    'balanced', 'vibrant', 'soft', 'monochrome', 
    'high-contrast', 'analogous', 'triadic', 
    'complementary', 'split-complementary', 'square'
  ]
  const mode = modes[Math.floor(Math.random() * modes.length)]
  
  // Perceptual OKLCH Targets
  let bgL = isDark ? 0.08 : 0.98
  let bgC = 0.02
  
  let fgL = isDark ? 0.92 : 0.08
  let fgC = 0.01
  
  let accentC = 0.12
  let accentL = isDark ? 0.70 : 0.45

  switch (mode) {
    case 'vibrant':
      accentC = 0.18
      bgC = 0.04
      break
    case 'soft':
      accentC = 0.06
      accentL = isDark ? 0.65 : 0.55
      bgC = 0.01
      break
    case 'monochrome':
      accentC = 0.03
      bgC = 0.01
      break
    case 'high-contrast':
      bgL = isDark ? 0.01 : 1.0
      fgL = isDark ? 1.0 : 0.01
      accentC = 0.22
      break
  }

  const mergeLocked = (newScheme: Partial<ColorScheme>) => {
    Object.keys(currentScheme).forEach(key => {
      if (lockedColors.has(key)) {
        (newScheme as any)[key] = (currentScheme as any)[key];
      }
    });
    return newScheme as ColorScheme;
  };

  const theme: Partial<ColorScheme> = {
    background: oklchToHex(bgL, bgC, seedHue),
    mantle: oklchToHex(isDark ? Math.max(0, bgL - 0.03) : Math.min(1, bgL + 0.03), bgC, seedHue),
    crust: oklchToHex(isDark ? Math.max(0, bgL - 0.05) : Math.min(1, bgL + 0.05), bgC, seedHue),
    surface0: oklchToHex(isDark ? bgL + 0.10 : bgL - 0.10, bgC, seedHue),
    surface1: oklchToHex(isDark ? bgL + 0.15 : bgL - 0.15, bgC, seedHue),
    surface2: oklchToHex(isDark ? bgL + 0.20 : bgL - 0.20, bgC, seedHue),
    foreground: oklchToHex(fgL, fgC, seedHue),
    cursor: oklchToHex(accentL, accentC, seedHue),
    primary: oklchToHex(accentL, accentC, seedHue),
    secondary: oklchToHex(accentL, accentC * 0.8, (seedHue + 30) % 360),
    accent: oklchToHex(accentL, accentC, (seedHue + 180) % 360),
  }

  // Base16 Mappings
  theme.base00 = theme.background
  theme.base01 = theme.mantle
  theme.base02 = theme.surface0
  theme.base04 = theme.surface1
  theme.base05 = theme.foreground
  theme.base06 = theme.foreground
  theme.base07 = theme.foreground

  // ANSI Colors (Standard Terminal Palette)
  // These are standard hue offsets but we'll adapt them to our harmony mode
  const ansiNames = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
  const baseHues = {
    red: 25,
    green: 145,
    yellow: 85,
    blue: 260,
    magenta: 320,
    cyan: 190,
    white: seedHue
  }

  theme.black = oklchToHex(isDark ? bgL + 0.12 : bgL - 0.12, bgC * 0.5, seedHue)
  theme.brightBlack = oklchToHex(isDark ? bgL + 0.25 : bgL - 0.25, bgC * 0.5, seedHue)
  theme.base03 = theme.brightBlack

  ansiNames.forEach((name) => {
    let h = baseHues[name as keyof typeof baseHues]
    
    // Adjust hues based on mode for more "powerful" harmony
    if (mode === 'analogous') {
      // Rotate standard hues towards seedHue
      const diff = h - seedHue
      h = seedHue + diff * 0.3
    } else if (mode === 'monochrome') {
      h = seedHue + (Math.random() * 20 - 10)
    } else if (mode === 'triadic') {
      // Snap to triadic points
      const triPoints = [seedHue, (seedHue + 120) % 360, (seedHue + 240) % 360]
      h = triPoints.reduce((prev, curr) => 
        Math.abs(curr - h) < Math.abs(prev - h) ? curr : prev
      )
    } else if (mode === 'split-complementary') {
      const splitPoints = [seedHue, (seedHue + 150) % 360, (seedHue + 210) % 360]
      h = splitPoints.reduce((prev, curr) => 
        Math.abs(curr - h) < Math.abs(prev - h) ? curr : prev
      )
    } else if (mode === 'square') {
      const squarePoints = [seedHue, (seedHue + 90) % 360, (seedHue + 180) % 360, (seedHue + 270) % 360]
      h = squarePoints.reduce((prev, curr) => 
        Math.abs(curr - h) < Math.abs(prev - h) ? curr : prev
      )
    }

    const hex = oklchToHex(accentL, accentC, h)
    const brightHex = oklchToHex(isDark ? Math.min(0.95, accentL + 0.15) : Math.max(0.05, accentL - 0.15), accentC, h)
    
    ;(theme as any)[name] = hex
    ;(theme as any)[`bright${name.charAt(0).toUpperCase() + name.slice(1)}`] = brightHex

    // Base16 slots
    if (name === 'red') theme.base08 = hex
    if (name === 'yellow') { theme.base09 = hex; theme.base0A = hex }
    if (name === 'green') theme.base0B = hex
    if (name === 'cyan') theme.base0C = hex
    if (name === 'blue') theme.base0D = hex
    if (name === 'magenta') { theme.base0E = hex; theme.base0F = brightHex }
  })

  // Ensure white is actually light
  theme.white = oklchToHex(isDark ? 0.85 : 0.15, 0.01, seedHue)
  theme.brightWhite = oklchToHex(isDark ? 0.98 : 0.05, 0.01, seedHue)

  return mergeLocked(theme)
}
