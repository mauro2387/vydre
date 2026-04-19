'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { registerFileUpload } from '@/lib/actions/files'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'image/gif', 'image/heic', 'image/heif',
  'application/pdf',
]

export type UploadingFile = {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export function useFileUpload(params: {
  patientId: string
  professionalId: string
  clinicalEntryId?: string
  onSuccess?: () => void
}) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Tipo no permitido: ${file.type}. Permitidos: JPG, PNG, PDF, WEBP, HEIC`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Supera el límite de 20MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`
    }
    return null
  }

  const generateStoragePath = (file: File): string => {
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, '')
    const safeName = nameWithoutExt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase()
      .slice(0, 100)
    return `${params.professionalId}/${params.patientId}/${timestamp}_${safeName}.${ext}`
  }

  const uploadFiles = useCallback(async (
    files: FileList | File[],
    category: string = 'general',
    description?: string
  ) => {
    const fileArray = Array.from(files)
    const supabase = createClient()

    const newUploading: UploadingFile[] = fileArray.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status: 'pending' as const,
    }))

    setUploadingFiles(prev => [...prev, ...newUploading])

    for (const uploadingFile of newUploading) {
      const { file } = uploadingFile

      const validationError = validateFile(file)
      if (validationError) {
        setUploadingFiles(prev => prev.map(f =>
          f.id === uploadingFile.id
            ? { ...f, status: 'error' as const, error: validationError }
            : f
        ))
        continue
      }

      setUploadingFiles(prev => prev.map(f =>
        f.id === uploadingFile.id
          ? { ...f, status: 'uploading' as const, progress: 10 }
          : f
      ))

      try {
        const storagePath = generateStoragePath(file)

        // Simulate progress: uploading to storage
        setUploadingFiles(prev => prev.map(f =>
          f.id === uploadingFile.id ? { ...f, progress: 30 } : f
        ))

        const { error: uploadError } = await supabase.storage
          .from('patient-files')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw new Error(uploadError.message)

        setUploadingFiles(prev => prev.map(f =>
          f.id === uploadingFile.id ? { ...f, progress: 80 } : f
        ))

        // Register in DB
        await registerFileUpload({
          patientId: params.patientId,
          clinicalEntryId: params.clinicalEntryId,
          storagePath,
          filename: storagePath.split('/').pop()!,
          originalName: file.name,
          fileType: file.type,
          fileSize: file.size,
          category,
          description,
        })

        setUploadingFiles(prev => prev.map(f =>
          f.id === uploadingFile.id
            ? { ...f, status: 'success' as const, progress: 100 }
            : f
        ))

        params.onSuccess?.()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al subir el archivo'
        setUploadingFiles(prev => prev.map(f =>
          f.id === uploadingFile.id
            ? { ...f, status: 'error' as const, error: message }
            : f
        ))
      }
    }

    // Clear successful uploads after 3s
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(f => f.status !== 'success'))
    }, 3000)
  }, [params])

  const clearErrors = useCallback(() => {
    setUploadingFiles(prev => prev.filter(f => f.status !== 'error'))
  }, [])

  return { uploadingFiles, uploadFiles, clearErrors }
}
