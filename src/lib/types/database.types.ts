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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

// Status types
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type MessageType = 'reminder' | 'confirmation' | 'summary'
export type MessageChannel = 'email' | 'whatsapp' | 'sms'
export type MessageStatus = 'pending' | 'sent' | 'failed'
export type ConfirmationResponse = 'confirmed' | 'declined'
