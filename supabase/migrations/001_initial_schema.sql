-- Enable extensions
create extension if not exists "uuid-ossp";

-- =====================
-- TABLE: professionals
-- =====================
create table professionals (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete cascade not null unique,
  name                 text not null,
  specialty            text not null,
  phone                text,
  timezone             text not null default 'America/Montevideo',
  schedule             jsonb not null default '{}',
  appointment_duration int not null default 30,
  onboarding_complete  boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- =====================
-- TABLE: patients
-- =====================
create table patients (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid references professionals(id) on delete cascade not null,
  name            text not null,
  phone           text not null,
  email           text,
  dob             date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- =====================
-- TABLE: appointments
-- =====================
create table appointments (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid references professionals(id) on delete cascade not null,
  patient_id      uuid references patients(id) on delete set null,
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  status          text not null default 'scheduled'
    check (status in ('scheduled','confirmed','cancelled','completed','no_show')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint appointments_no_overlap
    exclude using gist (
      professional_id with =,
      tstzrange(start_at, end_at, '[)') with &&
    )
);

-- Index para queries frecuentes
create index idx_appointments_professional_start 
  on appointments(professional_id, start_at);
create index idx_appointments_status 
  on appointments(status);

-- =====================
-- TABLE: appointment_confirmations
-- =====================
create table appointment_confirmations (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade not null unique,
  token          text not null unique default gen_random_uuid()::text,
  response       text check (response in ('confirmed','declined')),
  responded_at   timestamptz,
  reminder_sent_at timestamptz,
  created_at     timestamptz not null default now()
);

-- =====================
-- TABLE: consultation_notes
-- =====================
create table consultation_notes (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade not null unique,
  reason         text,
  treatment      text,
  observations   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- =====================
-- TABLE: generated_summaries
-- =====================
create table generated_summaries (
  id                   uuid primary key default gen_random_uuid(),
  consultation_note_id uuid references consultation_notes(id) on delete cascade not null unique,
  content              text not null,
  edited_content       text,
  sent_at              timestamptz,
  created_at           timestamptz not null default now()
);

-- =====================
-- TABLE: messages
-- =====================
create table messages (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade,
  professional_id uuid references professionals(id) on delete cascade,
  type           text not null check (type in ('reminder','confirmation','summary')),
  channel        text not null check (channel in ('email','whatsapp','sms')),
  status         text not null default 'pending'
    check (status in ('pending','sent','failed')),
  recipient      text not null,
  body           text,
  sent_at        timestamptz,
  error          text,
  created_at     timestamptz not null default now()
);

-- =====================
-- UPDATED_AT TRIGGERS
-- =====================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger professionals_updated_at
  before update on professionals
  for each row execute function update_updated_at();

create trigger patients_updated_at
  before update on patients
  for each row execute function update_updated_at();

create trigger appointments_updated_at
  before update on appointments
  for each row execute function update_updated_at();

create trigger consultation_notes_updated_at
  before update on consultation_notes
  for each row execute function update_updated_at();

-- =====================
-- ROW LEVEL SECURITY
-- =====================
alter table professionals enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table appointment_confirmations enable row level security;
alter table consultation_notes enable row level security;
alter table generated_summaries enable row level security;
alter table messages enable row level security;

-- professionals: solo el dueño
create policy "professionals_self" on professionals
  for all using (auth.uid() = user_id);

-- patients: solo el profesional dueño
create policy "patients_own_professional" on patients
  for all using (
    professional_id in (
      select id from professionals where user_id = auth.uid()
    )
  );

-- appointments: solo el profesional dueño
create policy "appointments_own_professional" on appointments
  for all using (
    professional_id in (
      select id from professionals where user_id = auth.uid()
    )
  );

-- appointment_confirmations: lectura pública por token (para página de confirmación)
-- escritura solo por service role (desde API route)
create policy "confirmations_public_read" on appointment_confirmations
  for select using (true);

create policy "confirmations_own_professional" on appointment_confirmations
  for all using (
    appointment_id in (
      select a.id from appointments a
      join professionals p on p.id = a.professional_id
      where p.user_id = auth.uid()
    )
  );

-- consultation_notes: solo el profesional dueño
create policy "notes_own_professional" on consultation_notes
  for all using (
    appointment_id in (
      select a.id from appointments a
      join professionals p on p.id = a.professional_id
      where p.user_id = auth.uid()
    )
  );

-- generated_summaries: solo el profesional dueño
create policy "summaries_own_professional" on generated_summaries
  for all using (
    consultation_note_id in (
      select cn.id from consultation_notes cn
      join appointments a on a.id = cn.appointment_id
      join professionals p on p.id = a.professional_id
      where p.user_id = auth.uid()
    )
  );

-- messages: solo el profesional dueño
create policy "messages_own_professional" on messages
  for all using (
    professional_id in (
      select id from professionals where user_id = auth.uid()
    )
  );
