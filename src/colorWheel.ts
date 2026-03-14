import { hexToHsl, hslToHex } from './colorUtils'

export type HarmonyMode = 'none' | 'complementary' | 'triadic' | 'analogous' | 'split-complementary' | 'tetradic'

export class ColorWheel {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private radius: number
  private centerX: number
  private centerY: number
  private harmonyMode: HarmonyMode = 'none'
  private colors: Record<string, { h: number, s: number, l: number }> = {}
  private activeId: string | null = null
  private onColorChange: (id: string, hex: string) => void
  private bgCanvas: HTMLCanvasElement | null = null
  private frameRequested: boolean = false

  constructor(container: HTMLElement, onColorChange: (id: string, hex: string) => void) {
    this.canvas = document.createElement('canvas')
    container.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d', { alpha: false })!
    this.onColorChange = onColorChange

    const size = container.clientWidth || 250
    this.canvas.width = size
    this.canvas.height = size
    this.radius = (size / 2) - 20
    this.centerX = size / 2
    this.centerY = size / 2

    this.preRenderBackground()
    this.setupListeners()
    this.draw()
  }

  private preRenderBackground() {
    this.bgCanvas = document.createElement('canvas')
    this.bgCanvas.width = this.canvas.width
    this.bgCanvas.height = this.canvas.height
    const ctx = this.bgCanvas.getContext('2d')!

    // Draw Hue Wheel (Background)
    for (let i = 0; i < 360; i++) {
      ctx.beginPath()
      ctx.moveTo(this.centerX, this.centerY)
      const startAngle = (i - 1) * (Math.PI / 180)
      const endAngle = (i + 1) * (Math.PI / 180)
      ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle)
      ctx.closePath()
      const gradient = ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, this.radius)
      gradient.addColorStop(0, '#fff')
      gradient.addColorStop(1, `hsl(${i}, 100%, 50%)`)
      ctx.fillStyle = gradient
      ctx.fill()
    }
  }

  setHarmonyMode(mode: HarmonyMode) {
    this.harmonyMode = mode
    if (mode !== 'none' && this.colors['primary']) {
      this.applyHarmony('primary', this.colors['primary'].h)
    }
    this.requestDraw()
  }

  updateColors(newColors: Record<string, string>) {
    Object.entries(newColors).forEach(([id, hex]) => {
      this.colors[id] = hexToHsl(hex)
    })
    this.requestDraw()
  }

  private setupListeners() {
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
      const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top
      return { x, y }
    }

    const handleStart = (e: MouseEvent | TouchEvent) => {
      const { x, y } = getPos(e)
      const ids = ['primary', 'secondary', 'accent', 'foreground', 'background']
      
      for (const id of ids) {
        if (!this.colors[id]) continue
        const pos = this.getHandlePos(this.colors[id].h, this.colors[id].s)
        const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
        if (dist < 15) {
          this.activeId = id
          e.preventDefault()
          return
        }
      }
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.activeId) return
      const { x, y } = getPos(e)
      const dx = x - this.centerX
      const dy = y - this.centerY
      
      let h = Math.atan2(dy, dx) * (180 / Math.PI)
      if (h < 0) h += 360
      
      const dist = Math.sqrt(dx * dx + dy * dy)
      const s = Math.min(100, (dist / this.radius) * 100)

      this.updateColor(this.activeId, h, s)
      e.preventDefault()
    }

    const handleEnd = () => {
      this.activeId = null
    }

    this.canvas.addEventListener('mousedown', handleStart)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    
    this.canvas.addEventListener('touchstart', handleStart, { passive: false })
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
  }

  private updateColor(id: string, h: number, s: number) {
    const l = this.colors[id]?.l ?? 50
    this.colors[id] = { h, s, l }
    this.onColorChange(id, hslToHex(h, s, l))

    if (id === 'primary' && this.harmonyMode !== 'none') {
      this.applyHarmony(id, h)
    }
    this.requestDraw()
  }

  private requestDraw() {
    if (this.frameRequested) return
    this.frameRequested = true
    requestAnimationFrame(() => {
      this.draw()
      this.frameRequested = false
    })
  }

  private applyHarmony(baseId: string, h: number) {
    const s = this.colors[baseId].s

    const set = (id: string, hueOffset: number) => {
      if (!this.colors[id]) return
      const newH = (h + hueOffset) % 360
      this.colors[id] = { h: newH < 0 ? newH + 360 : newH, s, l: this.colors[id].l }
      this.onColorChange(id, hslToHex(this.colors[id].h, s, this.colors[id].l))
    }

    switch (this.harmonyMode) {
      case 'complementary':
        set('secondary', 180)
        break
      case 'triadic':
        set('secondary', 120)
        set('accent', 240)
        break
      case 'analogous':
        set('secondary', 30)
        set('accent', -30)
        break
      case 'split-complementary':
        set('secondary', 150)
        set('accent', 210)
        break
      case 'tetradic':
        set('secondary', 90)
        set('accent', 180)
        break
    }
  }

  private getHandlePos(h: number, s: number) {
    const angle = h * (Math.PI / 180)
    const dist = (s / 100) * this.radius
    return {
      x: this.centerX + Math.cos(angle) * dist,
      y: this.centerY + Math.sin(angle) * dist
    }
  }

  private draw() {
    // Fill with background color to avoid transparent trails
    this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#0f0f0f'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw Pre-rendered Hue Wheel
    if (this.bgCanvas) {
      this.ctx.drawImage(this.bgCanvas, 0, 0)
    }

    // Draw Harmony Lines
    if (this.harmonyMode !== 'none' && this.colors['primary']) {
      const p = this.getHandlePos(this.colors['primary'].h, this.colors['primary'].s)
      this.ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      this.ctx.lineWidth = 1
      
      const targets = ['secondary', 'accent']
      targets.forEach(t => {
        if (this.colors[t]) {
          const tp = this.getHandlePos(this.colors[t].h, this.colors[t].s)
          this.ctx.beginPath()
          this.ctx.moveTo(p.x, p.y)
          this.ctx.lineTo(tp.x, tp.y)
          this.ctx.stroke()
        }
      })
    }

    // Draw Handles
    const ids = ['background', 'foreground', 'primary', 'secondary', 'accent']
    ids.forEach(id => {
      const color = this.colors[id]
      if (!color) return

      const pos = this.getHandlePos(color.h, color.s)
      const hex = hslToHex(color.h, color.s, color.l)

      this.ctx.beginPath()
      this.ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2)
      this.ctx.fillStyle = hex
      this.ctx.fill()
      this.ctx.strokeStyle = id === this.activeId ? '#fff' : 'rgba(255,255,255,0.8)'
      this.ctx.lineWidth = id === this.activeId ? 3 : 2
      this.ctx.stroke()
      
      // Label
      this.ctx.fillStyle = 'rgba(255,255,255,0.8)'
      this.ctx.font = 'bold 8px monospace'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(id.charAt(0).toUpperCase(), pos.x, pos.y + 3)
    })
  }
}
