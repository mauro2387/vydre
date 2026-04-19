'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getProfessional } from './professional'
import { logAuditEvent } from '@/lib/audit'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'image/gif', 'image/heic', 'image/heif',
  'application/pdf',
]

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getPatientFiles(patientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) return []

  const { data, error } = await supabase
    .from('patient_files')
    .select('*')
    .eq('patient_id', patientId)
    .eq('professional_id', professional.id)
    .order('uploaded_at', { ascending: false })

  if (error) return []
  return data
}

export async function getClinicalEntryFiles(entryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) return []

  const { data, error } = await supabase
    .from('patient_files')
    .select('*')
    .eq('clinical_entry_id', entryId)
    .eq('professional_id', professional.id)
    .order('uploaded_at', { ascending: false })

  if (error) return []
  return data
}

export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const professional = await getProfessional()
  if (!professional) return null

  if (!storagePath.startsWith(professional.id)) return null

  const serviceClient = getServiceClient()
  const { data, error } = await serviceClient
    .storage
    .from('patient-files')
    .createSignedUrl(storagePath, 3600)

  if (error || !data) return null
  return data.signedUrl
}

export async function getSignedUrls(
  storagePaths: string[]
): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const professional = await getProfessional()
  if (!professional) return {}

  const validPaths = storagePaths.filter(p => p.startsWith(professional.id))
  if (validPaths.length === 0) return {}

  const serviceClient = getServiceClient()
  const { data, error } = await serviceClient
    .storage
    .from('patient-files')
    .createSignedUrls(validPaths, 3600)

  if (error || !data) return {}

  const results: Record<string, string> = {}
  data.forEach(item => {
    if (item.signedUrl) {
      results[item.path ?? ''] = item.signedUrl
    }
  })
  return results
}

export async function registerFileUpload(params: {
  patientId: string
  clinicalEntryId?: string
  storagePath: string
  filename: string
  originalName: string
  fileType: string
  fileSize: number
  category: string
  description?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  // Security validations
  if (!params.storagePath.startsWith(professional.id)) {
    throw new Error('Path de archivo inválido')
  }
  if (params.fileSize > MAX_FILE_SIZE) {
    throw new Error('El archivo supera el límite de 20MB')
  }
  if (!ALLOWED_TYPES.includes(params.fileType)) {
    throw new Error('Tipo de archivo no permitido')
  }

  // Verify patient belongs to professional
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('id', params.patientId)
    .eq('professional_id', professional.id)
    .single()

  if (!patient) throw new Error('Paciente no encontrado')

  const { data, error } = await supabase
    .from('patient_files')
    .insert({
      professional_id: professional.id,
      patient_id: params.patientId,
      clinical_entry_id: params.clinicalEntryId ?? null,
      storage_path: params.storagePath,
      filename: params.filename,
      original_name: params.originalName,
      file_type: params.fileType,
      file_size: params.fileSize,
      category: params.category,
      description: params.description ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  void logAuditEvent({
    professionalId: professional.id,
    userId: user.id,
    action: 'file.uploaded',
    resourceType: 'patient_file',
    resourceId: data.id,
    metadata: { filename: params.originalName, category: params.category },
  })

  revalidatePath('/pacientes')
  return data
}

export async function deletePatientFile(fileId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const { data: file, error: fetchError } = await supabase
    .from('patient_files')
    .select('storage_path, professional_id, original_name')
    .eq('id', fileId)
    .eq('professional_id', professional.id)
    .single()

  if (fetchError || !file) throw new Error('Archivo no encontrado')

  const serviceClient = getServiceClient()
  const { error: storageError } = await serviceClient
    .storage
    .from('patient-files')
    .remove([file.storage_path])

  if (storageError) {
    console.error('Error eliminando de Storage:', storageError)
  }

  const { error: dbError } = await supabase
    .from('patient_files')
    .delete()
    .eq('id', fileId)
    .eq('professional_id', professional.id)

  if (dbError) throw new Error(dbError.message)

  void logAuditEvent({
    professionalId: professional.id,
    userId: user.id,
    action: 'file.deleted',
    resourceType: 'patient_file',
    resourceId: fileId,
    metadata: { filename: file.original_name },
  })

  revalidatePath('/pacientes')
}

export async function updateFileMetadata(
  fileId: string,
  data: { description?: string; category?: string }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const professional = await getProfessional()
  if (!professional) throw new Error('Profesional no encontrado')

  const { error } = await supabase
    .from('patient_files')
    .update(data)
    .eq('id', fileId)
    .eq('professional_id', professional.id)

  if (error) throw new Error(error.message)
  revalidatePath('/pacientes')
}

export async function getStorageUsage(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const professional = await getProfessional()
  if (!professional) return 0

  const { data } = await supabase
    .from('patient_files')
    .select('file_size')
    .eq('professional_id', professional.id)

  if (!data) return 0
  return data.reduce((sum, f) => sum + (f.file_size ?? 0), 0)
}
