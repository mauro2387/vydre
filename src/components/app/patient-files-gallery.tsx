'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Eye, Trash2, Download, FileText, Image as ImageIcon,
  Grid3X3, List, Search, ChevronLeft, ChevronRight, RefreshCw, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getSignedUrls } from '@/lib/actions/files'
import type { PatientFile } from '@/lib/types/database.types'

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  radiografia: 'Radiografía',
  laboratorio: 'Laboratorio',
  foto_clinica: 'Foto clínica',
  consentimiento: 'Consentimiento',
  receta: 'Receta',
  derivacion: 'Derivación',
  otro: 'Otro',
}

const HEIC_TYPES = ['image/heic', 'image/heif']

function isImage(fileType: string) {
  return fileType.startsWith('image/')
}

function isDisplayableImage(fileType: string) {
  return isImage(fileType) && !HEIC_TYPES.includes(fileType)
}

function isPdf(fileType: string) {
  return fileType === 'application/pdf'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function PatientFilesGallery({
  files,
  onDelete,
  onRefresh,
}: {
  files: PatientFile[]
  onDelete: (fileId: string) => Promise<void>
  onRefresh: () => void
}) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [urlsLoading, setUrlsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [lightboxFile, setLightboxFile] = useState<PatientFile | null>(null)
  const [pdfFile, setPdfFile] = useState<PatientFile | null>(null)
  const [deleteFile, setDeleteFile] = useState<PatientFile | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Load signed URLs
  const loadUrls = useCallback(async () => {
    if (files.length === 0) return
    setUrlsLoading(true)
    try {
      const paths = files.map(f => f.storage_path)
      const urls = await getSignedUrls(paths)
      setSignedUrls(urls)
    } catch {
      console.error('Error loading signed URLs')
    } finally {
      setUrlsLoading(false)
    }
  }, [files])

  useEffect(() => {
    loadUrls()
    // Refresh URLs before they expire (50 min)
    const timer = setTimeout(loadUrls, 50 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [loadUrls])

  // Filter files
  const filtered = useMemo(() => {
    let result = files
    if (categoryFilter !== 'all') {
      result = result.filter(f => f.category === categoryFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(f =>
        f.original_name.toLowerCase().includes(q) ||
        (f.description ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [files, categoryFilter, search])

  // Image files for lightbox navigation
  const imageFiles = useMemo(
    () => filtered.filter(f => isDisplayableImage(f.file_type)),
    [filtered]
  )

  const lightboxIndex = lightboxFile
    ? imageFiles.findIndex(f => f.id === lightboxFile.id)
    : -1

  const handleDownload = async (file: PatientFile) => {
    const url = signedUrls[file.storage_path]
    if (!url) {
      toast.error('URL expirada. Recargando...')
      loadUrls()
      return
    }
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = file.original_name
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      toast.error('Error al descargar')
    }
  }

  const handleDelete = async () => {
    if (!deleteFile) return
    setDeleting(true)
    try {
      await onDelete(deleteFile.id)
      toast.success('Archivo eliminado')
      setDeleteFile(null)
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const handleView = (file: PatientFile) => {
    if (isDisplayableImage(file.file_type)) {
      setLightboxFile(file)
    } else if (isPdf(file.file_type)) {
      setPdfFile(file)
    } else if (HEIC_TYPES.includes(file.file_type)) {
      handleDownload(file)
    }
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <ImageIcon className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No hay archivos aún.</p>
        <p className="text-xs text-muted-foreground">Subí archivos arrastrándolos a la zona de arriba.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={categoryFilter} onValueChange={(v) => { if (v) setCategoryFilter(v) }}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar archivo..."
            className="h-8 pl-7 text-xs"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} archivos</span>
        <div className="flex rounded-md border">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 ${viewMode === 'grid' ? 'bg-muted' : ''}`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 ${viewMode === 'list' ? 'bg-muted' : ''}`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map(file => (
            <FileGridCard
              key={file.id}
              file={file}
              url={signedUrls[file.storage_path]}
              onView={() => handleView(file)}
              onDelete={() => setDeleteFile(file)}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="space-y-1">
          {filtered.map(file => (
            <FileListRow
              key={file.id}
              file={file}
              url={signedUrls[file.storage_path]}
              onView={() => handleView(file)}
              onDelete={() => setDeleteFile(file)}
              onDownload={() => handleDownload(file)}
            />
          ))}
        </div>
      )}

      {/* Image Lightbox */}
      <Dialog open={!!lightboxFile} onOpenChange={() => setLightboxFile(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>{lightboxFile?.original_name}</DialogTitle>
            <DialogDescription>Vista previa del archivo</DialogDescription>
          </DialogHeader>
          {lightboxFile && signedUrls[lightboxFile.storage_path] && (
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrls[lightboxFile.storage_path]}
                alt={lightboxFile.original_name}
                className="max-h-[75vh] rounded-md object-contain"
              />
              <div className="flex items-center gap-2">
                {imageFiles.length > 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const prev = (lightboxIndex - 1 + imageFiles.length) % imageFiles.length
                      setLightboxFile(imageFiles[prev])
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => handleDownload(lightboxFile)}>
                  <Download className="mr-1 h-4 w-4" />
                  Descargar
                </Button>
                {imageFiles.length > 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const next = (lightboxIndex + 1) % imageFiles.length
                      setLightboxFile(imageFiles[next])
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {lightboxFile.original_name}
                {imageFiles.length > 1 && ` · ${lightboxIndex + 1} de ${imageFiles.length}`}
              </p>
            </div>
          )}
          {lightboxFile && !signedUrls[lightboxFile.storage_path] && (
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="text-sm text-muted-foreground">URL expirada</p>
              <Button size="sm" variant="outline" onClick={loadUrls}>
                <RefreshCw className="mr-1 h-4 w-4" />
                Recargar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Viewer */}
      <Dialog open={!!pdfFile} onOpenChange={() => setPdfFile(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>{pdfFile?.original_name}</DialogTitle>
            <DialogDescription>Vista previa PDF</DialogDescription>
          </DialogHeader>
          {pdfFile && signedUrls[pdfFile.storage_path] && (
            <div className="flex flex-col gap-2">
              <object
                data={signedUrls[pdfFile.storage_path]}
                type="application/pdf"
                className="h-[80vh] w-full rounded-md"
              >
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No se puede mostrar el PDF. Usá el botón para abrirlo.
                </p>
              </object>
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(signedUrls[pdfFile.storage_path], '_blank')}
                >
                  Abrir en nueva pestaña
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDownload(pdfFile)}>
                  <Download className="mr-1 h-4 w-4" />
                  Descargar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar &ldquo;{deleteFile?.original_name}&rdquo;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Grid card ──────────────────────────────────────────────
function FileGridCard({
  file,
  url,
  onView,
  onDelete,
}: {
  file: PatientFile
  url?: string
  onView: () => void
  onDelete: () => void
}) {
  const timeAgo = formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true, locale: es })

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-background">
      {/* Thumbnail */}
      <div className="relative flex h-36 items-center justify-center bg-muted/50">
        {isDisplayableImage(file.file_type) && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.original_name} className="h-full w-full object-cover" />
        ) : isPdf(file.file_type) ? (
          <FileText className="h-12 w-12 text-red-400" />
        ) : (
          <ImageIcon className="h-12 w-12 text-muted-foreground" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onView}
            className="rounded-full bg-white/90 p-2 transition-colors hover:bg-white"
          >
            <Eye className="h-4 w-4 text-gray-800" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-full bg-white/90 p-2 transition-colors hover:bg-white"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="line-clamp-2 text-xs font-medium">{file.original_name}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <Badge variant="secondary" className="px-1 py-0 text-[10px]">
            {CATEGORY_LABELS[file.category] ?? file.category}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
        </div>
      </div>
    </div>
  )
}

// ─── List row ───────────────────────────────────────────────
function FileListRow({
  file,
  url,
  onView,
  onDelete,
  onDownload,
}: {
  file: PatientFile
  url?: string
  onView: () => void
  onDelete: () => void
  onDownload: () => void
}) {
  const timeAgo = formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true, locale: es })

  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/50">
      {/* Mini thumbnail */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
        {isDisplayableImage(file.file_type) && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : isPdf(file.file_type) ? (
          <FileText className="h-5 w-5 text-red-400" />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.original_name}</p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-1 py-0 text-[10px]">
            {CATEGORY_LABELS[file.category] ?? file.category}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{formatFileSize(file.file_size)}</span>
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <button onClick={onView} className="rounded p-1.5 hover:bg-muted">
          <Eye className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={onDownload} className="rounded p-1.5 hover:bg-muted">
          <Download className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={onDelete} className="rounded p-1.5 hover:bg-muted">
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      </div>
    </div>
  )
}
