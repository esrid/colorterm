import type { ColorScheme } from './types'

export function parseThemeFromString(input: string): Partial<ColorScheme> | null {
  // Support for share URLs (extract hash if pasted as full link)
  if (input.includes('#') && input.length > 50) {
    const hashPart = input.split('#')[1].split('?')[0].split('/')[0]
    if (hashPart.length >= 114) {
      const keys = ['background', 'foreground', 'cursor', 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite', 'mantle', 'crust', 'surface0', 'surface1', 'surface2', 'primary', 'secondary', 'accent']
      const urlScheme: any = {}
      let valid = false
      for (let i = 0; i < keys.length; i++) {
        const hex = hashPart.slice(i * 6, (i + 1) * 6)
        if (hex && /^[0-9a-fA-F]{6}$/.test(hex)) {
          urlScheme[keys[i]] = '#' + hex
          valid = true
        }
      }
      if (valid) return urlScheme
    }
  }

  const scheme: Partial<ColorScheme> = {}

  // Try parsing as JSON first
  try {
    const json = JSON.parse(input)
    if (json && typeof json === 'object') {
      // Check for xterm.js or VS Code formats
      if (json.background || json["terminal.background"]) {
        return {
          background: json.background || json["terminal.background"],
          foreground: json.foreground || json["terminal.foreground"],
          cursor: json.cursor || json["terminal.cursorForeground"],
          black: json.black || json["terminal.ansiBlack"],
          red: json.red || json["terminal.ansiRed"],
          green: json.green || json["terminal.ansiGreen"],
          yellow: json.yellow || json["terminal.ansiYellow"],
          blue: json.blue || json["terminal.ansiBlue"],
          magenta: json.magenta || json["terminal.ansiMagenta"],
          cyan: json.cyan || json["terminal.ansiCyan"],
          white: json.white || json["terminal.ansiWhite"],
          brightBlack: json.brightBlack || json["terminal.ansiBrightBlack"],
          brightRed: json.brightRed || json["terminal.ansiBrightRed"],
          brightGreen: json.brightGreen || json["terminal.ansiBrightGreen"],
          brightYellow: json.brightYellow || json["terminal.ansiBrightYellow"],
          brightBlue: json.brightBlue || json["terminal.ansiBrightBlue"],
          brightMagenta: json.brightMagenta || json["terminal.ansiBrightMagenta"],
          brightCyan: json.brightCyan || json["terminal.ansiBrightCyan"],
          brightWhite: json.brightWhite || json["terminal.ansiBrightWhite"],
        }
      }
    }
  } catch (e) {
    // Not JSON, continue to other formats
  }

  // Helper to normalize hex to 6-digits
  const normalizeHex = (hex: string) => {
    hex = hex.trim().replace(/^#/, '')
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('')
    }
    return /^[0-9a-fA-F]{6}$/.test(hex) ? '#' + hex.toLowerCase() : '#' + hex
  }

  const rgbToHex = (r: string, g: string, b: string) => {
    const toHex = (n: number) => {
      const hex = Math.max(0, Math.min(255, n)).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    return '#' + toHex(parseInt(r)) + toHex(parseInt(g)) + toHex(parseInt(b))
  }

  // Generic key-value parser (INI, TOML, Xresources, CSS vars)
  const lines = input.split('\n')
  let currentSection = ''

  lines.forEach(line => {
    line = line.trim()
    if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith('!')) return

    const sectionMatch = line.match(/^\[(.*)\]$/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      return
    }

    // Handle Konsole (.colorscheme) and KDE Plasma (.colors)
    if (line.includes(',')) {
      const parts = line.split('=')
      if (parts.length === 2) {
        const key = parts[0].trim()
        const rgb = parts[1].split(',')
        if (rgb.length >= 3) {
          const hex = rgbToHex(rgb[0], rgb[1], rgb[2])
          
          // Konsole
          if (key === 'Color') {
            if (currentSection === 'Background') scheme.background = hex
            else if (currentSection === 'Foreground') scheme.foreground = hex
            else if (currentSection === 'Cursor') scheme.cursor = hex
            else if (currentSection === 'Color0') scheme.black = hex
            else if (currentSection === 'Color1') scheme.red = hex
            else if (currentSection === 'Color2') scheme.green = hex
            else if (currentSection === 'Color3') scheme.yellow = hex
            else if (currentSection === 'Color4') scheme.blue = hex
            else if (currentSection === 'Color5') scheme.magenta = hex
            else if (currentSection === 'Color6') scheme.cyan = hex
            else if (currentSection === 'Color7') scheme.white = hex
            else if (currentSection === 'Color0Intense') scheme.brightBlack = hex
            else if (currentSection === 'Color1Intense') scheme.brightRed = hex
            else if (currentSection === 'Color2Intense') scheme.brightGreen = hex
            else if (currentSection === 'Color3Intense') scheme.brightYellow = hex
            else if (currentSection === 'Color4Intense') scheme.brightBlue = hex
            else if (currentSection === 'Color5Intense') scheme.brightMagenta = hex
            else if (currentSection === 'Color6Intense') scheme.brightCyan = hex
            else if (currentSection === 'Color7Intense') scheme.brightWhite = hex
          }
          
          // KDE Plasma
          if (currentSection === 'Colors:Window') {
            if (key === 'BackgroundNormal') scheme.background = hex
            if (key === 'ForegroundNormal') scheme.foreground = hex
          } else if (currentSection === 'Colors:Selection') {
            if (key === 'BackgroundNormal') scheme.surface1 = hex
          }
        }
      }
    }

    // Support for .Xresources (*.color0: hex) and CSS (--bg: hex)
    // Updated regex to handle the '.' or '*' in Xresources and '--' in CSS
    const match = line.match(/^[*.-]*([\w.-]+)\s*[=:\s]\s*['"]?([^'"]+)['"]?/)
    if (!match) return

    const key = match[1].toLowerCase().replace(/-/g, '_')
    const val = normalizeHex(match[2].replace(/[;,]$/, ''))

    // Kitty / Ghostty / Foot / Generic
    if (key === 'background' || key === 'background_color') scheme.background = val
    if (key === 'foreground' || key === 'foreground_color') scheme.foreground = val
    if (key === 'cursor' || key === 'cursor_color' || key === 'cursor_bg' || key === 'cursorforeground' || key === 'cursor_fg') scheme.cursor = val
    
    // ANSI normal
    if (key === 'color0' || key === 'palette_0' || key === 'black' || key === 'ansiblack') scheme.black = val
    if (key === 'color1' || key === 'palette_1' || key === 'red' || key === 'ansired') scheme.red = val
    if (key === 'color2' || key === 'palette_2' || key === 'green' || key === 'ansigreen') scheme.green = val
    if (key === 'color3' || key === 'palette_3' || key === 'yellow' || key === 'ansiyellow') scheme.yellow = val
    if (key === 'color4' || key === 'palette_4' || key === 'blue' || key === 'ansiblue') scheme.blue = val
    if (key === 'color5' || key === 'palette_5' || key === 'magenta' || key === 'ansimagenta') scheme.magenta = val
    if (key === 'color6' || key === 'palette_6' || key === 'cyan' || key === 'ansicyan') scheme.cyan = val
    if (key === 'color7' || key === 'palette_7' || key === 'white' || key === 'ansiwhite') scheme.white = val

    // ANSI bright
    if (key === 'color8' || key === 'palette_8' || key === 'brightblack' || key === 'ansibrightblack') scheme.brightBlack = val
    if (key === 'color9' || key === 'palette_9' || key === 'brightred' || key === 'ansibrightred') scheme.brightRed = val
    if (key === 'color10' || key === 'palette_10' || key === 'brightgreen' || key === 'ansibrightgreen') scheme.brightGreen = val
    if (key === 'color11' || key === 'palette_11' || key === 'brightyellow' || key === 'ansibrightyellow') scheme.brightYellow = val
    if (key === 'color12' || key === 'palette_12' || key === 'brightblue' || key === 'ansibrightblue') scheme.brightBlue = val
    if (key === 'color13' || key === 'palette_13' || key === 'brightmagenta' || key === 'ansibrightmagenta') scheme.brightMagenta = val
    if (key === 'color14' || key === 'palette_14' || key === 'brightcyan' || key === 'ansibrightcyan') scheme.brightCyan = val
    if (key === 'color15' || key === 'palette_15' || key === 'brightwhite' || key === 'ansibrightwhite') scheme.brightWhite = val

    // Alacritty specific [colors.normal] / [colors.bright]
    // Note: Simple parser might need more logic for nested TOML, but let's try basic first
  })

  // Basic validation - check if we got at least background and foreground
  if (scheme.background && scheme.foreground) {
    return scheme
  }

  return null
}
