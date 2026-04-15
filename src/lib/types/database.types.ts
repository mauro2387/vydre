export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      professionals: {
        Row: {
          id: string
          user_id: string
          name: string
          specialty: string
          phone: string | null
          timezone: string
          schedule: Json
          appointment_duration: number
          onboarding_complete: boolean
          first_patient_created: boolean
          first_appointment_created: boolean
          first_reminder_sent: boolean
          activation_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          specialty: string
          phone?: string | null
          timezone?: string
          schedule?: Json
          appointment_duration?: number
          onboarding_complete?: boolean
          first_patient_created?: boolean
          first_appointment_created?: boolean
          first_reminder_sent?: boolean
          activation_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          specialty?: string
          phone?: string | null
          timezone?: string
          schedule?: Json
          appointment_duration?: number
          onboarding_complete?: boolean
          first_patient_created?: boolean
          first_appointment_created?: boolean
          first_reminder_sent?: boolean
          activation_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          id: string
          professional_id: string
          name: string
          phone: string
          email: string | null
          dob: string | null
          notes: string | null
          blood_type: string | null
          allergies: string[] | null
          chronic_conditions: string[] | null
          current_medications: string[] | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          insurance_provider: string | null
          insurance_number: string | null
          occupation: string | null
          clinical_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          name: string
          phone: string
          email?: string | null
          dob?: string | null
          notes?: string | null
          blood_type?: string | null
          allergies?: string[] | null
          chronic_conditions?: string[] | null
          current_medications?: string[] | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          insurance_provider?: string | null
          insurance_number?: string | null
          occupation?: string | null
          clinical_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          professional_id?: string
          name?: string
          phone?: string
          email?: string | null
          dob?: string | null
          notes?: string | null
          blood_type?: string | null
          allergies?: string[] | null
          chronic_conditions?: string[] | null
          current_medications?: string[] | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          insurance_provider?: string | null
          insurance_number?: string | null
          occupation?: string | null
          clinical_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          professional_id: string
          patient_id: string | null
          start_at: string
          end_at: string
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          patient_id?: string | null
          start_at: string
          end_at: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          professional_id?: string
          patient_id?: string | null
          start_at?: string
          end_at?: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointment_confirmations: {
        Row: {
          id: string
          appointment_id: string
          token: string
          response: string | null
          responded_at: string | null
          reminder_sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          token?: string
          response?: string | null
          responded_at?: string | null
          reminder_sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          token?: string
          response?: string | null
          responded_at?: string | null
          reminder_sent_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      consultation_notes: {
        Row: {
          id: string
          appointment_id: string
          reason: string | null
          treatment: string | null
          observations: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          reason?: string | null
          treatment?: string | null
          observations?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          reason?: string | null
          treatment?: string | null
          observations?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      generated_summaries: {
        Row: {
          id: string
          consultation_note_id: string
          content: string
          edited_content: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          consultation_note_id: string
          content: string
          edited_content?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          consultation_note_id?: string
          content?: string
          edited_content?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          appointment_id: string | null
          professional_id: string | null
          type: string
          channel: string
          status: string
          recipient: string
          body: string | null
          sent_at: string | null
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          appointment_id?: string | null
          professional_id?: string | null
          type: string
          channel: string
          status?: string
          recipient: string
          body?: string | null
          sent_at?: string | null
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string | null
          professional_id?: string | null
          type?: string
          channel?: string
          status?: string
          recipient?: string
          body?: string | null
          sent_at?: string | null
          error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          id: string
          name: string
          email: string
          specialty: string | null
          phone: string | null
          source: string
          status: string
          notes: string | null
          invited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          specialty?: string | null
          phone?: string | null
          source?: string
          status?: string
          notes?: string | null
          invited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          specialty?: string | null
          phone?: string | null
          source?: string
          status?: string
          notes?: string | null
          invited_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          professional_id: string
          type: string
          title: string
          body: string | null
          read: boolean
          action_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          professional_id: string
          type: string
          title: string
          body?: string | null
          read?: boolean
          action_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          professional_id?: string
          type?: string
          title?: string
          body?: string | null
          read?: boolean
          action_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      clinical_entries: {
        Row: {
          id: string
          appointment_id: string | null
          patient_id: string
          professional_id: string
          chief_complaint: string | null
          clinical_history: string | null
          physical_exam: string | null
          diagnosis: string | null
          treatment_plan: string | null
          medications: Json
          indications: string | null
          next_steps: string | null
          template_type: string
          specialty_data: Json
          ai_summary: string | null
          ai_summary_sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          appointment_id?: string | null
          patient_id: string
          professional_id: string
          chief_complaint?: string | null
          clinical_history?: string | null
          physical_exam?: string | null
          diagnosis?: string | null
          treatment_plan?: string | null
          medications?: Json
          indications?: string | null
          next_steps?: string | null
          template_type?: string
          specialty_data?: Json
          ai_summary?: string | null
          ai_summary_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string | null
          patient_id?: string
          professional_id?: string
          chief_complaint?: string | null
          clinical_history?: string | null
          physical_exam?: string | null
          diagnosis?: string | null
          treatment_plan?: string | null
          medications?: Json
          indications?: string | null
          next_steps?: string | null
          template_type?: string
          specialty_data?: Json
          ai_summary?: string | null
          ai_summary_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_medications: {
        Row: {
          id: string
          patient_id: string
          professional_id: string
          name: string
          dose: string | null
          frequency: string | null
          start_date: string | null
          end_date: string | null
          active: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          professional_id: string
          name: string
          dose?: string | null
          frequency?: string | null
          start_date?: string | null
          end_date?: string | null
          active?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          professional_id?: string
          name?: string
          dose?: string | null
          frequency?: string | null
          start_date?: string | null
          end_date?: string | null
          active?: boolean
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_patients: {
        Args: {
          prof_id: string
          search_term: string
        }
        Returns: Database['public']['Tables']['patients']['Row'][]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Professional = Database['public']['Tables']['professionals']['Row']
export type Patient = Database['public']['Tables']['patients']['Row']
export type Appointment = Database['public']['Tables']['appointments']['Row']
export type AppointmentConfirmation = Database['public']['Tables']['appointment_confirmations']['Row']
export type ConsultationNote = Database['public']['Tables']['consultation_notes']['Row']
export type GeneratedSummary = Database['public']['Tables']['generated_summaries']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type WaitlistEntry = Database['public']['Tables']['waitlist']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type ClinicalEntry = Database['public']['Tables']['clinical_entries']['Row']
export type PatientMedication = Database['public']['Tables']['patient_medications']['Row']

// Medication entry in clinical_entries jsonb
export type MedicationEntry = {
  name: string
  dose: string
  frequency: string
  notes?: string
}

// Status types
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type MessageType = 'reminder' | 'confirmation' | 'summary'
export type MessageChannel = 'email' | 'whatsapp' | 'sms'
export type MessageStatus = 'pending' | 'sent' | 'failed'
export type ConfirmationResponse = 'confirmed' | 'declined'

// Appointment con relaciones
export type AppointmentWithRelations = Appointment & {
  patients: Pick<Patient, 'id' | 'name' | 'phone' | 'email'> | null
  appointment_confirmations: Pick<
    AppointmentConfirmation,
    'response' | 'responded_at'
  > | null
  clinical_entries: Pick<ClinicalEntry, 'id'>[] | null
}

// Patient con detalle completo
export type PatientDetail = Patient & {
  appointments: (Appointment & {
    appointment_confirmations: Pick<AppointmentConfirmation, 'response'> | null
    consultation_notes: (ConsultationNote & {
      generated_summaries: GeneratedSummary | null
    }) | null
  })[]
}
