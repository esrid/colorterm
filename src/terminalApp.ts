import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { PREVIEW_CONTENT } from './constants'
import type { ColorScheme } from './types'

export class TerminalApp {
  public term: Terminal
  private fitAddon: FitAddon
  private currentLine: string = ''
  private loadedFonts: Set<string> = new Set(['JetBrains Mono', 'System Mono', 'monospace'])

  constructor(containerId: string) {
    this.term = new Terminal({
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      allowTransparency: true,
      cursorBlink: true,
    })

    this.fitAddon = new FitAddon()
    this.term.loadAddon(this.fitAddon)
    
    const container = document.getElementById(containerId)
    if (container) {
      this.term.open(container)
      this.fitAddon.fit()
    }

    this.setupInputHandling()
    this.setupResizeHandling()
  }

  private setupInputHandling() {
    this.term.onData(e => {
      switch (e) {
        case '\r': // Enter
          const cmd = this.currentLine.trim().toLowerCase()
          this.term.write('\r\n')
          this.executeCommand(cmd)
          this.term.write('\r\n\x1b[36muser@colorterm\x1b[0m:\x1b[34m~\x1b[0m$ ')
          this.currentLine = ''
          break
        case '\u007F': // Backspace
          if (this.currentLine.length > 0) {
            this.currentLine = this.currentLine.slice(0, -1)
            this.term.write('\b \b')
          }
          break
        default:
          if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7B)) {
            this.currentLine += e
            this.term.write(e)
          }
      }
    })
  }

  private executeCommand(cmd: string) {
    if (cmd === 'ls') (PREVIEW_CONTENT as any).ls(this.term)
    else if (cmd === 'help') this.term.writeln('  Available commands: ls, git, htop, neofetch, clear')
    else if (cmd === 'git') (PREVIEW_CONTENT as any).git(this.term)
    else if (cmd === 'htop') (PREVIEW_CONTENT as any).htop(this.term)
    else if (cmd === 'neofetch') (PREVIEW_CONTENT as any).neofetch(this.term)
    else if (cmd === 'clear') this.term.clear()
    else if (cmd) this.term.writeln(`  command not found: ${cmd}`)
  }

  private setupResizeHandling() {
    window.addEventListener('resize', () => {
      requestAnimationFrame(() => this.fitAddon.fit())
    })
  }

  updateTheme(scheme: ColorScheme, opacity: number) {
    const theme = { ...scheme }
    if (opacity < 1) {
      theme.background = 'rgba(0,0,0,0)'
    }
    this.term.options.theme = theme
    this.updateContainerBackground(scheme.background, opacity)
  }

  private updateContainerBackground(bg: string, opacity: number) {
    const container = document.getElementById('terminal')
    if (!container) return

    let hex = bg
    if (hex.length === 4) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
    }
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    
    container.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  setFont(family: string, name: string) {
    if (family !== 'monospace' && name !== 'JetBrains Mono') {
      this.loadGoogleFont(name)
    }
    this.term.options.fontFamily = family + ', monospace'
    requestAnimationFrame(() => this.fitAddon.fit())
  }

  private loadGoogleFont(fontName: string) {
    if (!fontName || this.loadedFonts.has(fontName)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css?family=${fontName.replace(/ /g, '+')}:400,700&display=swap`
    link.onload = () => {
      if (document.fonts) {
        document.fonts.load(`13px '${fontName}'`).then(() => {
          requestAnimationFrame(() => {
            this.fitAddon.fit()
            this.term.refresh(0, this.term.rows - 1)
          })
        })
      }
    }
    document.head.appendChild(link)
    this.loadedFonts.add(fontName)
  }

  writeSample(mode: string) {
    this.term.clear()
    this.term.writeln('  \x1b[1mTerminal Color Scheme Preview\x1b[0m\r\n')
    this.term.write('  '); [30, 31, 32, 33, 34, 35, 36, 37].forEach(c => this.term.write(`\x1b[${c}m████\x1b[0m `)); this.term.writeln(' (Normal)')
    this.term.write('  '); [30, 31, 32, 33, 34, 35, 36, 37].forEach(c => this.term.write(`\x1b[${c};1m████\x1b[0m `)); this.term.writeln(' (Bright)\r\n')
    
    if ((PREVIEW_CONTENT as any)[mode]) {
      (PREVIEW_CONTENT as any)[mode](this.term)
    }
    
    this.term.write('\r\n\x1b[36muser@colorterm\x1b[0m:\x1b[34m~\x1b[0m$ ')
  }
}
