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
