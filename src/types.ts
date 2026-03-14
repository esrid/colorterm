export interface ColorScheme {
  foreground: string
  background: string
  // Layered backgrounds
  mantle: string
  crust: string
  surface0: string
  surface1: string
  surface2: string
  // UI Specific
  primary: string
  secondary: string
  accent: string
  
  // Base16 / Base24 Standard Slots
  base00: string; base01: string; base02: string; base03: string;
  base04: string; base05: string; base06: string; base07: string;
  base08: string; base09: string; base0A: string; base0B: string;
  base0C: string; base0D: string; base0E: string; base0F: string;

  cursor: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}
