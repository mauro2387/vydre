'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useFileUpload, type UploadingFile } from '@/lib/hooks/use-file-upload'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'radiografia', label: 'Radiografía' },
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'foto_clinica', label: 'Foto clínica' },
  { value: 'consentimiento', label: 'Consentimiento' },
  { value: 'receta', label: 'Receta' },
  { value: 'derivacion', label: 'Derivación' },
  { value: 'otro', label: 'Otro' },
]

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf'

export function FileUploadZone({
  patientId,
  professionalId,
  clinicalEntryId,
  onUploadComplete,
  compact = false,
}: {
  patientId: string
  professionalId: string
  clinicalEntryId?: string
  onUploadComplete?: () => void
  compact?: boolean
}) {
  const [dragOver, setDragOver] = useState(false)
  const [category, setCategory] = useState('general')
  const [description, setDescription] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMobile('ontouchstart' in window)
  }, [])

  const { uploadingFiles, uploadFiles, clearErrors } = useFileUpload({
    patientId,
    professionalId,
    clinicalEntryId,
    onSuccess: onUploadComplete,
  })

  const handleFiles = useCallback((files: FileList | File[]) => {
    const cat = compact ? 'foto_clinica' : category
    const desc = compact ? undefined : (description || undefined)
    uploadFiles(files, cat, desc)
    setDescription('')
  }, [uploadFiles, category, description, compact])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleClick = () => inputRef.current?.click()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          compact ? 'min-h-[80px] p-3' : 'min-h-[120px] p-6'
        } ${
          dragOver
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
            : 'border-border bg-secondary/50 hover:border-muted-foreground/50'
        }`}
      >
        <Upload className={`mb-2 ${compact ? 'h-5 w-5' : 'h-8 w-8'} ${
          dragOver ? 'text-blue-500' : 'text-muted-foreground'
        }`} />
        {dragOver ? (
          <p className="text-sm font-medium text-blue-600">Soltá para subir</p>
        ) : (
          <>
            <p className={`text-center font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
              {isMobile ? 'Tocá para seleccionar archivos' : 'Arrastrá archivos acá o hacé click para seleccionar'}
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              JPG, PNG, PDF, WEBP hasta 20MB
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={handleInputChange}
          className="hidden"
          {...(isMobile ? { capture: 'environment' as const } : {})}
        />
      </div>

      {/* Category + description (only in full mode) */}
      {!compact && (
        <div className="flex gap-3">
          <div className="w-48 space-y-1">
            <Label className="text-xs">Categoría</Label>
            <Select value={category} onValueChange={(v) => { if (v) setCategory(v) }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Descripción (opcional)</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripción del archivo"
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map(f => (
            <UploadProgressItem key={f.id} item={f} onDismiss={clearErrors} />
          ))}
        </div>
      )}
    </div>
  )
}

function UploadProgressItem({ item, onDismiss }: { item: UploadingFile; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background p-2">
      {item.status === 'uploading' && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />}
      {item.status === 'success' && <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />}
      {item.status === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />}
      {item.status === 'pending' && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{item.file.name}</p>
        {item.status === 'uploading' && (
          <Progress value={item.progress} className="mt-1 h-1.5" />
        )}
        {item.status === 'success' && (
          <p className="text-xs text-green-600">Listo</p>
        )}
        {item.status === 'error' && (
          <p className="text-xs text-red-600">{item.error}</p>
        )}
      </div>

      {item.status === 'error' && (
        <button onClick={onDismiss} className="shrink-0 rounded p-0.5 hover:bg-muted">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
