import type { ColorScheme } from './types'

export function getLuminance(hex: string) {
  const rgb = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(rgb.slice(0, 2), 16) / 255;
  const g = parseInt(rgb.slice(2, 4), 16) / 255;
  const b = parseInt(rgb.slice(4, 6), 16) / 255;

  const a = [r, g, b].map(v => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrast(hex1: string, hex2: string) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

export function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  
  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
      default: h = 0
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToHex(h: number, s: number, l: number) {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function fixContrast(currentScheme: ColorScheme, lockedColors: Set<string>, targetRatio: number, updateCallback: (newScheme: ColorScheme) => void) {
  const bg = currentScheme.background
  const bgL = getLuminance(bg)
  const isDarkBg = bgL < 0.5
  
  const colorsToFix = [
    'foreground', 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
    'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
    'primary', 'secondary', 'accent'
  ]

  let changed = false
  const newScheme = { ...currentScheme }

  colorsToFix.forEach(key => {
    if (lockedColors.has(key)) return
    
    let color = (newScheme as any)[key]
    let ratio = getContrast(bg, color)
    
    if (ratio < targetRatio) {
      const { h, s, l } = hexToHsl(color)
      let newL = l
      
      // Nudge lightness in steps
      for (let i = 0; i < 20; i++) {
        if (isDarkBg) newL += 4 // Lighten if bg is dark
        else newL -= 4 // Darken if bg is light
        
        if (newL < 0) newL = 0
        if (newL > 100) newL = 100
        
        const newHex = hslToHex(h, s, newL)
        if (getContrast(bg, newHex) >= targetRatio) {
          ;(newScheme as any)[key] = newHex
          changed = true
          break
        }
      }
    }
  })

  // Ensure backgrounds contrast slightly with each other
  const bgLayers = ['mantle', 'crust', 'surface0', 'surface1', 'surface2']
  bgLayers.forEach(key => {
    if (lockedColors.has(key)) return
    // (Logic for background layering if needed, but generator handles it well)
  })

  if (changed) {
    updateCallback(newScheme)
  }
}

/**
 * Adjusts the entire theme based on hue shift, saturation multiplier, and brightness multiplier.
 */
export function adjustTheme(scheme: ColorScheme, hueShift: number, satMult: number, briMult: number): ColorScheme {
  const newScheme = { ...scheme }
  Object.keys(newScheme).forEach(key => {
    const hex = (newScheme as any)[key]
    const { h, s, l } = hexToHsl(hex)
    
    let newH = (h + hueShift) % 360
    if (newH < 0) newH += 360
    
    const newS = Math.min(100, Math.max(0, s * satMult))
    const newL = Math.min(100, Math.max(0, l * briMult))
    
    ;(newScheme as any)[key] = hslToHex(newH, newS, newL)
  })
  return newScheme
}

/**
 * Extracts a palette from an image using a canvas
 */
export async function extractPaletteFromImage(file: File): Promise<Partial<ColorScheme>> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = 100
        canvas.height = 100
        ctx.drawImage(img, 0, 0, 100, 100)
        
        const data = ctx.getImageData(0, 0, 100, 100).data
        const colors: {r:number, g:number, b:number}[] = []
        for (let i = 0; i < data.length; i += 40) { // Sample
          colors.push({ r: data[i], g: data[i+1], b: data[i+2] })
        }
        
        const hex = (c: {r:number, g:number, b:number}) => {
          const r = Math.round(c.r).toString(16).padStart(2,'0')
          const g = Math.round(c.g).toString(16).padStart(2,'0')
          const b = Math.round(c.b).toString(16).padStart(2,'0')
          return `#${r}${g}${b}`
        }
        
        const sorted = colors.sort((a,b) => (a.r+a.g+a.b) - (b.r+b.g+b.b))
        const L = sorted.length
        
        const scheme: Partial<ColorScheme> = {
          background: hex(sorted[0]),
          foreground: hex(sorted[L-1]),
          cursor: hex(sorted[L-1]),
          black: hex(sorted[Math.floor(L * 0.05)]),
          red: hex(sorted[Math.floor(L * 0.2)]),
          green: hex(sorted[Math.floor(L * 0.35)]),
          yellow: hex(sorted[Math.floor(L * 0.5)]),
          blue: hex(sorted[Math.floor(L * 0.65)]),
          magenta: hex(sorted[Math.floor(L * 0.8)]),
          cyan: hex(sorted[Math.floor(L * 0.9)]),
          white: hex(sorted[L-2]),
          brightBlack: hex(sorted[Math.floor(L * 0.1)]),
          brightRed: hex(sorted[Math.floor(L * 0.25)]),
          brightGreen: hex(sorted[Math.floor(L * 0.4)]),
          brightYellow: hex(sorted[Math.floor(L * 0.55)]),
          brightBlue: hex(sorted[Math.floor(L * 0.7)]),
          brightMagenta: hex(sorted[Math.floor(L * 0.85)]),
          brightCyan: hex(sorted[Math.floor(L * 0.95)]),
          brightWhite: hex(sorted[L-1]),
        }
        
        resolve(scheme)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Intelligently inverts a theme from dark to light or vice versa.
 */
export function generateInvertedTheme(scheme: ColorScheme): ColorScheme {
  const isDark = getLuminance(scheme.background) < 0.5
  const newScheme = { ...scheme }
  
  const invertLightness = (hex: string, darkRange: [number, number], lightRange: [number, number]) => {
    const { h, s, l } = hexToHsl(hex)
    const currentRange = isDark ? darkRange : lightRange
    const targetRange = isDark ? lightRange : darkRange
    
    // Normalize lightness within current range to [0, 1]
    const normalizedL = (l - currentRange[0]) / (currentRange[1] - currentRange[0])
    // Map to target range inversely
    const newL = targetRange[1] - (normalizedL * (targetRange[1] - targetRange[0]))
    
    return hslToHex(h, s, Math.min(100, Math.max(0, newL)))
  }

  // 1. Invert Background and UI Layers
  newScheme.background = invertLightness(scheme.background, [0, 15], [85, 98])
  newScheme.mantle = invertLightness(scheme.mantle, [0, 12], [80, 95])
  newScheme.crust = invertLightness(scheme.crust, [0, 10], [75, 92])
  newScheme.surface0 = invertLightness(scheme.surface0, [15, 25], [70, 90])
  newScheme.surface1 = invertLightness(scheme.surface1, [20, 30], [65, 85])
  newScheme.surface2 = invertLightness(scheme.surface2, [25, 35], [60, 80])

  // 2. Invert Foreground
  newScheme.foreground = invertLightness(scheme.foreground, [75, 95], [5, 25])
  newScheme.cursor = scheme.cursor

  // 3. Adjust ANSI Colors
  // On Dark themes, ANSI colors are usually L=60-80
  // On Light themes, they should be L=30-50 for readability
  const ansiKeys = [
    'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'black',
    'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite', 'brightBlack',
    'primary', 'secondary', 'accent'
  ]

  ansiKeys.forEach(key => {
    const hex = (scheme as any)[key]
    const { h, s, l } = hexToHsl(hex)
    
    let newL
    if (isDark) {
      // Dark -> Light: Make it darker
      // If it's a "bright" variant or white, make it even darker
      const isBright = key.startsWith('bright') || key === 'white'
      newL = isBright ? Math.max(20, l - 40) : Math.max(25, l - 30)
    } else {
      // Light -> Dark: Make it lighter
      const isBright = key.startsWith('bright') || key === 'white'
      newL = isBright ? Math.min(95, l + 40) : Math.min(90, l + 30)
    }
    
    ;(newScheme as any)[key] = hslToHex(h, s, newL)
  })

  // 4. Update Base16 Mappings (Simplified)
  newScheme.base00 = newScheme.background
  newScheme.base01 = newScheme.mantle
  newScheme.base02 = newScheme.surface0
  newScheme.base03 = newScheme.brightBlack
  newScheme.base04 = newScheme.surface1
  newScheme.base05 = newScheme.foreground
  newScheme.base06 = newScheme.foreground
  newScheme.base07 = newScheme.foreground
  newScheme.base08 = newScheme.red
  newScheme.base09 = newScheme.brightRed
  newScheme.base0A = newScheme.yellow
  newScheme.base0B = newScheme.green
  newScheme.base0C = newScheme.cyan
  newScheme.base0D = newScheme.blue
  newScheme.base0E = newScheme.magenta
  newScheme.base0F = newScheme.brightMagenta

  return newScheme
}
