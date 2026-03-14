import { EditorView, basicSetup } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { rust } from '@codemirror/lang-rust'
import { python } from '@codemirror/lang-python'
import { go } from '@codemirror/lang-go'
import { cpp } from '@codemirror/lang-cpp'
import { html } from '@codemirror/lang-html'
import { sql } from '@codemirror/lang-sql'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { tags as t } from '@lezer/highlight'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { ColorScheme } from './types'

export class EditorPreview {
  private view: EditorView
  private themeCompartment = new Compartment()
  private languageCompartment = new Compartment()

  constructor(parent: HTMLElement) {
    this.view = new EditorView({
      state: EditorState.create({
        extensions: [
          basicSetup,
          this.themeCompartment.of([]),
          this.languageCompartment.of(javascript()),
          EditorView.editable.of(false),
          EditorView.theme({
            '&': { height: '100%', fontSize: '14px' },
            '.cm-scroller': { fontFamily: '"JetBrains Mono", monospace' },
            '.cm-gutters': { border: 'none' }
          })
        ]
      }),
      parent
    })
  }

  updateTheme(scheme: ColorScheme) {
    const highlightStyle = HighlightStyle.define([
      { tag: t.keyword, color: scheme.magenta, fontWeight: 'bold' },
      { tag: t.operator, color: scheme.cyan },
      { tag: t.variableName, color: scheme.foreground },
      { tag: [t.function(t.variableName), t.function(t.propertyName)], color: scheme.blue },
      { tag: [t.string, t.special(t.string)], color: scheme.green },
      { tag: [t.number, t.self, t.null, t.atom, t.bool], color: scheme.red },
      { tag: [t.typeName, t.className, t.namespace, t.macroName], color: scheme.yellow },
      { tag: t.comment, color: scheme.brightBlack, fontStyle: 'italic' },
      { tag: t.meta, color: scheme.accent },
      { tag: t.punctuation, color: scheme.white },
      { tag: t.propertyName, color: scheme.cyan },
      { tag: t.heading, color: scheme.blue, fontWeight: 'bold' },
      { tag: t.link, color: scheme.accent, textDecoration: 'underline' },
      { tag: t.strikethrough, textDecoration: 'line-through' },
      { tag: t.invalid, color: scheme.red },
    ])

    const theme = EditorView.theme({
      '&': {
        color: scheme.foreground,
        backgroundColor: scheme.background
      },
      '.cm-content': {
        caretColor: scheme.cursor
      },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: scheme.cursor },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: scheme.surface1 },
      '.cm-gutters': {
        backgroundColor: scheme.mantle,
        color: scheme.surface1,
        borderRight: `1px solid ${scheme.crust}`
      },
      '.cm-activeLine': { backgroundColor: scheme.surface0 },
      '.cm-activeLineGutter': { backgroundColor: scheme.surface0, color: scheme.primary },
    }, { dark: true })

    this.view.dispatch({
      effects: this.themeCompartment.reconfigure([theme, syntaxHighlighting(highlightStyle)])
    })
  }

  setLanguage(lang: string) {
    let extension = javascript()
    switch (lang) {
      case 'rust': extension = rust(); break
      case 'python': extension = python(); break
      case 'go': extension = go(); break
      case 'cpp': extension = cpp(); break
      case 'html': extension = html(); break
      case 'sql': extension = sql(); break
      case 'json': extension = json(); break
      case 'markdown': extension = markdown(); break
    }

    this.view.dispatch({
      effects: this.languageCompartment.reconfigure(extension)
    })
  }

  setContent(content: string) {
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: content }
    })
  }

  show() {
    this.view.dom.style.display = 'block'
  }

  hide() {
    this.view.dom.style.display = 'none'
  }
}
