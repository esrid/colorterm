import type { ColorScheme } from './types'
import type { Terminal } from 'xterm'

export const DEFAULT_SCHEME: ColorScheme = {
  foreground: '#d4d4d4',
  background: '#0d0d0d',
  mantle: '#0a0a0a',
  crust: '#080808',
  surface0: '#141414',
  surface1: '#1f1f1f',
  surface2: '#2a2a2a',
  primary: '#2472c8',
  secondary: '#bc3fbc',
  accent: '#11a8cd',

  // Base16 Mappings
  base00: '#0d0d0d', // Default Background
  base01: '#0a0a0a', // Lighter Background (Mantle)
  base02: '#141414', // Selection Background (Surface0)
  base03: '#666666', // Comments, Invisibles (Bright Black)
  base04: '#888888', // Dark Foreground
  base05: '#d4d4d4', // Default Foreground
  base06: '#e5e5e5', // Light Foreground
  base07: '#ffffff', // Lightest Foreground
  base08: '#cd3131', // Red
  base09: '#e5e510', // Orange (using Yellow)
  base0A: '#f5f543', // Yellow
  base0B: '#0dbc79', // Green
  base0C: '#11a8cd', // Cyan
  base0D: '#2472c8', // Blue
  base0E: '#bc3fbc', // Magenta
  base0F: '#d670d6', // Brown/Vivid (using Bright Magenta)

  cursor: '#ffffff',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
}

export const MONO_FONTS = [
  { name: 'JetBrains Mono', family: "'JetBrains Mono'" },
  { name: 'Fira Code', family: "'Fira Code'" },
  { name: 'Source Code Pro', family: "'Source Code Pro'" },
  { name: 'Roboto Mono', family: "'Roboto Mono'" },
  { name: 'Inconsolata', family: "'Inconsolata'" },
  { name: 'Ubuntu Mono', family: "'Ubuntu Mono'" },
  { name: 'IBM Plex Mono', family: "'IBM Plex Mono'" },
  { name: 'Space Mono', family: "'Space Mono'" },
  { name: 'Courier Prime', family: "'Courier Prime'" },
  { name: 'Anonymous Pro', family: "'Anonymous Pro'" },
  { name: 'Share Tech Mono', family: "'Share Tech Mono'" },
  { name: 'VT323', family: "'VT323'" },
  { name: 'Red Hat Mono', family: "'Red Hat Mono'" },
  { name: 'Martian Mono', family: "'Martian Mono'" },
  { name: 'Azeret Mono', family: "'Azeret Mono'" },
  { name: 'System Mono', family: 'monospace' },
]

export const PREVIEW_CONTENT = {
  react: (term: Terminal) => {
    term.writeln('  \x1b[1mReact Component Preview:\x1b[0m')
    term.writeln("  \x1b[35mimport\x1b[0m React, { \x1b[36museState\x1b[0m } \x1b[35mfrom\x1b[0m \x1b[32m'react'\x1b[0m;")
    term.writeln('  ')
    term.writeln('  \x1b[90m// A simple counter component\x1b[0m')
    term.writeln('  \x1b[34mexport const\x1b[0m \x1b[33mCounter\x1b[0m = ({ \x1b[36minitial\x1b[0m }) => {')
    term.writeln('    \x1b[34mconst\x1b[0m [\x1b[31mcount\x1b[0m, \x1b[36msetCount\x1b[0m] = \x1b[36museState\x1b[0m(\x1b[31minitial\x1b[0m);')
    term.writeln('    ')
    term.writeln('    \x1b[35mreturn\x1b[0m (')
    term.writeln('      \x1b[34m<\x1b[36mdiv\x1b[34m \x1b[33mclassName\x1b[34m=\x1b[32m"container"\x1b[34m>\x1b[0m')
    term.writeln('        \x1b[34m<\x1b[36mh1\x1b[34m>\x1b[0mCount: {\x1b[31mcount\x1b[0m}\x1b[34m</\x1b[36mh1\x1b[34m>\x1b[0m')
    term.writeln('        \x1b[34m<\x1b[36mbutton\x1b[34m \x1b[33monClick\x1b[34m=\x1b[0m{() \x1b[34m=>\x1b[0m \x1b[36msetCount\x1b[0m(c \x1b[34m=>\x1b[0m c + \x1b[31m1\x1b[0m)}>')
    term.writeln('          Increment')
    term.writeln('        \x1b[34m</\x1b[36mbutton\x1b[34m>\x1b[0m')
    term.writeln('      \x1b[34m</\x1b[36mdiv\x1b[34m>\x1b[0m')
    term.writeln('    );')
    term.writeln('  };')
  },
  vim: (term: Terminal) => {
    term.writeln('  \x1b[1mNVIM: main.py\x1b[0m')
    term.writeln('  \x1b[90m 1 \x1b[0m \x1b[35mimport\x1b[0m os')
    term.writeln('  \x1b[90m 2 \x1b[0m \x1b[35mfrom\x1b[0m datetime \x1b[35mimport\x1b[0m datetime')
    term.writeln('  \x1b[90m 3 \x1b[0m ')
    term.writeln('  \x1b[90m 4 \x1b[0m \x1b[34mclass\x1b[0m \x1b[33mThemeGenerator\x1b[0m:')
    term.writeln('  \x1b[90m 5 \x1b[0m     \x1b[34mdef\x1b[0m \x1b[36m__init__\x1b[0m(\x1b[31mself\x1b[0m, name: \x1b[36mstr\x1b[0m):')
    term.writeln('  \x1b[90m 6 \x1b[0m         \x1b[31mself\x1b[0m.name = name')
    term.writeln('  \x1b[90m 7 \x1b[0m         \x1b[31mself\x1b[0m.created_at = datetime.now()')
    term.writeln('  \x1b[90m 8 \x1b[0m ')
    term.writeln('  \x1b[90m 9 \x1b[0m     \x1b[34mdef\x1b[0m \x1b[36mgenerate\x1b[0m(\x1b[31mself\x1b[0m):')
    term.writeln('  \x1b[90m10 \x1b[0m         \x1b[90m# TODO: Implement logic\x1b[0m')
    term.writeln('  \x1b[90m11 \x1b[0m         \x1b[35mreturn\x1b[0m \x1b[32mf"Generating \x1b[31m{\x1b[31mself\x1b[0m.name\x1b[31m}\x1b[32m..."\x1b[0m')
    term.writeln('  \x1b[90m12 \x1b[0m ')
    term.writeln('  \x1b[30;47m NORMAL \x1b[0m \x1b[37;44m main.py \x1b[0m \x1b[37;40m python \x1b[0m \x1b[90m L:11 C:10 \x1b[0m')
  },
  htop: (term: Terminal) => {
    term.writeln('  \x1b[1mHTOP - System Monitor\x1b[0m')
    term.writeln('')
    term.writeln('  CPU[\x1b[32m||||||||||||||||||||||| \x1b[37m45.2%\x1b[0m]  Tasks: \x1b[36m102\x1b[0m, \x1b[36m2\x1b[0m running')
    term.writeln('  Mem[\x1b[34m||||||||||||           \x1b[37m2.4G/16.0G\x1b[0m] Load: \x1b[32m0.15 0.10 0.05\x1b[0m')
    term.writeln('  Swp[\x1b[31m|                      \x1b[37m124M/2.0G\x1b[0m]  Uptime: \x1b[33m2:45:12\x1b[0m')
    term.writeln('')
    term.writeln('  \x1b[30;47m  PID USER      PRI  NI  VIRT   RES   SHR S  CPU% MEM%   TIME+  Command\x1b[0m')
    term.writeln('  \x1b[32m 1420 dev       20   0 1200M  250M   45M S   2.5  1.2  0:12.45 node index.js')
    term.writeln('  \x1b[32m 2105 root      20   0  500M   80M   20M S   0.8  0.5  0:05.12 nginx')
    term.writeln('  \x1b[32m 4512 dev       20   0  800M  120M   35M S   0.2  0.8  0:01.05 htop')
  },
  ls: (term: Terminal) => {
    term.writeln('  \x1b[1mls -la --color=always\x1b[0m')
    term.writeln('  drwxr-xr-x \x1b[34m.\x1b[0m')
    term.writeln('  drwxr-xr-x \x1b[34m..\x1b[0m')
    term.writeln('  -rw-r--r-- \x1b[31m.env\x1b[0m')
    term.writeln('  -rw-r--r-- \x1b[31m.gitignore\x1b[0m')
    term.writeln('  -rw-r--r-- \x1b[32mpackage.json\x1b[0m')
    term.writeln('  -rw-r--r-- \x1b[32mpackage-lock.json\x1b[0m')
    term.writeln('  drwxr-xr-x \x1b[34mpublic\x1b[0m/')
    term.writeln('  -rw-r--r-- README.md')
    term.writeln('  drwxr-xr-x \x1b[34msrc\x1b[0m/')
    term.writeln('  -rwxr-xr-x \x1b[32mscripts/deploy.sh\x1b[0m')
    term.writeln('  lrwxrwxrwx \x1b[36mlatest\x1b[0m -> \x1b[32mv2.0.1\x1b[0m')
  },
  git: (term: Terminal) => {
    term.writeln('  \x1b[1mGit Log Preview:\x1b[0m')
    term.writeln('')
    term.writeln('\x1b[33mcommit 7e2f5b1d4c9a8b0 (HEAD -> \x1b[36mmain\x1b[33m, \x1b[31morigin/main\x1b[33m)\x1b[0m')
    term.writeln('Author: \x1b[32mDeveloper Name <dev@colorterm.app>\x1b[0m')
    term.writeln('Date:   Fri Mar 13 14:32:10 2026 +0200')
    term.writeln('')
    term.writeln('    feat: add color locking and URL persistence')
    term.writeln('')
    term.writeln('\x1b[33mcommit a1b2c3d4e5f6g7h\x1b[0m')
    term.writeln('Author: \x1b[32mDeveloper Name <dev@colorterm.app>\x1b[0m')
    term.writeln('Date:   Thu Mar 12 11:20:05 2026 +0200')
    term.writeln('')
    term.writeln('    fix: syntax highlighting for Alacritty exports')
  },
  neofetch: (term: Terminal) => {
    term.writeln('  \x1b[36m       .---.          \x1b[37muser\x1b[36m@\x1b[37mcolorterm\x1b[0m')
    term.writeln('  \x1b[36m      /     \         \x1b[36m--------------\x1b[0m')
    term.writeln('  \x1b[36m      | () () |        \x1b[36mOS\x1b[0m: ColorTerm OS v1.0')
    term.writeln('  \x1b[36m       \  ^  /         \x1b[36mHost\x1b[0m: Virtual Workstation')
    term.writeln('  \x1b[36m        |||||          \x1b[36mKernel\x1b[0m: 6.8.0-custom')
    term.writeln('  \x1b[36m        |||||          \x1b[36mShell\x1b[0m: bun 1.2')
    term.writeln('  \x1b[36m                       \x1b[36mWM\x1b[0m: Vite')
    term.writeln('                         \x1b[36mTerminal\x1b[0m: xterm.js')
    term.writeln('')
    term.write('  ')
    const colors = [40, 41, 42, 43, 44, 45, 46, 47]
    colors.forEach(c => term.write(`\x1b[${c}m   \x1b[0m`))
    term.writeln('')
  },
  rust: (term: Terminal) => {
    term.writeln('  \x1b[1mRust: main.rs\x1b[0m')
    term.writeln('  \x1b[35mfn\x1b[0m \x1b[34mmain\x1b[0m() {')
    term.writeln('      \x1b[34mlet\x1b[0m \x1b[36mname\x1b[0m = \x1b[32m"ColorTerm"\x1b[0m;')
    term.writeln('      \x1b[35mprintln!\x1b[0m(\x1b[32m"Hello, {}!"\x1b[0m, \x1b[36mname\x1b[0m);')
    term.writeln('      ')
    term.writeln('      \x1b[34mlet\x1b[0m \x1b[36mvec\x1b[0m = \x1b[34mvec!\x1b[0m[\x1b[31m1\x1b[0m, \x1b[31m2\x1b[0m, \x1b[31m3\x1b[0m];')
    term.writeln('      \x1b[35mfor\x1b[0m \x1b[36mi\x1b[0m \x1b[35min\x1b[0m \x1b[36mvec\x1b[0m.iter() {')
    term.writeln('          \x1b[35mprintln!\x1b[0m(\x1b[32m"Value: {}"\x1b[0m, \x1b[36mi\x1b[0m);')
    term.writeln('      }')
    term.writeln('  }')
  },
  go: (term: Terminal) => {
    term.writeln('  \x1b[1mGo: main.go\x1b[0m')
    term.writeln('  \x1b[35mpackage\x1b[0m main')
    term.writeln('  \x1b[35mimport\x1b[0m \x1b[32m"fmt"\x1b[0m')
    term.writeln('  \x1b[34mfunc\x1b[0m \x1b[34mmain\x1b[0m() {')
    term.writeln('      \x1b[36mmsg\x1b[0m := \x1b[32m"Go Preview"\x1b[0m')
    term.writeln('      \x1b[34mfmt\x1b[0m.\x1b[34mPrintln\x1b[0m(\x1b[36mmsg\x1b[0m)')
    term.writeln('  }')
  },
  cpp: (term: Terminal) => {
    term.writeln('  \x1b[1mC++: main.cpp\x1b[0m')
    term.writeln('  \x1b[35m#include\x1b[0m \x1b[32m<iostream>\x1b[0m')
    term.writeln('  \x1b[34mint\x1b[0m \x1b[34mmain\x1b[0m() {')
    term.writeln('      \x1b[34mstd\x1b[0m::\x1b[36mcout\x1b[0m << \x1b[32m"Hello C++"\x1b[0m << \x1b[34mstd\x1b[0m::\x1b[36mendl\x1b[0m;')
    term.writeln('      \x1b[35mreturn\x1b[0m \x1b[31m0\x1b[0m;')
    term.writeln('  }')
  },
  html: (term: Terminal) => {
    term.writeln('  \x1b[1mHTML: index.html\x1b[0m')
    term.writeln('  \x1b[34m<!DOCTYPE html>\x1b[0m')
    term.writeln('  \x1b[34m<html\x1b[0m \x1b[33mlang\x1b[0m=\x1b[32m"en"\x1b[0m\x1b[34m>\x1b[0m')
    term.writeln('    \x1b[34m<head>\x1b[0m')
    term.writeln('      \x1b[34m<title>\x1b[0mColorTerm\x1b[34m</title>\x1b[0m')
    term.writeln('    \x1b[34m</head>\x1b[0m')
    term.writeln('    \x1b[34m<body>\x1b[0m')
    term.writeln('      \x1b[34m<h1\x1b[0m \x1b[33mclass\x1b[0m=\x1b[32m"title"\x1b[0m\x1b[34m>\x1b[0mHello World\x1b[34m</h1>\x1b[0m')
    term.writeln('    \x1b[34m</body>\x1b[0m')
    term.writeln('  \x1b[34m</html>\x1b[0m')
  },
  css: (term: Terminal) => {
    term.writeln('  \x1b[1mCSS: style.css\x1b[0m')
    term.writeln('  \x1b[33m.container\x1b[0m {')
    term.writeln('      \x1b[36mdisplay\x1b[0m: \x1b[32mflex\x1b[0m;')
    term.writeln('      \x1b[36mbackground-color\x1b[0m: \x1b[31m#0d0d0d\x1b[0m;')
    term.writeln('      \x1b[36mborder\x1b[0m: \x1b[31m1px\x1b[0m \x1b[32msolid\x1b[0m \x1b[35mvar\x1b[0m(\x1b[34m--accent\x1b[0m);')
    term.writeln('  }')
  },
  sql: (term: Terminal) => {
    term.writeln('  \x1b[1mSQL Query\x1b[0m')
    term.writeln('  \x1b[35mSELECT\x1b[0m \x1b[36mid\x1b[0m, \x1b[36mname\x1b[0m, \x1b[36mcreated_at\x1b[0m')
    term.writeln('  \x1b[35mFROM\x1b[0m \x1b[33musers\x1b[0m')
    term.writeln('  \x1b[35mWHERE\x1b[0m \x1b[36mstatus\x1b[0m = \x1b[32m\'active\'\x1b[0m')
    term.writeln('  \x1b[35mORDER BY\x1b[0m \x1b[36mcreated_at\x1b[0m \x1b[35mDESC\x1b[0m;')
  },
  markdown: (term: Terminal) => {
    term.writeln('  \x1b[1mMarkdown: README.md\x1b[0m')
    term.writeln('  \x1b[34m# ColorTerm\x1b[0m')
    term.writeln('  Interactive terminal theme generator.')
    term.writeln('  ')
    term.writeln('  \x1b[35m## Features\x1b[0m')
    term.writeln('  - \x1b[32m**Accessible**\x1b[0m: WCAG AA/AAA')
    term.writeln('  - \x1b[34m*Fast*\x1b[0m: Instant preview')
    term.writeln('  ')
    term.writeln('  \x1b[90m> Generate themes instantly.\x1b[0m')
  },
  json: (term: Terminal) => {
    term.writeln('  \x1b[1mJSON Data\x1b[0m')
    term.writeln('  {')
    term.writeln('    \x1b[34m"name"\x1b[0m: \x1b[32m"ColorTerm"\x1b[0m,')
    term.writeln('    \x1b[34m"version"\x1b[0m: \x1b[31m"1.2.0"\x1b[0m,')
    term.writeln('    \x1b[34m"is_open_source"\x1b[0m: \x1b[35mtrue\x1b[0m,')
    term.writeln('    \x1b[34m"tags"\x1b[0m: [\x1b[32m"terminal"\x1b[0m, \x1b[32m"themes"\x1b[0m]')
    term.writeln('  }')
  }
}

export const PRESETS: Record<string, Partial<ColorScheme>> = {
  gruvbox: {
    background: '#282828',
    foreground: '#ebdbb2',
    cursor: '#ebdbb2',
    black: '#282828',
    red: '#cc241d',
    green: '#98971a',
    yellow: '#d79921',
    blue: '#458588',
    magenta: '#b16286',
    cyan: '#689d6a',
    white: '#a89984',
    brightBlack: '#928374',
    brightRed: '#fb4934',
    brightGreen: '#b8bb26',
    brightYellow: '#fabd2f',
    brightBlue: '#83a598',
    brightMagenta: '#d3869b',
    brightCyan: '#8ec07c',
    brightWhite: '#ebdbb2',
  },
  nord: {
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#d8dee9',
    black: '#3b4252',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#e5e9f0',
    brightBlack: '#4c566a',
    brightRed: '#bf616a',
    brightGreen: '#a3be8c',
    brightYellow: '#ebcb8b',
    brightBlue: '#81a1c1',
    brightMagenta: '#b48ead',
    brightCyan: '#8fbcbb',
    brightWhite: '#eceff4',
  },
  catppuccin: {
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    cursor: '#f5e0dc',
    black: '#45475a',
    red: '#f38ba8',
    green: '#a6e3a1',
    yellow: '#f9e2af',
    blue: '#89b4fa',
    magenta: '#f5c2e7',
    cyan: '#94e2d5',
    white: '#bac2de',
    brightBlack: '#585b70',
    brightRed: '#f38ba8',
    brightGreen: '#a6e3a1',
    brightYellow: '#f9e2af',
    brightBlue: '#89b4fa',
    brightMagenta: '#f5c2e7',
    brightCyan: '#94e2d5',
    brightWhite: '#a6adc8',
  },
  solarizedDark: {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#93a1a1',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#002b36',
    brightRed: '#cb4b16',
    brightGreen: '#586e75',
    brightYellow: '#657b83',
    brightBlue: '#839496',
    brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1',
    brightWhite: '#fdf6e3',
  },
  tokyoNight: {
    background: '#1a1b26',
    foreground: '#a9b1d6',
    cursor: '#c0caf5',
    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5',
  },
  synthwave: {
    background: '#241b2f',
    foreground: '#ebeade',
    cursor: '#f07178',
    black: '#241b2f',
    red: '#f07178',
    green: '#20e3b2',
    yellow: '#ffae57',
    blue: '#2de2e2',
    magenta: '#ff4499',
    cyan: '#2de2e2',
    white: '#f1eff7',
    brightBlack: '#493e59',
    brightRed: '#f07178',
    brightGreen: '#20e3b2',
    brightYellow: '#ffae57',
    brightBlue: '#2de2e2',
    brightMagenta: '#ff4499',
    brightCyan: '#2de2e2',
    brightWhite: '#f1eff7',
  },
  monokai: {
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#f4bf75',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2',
    brightBlack: '#75715e',
    brightRed: '#f92672',
    brightGreen: '#a6e22e',
    brightYellow: '#f4bf75',
    brightBlue: '#66d9ef',
    brightMagenta: '#ae81ff',
    brightCyan: '#a1efe4',
    brightWhite: '#f9f8f5',
  }
}
