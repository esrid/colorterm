import './style.css'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import lua from 'highlight.js/lib/languages/lua'
import ini from 'highlight.js/lib/languages/ini'
import yaml from 'highlight.js/lib/languages/yaml'

import type { ColorScheme } from './types'
import { DEFAULT_SCHEME, MONO_FONTS, PREVIEW_CONTENT, PRESETS } from './constants'
import { getLuminance, getContrast, fixContrast, extractPaletteFromImage, adjustTheme } from './colorUtils'
import { generateColorSchemeExport, generateSettingsExport } from './exportEngine'
import { parseThemeFromString } from './importEngine'
import { generateCoherentTheme } from './themeGenerator'
import JSZip from 'jszip'

// Register HLJS languages
hljs.registerLanguage('json', json)
hljs.registerLanguage('lua', lua)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('yaml', yaml)

// Import Fonts Locally
import "@fontsource/inter/400.css"
import "@fontsource/inter/600.css"
import "@fontsource/jetbrains-mono/400.css"
import "@fontsource/jetbrains-mono/700.css"

let currentScheme: ColorScheme = { ...DEFAULT_SCHEME }
const lockedColors = new Set<string>()
const loadedFonts = new Set<string>(['JetBrains Mono', 'System Mono', 'monospace'])

// History stack
const historyStack: ColorScheme[] = []
const redoStack: ColorScheme[] = []

function pushToHistory() {
  historyStack.push({ ...currentScheme })
  redoStack.length = 0 // Clear redo stack on new action
  if (historyStack.length > 50) historyStack.shift() // Limit history
}

function undo() {
  if (historyStack.length === 0) return
  redoStack.push({ ...currentScheme })
  currentScheme = historyStack.pop()!
  applyScheme()
}

function redo() {
  if (redoStack.length === 0) return
  historyStack.push({ ...currentScheme })
  currentScheme = redoStack.pop()!
  applyScheme()
}

function applyScheme() {
  Object.keys(currentScheme).forEach((key) => {
    const input = document.getElementById(key) as HTMLInputElement
    if (input) input.value = (currentScheme as any)[key]
  })
  updateTerminalTheme()
}

const COLOR_KEYS = ['background', 'foreground', 'cursor', 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite', 'mantle', 'crust', 'surface0', 'surface1', 'surface2', 'primary', 'secondary', 'accent']

function syncSchemeToUrl() {
  const hexValues = COLOR_KEYS.map(key => (currentScheme as any)[key].replace('#', ''))
  const hash = hexValues.join('')
  window.history.replaceState(null, '', '#' + hash)
}

function loadSchemeFromUrl() {
  const hash = window.location.hash.slice(1)
  if (!hash || hash.length < 114) return null // At least basic 19 colors
  
  const scheme: any = { ...DEFAULT_SCHEME }
  let hasValidData = false
  
  try {
    COLOR_KEYS.forEach((key, i) => {
      const hex = hash.slice(i * 6, (i + 1) * 6)
      if (hex && /^[0-9a-fA-F]{6}$/.test(hex)) {
        scheme[key] = '#' + hex
        hasValidData = true
      }
    })
  } catch (e) { return null }
  
  return hasValidData ? scheme : null
}

const savedScheme = loadSchemeFromUrl()
if (savedScheme) currentScheme = savedScheme

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
<aside>
  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
    <div>
      <h1>ColorTerm</h1>
      <p class="subtitle">Interactive terminal theme generator</p>
    </div>
    <button id="theme-switcher" class="theme-toggle" title="Toggle Light/Dark Mode">
      <span class="theme-icon">🌙</span>
    </button>
  </div>
  
  <div class="card">
    <h3>Terminal Config</h3>
    <div class="control-group">
      <select id="term-font">
        ${MONO_FONTS.map(f => `<option value="${f.family}">${f.name}</option>`).join('')}
      </select>
      <input type="text" id="custom-font" placeholder="Load Google Font (e.g. Victor Mono)" title="Type a Google Font name and press Enter">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <input type="number" id="term-size" value="13" min="8" max="24" title="Size">
        <input type="number" id="term-line-height" value="1.2" step="0.1" min="1" max="2" title="Line Height">
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <label style="font-size: 0.65rem; color: var(--text-muted); min-width: 45px;">Opacity</label>
        <input type="range" id="term-opacity" value="1" min="0.1" max="1" step="0.01" style="flex: 1;">
      </div>
      <input type="number" id="term-letter-spacing" value="0" step="0.5" min="-2" max="5" title="Letter Spacing">
      
      <div style="margin-top: 8px; border-top: 1px solid var(--border-card); padding-top: 8px;">
        <input type="file" id="wallpaper-upload" accept="image/*" style="display: none;">
        <button id="trigger-wallpaper" class="randomize-btn" style="background: var(--bg-sidebar); border: 1px solid var(--border-input); color: var(--text-main); font-size: 0.7rem;">🖼️ Set Custom Wallpaper</button>
      </div>
    </div>
  </div>

  <div class="card">
    <h3>Generator & Presets</h3>
    <div class="control-group">
      <select id="theme-presets">
        <option value="">-- Built-in Presets --</option>
        ${Object.keys(PRESETS).map(id => `<option value="${id}">${id.charAt(0).toUpperCase() + id.slice(1).replace(/([A-Z])/g, ' $1')}</option>`).join('')}
      </select>
      <button id="randomize" class="randomize-btn">Generate Theme</button>
      
      <div style="margin-top: 12px; border-top: 1px solid var(--border-card); padding-top: 12px;">
        <div class="control-group">
          <input type="file" id="image-upload" accept="image/*" style="display: none;">
          <button id="trigger-image" class="randomize-btn" style="background: var(--bg-sidebar); border: 1px solid var(--border-input); color: var(--text-main); font-size: 0.7rem;">🎨 Image to Theme</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
        <button id="undo-btn" class="randomize-btn" style="background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-main);" title="Undo (Ctrl+Z)">↩ Undo</button>
        <button id="redo-btn" class="randomize-btn" style="background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-main);" title="Redo (Ctrl+Y)">↪ Redo</button>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <button id="share-link" class="randomize-btn" style="background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-main);">Share Theme</button>
        <button id="import-btn" class="randomize-btn" style="background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-main);">Import JSON</button>
      </div>
      <div id="import-area" style="display: none; margin-top: 12px; border-top: 1px solid var(--border-card); padding-top: 12px;">
        <textarea id="import-json" placeholder="Paste terminal config here (JSON, Kitty, Ghostty, Alacritty...)" style="width: 100%; height: 100px; font-family: monospace; font-size: 0.6rem; padding: 8px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-input); border-radius: 4px; resize: vertical;"></textarea>
        <button id="import-apply" class="randomize-btn" style="margin-top: 8px; font-size: 0.7rem;">Apply Theme</button>
      </div>
    </div>
  </div>  

    <div class="card">
    <h3>My Saved Themes</h3>
    <div id="local-themes" style="display: flex; flex-direction: column; gap: 8px;">
      <!-- Populated by JS -->
    </div>
    <button id="save-local" class="randomize-btn" style="margin-top: 12px; font-size: 0.7rem; background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-main);">Save Current Theme</button>
  </div>

  <div class="card">
    <h3>Vision Simulator</h3>
    <select id="vision-mode">
      <option value="none">Normal Vision</option>
      <option value="protanopia">Protanopia (Red-Blind)</option>
      <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
      <option value="tritanopia">Tritanopia (Blue-Blind)</option>
      <option value="achromatopsia">Achromatopsia (No Color)</option>
    </select>
  </div>

  <div class="card">
    <h3>Global Adjustments</h3>
    <div class="control-group">
      <div style="display: flex; align-items: center; gap: 8px;">
        <label style="font-size: 0.65rem; color: var(--text-muted); min-width: 65px;">Hue Shift</label>
        <input type="range" id="adjust-hue" value="0" min="-180" max="180" step="1" style="flex: 1;">
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <label style="font-size: 0.65rem; color: var(--text-muted); min-width: 65px;">Saturation</label>
        <input type="range" id="adjust-sat" value="1" min="0" max="2" step="0.05" style="flex: 1;">
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <label style="font-size: 0.65rem; color: var(--text-muted); min-width: 65px;">Brightness</label>
        <input type="range" id="adjust-bri" value="1" min="0.5" max="1.5" step="0.05" style="flex: 1;">
      </div>
    </div>
  </div>

  <div class="card">
    <h3>Community Favorites</h3>
    <input type="text" id="gallery-search" placeholder="Search themes..." style="font-size: 0.65rem; margin-bottom: 12px;">
    <div id="community-gallery" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
      <!-- Populated by JS -->
    </div>
  </div>

  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
      <h3 style="margin: 0;">Core Palette</h3>
      <span id="contrast-badge" style="font-size: 0.65rem; font-family: var(--font-mono); font-weight: 700;">-</span>
    </div>
    <div class="control-group">
      <div class="color-row">
        <div class="color-item">
          <label>BG</label>
          <input type="color" id="background" value="${currentScheme.background}">
          <button class="lock-btn" id="lock-background" data-id="background">🔓</button>
        </div>
        <div class="color-item">
          <label>FG</label>
          <input type="color" id="foreground" value="${currentScheme.foreground}">
          <button class="lock-btn" id="lock-foreground" data-id="foreground">🔓</button>
        </div>
        <div class="color-item">
          <label>Cursor</label>
          <input type="color" id="cursor" value="${currentScheme.cursor}">
          <button class="lock-btn" id="lock-cursor" data-id="cursor">🔓</button>
        </div>
      </div>
      <div id="contrast-grid" class="contrast-grid"></div>
      <div style="display: flex; gap: 8px; margin-top: 12px; align-items: center;">
        <select id="target-contrast" style="flex: 1; font-size: 0.7rem;">
          <option value="4.5">AA (4.5:1)</option>
          <option value="7.0">AAA (7.0:1)</option>
          <option value="3.0">Loose (3.0:1)</option>
        </select>
        <button id="fix-contrast" class="randomize-btn" style="flex: 2; background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-main); font-size: 0.7rem;">Auto-Fix Contrast</button>
      </div>
    </div>
  </div>

  <div class="card">
    <h3>UI & Layers</h3>
    <div class="control-group">
      <div class="grid-8">
        ${['mantle', 'crust', 'surface0', 'surface1', 'surface2', 'primary', 'secondary', 'accent']
          .map(c => `<div class="color-item">
            <input type="color" id="${c}" value="${(currentScheme as any)[c]}" title="${c}">
            <button class="lock-btn" id="lock-${c}" data-id="${c}">🔓</button>
          </div>`)
          .join('')}
      </div>
    </div>
  </div>

  <div class="card">
    <h3>ANSI Colors</h3>
    <div class="control-group">
      <div class="grid-8">
        ${['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
          .map(c => `<div class="color-item">
            <input type="color" id="${c}" value="${(currentScheme as any)[c]}" title="${c}">
            <button class="lock-btn" id="lock-${c}" data-id="${c}">🔓</button>
          </div>`)
          .join('')}
      </div>
      <div class="grid-8">
        ${['brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite']
          .map(c => `<div class="color-item">
            <input type="color" id="${c}" value="${(currentScheme as any)[c]}" title="${c}">
            <button class="lock-btn" id="lock-${c}" data-id="${c}">🔓</button>
          </div>`)
          .join('')}
      </div>
    </div>
  </div>
</aside>

<main>
  <div style="display: flex; justify-content: flex-end; margin-bottom: 12px; gap: 8px;">
    <select id="preview-mode" style="width: auto; padding: 4px 12px;">
      <option value="react">Preview: React Code</option>
      <option value="rust">Preview: Rust</option>
      <option value="go">Preview: Go</option>
      <option value="cpp">Preview: C++</option>
      <option value="html">Preview: HTML</option>
      <option value="css">Preview: CSS</option>
      <option value="sql">Preview: SQL</option>
      <option value="markdown">Preview: Markdown</option>
      <option value="json">Preview: JSON</option>
      <option value="vim">Preview: Vim (Python)</option>
      <option value="htop">Preview: htop</option>
      <option value="ls">Preview: ls -la</option>
      <option value="git">Preview: git log</option>
      <option value="neofetch">Preview: neofetch</option>
    </select>
  </div>
  <div class="terminal-container" id="terminal"></div>
  
  <div style="margin-top: 24px;">
    <h3>Instant Variants</h3>
    <div id="variants-grid" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px;">
      <!-- Populated by JS -->
    </div>
  </div>
  
  <p style="font-size: 0.7rem; opacity: 0.4; text-align: center; margin-top: 12px; font-family: 'JetBrains Mono', monospace;">Type 'ls', 'help', or 'clear'</p>
</main>

<aside class="export-sidebar">
  <div class="export-area">
    <h3>Export Format</h3>
    <select id="export-format">
      <option value="ghostty">Ghostty</option>
      <option value="xterm">xterm.js (JSON)</option>
      <option value="vscode">VS Code Terminal</option>
      <option value="warp">Warp</option>
      <option value="neovim">Neovim (Lua)</option>
      <option value="helix">Helix (TOML)</option>
      <option value="zellij">Zellij (KDL)</option>
      <option value="tmux">Tmux (.conf)</option>
      <option value="nix">Nix (Home Manager)</option>
      <option value="tailwind">Tailwind CSS</option>
      <option value="css">CSS Variables</option>
      <option value="base16">Base16 (YAML)</option>
      <option value="iterm2">iTerm2 (.itermcolors)</option>
      <option value="wezterm">Wezterm (Lua)</option>
      <option value="kitty">Kitty</option>
      <option value="alacritty">Alacritty (TOML)</option>
      <option value="windowsterminal">Windows Terminal (JSON)</option>
      <option value="foot">Foot (INI)</option>
    </select>
    
    <h3 style="margin-top: 24px;">Color Scheme</h3>
    <pre><code id="export-output"></code></pre>
    <button id="copy-export" class="randomize-btn">Copy Palette</button>

    <h3 style="margin-top: 24px;">Terminal Settings</h3>
    <pre><code id="export-settings"></code></pre>
    <button id="copy-settings" class="randomize-btn" style="background: #141414; border: 1px solid #2a2a2a; color: #ccc;">Copy Settings</button>

    <div style="margin-top: auto; padding-top: 24px; display: flex; flex-direction: column; gap: 8px;">
      <button id="batch-export" class="randomize-btn" style="background: var(--accent); font-size: 0.7rem;">📦 Batch Export (.zip)</button>
    </div>
  </div>
</aside>
`

// Populate Community Gallery
const gallery = document.getElementById('community-gallery')!
const featured = ['synthwave', 'nord', 'gruvbox', 'tokyoNight', 'catppuccin', 'monokai', 'solarizedDark']

function loadLocalThemes() {
  const container = document.getElementById('local-themes')!
  const saved = JSON.parse(localStorage.getItem('my-themes') || '[]')
  
  if (saved.length === 0) {
    container.innerHTML = '<p style="font-size: 0.65rem; color: var(--text-muted); opacity: 0.5;">No themes saved yet</p>'
    return
  }

  container.innerHTML = saved.map((t: any, i: number) => `
    <div class="local-theme-row" style="display: flex; gap: 8px; align-items: center;">
      <div class="gallery-item" data-idx="${i}" style="flex: 1; display: flex; align-items: center; gap: 8px;">
        <div style="background: ${t.scheme.background}; width: 30px; height: 16px; border-radius: 4px; border: 1px solid var(--border-card);"></div>
        <span style="font-size: 0.65rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.name}</span>
      </div>
      <button class="delete-local" data-idx="${i}" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.7rem;">✕</button>
    </div>
  `).join('')

  container.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-idx')!)
      pushToHistory()
      currentScheme = { ...saved[idx].scheme }
      applyScheme()
    })
  })

  container.querySelectorAll('.delete-local').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt((e.currentTarget as HTMLButtonElement).getAttribute('data-idx')!)
      const current = JSON.parse(localStorage.getItem('my-themes') || '[]')
      current.splice(idx, 1)
      localStorage.setItem('my-themes', JSON.stringify(current))
      loadLocalThemes()
    })
  })
}

gallery.innerHTML = featured.map(id => {
  const p = PRESETS[id]
  return `
    <div class="gallery-item" data-id="${id}" title="${id}">
      <div style="background: ${p.background}; width: 100%; height: 20px; border-radius: 4px; display: grid; grid-template-columns: repeat(4, 1fr); overflow: hidden; border: 1px solid var(--border-card);">
        <div style="background: ${p.red}"></div>
        <div style="background: ${p.green}"></div>
        <div style="background: ${p.blue}"></div>
        <div style="background: ${p.magenta}"></div>
      </div>
    </div>
  `
}).join('')

gallery.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', () => {
    const id = item.getAttribute('data-id')!
    pushToHistory()
    currentScheme = { ...currentScheme, ...PRESETS[id] }
    applyScheme()
  })
})

const term = new Terminal({
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 13,
  lineHeight: 1.2,
  allowTransparency: true,
  cursorBlink: true,
})

const fitAddon = new FitAddon()
term.loadAddon(fitAddon)
term.open(document.getElementById('terminal')!)
fitAddon.fit()

let currentLine = ''
term.onData(e => {
  switch (e) {
    case '\r': // Enter
      const cmd = currentLine.trim().toLowerCase()
      term.write('\r\n')
      if (cmd === 'ls') (PREVIEW_CONTENT as any).ls(term)
      else if (cmd === 'help') term.writeln('  Available commands: ls, git, htop, neofetch, clear')
      else if (cmd === 'git') (PREVIEW_CONTENT as any).git(term)
      else if (cmd === 'htop') (PREVIEW_CONTENT as any).htop(term)
      else if (cmd === 'neofetch') (PREVIEW_CONTENT as any).neofetch(term)
      else if (cmd === 'clear') term.clear()
      else if (cmd) term.writeln(`  command not found: ${cmd}`)
      
      term.write('\r\n\x1b[36muser@colorterm\x1b[0m:\x1b[34m~\x1b[0m$ ')
      currentLine = ''
      break
    case '\u007F': // Backspace
      if (currentLine.length > 0) {
        currentLine = currentLine.slice(0, -1)
        term.write('\b \b')
      }
      break
    default:
      if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7B)) {
        currentLine += e
        term.write(e)
      }
  }
})

function loadGoogleFont(fontName: string) {
  if (!fontName || loadedFonts.has(fontName)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css?family=${fontName.replace(/ /g, '+')}:400,700&display=swap`
  link.onload = () => {
    if (document.fonts) {
      document.fonts.load(`13px '${fontName}'`).then(() => {
        requestAnimationFrame(() => {
          fitAddon.fit()
          term.refresh(0, term.rows - 1)
        })
      })
    }
  }
  document.head.appendChild(link)
  loadedFonts.add(fontName)
}

MONO_FONTS.forEach(f => {
  if (f.name !== 'JetBrains Mono' && f.family !== 'monospace') loadGoogleFont(f.name)
})

function updateTerminalContainerBackground() {
  const container = document.getElementById('terminal')!
  const opacity = (document.getElementById('term-opacity') as HTMLInputElement).value
  const bg = currentScheme.background
  const r = parseInt(bg.slice(1, 3), 16), g = parseInt(bg.slice(3, 5), 16), b = parseInt(bg.slice(5, 7), 16)
  container.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function updateVariants() {
  const container = document.getElementById('variants-grid')!
  const variants = [
    { name: 'Default', fn: (s: ColorScheme) => s },
    { name: 'Deep', fn: (s: ColorScheme) => adjustTheme(s, 0, 1.0, 0.6) },
    { name: 'Vibrant', fn: (s: ColorScheme) => adjustTheme(s, 0, 1.5, 1.0) },
    { name: 'Muted', fn: (s: ColorScheme) => adjustTheme(s, 0, 0.6, 1.0) },
    { name: 'Contrast', fn: (s: ColorScheme) => adjustTheme(s, 0, 1.0, 1.2) },
    { name: 'Soft', fn: (s: ColorScheme) => adjustTheme(s, 0, 0.8, 0.8) },
  ]
  
  container.innerHTML = variants.map((v, i) => {
    const s = v.fn(currentScheme)
    return `
      <div class="variant-item" data-idx="${i}" style="cursor: pointer; background: ${s.background}; border: 1px solid var(--border-card); border-radius: 6px; padding: 12px; transition: transform 0.1s;">
        <div style="font-size: 0.6rem; color: ${s.foreground}; text-align: center; font-weight: 600; margin-bottom: 8px;">${v.name}</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;">
          <div style="background: ${s.red}; aspect-ratio: 1; border-radius: 2px;"></div>
          <div style="background: ${s.green}; aspect-ratio: 1; border-radius: 2px;"></div>
          <div style="background: ${s.blue}; aspect-ratio: 1; border-radius: 2px;"></div>
          <div style="background: ${s.magenta}; aspect-ratio: 1; border-radius: 2px;"></div>
        </div>
      </div>
    `
  }).join('')
  
  container.querySelectorAll('.variant-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-idx')!)
      pushToHistory()
      currentScheme = variants[idx].fn(currentScheme)
      applyScheme()
    })
  })
}

function updateTerminalTheme() {
  // Update CSS variables for Highlight.js and other dynamic UI elements
  Object.entries(currentScheme).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--term-${key}`, value)
  })

  updateTerminalContainerBackground()
  term.options.theme = { ...currentScheme }
  
  const ratio = getContrast(currentScheme.background, currentScheme.foreground)
  const badge = document.getElementById('contrast-badge')!
  let status = 'Fail', color = '#ff4c4c'
  if (ratio >= 7) { status = 'AAA'; color = '#23d18b' }
  else if (ratio >= 4.5) { status = 'AA'; color = '#23d18b' }
  else if (ratio >= 3) { status = 'Large'; color = '#f5f543' }
  badge.textContent = `${ratio.toFixed(2)}:1 (${status})`
  badge.style.color = color

  const heatmap = document.getElementById('contrast-grid')!
  const ansiColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite']
  heatmap.innerHTML = ansiColors.map(c => {
    const col = (currentScheme as any)[c]
    const r = getContrast(currentScheme.background, col)
    const pass = r >= 4.5, largePass = r >= 3, icon = pass ? '✓' : (largePass ? '○' : '✕')
    return `<div class="contrast-box" style="background: ${col}; color: ${getLuminance(col) > 0.5 ? '#000' : '#fff'}" title="${c}: ${r.toFixed(2)}:1" data-id="${c}">${icon}</div>`
  }).join('')

  // Add heatmap interaction
  heatmap.querySelectorAll('.contrast-box').forEach(box => {
    box.addEventListener('click', () => {
      const id = box.getAttribute('data-id')!
      const input = document.getElementById(id) as HTMLInputElement
      input.click()
    })
  })

  const format = (document.getElementById('export-format') as HTMLSelectElement).value
  const outputEl = document.getElementById('export-output')!, settingsEl = document.getElementById('export-settings')!
  let lang = (format === 'neovim' || format === 'wezterm') ? 'lua' : (['ghostty', 'kitty', 'foot', 'alacritty'].includes(format) ? 'ini' : 'json')
  outputEl.className = `language-${lang}`; settingsEl.className = `language-${lang}`
  outputEl.removeAttribute('data-highlighted'); settingsEl.removeAttribute('data-highlighted')
  outputEl.textContent = generateColorSchemeExport(format, currentScheme)
  settingsEl.textContent = generateSettingsExport(format)
  syncSchemeToUrl()
  updateVariants()
  hljs.highlightElement(outputEl); hljs.highlightElement(settingsEl)
}

function writeSampleText() {
  const mode = (document.getElementById('preview-mode') as HTMLSelectElement)?.value || 'react'
  term.clear(); term.writeln('  \x1b[1mTerminal Color Scheme Preview\x1b[0m\r\n')
  term.write('  '); [30, 31, 32, 33, 34, 35, 36, 37].forEach(c => term.write(`\x1b[${c}m████\x1b[0m `)); term.writeln(' (Normal)')
  term.write('  '); [30, 31, 32, 33, 34, 35, 36, 37].forEach(c => term.write(`\x1b[${c};1m████\x1b[0m `)); term.writeln(' (Bright)\r\n')
  ;(PREVIEW_CONTENT as any)[mode](term)
  term.write('\r\n\x1b[36muser@colorterm\x1b[0m:\x1b[34m~\x1b[0m$ ')
}

// Initial update
updateTerminalTheme()
writeSampleText()

// Listeners
document.querySelectorAll('.lock-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.currentTarget as HTMLButtonElement, id = target.getAttribute('data-id')!
    if (lockedColors.has(id)) { lockedColors.delete(id); target.textContent = '🔓' }
    else { lockedColors.add(id); target.textContent = '🔒' }
  })
})

document.querySelectorAll('input[type="color"]').forEach((input) => {
  input.addEventListener('input', (e) => {
    (currentScheme as any)[(e.target as HTMLInputElement).id] = (e.target as HTMLInputElement).value
    updateTerminalTheme()
  })
  input.addEventListener('change', () => {
    pushToHistory()
  })
})

document.getElementById('theme-presets')!.addEventListener('change', (e) => {
  const presetId = (e.target as HTMLSelectElement).value
  if (presetId && PRESETS[presetId]) {
    pushToHistory()
    currentScheme = { ...currentScheme, ...PRESETS[presetId] }
    applyScheme()
  }
})

document.getElementById('randomize')!.addEventListener('click', () => {
  pushToHistory()
  currentScheme = generateCoherentTheme(currentScheme, lockedColors)
  applyScheme()
})

document.getElementById('trigger-image')!.addEventListener('click', () => {
  document.getElementById('image-upload')!.click()
})

document.getElementById('trigger-wallpaper')!.addEventListener('click', () => {
  document.getElementById('wallpaper-upload')!.click()
})

document.getElementById('wallpaper-upload')!.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    document.querySelector('main')!.style.backgroundImage = `url(${e.target?.result})`
    document.querySelector('main')!.style.backgroundSize = 'cover'
    document.querySelector('main')!.style.backgroundPosition = 'center'
  }
  reader.readAsDataURL(file)
})

document.getElementById('gallery-search')!.addEventListener('input', (e) => {
  const term = (e.target as HTMLInputElement).value.toLowerCase()
  const items = document.querySelectorAll('.gallery-item[data-id]')
  items.forEach(item => {
    const id = item.getAttribute('data-id')!.toLowerCase()
    ;(item as HTMLElement).style.display = id.includes(term) ? 'block' : 'none'
  })
})

document.getElementById('image-upload')!.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  try {
    const extracted = await extractPaletteFromImage(file)
    pushToHistory()
    currentScheme = { ...currentScheme, ...extracted }
    applyScheme()
  } catch (err) { alert('Image processing failed') }
})

document.getElementById('undo-btn')!.addEventListener('click', () => undo())
document.getElementById('redo-btn')!.addEventListener('click', () => redo())

// Keyboard shortcuts for Undo/Redo
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    if (e.shiftKey) redo()
    else undo()
    e.preventDefault()
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    redo()
    e.preventDefault()
  }
})

document.getElementById('fix-contrast')!.addEventListener('click', () => {
  const targetRatio = parseFloat((document.getElementById('target-contrast') as HTMLSelectElement).value)
  pushToHistory()
  fixContrast(currentScheme, lockedColors, targetRatio, (newScheme) => {
    currentScheme = newScheme
    applyScheme()
  })
})

document.getElementById('share-link')!.addEventListener('click', (e) => {
  const btn = e.currentTarget as HTMLButtonElement
  const originalText = btn.textContent
  navigator.clipboard.writeText(window.location.href)
  btn.textContent = 'Copied! ✓'
  btn.style.borderColor = 'var(--accent)'
  setTimeout(() => {
    btn.textContent = originalText
    btn.style.borderColor = ''
  }, 2000)
})

document.getElementById('import-btn')!.addEventListener('click', () => {
  const area = document.getElementById('import-area')!
  area.style.display = area.style.display === 'none' ? 'block' : 'none'
})

document.getElementById('import-apply')!.addEventListener('click', () => {
  const textarea = document.getElementById('import-json') as HTMLTextAreaElement
  try {
    const imported = parseThemeFromString(textarea.value)
    if (!imported) throw new Error('Could not detect theme format. Please ensure you include at least background and foreground colors.')
    
    pushToHistory()
    currentScheme = { ...currentScheme, ...imported }
    applyScheme()
    textarea.value = ''
    document.getElementById('import-area')!.style.display = 'none'
    alert('Theme imported successfully!')
  } catch (err: any) { 
    alert(`Import failed: ${err.message}`) 
  }
})

// New Feature Listeners
document.getElementById('save-local')!.addEventListener('click', () => {
  const name = prompt('Theme name?') || 'My Theme'
  const saved = JSON.parse(localStorage.getItem('my-themes') || '[]')
  saved.push({ name, scheme: { ...currentScheme } })
  localStorage.setItem('my-themes', JSON.stringify(saved))
  loadLocalThemes()
})

document.getElementById('vision-mode')!.addEventListener('change', (e) => {
  const mode = (e.target as HTMLSelectElement).value
  const main = document.querySelector('main')!
  const codePre = document.getElementById('export-output')!.parentElement!
  const settingsPre = document.getElementById('export-settings')!.parentElement!
  
  const applyFilter = (el: HTMLElement) => {
    el.style.filter = mode === 'none' ? '' : `url(#${mode})`
  }
  
  applyFilter(main)
  applyFilter(codePre)
  applyFilter(settingsPre)
})

const handleAdjust = () => {
  const h = parseInt((document.getElementById('adjust-hue') as HTMLInputElement).value)
  const s = parseFloat((document.getElementById('adjust-sat') as HTMLInputElement).value)
  const b = parseFloat((document.getElementById('adjust-bri') as HTMLInputElement).value)
  
  // We use the last state for continuous adjustments
  const newScheme = adjustTheme(currentScheme, h, s, b)
  term.options.theme = { ...newScheme }
  Object.entries(newScheme).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--term-${key}`, value)
  })
}

// Reset sliders and push to history on finish
const finishAdjust = () => {
  pushToHistory()
  const h = parseInt((document.getElementById('adjust-hue') as HTMLInputElement).value)
  const s = parseFloat((document.getElementById('adjust-sat') as HTMLInputElement).value)
  const b = parseFloat((document.getElementById('adjust-bri') as HTMLInputElement).value)
  currentScheme = adjustTheme(currentScheme, h, s, b)
  
  // Reset UI sliders
  ;(document.getElementById('adjust-hue') as HTMLInputElement).value = "0"
  ;(document.getElementById('adjust-sat') as HTMLInputElement).value = "1"
  ;(document.getElementById('adjust-bri') as HTMLInputElement).value = "1"
  
  applyScheme()
}

document.getElementById('adjust-hue')!.addEventListener('input', handleAdjust)
document.getElementById('adjust-sat')!.addEventListener('input', handleAdjust)
document.getElementById('adjust-bri')!.addEventListener('input', handleAdjust)

document.getElementById('adjust-hue')!.addEventListener('change', finishAdjust)
document.getElementById('adjust-sat')!.addEventListener('change', finishAdjust)
document.getElementById('adjust-bri')!.addEventListener('change', finishAdjust)

document.getElementById('batch-export')!.addEventListener('click', async () => {
  const zip = new JSZip()
  const formats = ['ghostty', 'iterm2', 'wezterm', 'kitty', 'alacritty', 'vscode', 'warp', 'windowsterminal', 'foot', 'xterm', 'neovim', 'helix', 'zellij', 'tmux', 'nix']
  
  formats.forEach(f => {
    const ext = f === 'iterm2' ? 'itermcolors' : (['neovim', 'wezterm', 'nix'].includes(f) ? 'lua' : (['alacritty', 'helix', 'zellij'].includes(f) ? 'toml' : (['foot'].includes(f) ? 'ini' : (['vscode', 'windowsterminal', 'xterm'].includes(f) ? 'json' : 'conf'))))
    if (f === 'nix') {
      zip.file(`theme.nix`, generateColorSchemeExport(f, currentScheme))
    } else {
      zip.file(`theme.${ext}`, generateColorSchemeExport(f, currentScheme))
      zip.file(`settings.${ext}`, generateSettingsExport(f))
    }
  })

  const content = await zip.generateAsync({ type: 'blob' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(content)
  link.download = 'colorterm-bundle.zip'
  link.click()
})

loadLocalThemes()

document.getElementById('export-format')!.addEventListener('change', () => updateTerminalTheme())
document.getElementById('preview-mode')!.addEventListener('change', () => writeSampleText())

document.getElementById('term-font')!.addEventListener('change', (e) => {
  const select = e.target as HTMLSelectElement
  const fontName = select.selectedOptions[0].text
  if (select.value !== 'monospace' && fontName !== 'JetBrains Mono') loadGoogleFont(fontName)
  term.options.fontFamily = select.value + ', monospace'
  updateTerminalTheme(); requestAnimationFrame(() => fitAddon.fit())
})

document.getElementById('term-opacity')!.addEventListener('input', () => {
  updateTerminalTheme(); requestAnimationFrame(() => fitAddon.fit())
})

document.getElementById('term-size')!.addEventListener('input', (e) => {
  term.options.fontSize = parseInt((e.target as HTMLInputElement).value)
  updateTerminalTheme(); requestAnimationFrame(() => fitAddon.fit())
})

const themeSwitcher = document.getElementById('theme-switcher')!
let isAppDarkMode = true
themeSwitcher.addEventListener('click', () => {
  isAppDarkMode = !isAppDarkMode
  document.documentElement.setAttribute('data-theme', isAppDarkMode ? 'dark' : 'light')
  themeSwitcher.querySelector('.theme-icon')!.textContent = isAppDarkMode ? '🌙' : '☀️'
})

window.addEventListener('resize', () => requestAnimationFrame(() => fitAddon.fit()))

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
  });
}
