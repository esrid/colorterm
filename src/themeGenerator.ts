import type { ColorScheme } from './types'
import { hslToHex } from './colorUtils'

export function generateCoherentTheme(currentScheme: ColorScheme, lockedColors: Set<string>): ColorScheme {
  const seedHue = Math.floor(Math.random() * 360)
  
  // Default to dark terminal tone now that selector is removed
  const isDark = true
  
  // Randomize the generation mode internally for variety
  const modes = ['balanced', 'vibrant', 'muted', 'monochrome', 'high-contrast', 'analogous', 'triadic', 'complementary']
  const mode = modes[Math.floor(Math.random() * modes.length)]
  
  let bgS, bgL, fgS, fgL, ansiS, ansiL

  const mergeLocked = (newScheme: Partial<ColorScheme>) => {
    Object.keys(currentScheme).forEach(key => {
      if (lockedColors.has(key)) {
        (newScheme as any)[key] = (currentScheme as any)[key];
      }
    });
    return newScheme as ColorScheme;
  };

  switch (mode) {
    case 'vibrant':
      bgS = Math.floor(Math.random() * 20) + 15
      bgL = isDark ? 8 : 92
      fgS = 20
      fgL = isDark ? 95 : 5
      ansiS = 85
      ansiL = isDark ? 70 : 45
      break
    case 'muted':
      bgS = Math.floor(Math.random() * 10) + 5
      bgL = isDark ? 15 : 85
      fgS = 5
      fgL = isDark ? 80 : 20
      ansiS = 35
      ansiL = isDark ? 65 : 45
      break
    case 'monochrome':
      bgS = Math.floor(Math.random() * 15) + 5
      bgL = isDark ? 5 : 95
      fgS = bgS
      fgL = isDark ? 90 : 10
      ansiS = Math.floor(Math.random() * 30) + 10
      ansiL = isDark ? 70 : 40
      break
    case 'high-contrast':
      bgS = 0
      bgL = isDark ? 0 : 100
      fgS = 0
      fgL = isDark ? 100 : 0
      ansiS = 95
      ansiL = isDark ? 60 : 50
      break
    case 'analogous':
    case 'triadic':
    case 'complementary':
      bgS = Math.floor(Math.random() * 15) + 10
      bgL = isDark ? 8 : 92
      fgS = 15
      fgL = isDark ? 90 : 10
      ansiS = 70
      ansiL = isDark ? 65 : 45
      break
    default: 
      bgS = Math.floor(Math.random() * 15) + 5
      bgL = isDark ? 10 : 90
      fgS = 10
      fgL = isDark ? 85 : 15
      ansiS = 60
      ansiL = isDark ? 65 : 40
  }

  const theme: Partial<ColorScheme> = {
    background: hslToHex(seedHue, bgS, bgL),
    mantle: hslToHex(seedHue, bgS, isDark ? Math.max(0, bgL - 2) : Math.min(100, bgL + 2)),
    crust: hslToHex(seedHue, bgS, isDark ? Math.max(0, bgL - 4) : Math.min(100, bgL + 4)),
    surface0: hslToHex(seedHue, bgS, isDark ? bgL + 10 : bgL - 10),
    surface1: hslToHex(seedHue, bgS, isDark ? bgL + 15 : bgL - 15),
    surface2: hslToHex(seedHue, bgS, isDark ? bgL + 20 : bgL - 20),
    foreground: hslToHex(seedHue, fgS, fgL),
    cursor: hslToHex(seedHue, 100, 50),
    primary: hslToHex(seedHue, 70, isDark ? 65 : 45),
    secondary: hslToHex((seedHue + 120) % 360, 60, isDark ? 65 : 45),
    accent: hslToHex((seedHue + 240) % 360, 70, isDark ? 65 : 45),
  }

  const baseAnsiHues = [0, 120, 60, 240, 300, 180, seedHue] 
  const ansiNames = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
  
  theme.black = hslToHex(seedHue, bgS, isDark ? bgL + 10 : bgL - 10)
  theme.brightBlack = hslToHex(seedHue, bgS, isDark ? bgL + 25 : bgL - 25)

  ansiNames.forEach((name, i) => {
    let h = baseAnsiHues[i]
    
    if (mode === 'monochrome') {
       h = (seedHue + (Math.random() * 40 - 20)) % 360 
    } else if (mode === 'analogous') {
       h = (seedHue + (i * 15) - 45) % 360
    } else if (mode === 'triadic') {
       // Spread colors across the triad
       const offsets = [0, 120, 240, 0, 120, 240, 0]
       h = (seedHue + offsets[i]) % 360
    } else if (mode === 'complementary') {
       // Mix base hue and its complement
       const isComplement = i % 2 === 0
       h = (seedHue + (isComplement ? 180 : 0)) % 360
    }
    
    if (h < 0) h += 360
    
    ;(theme as any)[name] = hslToHex(h, ansiS, ansiL)
    ;(theme as any)[`bright${name.charAt(0).toUpperCase() + name.slice(1)}`] = hslToHex(h, Math.min(100, ansiS + 15), isDark ? Math.min(95, ansiL + 15) : Math.max(5, ansiL - 15))
  })

  return mergeLocked(theme)
}
