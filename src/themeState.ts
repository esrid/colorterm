import type { ColorScheme } from './types'
import { DEFAULT_SCHEME } from './constants'
import { generateCoherentTheme } from './themeGenerator'
import type { GenerationStrategy } from './themeGenerator'
import { generatePerceptualPair } from './colorUtils'

export class ThemeState {
  private currentScheme: ColorScheme
  private baseScheme: ColorScheme
  private lockedColors: Set<string> = new Set()
  private historyStack: ColorScheme[] = []
  private redoStack: ColorScheme[] = []

  constructor(initialScheme?: ColorScheme) {
    this.currentScheme = initialScheme || { ...DEFAULT_SCHEME }
    this.baseScheme = { ...this.currentScheme }
  }

  getCurrentScheme(): ColorScheme {
    return { ...this.currentScheme }
  }

  getBaseScheme(): ColorScheme {
    return { ...this.baseScheme }
  }

  setScheme(scheme: ColorScheme, updateBase = true) {
    this.pushToHistory()
    this.currentScheme = { ...scheme }
    if (updateBase) {
      this.baseScheme = { ...this.currentScheme }
    }
  }

  updateCurrentColor(id: string, value: string) {
    (this.currentScheme as any)[id] = value
    this.baseScheme = { ...this.currentScheme }
  }

  toggleLock(id: string): boolean {
    if (this.lockedColors.has(id)) {
      this.lockedColors.delete(id)
      return false
    } else {
      this.lockedColors.add(id)
      return true
    }
  }

  isLocked(id: string): boolean {
    return this.lockedColors.has(id)
  }

  getLockedColors(): Set<string> {
    return new Set(this.lockedColors)
  }

  randomize(strategy: GenerationStrategy = 'tonal') {
    this.pushToHistory()
    this.currentScheme = generateCoherentTheme(this.currentScheme, this.lockedColors, strategy)
    this.baseScheme = { ...this.currentScheme }
  }

  invert() {
    this.pushToHistory()
    this.currentScheme = generatePerceptualPair(this.currentScheme)
    this.baseScheme = { ...this.currentScheme }
  }

  applyVariant(fn: (s: ColorScheme) => ColorScheme) {
    this.pushToHistory()
    this.currentScheme = fn(this.baseScheme)
  }

  private pushToHistory() {
    this.historyStack.push({ ...this.currentScheme })
    this.redoStack.length = 0
    if (this.historyStack.length > 50) this.historyStack.shift()
  }

  undo(): boolean {
    if (this.historyStack.length === 0) return false
    this.redoStack.push({ ...this.currentScheme })
    this.currentScheme = this.historyStack.pop()!
    this.baseScheme = { ...this.currentScheme }
    return true
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false
    this.historyStack.push({ ...this.currentScheme })
    this.currentScheme = this.redoStack.pop()!
    this.baseScheme = { ...this.currentScheme }
    return true
  }
}
