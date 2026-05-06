'use client'

import { createPortal } from 'react-dom'
import { X, Keyboard } from 'lucide-react'

interface ShortcutsModalProps {
  onClose: () => void
}

const SHORTCUTS = [
  { key: 'j', desc: 'Artículo siguiente' },
  { key: 'k', desc: 'Artículo anterior' },
  { key: 'o', desc: 'Abrir enlace original' },
  { key: 'r', desc: 'Abrir modo lector' },
  { key: 's', desc: 'Guardar / desguardar' },
  { key: 'm', desc: 'Marcar como leído' },
  { key: '?', desc: 'Mostrar esta ayuda' },
]

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl shadow-2xl w-full max-w-xs p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Atajos de teclado</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">{desc}</span>
              <kbd className="shrink-0 px-2 py-0.5 text-xs font-mono border rounded-md bg-muted text-foreground">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
