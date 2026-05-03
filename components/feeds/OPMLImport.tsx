'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/providers/ToastProvider'
import { cn } from '@/lib/utils'

interface OPMLImportProps {
  onImported: () => void
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export function OPMLImport({ onImported }: OPMLImportProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.opml') && !file.name.endsWith('.xml')) {
      toast({ title: 'Formato incorrecto', description: 'El archivo debe ser .opml o .xml', variant: 'destructive' })
      return
    }

    setStatus('loading')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/opml/import', { method: 'POST', body: formData })
      const data = await res.json() as { inserted?: number; skipped?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error importando')
      const inserted = data.inserted ?? 0
      const skipped = data.skipped ?? 0
      setResult({ inserted, skipped })
      setStatus('success')
      toast({ title: `${inserted} feed${inserted !== 1 ? 's' : ''} importados` })
      onImported()
    } catch (err) {
      setStatus('error')
      toast({
        title: 'Error al importar',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer text-center',
          dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          status === 'loading' && 'pointer-events-none opacity-60'
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".opml,.xml"
          className="hidden"
          onChange={handleInputChange}
        />

        {status === 'loading' ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : status === 'success' ? (
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        ) : status === 'error' ? (
          <AlertCircle className="h-8 w-8 text-destructive" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}

        <div>
          <p className="text-sm font-medium">
            {status === 'loading' && 'Importando feeds…'}
            {status === 'success' && '¡Importación completada!'}
            {status === 'error' && 'Error en la importación'}
            {status === 'idle' && 'Arrastra tu archivo OPML aquí'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status === 'idle' && 'o haz clic para seleccionarlo · .opml o .xml'}
            {status === 'success' && result && (
              `${result.inserted} añadidos · ${result.skipped} duplicados omitidos`
            )}
          </p>
        </div>

        {(status === 'success' || status === 'error') && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setStatus('idle') }}
          >
            Importar otro archivo
          </Button>
        )}
      </div>

      <div className="rounded-lg bg-muted/40 border p-4 flex flex-col gap-2">
        <p className="text-xs font-medium flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          Cómo exportar desde Feedly
        </p>
        <ol className="text-xs text-muted-foreground flex flex-col gap-1 list-decimal list-inside">
          <li>Abre Feedly y ve a <strong>Preferences</strong></li>
          <li>Busca la sección <strong>Import / Export</strong></li>
          <li>Haz clic en <strong>Export as OPML</strong></li>
          <li>Sube el archivo descargado aquí</li>
        </ol>
      </div>
    </div>
  )
}
