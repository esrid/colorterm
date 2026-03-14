import type { ColorScheme } from './types'

export function generateColorSchemeExport(format: string, scheme: ColorScheme): string {
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    return { r, g, b }
  }

  const itermKey = (label: string, hex: string) => {
    const { r, g, b } = hexToRgb(hex)
    return `	<key>${label}</key>
	<dict>
		<key>Blue Component</key>
		<real>${b}</real>
		<key>Green Component</key>
		<real>${g}</real>
		<key>Red Component</key>
		<real>${r}</real>
	</dict>`
  }

  switch (format) {
    case 'xterm':
      return JSON.stringify(scheme, null, 2)
    case 'neovim':
      return `local colors = {
  bg = "${scheme.background}",
  mantle = "${scheme.mantle}",
  crust = "${scheme.crust}",
  surface0 = "${scheme.surface0}",
  surface1 = "${scheme.surface1}",
  surface2 = "${scheme.surface2}",
  fg = "${scheme.foreground}",
  primary = "${scheme.primary}",
  secondary = "${scheme.secondary}",
  accent = "${scheme.accent}",
  cursor = "${scheme.cursor}",
  black = "${scheme.black}",
  red = "${scheme.red}",
  green = "${scheme.green}",
  yellow = "${scheme.yellow}",
  blue = "${scheme.blue}",
  magenta = "${scheme.magenta}",
  cyan = "${scheme.cyan}",
  white = "${scheme.white}",
  bright_black = "${scheme.brightBlack}",
  bright_red = "${scheme.brightRed}",
  bright_green = "${scheme.brightGreen}",
  bright_yellow = "${scheme.brightYellow}",
  bright_blue = "${scheme.brightBlue}",
  bright_magenta = "${scheme.brightMagenta}",
  bright_cyan = "${scheme.brightCyan}",
  bright_white = "${scheme.brightWhite}",
}

vim.api.nvim_command("hi clear")
if vim.fn.exists("syntax_on") then
  vim.api.nvim_command("syntax reset")
end
vim.o.termguicolors = true
vim.g.colors_name = "colorterm_theme"
vim.o.background = "${(document.getElementById('gen-tone') as HTMLSelectElement)?.value === 'light' ? 'light' : 'dark'}"

local hl = function(group, opts)
  vim.api.nvim_set_hl(0, group, opts)
end

-- UI
hl("Normal", { fg = colors.fg, bg = colors.bg })
hl("NormalFloat", { fg = colors.fg, bg = colors.mantle })
hl("FloatBorder", { fg = colors.surface2, bg = colors.mantle })
hl("Cursor", { fg = colors.bg, bg = colors.cursor })
hl("CursorLine", { bg = colors.surface0 })
hl("LineNr", { fg = colors.surface1 })
hl("CursorLineNr", { fg = colors.primary, bold = true })
hl("Comment", { fg = colors.bright_black, italic = true })
hl("Search", { fg = colors.bg, bg = colors.yellow })
hl("Visual", { bg = colors.surface1 })
hl("Pmenu", { fg = colors.fg, bg = colors.mantle })
hl("PmenuSel", { fg = colors.bg, bg = colors.primary })
hl("VertSplit", { fg = colors.crust, bg = colors.crust })
hl("StatusLine", { fg = colors.fg, bg = colors.mantle })
hl("StatusLineNC", { fg = colors.surface1, bg = colors.mantle })
hl("SignColumn", { bg = colors.bg })
hl("Folded", { fg = colors.blue, bg = colors.surface0 })
hl("EndOfBuffer", { fg = colors.bg })

-- Syntax Highlights
hl("Keyword", { fg = colors.magenta, bold = true })
hl("Function", { fg = colors.blue })
hl("String", { fg = colors.green })
hl("Number", { fg = colors.red })
hl("Type", { fg = colors.yellow })
hl("Operator", { fg = colors.cyan })
hl("Identifier", { fg = colors.cyan })
hl("Statement", { fg = colors.magenta })
hl("PreProc", { fg = colors.magenta })
hl("Constant", { fg = colors.accent })
hl("Special", { fg = colors.magenta })
hl("Todo", { fg = colors.bg, bg = colors.yellow, bold = true })
hl("Error", { fg = colors.red, bold = true })

-- Treesitter & LSP
hl("@keyword", { fg = colors.magenta, bold = true })
hl("@function", { fg = colors.blue })
hl("@string", { fg = colors.green })
hl("@variable", { fg = colors.fg })
hl("@variable.builtin", { fg = colors.red, italic = true })
hl("@property", { fg = colors.cyan })
hl("@parameter", { fg = colors.yellow, italic = true })
hl("@tag", { fg = colors.magenta })
hl("@tag.attribute", { fg = colors.blue, italic = true })
hl("@markup.heading", { fg = colors.blue, bold = true })
hl("@markup.link", { fg = colors.accent, underline = true })

-- LSP Diagnostics
hl("DiagnosticError", { fg = colors.red })
hl("DiagnosticWarn", { fg = colors.yellow })
hl("DiagnosticInfo", { fg = colors.blue })
hl("DiagnosticHint", { fg = colors.cyan })
hl("LspSignatureActiveParameter", { fg = colors.accent, bold = true })`
    case 'ghostty':
      return `palette = 0=${scheme.black}
palette = 1=${scheme.red}
palette = 2=${scheme.green}
palette = 3=${scheme.yellow}
palette = 4=${scheme.blue}
palette = 5=${scheme.magenta}
palette = 6=${scheme.cyan}
palette = 7=${scheme.white}
palette = 8=${scheme.brightBlack}
palette = 9=${scheme.brightRed}
palette = 10=${scheme.brightGreen}
palette = 11=${scheme.brightYellow}
palette = 12=${scheme.brightBlue}
palette = 13=${scheme.brightMagenta}
palette = 14=${scheme.brightCyan}
palette = 15=${scheme.brightWhite}
background = ${scheme.background}
foreground = ${scheme.foreground}
cursor-color = ${scheme.cursor}`
    case 'iterm2':
      return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${itermKey('Ansi 0 Color', scheme.black)}
${itermKey('Ansi 1 Color', scheme.red)}
${itermKey('Ansi 2 Color', scheme.green)}
${itermKey('Ansi 3 Color', scheme.yellow)}
${itermKey('Ansi 4 Color', scheme.blue)}
${itermKey('Ansi 5 Color', scheme.magenta)}
${itermKey('Ansi 6 Color', scheme.cyan)}
${itermKey('Ansi 7 Color', scheme.white)}
${itermKey('Ansi 8 Color', scheme.brightBlack)}
${itermKey('Ansi 9 Color', scheme.brightRed)}
${itermKey('Ansi 10 Color', scheme.brightGreen)}
${itermKey('Ansi 11 Color', scheme.brightYellow)}
${itermKey('Ansi 12 Color', scheme.brightBlue)}
${itermKey('Ansi 13 Color', scheme.brightMagenta)}
${itermKey('Ansi 14 Color', scheme.brightCyan)}
${itermKey('Ansi 15 Color', scheme.brightWhite)}
${itermKey('Background Color', scheme.background)}
${itermKey('Foreground Color', scheme.foreground)}
${itermKey('Cursor Color', scheme.cursor)}
</dict>
</plist>`
    case 'wezterm':
      return `return {
  colors = {
    foreground = "${scheme.foreground}",
    background = "${scheme.background}",
    cursor_bg = "${scheme.cursor}",
    ansi = {
      "${scheme.black}", "${scheme.red}", "${scheme.green}", "${scheme.yellow}",
      "${scheme.blue}", "${scheme.magenta}", "${scheme.cyan}", "${scheme.white}"
    },
    brights = {
      "${scheme.brightBlack}", "${scheme.brightRed}", "${scheme.brightGreen}", "${scheme.brightYellow}",
      "${scheme.brightBlue}", "${scheme.brightMagenta}", "${scheme.brightCyan}", "${scheme.brightWhite}"
    },
  }
}`
    case 'kitty':
      return `foreground ${scheme.foreground}
background ${scheme.background}
cursor ${scheme.cursor}
color0 ${scheme.black}
color1 ${scheme.red}
color2 ${scheme.green}
color3 ${scheme.yellow}
color4 ${scheme.blue}
color5 ${scheme.magenta}
color6 ${scheme.cyan}
color7 ${scheme.white}
color8 ${scheme.brightBlack}
color9 ${scheme.brightRed}
color10 ${scheme.brightGreen}
color11 ${scheme.brightYellow}
color12 ${scheme.brightBlue}
color13 ${scheme.brightMagenta}
color14 ${scheme.brightCyan}
color15 ${scheme.brightWhite}`
    case 'alacritty':
      return `[colors.primary]
background = "${scheme.background}"
foreground = "${scheme.foreground}"

[colors.cursor]
text = "CellBackground"
cursor = "${scheme.cursor}"

[colors.normal]
black = "${scheme.black}"
red = "${scheme.red}"
green = "${scheme.green}"
yellow = "${scheme.yellow}"
blue = "${scheme.blue}"
magenta = "${scheme.magenta}"
cyan = "${scheme.cyan}"
white = "${scheme.white}"

[colors.bright]
black = "${scheme.brightBlack}"
red = "${scheme.brightRed}"
green = "${scheme.brightGreen}"
yellow = "${scheme.brightYellow}"
blue = "${scheme.brightBlue}"
magenta = "${scheme.brightMagenta}"
cyan = "${scheme.brightCyan}"
white = "${scheme.brightWhite}"`
    case 'windowsterminal':
      return JSON.stringify({
        name: "Generated Theme",
        background: scheme.background,
        foreground: scheme.foreground,
        cursorColor: scheme.cursor,
        black: scheme.black,
        red: scheme.red,
        green: scheme.green,
        yellow: scheme.yellow,
        blue: scheme.blue,
        magenta: scheme.magenta,
        cyan: scheme.cyan,
        white: scheme.white,
        brightBlack: scheme.brightBlack,
        brightRed: scheme.brightRed,
        brightGreen: scheme.brightGreen,
        brightYellow: scheme.brightYellow,
        brightBlue: scheme.brightBlue,
        brightMagenta: scheme.brightMagenta,
        brightCyan: scheme.brightCyan,
        brightWhite: scheme.brightWhite
      }, null, 2)
    case 'foot':
      const s = (h: string) => h.replace('#', '')
      return `[colors]
background=${s(scheme.background)}
foreground=${s(scheme.foreground)}
regular0=${s(scheme.black)}
regular1=${s(scheme.red)}
regular2=${s(scheme.green)}
regular3=${s(scheme.yellow)}
regular4=${s(scheme.blue)}
regular5=${s(scheme.magenta)}
regular6=${s(scheme.cyan)}
regular7=${s(scheme.white)}
bright0=${s(scheme.brightBlack)}
bright1=${s(scheme.brightRed)}
bright2=${s(scheme.brightGreen)}
bright3=${s(scheme.brightYellow)}
bright4=${s(scheme.brightBlue)}
bright5=${s(scheme.brightMagenta)}
bright6=${s(scheme.brightCyan)}
bright7=${s(scheme.brightWhite)}`
    case 'zellij':
      return `themes {
    colorterm {
        fg "${scheme.foreground}"
        bg "${scheme.background}"
        black "${scheme.black}"
        red "${scheme.red}"
        green "${scheme.green}"
        yellow "${scheme.yellow}"
        blue "${scheme.blue}"
        magenta "${scheme.magenta}"
        cyan "${scheme.cyan}"
        white "${scheme.white}"
        orange "${scheme.brightRed}"
    }
}`
    case 'tmux':
      return `# ColorTerm Tmux Theme
set -g status-style "bg=${scheme.mantle},fg=${scheme.foreground}"
set -g window-status-current-style "bg=${scheme.primary},fg=${scheme.background},bold"
set -g pane-border-style "fg=${scheme.surface0}"
set -g pane-active-border-style "fg=${scheme.primary}"
set -g message-style "bg=${scheme.surface1},fg=${scheme.foreground}"`
    case 'nix':
      return `{
  # Use this in your NixOS or Home Manager configuration
  colors = {
    background = "${scheme.background}";
    foreground = "${scheme.foreground}";
    mantle = "${scheme.mantle}";
    crust = "${scheme.crust}";
    surface0 = "${scheme.surface0}";
    surface1 = "${scheme.surface1}";
    surface2 = "${scheme.surface2}";
    primary = "${scheme.primary}";
    secondary = "${scheme.secondary}";
    accent = "${scheme.accent}";
    
    # ANSI
    black = "${scheme.black}";
    red = "${scheme.red}";
    green = "${scheme.green}";
    yellow = "${scheme.yellow}";
    blue = "${scheme.blue}";
    magenta = "${scheme.magenta}";
    cyan = "${scheme.cyan}";
    white = "${scheme.white}";
    brightBlack = "${scheme.brightBlack}";
    brightRed = "${scheme.brightRed}";
    brightGreen = "${scheme.brightGreen}";
    brightYellow = "${scheme.brightYellow}";
    brightBlue = "${scheme.brightBlue}";
    brightMagenta = "${scheme.brightMagenta}";
    brightCyan = "${scheme.brightCyan}";
    brightWhite = "${scheme.brightWhite}";
  };
}`
    case 'tailwind':
      return `/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        'terminal-bg': '${scheme.background}',
        'terminal-fg': '${scheme.foreground}',
        'terminal-primary': '${scheme.primary}',
        'terminal-accent': '${scheme.accent}',
        ansi: {
          black: '${scheme.black}',
          red: '${scheme.red}',
          green: '${scheme.green}',
          yellow: '${scheme.yellow}',
          blue: '${scheme.blue}',
          magenta: '${scheme.magenta}',
          cyan: '${scheme.cyan}',
          white: '${scheme.white}',
        }
      }
    }
  }
}`
    case 'css':
      return `:root {
  --term-bg: ${scheme.background};
  --term-fg: ${scheme.foreground};
  --term-mantle: ${scheme.mantle};
  --term-surface: ${scheme.surface0};
  --term-primary: ${scheme.primary};
  --term-accent: ${scheme.accent};
  --ansi-black: ${scheme.black};
  --ansi-red: ${scheme.red};
  --ansi-green: ${scheme.green};
  --ansi-yellow: ${scheme.yellow};
  --ansi-blue: ${scheme.blue};
  --ansi-magenta: ${scheme.magenta};
  --ansi-cyan: ${scheme.cyan};
  --ansi-white: ${scheme.white};
}`
    case 'base16':
      return `scheme: "ColorTerm Theme"
author: "ColorTerm Generator"
base00: "${scheme.base00.replace('#', '')}"
base01: "${scheme.base01.replace('#', '')}"
base02: "${scheme.base02.replace('#', '')}"
base03: "${scheme.base03.replace('#', '')}"
base04: "${scheme.base04.replace('#', '')}"
base05: "${scheme.base05.replace('#', '')}"
base06: "${scheme.base06.replace('#', '')}"
base07: "${scheme.base07.replace('#', '')}"
base08: "${scheme.base08.replace('#', '')}"
base09: "${scheme.base09.replace('#', '')}"
base0A: "${scheme.base0A.replace('#', '')}"
base0B: "${scheme.base0B.replace('#', '')}"
base0C: "${scheme.base0C.replace('#', '')}"
base0D: "${scheme.base0D.replace('#', '')}"
base0E: "${scheme.base0E.replace('#', '')}"
base0F: "${scheme.base0F.replace('#', '')}"`
    case 'helix':
      return `# Helix Theme
"ui.background" = { bg = "${scheme.background}" }
"ui.foreground" = { fg = "${scheme.foreground}" }
"ui.cursor" = { fg = "${scheme.background}", bg = "${scheme.cursor}" }
"ui.selection" = { bg = "${scheme.brightBlack}" }
"ui.linenr" = { fg = "${scheme.brightBlack}" }
"ui.linenr.selected" = { fg = "${scheme.white}", modifiers = ["bold"] }
"ui.statusline" = { fg = "${scheme.foreground}", bg = "${scheme.black}" }
"ui.statusline.normal" = { fg = "${scheme.background}", bg = "${scheme.blue}", modifiers = ["bold"] }
"ui.statusline.insert" = { fg = "${scheme.background}", bg = "${scheme.green}", modifiers = ["bold"] }
"ui.statusline.select" = { fg = "${scheme.background}", bg = "${scheme.yellow}", modifiers = ["bold"] }
"ui.menu" = { fg = "${scheme.foreground}", bg = "${scheme.black}" }
"ui.menu.selected" = { fg = "${scheme.background}", bg = "${scheme.blue}" }
"ui.window" = { fg = "${scheme.black}" }
"ui.text" = { fg = "${scheme.foreground}" }
"ui.help" = { fg = "${scheme.foreground}", bg = "${scheme.black}" }
"ui.cursor.match" = { fg = "${scheme.yellow}", modifiers = ["bold"] }

# Syntax
"comment" = { fg = "${scheme.brightBlack}", modifiers = ["italic"] }
"constant" = { fg = "${scheme.red}" }
"constant.numeric" = { fg = "${scheme.red}" }
"string" = { fg = "${scheme.green}" }
"variable" = { fg = "${scheme.cyan}" }
"variable.builtin" = { fg = "${scheme.magenta}" }
"type" = { fg = "${scheme.cyan}" }
"type.builtin" = { fg = "${scheme.cyan}", modifiers = ["bold"] }
"function" = { fg = "${scheme.blue}" }
"function.builtin" = { fg = "${scheme.blue}" }
"keyword" = { fg = "${scheme.magenta}", modifiers = ["bold"] }
"operator" = { fg = "${scheme.cyan}" }
"punctuation" = { fg = "${scheme.white}" }
"tag" = { fg = "${scheme.blue}" }
"attribute" = { fg = "${scheme.yellow}" }
"markup.heading" = { fg = "${scheme.blue}", modifiers = ["bold"] }
"markup.link.url" = { fg = "${scheme.cyan}", modifiers = ["underline"] }
"diff.plus" = { fg = "${scheme.green}" }
"diff.minus" = { fg = "${scheme.red}" }
"diff.delta" = { fg = "${scheme.yellow}" }
"diagnostic.error" = { fg = "${scheme.red}" }
"diagnostic.warning" = { fg = "${scheme.yellow}" }
"diagnostic.info" = { fg = "${scheme.blue}" }
"diagnostic.hint" = { fg = "${scheme.cyan}" }`
    case 'vscode':
      return JSON.stringify({
        "workbench.colorCustomizations": {
          // Base
          "foreground": scheme.foreground,
          "focusBorder": scheme.primary,
          "selection.background": scheme.surface1,
          "scrollbar.shadow": scheme.crust,
          "activityBar.background": scheme.crust,
          "activityBar.foreground": scheme.foreground,
          "activityBar.inactiveForeground": scheme.brightBlack,
          "activityBar.activeBorder": scheme.primary,
          "activityBarBadge.background": scheme.primary,
          "activityBarBadge.foreground": scheme.background,
          
          // Side Bar
          "sideBar.background": scheme.mantle,
          "sideBar.foreground": scheme.foreground,
          "sideBar.border": scheme.crust,
          "sideBarSectionHeader.background": scheme.mantle,
          "sideBarSectionHeader.foreground": scheme.foreground,
          
          // Editor Groups & Tabs
          "editorGroupHeader.tabsBackground": scheme.crust,
          "tab.activeBackground": scheme.background,
          "tab.activeForeground": scheme.foreground,
          "tab.inactiveBackground": scheme.mantle,
          "tab.inactiveForeground": scheme.brightBlack,
          "tab.border": scheme.crust,
          
          // Editor
          "editor.background": scheme.background,
          "editor.foreground": scheme.foreground,
          "editorLineNumber.foreground": scheme.surface1,
          "editorLineNumber.activeForeground": scheme.primary,
          "editor.selectionBackground": scheme.surface1,
          "editor.inactiveSelectionBackground": scheme.surface0,
          "editor.lineHighlightBackground": scheme.surface0,
          "editorCursor.foreground": scheme.cursor,
          "editorWhitespace.foreground": scheme.surface1,
          "editorIndentGuide.background": scheme.surface0,
          "editorIndentGuide.activeBackground": scheme.surface1,
          
          // Lists
          "list.activeSelectionBackground": scheme.surface1,
          "list.activeSelectionForeground": scheme.foreground,
          "list.hoverBackground": scheme.surface0,
          
          // Status Bar
          "statusBar.background": scheme.crust,
          "statusBar.foreground": scheme.foreground,
          "statusBar.noFolderBackground": scheme.crust,
          "statusBar.debuggingBackground": scheme.secondary,
          "statusBar.debuggingForeground": scheme.background,
          
          // Terminal
          "terminal.background": scheme.background,
          "terminal.foreground": scheme.foreground,
          "terminal.cursorForeground": scheme.cursor,
          "terminal.ansiBlack": scheme.black,
          "terminal.ansiRed": scheme.red,
          "terminal.ansiGreen": scheme.green,
          "terminal.ansiYellow": scheme.yellow,
          "terminal.ansiBlue": scheme.blue,
          "terminal.ansiMagenta": scheme.magenta,
          "terminal.ansiCyan": scheme.cyan,
          "terminal.ansiWhite": scheme.white,
          "terminal.ansiBrightBlack": scheme.brightBlack,
          "terminal.ansiBrightRed": scheme.brightRed,
          "terminal.ansiBrightGreen": scheme.brightGreen,
          "terminal.ansiBrightYellow": scheme.brightYellow,
          "terminal.ansiBrightBlue": scheme.brightBlue,
          "terminal.ansiBrightMagenta": scheme.brightMagenta,
          "terminal.ansiBrightCyan": scheme.brightCyan,
          "terminal.ansiBrightWhite": scheme.brightWhite,
          
          // Title Bar
          "titleBar.activeBackground": scheme.crust,
          "titleBar.activeForeground": scheme.foreground,
          "titleBar.inactiveBackground": scheme.crust,
          "titleBar.inactiveForeground": scheme.brightBlack
        },
        "editor.tokenColorCustomizations": {
          "textMateRules": [
            { "scope": "keyword", "settings": { "foreground": scheme.magenta, "fontStyle": "bold" } },
            { "scope": "entity.name.function", "settings": { "foreground": scheme.blue } },
            { "scope": "string", "settings": { "foreground": scheme.green } },
            { "scope": "constant.numeric", "settings": { "foreground": scheme.red } },
            { "scope": "entity.name.type", "settings": { "foreground": scheme.yellow } },
            { "scope": "variable", "settings": { "foreground": scheme.foreground } },
            { "scope": "variable.parameter", "settings": { "foreground": scheme.yellow, "fontStyle": "italic" } },
            { "scope": "comment", "settings": { "foreground": scheme.brightBlack, "fontStyle": "italic" } },
            { "scope": "punctuation", "settings": { "foreground": scheme.white } }
          ]
        }
      }, null, 2)
    case 'warp':
      return `accent: '${scheme.blue}'
background: '${scheme.background}'
foreground: '${scheme.foreground}'
details: 'darker'
terminal_colors:
  normal:
    black: '${scheme.black}'
    red: '${scheme.red}'
    green: '${scheme.green}'
    yellow: '${scheme.yellow}'
    blue: '${scheme.blue}'
    magenta: '${scheme.magenta}'
    cyan: '${scheme.cyan}'
    white: '${scheme.white}'
  bright:
    black: '${scheme.brightBlack}'
    red: '${scheme.brightRed}'
    green: '${scheme.brightGreen}'
    yellow: '${scheme.brightYellow}'
    blue: '${scheme.brightBlue}'
    magenta: '${scheme.brightMagenta}'
    cyan: '${scheme.brightCyan}'
    white: '${scheme.brightWhite}'`
    default:
      return ''
  }
}

export function generateSettingsExport(format: string): string {
  const font = (document.getElementById('term-font') as HTMLSelectElement).value.replace(/'/g, '')
  const size = (document.getElementById('term-size') as HTMLInputElement).value
  const line = (document.getElementById('term-line-height') as HTMLInputElement).value
  const space = (document.getElementById('term-letter-spacing') as HTMLInputElement).value
  const opacity = (document.getElementById('term-opacity') as HTMLInputElement).value

  switch (format) {
    case 'ghostty':
      return `font-family = ${font}
font-size = ${size}
line-height = ${line}
letter-spacing = ${space}
background-opacity = ${opacity}`
    case 'kitty':
      return `font_family ${font}
font_size ${size}
line_spacing ${line}
letter_spacing ${space}
background_opacity ${opacity}`
    case 'wezterm':
      return `return {
  font = wezterm.font("${font}"),
  font_size = ${size},
  line_height = ${line},
  letter_spacing = ${space},
  window_background_opacity = ${opacity},
}`
    case 'alacritty':
      return `[font]
normal = { family = "${font}" }
size = ${size}

[font.offset]
x = ${space}

[window]
opacity = ${opacity}`
    case 'windowsterminal':
      return JSON.stringify({
        font: {
          face: font,
          size: parseInt(size)
        },
        opacity: Math.round(parseFloat(opacity) * 100)
      }, null, 2)
    case 'foot':
      return `[main]
font=${font}:size=${size}

[colors]
alpha=${opacity}`
    case 'zellij':
      return `# Save to ~/.config/zellij/config.kdl
theme "colorterm"`
    case 'tmux':
      return `# Save to ~/.tmux.conf
source-file ~/.tmux/colorterm.conf`
    case 'nix':
      return `# Import this into your configuration.nix or home.nix
# let colorterm = import ./colorterm.nix; in { ... }`
    case 'tailwind':
      return `// Add this to your tailwind.config.js file`
    case 'css':
      return `/* Add this to your global stylesheet */`
    case 'base16':
      return `# Base16 (YAML) Format
# Compatible with Base16 builders and templates`
    case 'helix':
      return `# Helix Settings (config.toml)
# Save theme to ~/.config/helix/themes/colorterm.toml
theme = "colorterm"`
    case 'vscode':
      return JSON.stringify({
        "terminal.integrated.fontFamily": font,
        "terminal.integrated.fontSize": parseInt(size),
        "terminal.integrated.lineHeight": parseFloat(line),
        "terminal.integrated.letterSpacing": parseFloat(space),
        "terminal.integrated.cursorBlinking": true,
        "editor.fontFamily": font,
        "editor.fontSize": parseInt(size),
        "editor.lineHeight": Math.round(parseInt(size) * parseFloat(line))
      }, null, 2) + "\n\n// Paste both color and font settings into your VS Code settings.json"
    case 'warp':
      return `font_size: ${size}
font_name: "${font}"`
    case 'xterm':
      return JSON.stringify({
        fontFamily: font,
        fontSize: parseInt(size),
        lineHeight: parseFloat(line),
        letterSpacing: parseFloat(space),
        backgroundOpacity: parseFloat(opacity)
      }, null, 2)
    case 'neovim':
      return `-- Place this in ~/.config/nvim/colors/mytheme.lua
-- Use with: :colorscheme mytheme

vim.o.termguicolors = true
vim.o.background = "${(document.getElementById('gen-tone') as HTMLSelectElement).value === 'light' ? 'light' : 'dark'}"
vim.o.guifont = "${font}:h${size}"`
    default:
      return '# Settings not supported for this format'
  }
}
