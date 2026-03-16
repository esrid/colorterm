import './style.css'
import 'xterm/css/xterm.css'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import lua from 'highlight.js/lib/languages/lua'
import ini from 'highlight.js/lib/languages/ini'
import yaml from 'highlight.js/lib/languages/yaml'
import xml from 'highlight.js/lib/languages/xml'
import lisp from 'highlight.js/lib/languages/lisp'

import type { ColorScheme } from './types'
import { DEFAULT_SCHEME, MONO_FONTS, PRESETS } from './constants'
import { getLuminance, getContrast, fixContrast, extractPaletteFromImage, adjustTheme, interpolateSchemes } from './colorUtils'
import { generateColorSchemeExport, generateSettingsExport } from './exportEngine'
import { parseThemeFromString } from './importEngine'
import { generateCoherentTheme } from './themeGenerator'
import { ThemeState } from './themeState'
import { TerminalApp } from './terminalApp'
import { EditorPreview } from './editorPreview'
import { ColorWheel } from './colorWheel'
import type { HarmonyMode } from './colorWheel'
import JSZip from 'jszip'

// Register HLJS languages
hljs.registerLanguage('json', json)
hljs.registerLanguage('lua', lua)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('lisp', lisp)

// Import Fonts Locally
import "@fontsource/inter/400.css"
import "@fontsource/inter/600.css"
import "@fontsource/jetbrains-mono/400.css"
import "@fontsource/jetbrains-mono/700.css"

const themeState = new ThemeState()
let terminalApp: TerminalApp
let editorPreview: EditorPreview
let colorWheel: ColorWheel
let isProEditor = false

const COLOR_KEYS = ['background', 'foreground', 'cursor', 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite', 'mantle', 'crust', 'surface0', 'surface1', 'surface2', 'primary', 'secondary', 'accent']

function applyScheme() {
  const currentScheme = themeState.getCurrentScheme()
  syncBase16Mappings(currentScheme)
  Object.keys(currentScheme).forEach((key) => {
    const input = document.getElementById(key) as HTMLInputElement
    if (input) input.value = (currentScheme as any)[key]
  })
  updateTerminalTheme()
}

function syncSchemeToUrl() {
  const currentScheme = themeState.getCurrentScheme()
  const hexValues = COLOR_KEYS.map(key => {
    let hex = (currentScheme as any)[key].replace('#', '')
    if (hex.length === 3) hex = hex.split('').map((c: string) => c + c).join('')
    return hex.toLowerCase()
  })
  const hash = hexValues.join('')
  window.history.replaceState(null, '', '#' + hash)
}

function loadSchemeFromUrl() {
  let hash = window.location.hash.slice(1)
  if (!hash) return null
  hash = hash.split('?')[0].split('/')[0].replace(/^[\/#]+/, '')
  if (hash.length < 114) return null
  const scheme: any = { ...DEFAULT_SCHEME }
  let hasValidData = false
  try {
    COLOR_KEYS.forEach((key, i) => {
      const hex = hash.slice(i * 6, (i + 1) * 6)
      if (hex && /^[0-9a-fA-F]{6}$/.test(hex)) {
        scheme[key] = '#' + hex.toLowerCase()
        hasValidData = true
      }
    })
  } catch (e) { return null }
  return hasValidData ? scheme as ColorScheme : null
}

function syncBase16Mappings(scheme: ColorScheme) {
  scheme.base00 = scheme.background; scheme.base01 = scheme.mantle; scheme.base02 = scheme.surface0
  scheme.base03 = scheme.brightBlack; scheme.base04 = scheme.surface1; scheme.base05 = scheme.foreground
  scheme.base06 = scheme.foreground; scheme.base07 = scheme.foreground; scheme.base08 = scheme.red
  scheme.base09 = scheme.brightRed; scheme.base0A = scheme.yellow; scheme.base0B = scheme.green
  scheme.base0C = scheme.cyan; scheme.base0D = scheme.blue; scheme.base0E = scheme.magenta
  scheme.base0F = scheme.brightMagenta
}

window.addEventListener('hashchange', () => {
  const loaded = loadSchemeFromUrl()
  if (loaded) {
    themeState.setScheme(loaded)
    applyScheme()
  }
})

const savedScheme = loadSchemeFromUrl()
if (savedScheme) {
  themeState.setScheme(savedScheme)
}

const app = document.querySelector<HTMLDivElement>('#app')!
const initialScheme = themeState.getCurrentScheme()

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
    <h3>Themes</h3>
    <div id="community-gallery" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
      <!-- Populated by JS -->
    </div>
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
        <label style="font-size: 0.65rem; color: var(--text-muted); min-width: 80px;">Terminal Opacity</label>
        <input type="range" id="term-opacity" value="1" min="0.1" max="1" step="0.01" style="flex: 1;">
        <span style="font-size: 0.6rem; color: var(--text-muted); opacity: 0.6;">0-1</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <label style="font-size: 0.65rem; color: var(--text-muted); min-width: 80px;">Letter Spacing</label>
        <input type="number" id="term-letter-spacing" value="0" step="0.5" min="-2" max="5">
      </div>
      
      <div style="margin-top: 8px; border-top: 1px solid var(--border-card); padding-top: 8px;">
        <input type="file" id="wallpaper-upload" accept="image/*" style="display: none;">
        <button id="trigger-wallpaper" class="randomize-btn" style="background: var(--bg-sidebar); border: 1px solid var(--border-input); color: var(--text-main); font-size: 0.7rem;">🖼️ Set Custom Wallpaper</button>
      </div>
    </div>
  </div>

  <div class="card">
    <h3>Generate & Import</h3>
    <div class="control-group">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <button id="randomize" class="randomize-btn">Generate Theme</button>
        <button id="invert-mode" class="randomize-btn" style="background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-main);" title="Switch between Dark/Light modes">🌗 Invert Mode</button>
      </div>
      
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
        <div class="url-fetch-row">
          <input id="import-url" type="text" placeholder="Paste GitHub/raw dotfile URL...">
          <button id="import-url-btn" class="btn-ghost">Fetch</button>
        </div>
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
    <div style="display: flex; gap: 8px; margin-top: 12px;">
      <button id="save-local" class="randomize-btn" style="flex: 1; font-size: 0.7rem; background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-main);">Save Current Theme</button>
      <button id="diff-btn" class="btn-outline">Diff</button>
    </div>
    <div id="diff-area" style="display: none; margin-top: 12px; border-top: 1px solid var(--border-card); padding-top: 12px;">
      <select id="diff-select" style="margin-bottom: 8px;">
        <option value="">— pick a saved theme —</option>
      </select>
      <div id="diff-output" style="display: flex; flex-direction: column;"></div>
    </div>
  </div>

  <div class="card">
    <h3>Theme Morph</h3>
    <p style="font-size: 0.6rem; color: var(--text-muted); margin: 0 0 12px;">Blend between two saved themes</p>
    <div class="morph-selects">
      <select id="morph-a">
        <option value="">— Theme A (current) —</option>
      </select>
      <select id="morph-b">
        <option value="">— Theme B —</option>
      </select>
      <div class="morph-labels">
        <span>A</span>
        <input type="range" id="morph-slider" value="0" min="0" max="100" step="1" style="flex: 1;">
        <span>B</span>
      </div>
      <button id="morph-apply" class="btn-outline" style="width: 100%;">Apply Morphed Theme</button>
    </div>
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
    <h3>Harmony Wheel</h3>
    <div class="control-group">
      <select id="harmony-mode" style="font-size: 0.7rem;">
        <option value="none">No Harmony (Manual)</option>
        <option value="complementary">Complementary</option>
        <option value="triadic">Triadic</option>
        <option value="analogous">Analogous</option>
        <option value="split-complementary">Split Complementary</option>
        <option value="tetradic">Tetradic</option>
      </select>
      <div id="harmony-wheel-container" style="display: flex; justify-content: center; margin-top: 8px;"></div>
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
          <input type="color" id="background" value="${initialScheme.background}">
          <button class="lock-btn" id="lock-background" data-id="background">🔓</button>
        </div>
        <div class="color-item">
          <label>FG</label>
          <input type="color" id="foreground" value="${initialScheme.foreground}">
          <button class="lock-btn" id="lock-foreground" data-id="foreground">🔓</button>
        </div>
        <div class="color-item">
          <label>Cursor</label>
          <input type="color" id="cursor" value="${initialScheme.cursor}">
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
            <input type="color" id="${c}" value="${(initialScheme as any)[c]}" title="${c}">
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
            <input type="color" id="${c}" value="${(initialScheme as any)[c]}" title="${c}">
            <button class="lock-btn" id="lock-${c}" data-id="${c}">🔓</button>
          </div>`)
          .join('')}
      </div>
      <div class="grid-8">
        ${['brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite']
          .map(c => `<div class="color-item">
            <input type="color" id="${c}" value="${(initialScheme as any)[c]}" title="${c}">
            <button class="lock-btn" id="lock-${c}" data-id="${c}">🔓</button>
          </div>`)
          .join('')}
      </div>
    </div>
  </div>
</aside>

<main>
  <div style="display: flex; justify-content: flex-end; margin-bottom: 12px; gap: 8px;">
    <button id="toggle-pro-editor" class="randomize-btn" style="width: auto; padding: 4px 12px; background: var(--bg-input); border: 1px solid var(--border-input); color: var(--text-main); font-size: 0.7rem;">✨ Pro Editor: Off</button>
    <select id="preview-mode" style="width: auto; padding: 4px 12px;">
      <option value="react (Code)">Preview: React (Code)</option>
      <option value="rust (Code)">Preview: Rust (Code)</option>
      <option value="go (Code)">Preview: Go (Code)</option>
      <option value="cpp (Code)">Preview: C++ (Code)</option>
      <option value="python (Code)">Preview: Python (Code)</option>
      <option value="html (Code)">Preview: HTML (Code)</option>
      <option value="css (Code)">Preview: CSS (Code)</option>
      <option value="sql (Code)">Preview: SQL (Code)</option>
      <option value="markdown (Code)">Preview: Markdown (Code)</option>
      <option value="json (Code)">Preview: JSON (Code)</option>
      <option value="htop (Terminal)">Preview: htop (Terminal)</option>
      <option value="ls (Terminal)">Preview: ls -la (Terminal)</option>
      <option value="git (Terminal)">Preview: git log (Terminal)</option>
      <option value="neofetch (Terminal)">Preview: neofetch (Terminal)</option>
    </select>
  </div>
  <div class="terminal-container">
    <div id="terminal" style="height: 100%;"></div>
    <div id="editor-preview" style="height: 100%; display: none; overflow: hidden; border-radius: 8px;"></div>
  </div>
  
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
      <option value="zed">Zed (JSON)</option>
      <option value="emacs">Emacs (deftheme)</option>
      <option value="sublime">Sublime Text (.tmTheme)</option>
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

const gallery = document.getElementById('community-gallery')!

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
      themeState.setScheme(saved[idx].scheme)
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

gallery.innerHTML = Object.keys(PRESETS).map(id => {
  const p = PRESETS[id]
  const name = id.charAt(0).toUpperCase() + id.slice(1).replace(/([A-Z])/g, ' $1')
  return `
    <div class="gallery-item" data-id="${id}" title="${name}">
      <div style="background: ${p.background}; width: 100%; height: 20px; border-radius: 4px; display: grid; grid-template-columns: repeat(4, 1fr); overflow: hidden; border: 1px solid var(--border-card);">
        <div style="background: ${p.red}"></div>
        <div style="background: ${p.green}"></div>
        <div style="background: ${p.blue}"></div>
        <div style="background: ${p.magenta}"></div>
      </div>
      <span class="gallery-name">${name}</span>
    </div>
  `
}).join('')

gallery.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', () => {
    const id = item.getAttribute('data-id')!
    const preset = PRESETS[id]
    const newScheme = generateCoherentTheme({ ...themeState.getCurrentScheme(), ...preset }, new Set(Object.keys(preset)))
    themeState.setScheme(newScheme)
    applyScheme()
  })
})

function updateVariants() {
  const container = document.getElementById('variants-grid')!
  const baseScheme = themeState.getBaseScheme()
  const variants = [
    { name: 'Default', fn: (s: ColorScheme) => s },
    { name: 'Deep', fn: (s: ColorScheme) => adjustTheme(s, 0, 1.0, 0.6) },
    { name: 'Vibrant', fn: (s: ColorScheme) => adjustTheme(s, 0, 1.5, 1.0) },
    { name: 'Muted', fn: (s: ColorScheme) => adjustTheme(s, 0, 0.6, 1.0) },
    { name: 'Contrast', fn: (s: ColorScheme) => adjustTheme(s, 0, 1.0, 1.2) },
    { name: 'Soft', fn: (s: ColorScheme) => adjustTheme(s, 0, 0.8, 0.8) },
  ]
  container.innerHTML = variants.map((v, i) => {
    const s = v.fn(baseScheme)
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
      themeState.applyVariant(variants[idx].fn)
      applyScheme()
    })
  })
}

function updateTerminalTheme() {
  const currentScheme = themeState.getCurrentScheme()
  Object.entries(currentScheme).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--term-${key}`, value)
  })
  const opacity = parseFloat((document.getElementById('term-opacity') as HTMLInputElement).value)
  if (terminalApp) terminalApp.updateTheme(currentScheme, opacity)
  if (editorPreview) editorPreview.updateTheme(currentScheme)
  if (colorWheel) colorWheel.updateColors(currentScheme as any)
  const ratio = getContrast(currentScheme.background, currentScheme.foreground)
  const badge = document.getElementById('contrast-badge')!
  let status = 'Fail', color = '#ff4c4c'
  if (ratio >= 7) { status = 'AAA'; color = '#23d18b' }
  else if (ratio >= 4.5) { status = 'AA'; color = '#23d18b' }
  else if (ratio >= 3) { status = 'Large'; color = '#f5f543' }
  badge.textContent = `${ratio.toFixed(2)}:1 (${status})`; badge.style.color = color
  const heatmap = document.getElementById('contrast-grid')!
  const ansiColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite']
  heatmap.innerHTML = ansiColors.map(c => {
    const col = (currentScheme as any)[c]
    const r = getContrast(currentScheme.background, col)
    const pass = r >= 4.5, largePass = r >= 3, icon = pass ? '✓' : (largePass ? '○' : '✕')
    return `<div class="contrast-box" style="background: ${col}; color: ${getLuminance(col) > 0.5 ? '#000' : '#fff'}" title="${c}: ${r.toFixed(2)}:1" data-id="${c}">${icon}</div>`
  }).join('')
  heatmap.querySelectorAll('.contrast-box').forEach(box => {
    box.addEventListener('click', () => {
      const id = box.getAttribute('data-id')!; const input = document.getElementById(id) as HTMLInputElement; input.click()
    })
  })
  const format = (document.getElementById('export-format') as HTMLSelectElement).value
  const outputEl = document.getElementById('export-output')!, settingsEl = document.getElementById('export-settings')!
  let lang = (format === 'neovim' || format === 'wezterm') ? 'lua' : (format === 'emacs') ? 'lisp' : (['iterm2', 'sublime'].includes(format)) ? 'xml' : (['ghostty', 'kitty', 'foot', 'alacritty'].includes(format) ? 'ini' : 'json')
  outputEl.className = `language-${lang}`; settingsEl.className = `language-${lang}`
  outputEl.removeAttribute('data-highlighted'); settingsEl.removeAttribute('data-highlighted')
  outputEl.textContent = generateColorSchemeExport(format, currentScheme)
  settingsEl.textContent = generateSettingsExport(format)
  syncSchemeToUrl(); updateVariants()
  hljs.highlightElement(outputEl); hljs.highlightElement(settingsEl)
}

terminalApp = new TerminalApp('terminal')
editorPreview = new EditorPreview(document.getElementById('editor-preview')!)
colorWheel = new ColorWheel(document.getElementById('harmony-wheel-container')!, (id, hex) => {
  themeState.updateCurrentColor(id, hex)
  applyScheme()
})
document.getElementById('harmony-mode')!.addEventListener('change', (e) => {
  colorWheel.setHarmonyMode((e.target as HTMLSelectElement).value as HarmonyMode)
})
applyScheme()

function refreshPreview() {
  const mode = (document.getElementById('preview-mode') as HTMLSelectElement).value
  const isCode = mode.includes('(Code)')
  const termEl = document.getElementById('terminal')!
  const editorEl = document.getElementById('editor-preview')!
  const toggleBtn = document.getElementById('toggle-pro-editor') as HTMLButtonElement

  if (isProEditor && isCode) {
    termEl.style.display = 'none'
    editorEl.style.display = 'block'
    editorPreview.show()
    editorPreview.setLanguage(mode.split(' ')[0].toLowerCase())
    
    // Get sample code based on language
    let code = ""
    switch(mode.split(' ')[0].toLowerCase()) {
      case 'react':
        code = `import React, { useState, useEffect } from 'react';\n\nexport const Counter = ({ initial = 0 }) => {\n  const [count, setCount] = useState(initial);\n\n  useEffect(() => {\n    console.log("Count changed to:", count);\n  }, [count]);\n\n  return (\n    <div className="p-4 border rounded shadow-lg">\n      <h1 className="text-2xl font-bold">Count: {count}</h1>\n      <div className="flex gap-2 mt-4">\n        <button \n          onClick={() => setCount(c => c + 1)}\n          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"\n        >\n          Increment\n        </button>\n        <button \n          onClick={() => setCount(0)}\n          className="px-4 py-2 bg-gray-200 text-gray-800 rounded"\n        >\n          Reset\n        </button>\n      </div>\n    </div>\n  );\n};`; break;
      case 'rust':
        code = `#[derive(Debug, Clone)]\npub struct User {\n    id: u64,\n    username: String,\n    active: bool,\n}\n\nimpl User {\n    pub fn new(id: u64, username: &str) -> Self {\n        User {\n            id,\n            username: username.to_string(),\n            active: true,\n        }\n    }\n\n    pub fn deactivate(&mut self) {\n        self.active = false;\n        println!("User {} deactivated", self.username);\n    }\n}\n\nfn main() {\n    let mut user = User::new(1, "ferris");\n    if user.active {\n        user.deactivate();\n    }\n    println!("Status: {:?}", user);\n}`; break;
      case 'go':
        code = `package main\n\nimport (\n\t"fmt"\n\t"net/http"\n)\n\nfunc handler(w http.ResponseWriter, r *http.Request) {\n\tfmt.Fprintf(w, "Hello, %s!", r.URL.Path[1:])\n}\n\nfunc main() {\n\thttp.HandleFunc("/", handler)\n\tfmt.Println("Server starting on :8080...")\n\tif err := http.ListenAndServe(":8080", nil); err != nil {\n\t\tpanic(err)\n\t}\n}`; break;
      case 'cpp':
        code = `#include <iostream>\n#include <vector>\n#include <algorithm>\n\ntemplate <typename T>\nvoid print_vector(const std::vector<T>& v) {\n    for (const auto& item : v) {\n        std::cout << item << " ";\n    }\n    std::cout << std::endl;\n}\n\nint main() {\n    std::vector<int> numbers = {5, 2, 9, 1, 5, 6};\n    std::sort(numbers.begin(), numbers.end());\n    std::cout << "Sorted sequence: ";\n    print_vector(numbers);\n    return 0;\n}`; break;
      case 'python':
        code = `import asyncio\nimport time\n\nasync def say_after(delay, what):\n    await asyncio.sleep(delay)\n    print(f"{what} after {delay}s")\n\nasync def main():\n    print(f"Started at {time.strftime('%X')}")\n    await asyncio.gather(\n        say_after(1, 'hello'),\n        say_after(2, 'world')\n    )\n    print(f"Finished at {time.strftime('%X')}")\n\nif __name__ == "__main__":\n    asyncio.run(main())`; break;
      case 'html':
        code = `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>ColorTerm Theme Preview</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <header class="navbar">\n        <nav>\n            <ul>\n                <li><a href="#home">Home</a></li>\n                <li><a href="#features" class="active">Features</a></li>\n            </ul>\n        </nav>\n    </header>\n    <main>\n        <h1>Welcome to ColorTerm</h1>\n        <p>A <strong>perceptual</strong> theme generator.</p>\n        <button class="btn-primary" onclick="generate()">Generate</button>\n    </main>\n</body>\n</html>`; break;
      case 'css':
        code = `:root {\n  --primary: #7c7cf0;\n  --bg: #050505;\n  --text: #ededed;\n}\n\n.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n  background-color: var(--bg);\n  color: var(--text);\n}\n\n.card {\n  padding: 2rem;\n  border-radius: 12px;\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);\n  backdrop-filter: blur(10px);\n}`; break;
      case 'sql':
        code = `SELECT \n    u.id, \n    u.username, \n    count(o.id) as total_orders,\n    sum(o.amount) as revenue\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE u.active = true\nGROUP BY u.id\nHAVING count(o.id) > 5\nORDER BY revenue DESC\nLIMIT 10;`; break;
      case 'markdown':
        code = `# ColorTerm Pro\n\nA powerful **terminal theme generator** with:\n\n*   Perceptual color generation (OKLCH)\n*   Contrast-aware adjustments\n*   K-Means image extraction\n\n## Installation\n\n\`\`\`bash\nnpm install -g colorterm\n\`\`\`\n\n> "The best terminal theme tool I've used!" - Anonymous\n\n---`; break;
      case 'json':
        code = `{\n  "theme": "ColorTerm Dark",\n  "version": "1.2.0",\n  "author": "Alexandre Desir",\n  "settings": {\n    "transparency": true,\n    "blur": 10,\n    "font": "JetBrains Mono"\n  },\n  "colors": {\n    "background": "#050505",\n    "foreground": "#ededed",\n    "accent": "#7c7cf0"\n  },\n  "active": true\n}`; break;
      default:
        code = `// Preview for ${mode}\nfunction example() {\n  const greeting = "Hello, World!";\n  console.log(greeting);\n  return true;\n}`; break;
    }
    editorPreview.setContent(code)
    toggleBtn.textContent = '✨ Pro Editor: On'
  } else {
    termEl.style.display = 'block'
    editorEl.style.display = 'none'
    editorPreview.hide()
    terminalApp.writeSample(mode.replace(' (Code)', '').replace(' (Terminal)', '').toLowerCase())
    toggleBtn.textContent = '✨ Pro Editor: Off'
  }
}

document.getElementById('toggle-pro-editor')!.addEventListener('click', () => {
  isProEditor = !isProEditor
  
  const modeSelect = document.getElementById('preview-mode') as HTMLSelectElement
  const mode = modeSelect.value
  const isCode = mode.includes('(Code)')
  
  // If we turn it ON but are on a Terminal view, switch to a Code view automatically
  if (isProEditor && !isCode) {
    modeSelect.value = 'react (Code)'
  }
  
  refreshPreview()
})

document.getElementById('preview-mode')!.addEventListener('change', refreshPreview)
refreshPreview()

document.querySelectorAll('.lock-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.currentTarget as HTMLButtonElement, id = target.getAttribute('data-id')!
    const isLocked = themeState.toggleLock(id)
    target.textContent = isLocked ? '🔒' : '🔓'; target.classList.toggle('locked', isLocked)
  })
})

document.querySelectorAll('input[type="color"]').forEach((input) => {
  input.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement
    themeState.updateCurrentColor(target.id, target.value); applyScheme()
  })
})

document.getElementById('randomize')!.addEventListener('click', () => { themeState.randomize(); applyScheme() })
document.getElementById('invert-mode')!.addEventListener('click', () => { themeState.invert(); applyScheme() })
document.getElementById('trigger-image')!.addEventListener('click', () => { document.getElementById('image-upload')!.click() })
document.getElementById('trigger-wallpaper')!.addEventListener('click', () => { document.getElementById('wallpaper-upload')!.click() })
document.getElementById('wallpaper-upload')!.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return
  const reader = new FileReader(); reader.onload = (e) => {
    const main = document.querySelector('main')!; main.style.backgroundImage = `url(${e.target?.result})`; main.style.backgroundSize = 'cover'; main.style.backgroundPosition = 'center'
  }; reader.readAsDataURL(file)
})
document.getElementById('image-upload')!.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return
  try {
    const extracted = await extractPaletteFromImage(file)
    themeState.setScheme({ ...themeState.getCurrentScheme(), ...extracted }); applyScheme()
  } catch (err) { alert('Image processing failed') }
})
document.getElementById('undo-btn')!.addEventListener('click', () => { if (themeState.undo()) applyScheme() })
document.getElementById('redo-btn')!.addEventListener('click', () => { if (themeState.redo()) applyScheme() })
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { if (e.shiftKey) { if (themeState.redo()) applyScheme() } else { if (themeState.undo()) applyScheme() } e.preventDefault() }
  else if ((e.ctrlKey || e.metaKey) && e.key === 'y') { if (themeState.redo()) applyScheme(); e.preventDefault() }
})
document.getElementById('fix-contrast')!.addEventListener('click', () => {
  const targetRatio = parseFloat((document.getElementById('target-contrast') as HTMLSelectElement).value)
  fixContrast(themeState.getCurrentScheme(), themeState.getLockedColors(), targetRatio, (newScheme) => { themeState.setScheme(newScheme); applyScheme() })
})

async function copyToClipboard(text: string, btn: HTMLButtonElement) {
  const originalText = btn.textContent
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text)
    else {
      const textArea = document.createElement("textarea"); textArea.value = text; textArea.style.position = "fixed"; textArea.style.left = "-9999px"; textArea.style.top = "0";
      document.body.appendChild(textArea); textArea.focus(); textArea.select(); document.execCommand('copy'); textArea.remove()
    }
    btn.textContent = 'Copied! ✓'
  } catch (err) { btn.textContent = 'Error! ✕' }
  setTimeout(() => btn.textContent = originalText, 2000)
}

document.getElementById('share-link')!.addEventListener('click', (e) => copyToClipboard(window.location.href, e.currentTarget as HTMLButtonElement))
document.getElementById('copy-export')!.addEventListener('click', (e) => copyToClipboard(document.getElementById('export-output')!.textContent || '', e.currentTarget as HTMLButtonElement))
document.getElementById('copy-settings')!.addEventListener('click', (e) => copyToClipboard(document.getElementById('export-settings')!.textContent || '', e.currentTarget as HTMLButtonElement))
document.getElementById('import-btn')!.addEventListener('click', () => { const area = document.getElementById('import-area')!; area.style.display = area.style.display === 'none' ? 'block' : 'none' })
document.getElementById('import-apply')!.addEventListener('click', () => {
  const textarea = document.getElementById('import-json') as HTMLTextAreaElement
  try {
    const imported = parseThemeFromString(textarea.value); if (!imported) throw new Error('Could not detect theme format.')
    themeState.setScheme({ ...themeState.getCurrentScheme(), ...imported }); applyScheme()
    textarea.value = ''; document.getElementById('import-area')!.style.display = 'none'; alert('Theme imported successfully!')
  } catch (err: any) { alert(`Import failed: ${err.message}`) }
})
document.getElementById('save-local')!.addEventListener('click', () => {
  const name = prompt('Theme name?') || 'My Theme'; const saved = JSON.parse(localStorage.getItem('my-themes') || '[]'); saved.push({ name, scheme: themeState.getCurrentScheme() });
  localStorage.setItem('my-themes', JSON.stringify(saved)); loadLocalThemes(); populateMorphSelects(); populateDiffSelect()
})

// --- URL Import ---
document.getElementById('import-url-btn')!.addEventListener('click', async () => {
  const btn = document.getElementById('import-url-btn') as HTMLButtonElement
  let url = (document.getElementById('import-url') as HTMLInputElement).value.trim()
  if (!url) return
  // Convert github.com URLs to raw.githubusercontent.com
  url = url.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/')
  btn.textContent = '...'
  btn.disabled = true
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    ;(document.getElementById('import-json') as HTMLTextAreaElement).value = text
    btn.textContent = 'Done ✓'
  } catch (e: any) {
    btn.textContent = 'Error ✕'
    alert(`Fetch failed: ${e.message}`)
  } finally {
    setTimeout(() => { btn.textContent = 'Fetch'; btn.disabled = false }, 2000)
  }
})

// --- Theme Diff ---
const SCHEME_KEYS = ['background','foreground','cursor','mantle','crust','surface0','surface1','surface2','primary','secondary','accent','black','red','green','yellow','blue','magenta','cyan','white','brightBlack','brightRed','brightGreen','brightYellow','brightBlue','brightMagenta','brightCyan','brightWhite'] as const

function populateDiffSelect() {
  const saved = JSON.parse(localStorage.getItem('my-themes') || '[]')
  const sel = document.getElementById('diff-select') as HTMLSelectElement
  sel.innerHTML = '<option value="">— pick a saved theme —</option>' + saved.map((t: any, i: number) => `<option value="${i}">${t.name}</option>`).join('')
}

function renderDiff(other: any) {
  const current = themeState.getCurrentScheme()
  const out = document.getElementById('diff-output')!
  let html = ''
  for (const key of SCHEME_KEYS) {
    const a = (current as any)[key], b = (other as any)[key]
    const changed = a?.toLowerCase() !== b?.toLowerCase()
    html += `<div class="diff-row${changed ? '' : ' unchanged'}">
      <span class="diff-key">${key}</span>
      <div class="diff-swatch" style="background:${a}" title="${a}"></div>
      <span class="diff-arrow">${changed ? '→' : '='}</span>
      <div class="diff-swatch" style="background:${b}" title="${b}"></div>
      ${changed ? `<span class="diff-hex">${b}</span>` : ''}
    </div>`
  }
  out.innerHTML = html
}

document.getElementById('diff-btn')!.addEventListener('click', () => {
  const area = document.getElementById('diff-area')!
  const isOpen = area.style.display !== 'none'
  area.style.display = isOpen ? 'none' : 'block'
  if (!isOpen) populateDiffSelect()
})
document.getElementById('diff-select')!.addEventListener('change', (e) => {
  const idx = (e.target as HTMLSelectElement).value
  if (!idx) { document.getElementById('diff-output')!.innerHTML = ''; return }
  const saved = JSON.parse(localStorage.getItem('my-themes') || '[]')
  renderDiff(saved[parseInt(idx)].scheme)
})

// --- Theme Morph ---
function populateMorphSelects() {
  const saved = JSON.parse(localStorage.getItem('my-themes') || '[]')
  const opts = '<option value="">— current theme —</option>' + saved.map((t: any, i: number) => `<option value="${i}">${t.name}</option>`).join('')
  ;(document.getElementById('morph-a') as HTMLSelectElement).innerHTML = opts
  ;(document.getElementById('morph-b') as HTMLSelectElement).innerHTML = opts.replace('— current theme —', '— Theme B —')
}

function getMorphScheme(selectId: string) {
  const val = (document.getElementById(selectId) as HTMLSelectElement).value
  if (val === '') return themeState.getCurrentScheme()
  const saved = JSON.parse(localStorage.getItem('my-themes') || '[]')
  return saved[parseInt(val)]?.scheme || themeState.getCurrentScheme()
}

document.getElementById('morph-slider')!.addEventListener('input', (e) => {
  const t = parseInt((e.target as HTMLInputElement).value) / 100
  const a = getMorphScheme('morph-a'), b = getMorphScheme('morph-b')
  themeState.setScheme(interpolateSchemes(a, b, t), false)
  applyScheme()
})
document.getElementById('morph-apply')!.addEventListener('click', () => {
  const t = parseInt((document.getElementById('morph-slider') as HTMLInputElement).value) / 100
  const a = getMorphScheme('morph-a'), b = getMorphScheme('morph-b')
  themeState.setScheme(interpolateSchemes(a, b, t))
  applyScheme()
})
document.getElementById('vision-mode')!.addEventListener('change', (e) => {
  const mode = (e.target as HTMLSelectElement).value;
  const aside = document.querySelector('aside')!;
  const main = document.querySelector('main')!;
  const terminal = document.getElementById('terminal')!;
  
  const filterVal = mode === 'none' ? '' : `url(#${mode})`;
  aside.style.filter = filterVal;
  main.style.filter = filterVal;
  
  // Disable backdrop-filter on terminal when vision mode is on to prevent clashing
  if (mode !== 'none') {
    terminal.style.backdropFilter = 'none';
  } else {
    terminal.style.backdropFilter = 'blur(10px)';
  }
})
const handleAdjust = () => {
  const h = parseInt((document.getElementById('adjust-hue') as HTMLInputElement).value); const s = parseFloat((document.getElementById('adjust-sat') as HTMLInputElement).value); const b = parseFloat((document.getElementById('adjust-bri') as HTMLInputElement).value)
  const newScheme = adjustTheme(themeState.getCurrentScheme(), h, s, b); if (terminalApp) terminalApp.updateTheme(newScheme, parseFloat((document.getElementById('term-opacity') as HTMLInputElement).value))
  Object.entries(newScheme).forEach(([key, value]) => { document.documentElement.style.setProperty(`--term-${key}`, value) })
}
const finishAdjust = () => {
  const h = parseInt((document.getElementById('adjust-hue') as HTMLInputElement).value); const s = parseFloat((document.getElementById('adjust-sat') as HTMLInputElement).value); const b = parseFloat((document.getElementById('adjust-bri') as HTMLInputElement).value)
  const newScheme = adjustTheme(themeState.getCurrentScheme(), h, s, b); themeState.setScheme(newScheme)
  ;(document.getElementById('adjust-hue') as HTMLInputElement).value = "0"; (document.getElementById('adjust-sat') as HTMLInputElement).value = "1"; (document.getElementById('adjust-bri') as HTMLInputElement).value = "1"; applyScheme()
}
document.getElementById('adjust-hue')!.addEventListener('input', handleAdjust); document.getElementById('adjust-sat')!.addEventListener('input', handleAdjust); document.getElementById('adjust-bri')!.addEventListener('input', handleAdjust)
document.getElementById('adjust-hue')!.addEventListener('change', finishAdjust); document.getElementById('adjust-sat')!.addEventListener('change', finishAdjust); document.getElementById('adjust-bri')!.addEventListener('change', finishAdjust)
document.getElementById('batch-export')!.addEventListener('click', async (e) => {
  const btn = e.currentTarget as HTMLButtonElement; const originalText = btn.textContent; btn.textContent = '📦 Generating ZIP...'; btn.disabled = true
  const currentScheme = themeState.getCurrentScheme()
  try {
    const zip = new JSZip(); const formats = ['ghostty', 'iterm2', 'wezterm', 'kitty', 'alacritty', 'vscode', 'warp', 'windowsterminal', 'foot', 'xterm', 'neovim', 'helix', 'zellij', 'tmux', 'nix', 'tailwind', 'css', 'base16', 'zed', 'emacs', 'sublime']
    formats.forEach(f => {
      let ext = 'conf'; if (f === 'iterm2') ext = 'itermcolors'; else if (['neovim', 'wezterm'].includes(f)) ext = 'lua'; else if (['alacritty', 'helix', 'zellij'].includes(f)) ext = 'toml'; else if (f === 'foot') ext = 'ini'; else if (['vscode', 'windowsterminal', 'xterm', 'tailwind', 'zed'].includes(f)) ext = 'json'; else if (f === 'css') ext = 'css'; else if (f === 'base16') ext = 'yaml'; else if (f === 'nix') ext = 'nix'; else if (f === 'emacs') ext = 'el'; else if (f === 'sublime') ext = 'tmTheme'
      zip.file(`${f}/theme.${ext}`, generateColorSchemeExport(f, currentScheme))
      const settings = generateSettingsExport(f); if (settings && !settings.startsWith('# Settings not supported')) zip.file(`${f}/settings.${ext === 'itermcolors' ? 'txt' : ext}`, settings)
    })
    const content = await zip.generateAsync({ type: 'blob' }); const link = document.createElement('a'); link.href = URL.createObjectURL(content); link.download = 'colorterm-bundle.zip'; document.body.appendChild(link); link.click(); document.body.removeChild(link)
  } catch (err) { alert('Failed to generate ZIP file') } finally { btn.textContent = originalText; btn.disabled = false }
})
loadLocalThemes()
populateMorphSelects()
populateDiffSelect()
document.getElementById('export-format')!.addEventListener('change', () => updateTerminalTheme())
document.getElementById('term-font')!.addEventListener('change', (e) => { const select = e.target as HTMLSelectElement; terminalApp?.setFont(select.value, select.selectedOptions[0].text) })
document.getElementById('term-opacity')!.addEventListener('input', () => updateTerminalTheme())
document.getElementById('term-size')!.addEventListener('input', (e) => { if (terminalApp) terminalApp.term.options.fontSize = parseInt((e.target as HTMLInputElement).value) })
document.getElementById('term-letter-spacing')!.addEventListener('input', (e) => { if (terminalApp) terminalApp.term.options.letterSpacing = parseFloat((e.target as HTMLInputElement).value) })
const themeSwitcher = document.getElementById('theme-switcher')!; let isAppDarkMode = true; themeSwitcher.addEventListener('click', () => { isAppDarkMode = !isAppDarkMode; document.documentElement.setAttribute('data-theme', isAppDarkMode ? 'dark' : 'light'); themeSwitcher.querySelector('.theme-icon')!.textContent = isAppDarkMode ? '🌙' : '☀️' })
if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err)) })
