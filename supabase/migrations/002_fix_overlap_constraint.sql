-- Requiere btree_gist para exclusion constraint en UUID
create extension if not exists "btree_gist";

-- Agrega la constraint de overlap si no existe
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'appointments_no_overlap'
    and conrelid = 'appointments'::regclass
  ) then
    alter table appointments
      add constraint appointments_no_overlap
      exclude using gist (
        professional_id with =,
        tstzrange(start_at, end_at, '[)') with &&
      );
  end if;
end;
$$;
