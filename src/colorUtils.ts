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
      const { l, c, h } = hexToOklch(color)
      let newL = l
      
      // Nudge lightness in steps perceptually
      for (let i = 0; i < 20; i++) {
        if (isDarkBg) newL += 0.04 // Lighten if bg is dark
        else newL -= 0.04 // Darken if bg is light
        
        if (newL < 0) newL = 0
        if (newL > 1) newL = 1
        
        const newHex = oklchToHex(newL, c, h)
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
 * K-Means clustering for color extraction
 */
function kMeans(pixels: {r:number, g:number, b:number}[], k: number, iterations: number = 5) {
  // Initialize centroids randomly
  let centroids = []
  for (let i = 0; i < k; i++) {
    centroids.push(pixels[Math.floor(Math.random() * pixels.length)])
  }

  for (let iter = 0; iter < iterations; iter++) {
    const clusters: {r:number, g:number, b:number}[][] = Array.from({ length: k }, () => [])
    
    // Assignment
    for (const p of pixels) {
      let minDist = Infinity
      let clusterIdx = 0
      for (let i = 0; i < k; i++) {
        const d = Math.sqrt((p.r - centroids[i].r)**2 + (p.g - centroids[i].g)**2 + (p.b - centroids[i].b)**2)
        if (d < minDist) {
          minDist = d
          clusterIdx = i
        }
      }
      clusters[clusterIdx].push(p)
    }
    
    // Update
    centroids = clusters.map(cluster => {
      if (cluster.length === 0) return pixels[Math.floor(Math.random() * pixels.length)]
      const sum = cluster.reduce((acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }), { r: 0, g: 0, b: 0 })
      return { r: sum.r / cluster.length, g: sum.g / cluster.length, b: sum.b / cluster.length }
    })
  }
  
  return centroids
}

/**
 * Extracts a palette from an image using K-Means clustering
 */
export async function extractPaletteFromImage(file: File): Promise<Partial<ColorScheme>> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        const size = 64 // Smaller size for performance
        canvas.width = size
        canvas.height = size
        ctx.drawImage(img, 0, 0, size, size)
        
        const data = ctx.getImageData(0, 0, size, size).data
        const pixels: {r:number, g:number, b:number}[] = []
        for (let i = 0; i < data.length; i += 4) {
          pixels.push({ r: data[i], g: data[i+1], b: data[i+2] })
        }
        
        // Extract 8 dominant colors using K-Means
        const dominantColors = kMeans(pixels, 8)
        
        const hex = (c: {r:number, g:number, b:number}) => {
          const r = Math.round(Math.max(0, Math.min(255, c.r))).toString(16).padStart(2,'0')
          const g = Math.round(Math.max(0, Math.min(255, c.g))).toString(16).padStart(2,'0')
          const b = Math.round(Math.max(0, Math.min(255, c.b))).toString(16).padStart(2,'0')
          return `#${r}${g}${b}`
        }
        
        // Sort by luminance
        const sorted = dominantColors.sort((a,b) => {
          const lA = (a.r * 0.299 + a.g * 0.587 + a.b * 0.114)
          const lB = (b.r * 0.299 + b.g * 0.587 + b.b * 0.114)
          return lA - lB
        })

        const dark = hex(sorted[0])
        const light = hex(sorted[sorted.length - 1])
        
        const scheme: Partial<ColorScheme> = {
          background: dark,
          foreground: light,
          cursor: light,
          black: hex(sorted[0]),
          red: hex(sorted[1] || sorted[0]),
          green: hex(sorted[2] || sorted[0]),
          yellow: hex(sorted[3] || sorted[0]),
          blue: hex(sorted[4] || sorted[0]),
          magenta: hex(sorted[5] || sorted[0]),
          cyan: hex(sorted[6] || sorted[0]),
          white: hex(sorted[7] || sorted[0]),
          brightBlack: hex(sorted[0]),
          brightRed: hex(sorted[1] || sorted[0]),
          brightGreen: hex(sorted[2] || sorted[0]),
          brightYellow: hex(sorted[3] || sorted[0]),
          brightBlue: hex(sorted[4] || sorted[0]),
          brightMagenta: hex(sorted[5] || sorted[0]),
          brightCyan: hex(sorted[6] || sorted[0]),
          brightWhite: hex(sorted[7] || sorted[0]),
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
export function generateTonalPalette(baseHex: string): Record<number, string> {
  const { c: baseC, h: baseH } = hexToOklch(baseHex)
  
  const stops = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
  const palette: Record<number, string> = {}

  const getL = (stop: number) => {
    const t = (stop - 50) / 900
    const l = 0.98 - (1 / (1 + Math.exp(-6 * (t - 0.5))) * 0.86)
    return Math.max(0, Math.min(1, l))
  }

  const getC = (stop: number) => {
    const t = (stop - 50) / 900
    const bell = Math.exp(-Math.pow(t - 0.5, 2) / 0.08)
    return baseC * (0.3 + 0.7 * bell)
  }

  stops.forEach(stop => {
    const targetL = getL(stop)
    const targetC = getC(stop)
    let targetH = baseH
    palette[stop] = oklchToHex(targetL, targetC, targetH)
  })

  return palette
}

/**
 * Converts Kelvin temperature to sRGB.
 * Range: 1000K to 40000K
 */
export function kelvinToHex(kelvin: number): string {
  let temp = kelvin / 100
  let r, g, b_
  
  if (temp <= 66) {
    r = 255
    g = 99.4708025861 * Math.log(temp) - 161.1195681661
    if (temp <= 19) b_ = 0
    else b_ = 138.5177312231 * Math.log(temp - 10) - 305.0447927307
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592)
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492)
    b_ = 255
  }
  
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)))
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b_)}`
}

/**
 * Advanced Perceptual Contrast Algorithm (APCA) simplified.
 * Returns value between -108 and 106.
 */
export function getAPCA(textHex: string, bgHex: string): number {
  const sRGBtoY = (c: number) => Math.pow(c / 255, 2.4)
  const getY = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return 0.2126729 * sRGBtoY(r) + 0.7151522 * sRGBtoY(g) + 0.0721750 * sRGBtoY(b)
  }

  let Ytxt = getY(textHex)
  let Ybg = getY(bgHex)

  let Lc
  if (Ybg > Ytxt) {
    Lc = (Math.pow(Ybg, 0.56) - Math.pow(Ytxt, 0.57)) * 1.14
    Lc = (Lc < 0.1) ? 0 : (Lc * 100) - 2.7
  } else {
    Lc = (Math.pow(Ybg, 0.65) - Math.pow(Ytxt, 0.62)) * 1.14
    Lc = (Lc > -0.1) ? 0 : (Lc * 100) + 2.7
  }
  return Lc
}

/**
 * Wyman's analytic fit for CIE 1931 Color Matching Functions.
 * Used for accurate spectral to XYZ conversion.
 */
function wymanCMF(lambda: number) {
  const f = (x: number, alpha: number, mu: number, sigma1: number, sigma2: number) => {
    const d = x - mu
    const sigma = d < 0 ? sigma1 : sigma2
    return alpha * Math.exp(-0.5 * (d / sigma) ** 2)
  }

  const x = f(lambda, 1.056, 599.8, 37.9, 31.0) + f(lambda, 0.362, 442.0, 16.0, 26.7) + f(lambda, -0.065, 501.1, 20.4, 26.2)
  const y = f(lambda, 0.821, 568.8, 46.9, 40.5) + f(lambda, 0.286, 530.9, 16.3, 31.1)
  const z = f(lambda, 1.217, 437.0, 11.8, 36.0) + f(lambda, 0.681, 459.0, 26.0, 13.8)
  
  return { x, y, z }
}

/**
 * Advanced Thin-Film Interference simulation.
 * Calculates sRGB from thickness (nm).
 */
export function interferenceToHex(thicknessNm: number): string {
  const nFilm = 1.33 // Water/Soap
  let X = 0, Y = 0, Z = 0
  
  // Sample visible spectrum 380nm - 780nm
  for (let l = 380; l <= 780; l += 5) {
    // Path difference for normal incidence
    const delta = 2 * nFilm * thicknessNm
    // Phase shift (PI at first surface reflection n_air < n_film)
    const phi = Math.PI
    const phase = (2 * Math.PI * delta) / l + phi
    // Reflectance I = 0.5 * (1 + cos(phase))
    const R = 0.5 * (1 + Math.cos(phase))
    
    const cmf = wymanCMF(l)
    X += R * cmf.x
    Y += R * cmf.y
    Z += R * cmf.z
  }

  // Normalize XYZ
  const norm = 80 // Arbitrary normalization for brightness
  X /= norm; Y /= norm; Z /= norm

  // XYZ to linear sRGB
  let rL =  3.2406 * X - 1.5372 * Y - 0.4986 * Z
  let gL = -0.9689 * X + 1.8758 * Y + 0.0415 * Z
  let bL =  0.0557 * X - 0.2040 * Y + 1.0570 * Z

  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  const gamma = (v: number) => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1/2.4) - 0.055
  
  const toHex = (v: number) => Math.round(gamma(clamp(v)) * 255).toString(16).padStart(2, '0')
  return `#${toHex(rL)}${toHex(gL)}${toHex(bL)}`
}

/**
 * OKLCH Color Space Utilities
 * Based on https://bottosson.github.io/posts/oklab/
 */

export function hexToOklch(hex: string) {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255

  // Linearize sRGB
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

  // sRGB to LMS
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188976 * g + 0.6299786405 * b

  // LMS to OKLab
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_

  // OKLab to OKLCH
  const C = Math.sqrt(a * a + b_ * b_)
  const h = Math.atan2(b_, a) * (180 / Math.PI)

  return { l: L, c: C, h: h < 0 ? h + 360 : h }
}

export function oklchToHex(L: number, C: number, h: number) {
  const hRad = h * (Math.PI / 180)
  
  // Gamut mapping: if color is out of gamut, reduce chroma until it fits
  let currentC = C
  let r=0, g=0, b_=0
  
  for (let i = 0; i < 10; i++) {
    const a = currentC * Math.cos(hRad)
    const b = currentC * Math.sin(hRad)

    // OKLab to LMS
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b
    const s_ = L - 0.0894841775 * a - 1.291485548 * b

    const l = l_ * l_ * l_
    const m = m_ * m_ * m_
    const s = s_ * s_ * s_

    // LMS to sRGB
    r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    b_ = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    
    if (r >= -0.001 && r <= 1.001 && g >= -0.001 && g <= 1.001 && b_ >= -0.001 && b_ <= 1.001) {
      break
    }
    currentC *= 0.9
  }

  // Gamma correction
  const f = (n: number) => {
    n = Math.max(0, Math.min(1, n))
    return n > 0.0031308 ? 1.055 * Math.pow(n, 1 / 2.4) - 0.055 : 12.92 * n
  }

  const toHex = (n: number) => Math.round(f(n) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b_)}`
}

/**
 * Calculates perceptual distance (Delta E) in OKLab space.
 */
export function deltaEOKLab(hex1: string, hex2: string): number {
  const c1 = hexToOklch(hex1)
  const c2 = hexToOklch(hex2)
  
  const a1 = c1.c * Math.cos(c1.h * (Math.PI / 180))
  const b1 = c1.c * Math.sin(c1.h * (Math.PI / 180))
  const a2 = c2.c * Math.cos(c2.h * (Math.PI / 180))
  const b2 = c2.c * Math.sin(c2.h * (Math.PI / 180))
  
  return Math.sqrt((c1.l - c2.l) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2)
}

/**
 * Simple 1D Cubic Bezier for interpolation
 */
export function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  return (
    Math.pow(1 - t, 3) * p0 +
    3 * Math.pow(1 - t, 2) * t * p1 +
    3 * (1 - t) * Math.pow(t, 2) * p2 +
    Math.pow(t, 3) * p3
  )
}

/**
 * Bezier interpolation in OKLAB space for smooth gradients.
 */
export function bezierInterpolate(hexStart: string, hexEnd: string, t: number): string {
  const c1 = hexToOklch(hexStart)
  const c2 = hexToOklch(hexEnd)
  
  // Convert to OKLab for linear interpolation
  const a1 = c1.c * Math.cos(c1.h * (Math.PI / 180))
  const b1 = c1.c * Math.sin(c1.h * (Math.PI / 180))
  const a2 = c2.c * Math.cos(c2.h * (Math.PI / 180))
  const b2 = c2.c * Math.sin(c2.h * (Math.PI / 180))

  // Simple linear for now, but we use OKLab which is already better than RGB/HSL
  const L = c1.l + (c2.l - c1.l) * t
  const A = a1 + (a2 - a1) * t
  const B = b1 + (b2 - b1) * t
  
  const C = Math.sqrt(A * A + B * B)
  const h = Math.atan2(B, A) * (180 / Math.PI)
  
  return oklchToHex(L, C, h < 0 ? h + 360 : h)
}

/**
 * Perceptually inverts a theme using OKLCH
 */
export function generatePerceptualPair(scheme: ColorScheme): ColorScheme {
  const isDark = getLuminance(scheme.background) < 0.5
  const newScheme = { ...scheme }

  const mapLightness = (hex: string, targetL: number | ((l: number) => number)) => {
    const { l, c, h } = hexToOklch(hex)
    const nextL = typeof targetL === 'function' ? targetL(l) : targetL
    return oklchToHex(Math.max(0, Math.min(1, nextL)), c, h)
  }

  if (isDark) {
    // Dark -> Light
    newScheme.background = mapLightness(scheme.background, 0.98)
    newScheme.mantle = mapLightness(scheme.mantle, 0.95)
    newScheme.crust = mapLightness(scheme.crust, 0.92)
    newScheme.surface0 = mapLightness(scheme.surface0, 0.88)
    newScheme.surface1 = mapLightness(scheme.surface1, 0.82)
    newScheme.surface2 = mapLightness(scheme.surface2, 0.75)
    newScheme.foreground = mapLightness(scheme.foreground, 0.15)
  } else {
    // Light -> Dark
    newScheme.background = mapLightness(scheme.background, 0.05)
    newScheme.mantle = mapLightness(scheme.mantle, 0.03)
    newScheme.crust = mapLightness(scheme.crust, 0.01)
    newScheme.surface0 = mapLightness(scheme.surface0, 0.12)
    newScheme.surface1 = mapLightness(scheme.surface1, 0.18)
    newScheme.surface2 = mapLightness(scheme.surface2, 0.25)
    newScheme.foreground = mapLightness(scheme.foreground, 0.90)
  }

  const ansiKeys = [
    'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'black',
    'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite', 'brightBlack',
    'primary', 'secondary', 'accent'
  ]

  ansiKeys.forEach(key => {
    const hex = (scheme as any)[key]
    const { c, h } = hexToOklch(hex)
    
    // For ANSI colors, we want to maintain chroma but adjust lightness for readability
    // In light mode, we want L ~ 0.45-0.55
    // In dark mode, we want L ~ 0.65-0.75
    let targetL = isDark ? 0.50 : 0.70
    
    // Special handling for blacks/whites to keep them as shades
    if (key === 'black' || key === 'brightBlack' || key === 'white' || key === 'brightWhite') {
      if (isDark) {
         targetL = key.includes('white') ? 0.2 : 0.8 // Invert shades
      } else {
         targetL = key.includes('white') ? 0.9 : 0.1
      }
    }

    ;(newScheme as any)[key] = oklchToHex(targetL, c, h)
  })

  return newScheme
}

/**
 * Interpolates between two ColorSchemes using HSL blending.
 * t=0 returns schemeA, t=1 returns schemeB.
 */
export function interpolateSchemes(a: ColorScheme, b: ColorScheme, t: number): ColorScheme {
  const lerpHex = (hexA: string, hexB: string) => {
    const hA = hexToHsl(hexA), hB = hexToHsl(hexB)
    // Shortest path hue interpolation
    let dh = hB.h - hA.h
    if (dh > 180) dh -= 360
    if (dh < -180) dh += 360
    const h = (hA.h + dh * t + 360) % 360
    const s = hA.s + (hB.s - hA.s) * t
    const l = hA.l + (hB.l - hA.l) * t
    return hslToHex(h, s, l)
  }
  const result = { ...a }
  for (const key of Object.keys(a) as (keyof ColorScheme)[]) {
    result[key] = lerpHex(a[key], b[key])
  }
  return result
}

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
