-- Auditoria Daleth: executar uma vez no SQL Editor, como administrador.
-- Nao altera dados comerciais nem as politicas existentes dessas tabelas.
begin;

create schema if not exists dsh_audit;
revoke all on schema dsh_audit from public, anon, authenticated;

create table if not exists dsh_audit.settings (
  singleton boolean primary key default true check (singleton),
  owner_id uuid not null,
  enabled_at timestamptz not null default clock_timestamp()
);
revoke all on dsh_audit.settings from public, anon, authenticated;

-- Vinculo imutavel ao ID do Auth, nunca ao nome/perfil informado pelo navegador.
-- Reexecutar a migracao nao troca o proprietario nem a data de ativacao.
do $$
declare v_owner uuid;
begin
  if not exists (select 1 from dsh_audit.settings) then
    select id into strict v_owner from auth.users
    where lower(email) = 'sergio.paulo@daleth.com.br';
    insert into dsh_audit.settings (owner_id) values (v_owner);
  end if;
end;
$$;

create table if not exists public.crm_audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default clock_timestamp(),
  actor_id uuid,
  actor_name text not null,
  entity_type text not null,
  entity_id text not null,
  entity_label text not null,
  client_name text not null default 'Sem cliente vinculado',
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  changes jsonb not null,
  source text not null,
  transaction_id bigint not null default txid_current()
);
alter table public.crm_audit_log add column if not exists client_name text not null default 'Sem cliente vinculado';
create index if not exists crm_audit_log_time_idx on public.crm_audit_log (occurred_at desc, id desc);
create index if not exists crm_audit_log_actor_time_idx on public.crm_audit_log (actor_id, occurred_at desc, id desc);
create index if not exists crm_audit_log_entity_time_idx on public.crm_audit_log (entity_type, occurred_at desc, id desc);

create or replace function public.crm_can_read_audit()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from dsh_audit.settings where owner_id = auth.uid());
$$;
revoke all on function public.crm_can_read_audit() from public, anon;
grant execute on function public.crm_can_read_audit() to authenticated;

alter table public.crm_audit_log enable row level security;
revoke all on public.crm_audit_log from public, anon, authenticated;
revoke all on sequence public.crm_audit_log_id_seq from public, anon, authenticated;
grant select on public.crm_audit_log to authenticated;
drop policy if exists crm_audit_owner_read on public.crm_audit_log;
create policy crm_audit_owner_read on public.crm_audit_log for select to authenticated
using ((select public.crm_can_read_audit()));

create or replace function public.crm_audit_access()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'allowed', public.crm_can_read_audit(),
    'enabled_at', (select enabled_at from dsh_audit.settings where owner_id = auth.uid())
  );
$$;
revoke all on function public.crm_audit_access() from public, anon;
grant execute on function public.crm_audit_access() to authenticated;

create or replace function public.crm_audit_actors()
returns table (id uuid, name text) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.crm_can_read_audit() then
    raise exception 'Consulta de auditoria nao autorizada' using errcode = '42501';
  end if;
  return query
  select actors.actor_id, actors.actor_name from (
    select distinct on (c.actor_id) c.actor_id, c.actor_name from (
      select u.id as actor_id, coalesce(nullif(p.full_name,''),u.email,u.id::text) as actor_name,
        0 as priority, now() as recorded_at
      from auth.users u left join public.profiles p on p.id = u.id
      union all
      select l.actor_id, l.actor_name, 1, l.occurred_at from public.crm_audit_log l where l.actor_id is not null
    ) c order by c.actor_id, c.priority, c.recorded_at desc
  ) actors order by actors.actor_name, actors.actor_id;
end;
$$;
revoke all on function public.crm_audit_actors() from public, anon;
grant execute on function public.crm_audit_actors() to authenticated;

create or replace function dsh_audit.clean_row(row_data jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(row_data, '{}'::jsonb) - array['updated_at','updatedAt','created_at','createdAt','supabaseId'];
$$;

create or replace function dsh_audit.resolve_client(kind text, record_id text, row_data jsonb)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_company_ref text := coalesce(row_data->>'company_id', row_data->>'companyId');
  v_opportunity_ref text := coalesce(row_data->>'opportunity_id', row_data->>'dealId');
  v_company_is_legacy boolean := row_data ? 'companyId' and not (row_data ? 'company_id');
  v_opportunity_is_legacy boolean := row_data ? 'dealId' and not (row_data ? 'opportunity_id');
  v_item_id text := row_data->>'itemId';
  v_name text;
  v_item jsonb;
begin
  if kind = 'companies' then
    v_name := nullif(row_data->>'name','');
    if v_name is null then
      select c.name into v_name from public.companies c
      where c.id::text = record_id or c.legacy_id = record_id limit 1;
    end if;
    return coalesce(v_name, 'Sem cliente vinculado');
  end if;

  if v_company_ref is null and kind = any(array['contacts','opportunities','contracts']) then
    if kind = 'contacts' then
      select c.company_id::text into v_company_ref from public.contacts c
      where c.id::text = record_id or c.legacy_id = record_id limit 1;
      v_company_is_legacy := false;
    elsif kind = 'opportunities' then
      select o.company_id::text into v_company_ref from public.opportunities o
      where o.id::text = record_id or o.legacy_id = record_id limit 1;
      v_company_is_legacy := false;
    else
      select c.company_id::text into v_company_ref from public.contracts c
      where c.id::text = record_id or c.legacy_id = record_id limit 1;
      v_company_is_legacy := false;
    end if;
  end if;

  if v_opportunity_ref is null and kind = any(array['activities','notes']) then
    if kind = 'activities' then
      select a.opportunity_id::text into v_opportunity_ref from public.activities a
      where a.id::text = record_id or a.legacy_id = record_id limit 1;
      v_opportunity_is_legacy := false;
    else
      select n.opportunity_id::text into v_opportunity_ref from public.notes n
      where n.id::text = record_id or n.legacy_id = record_id limit 1;
      v_opportunity_is_legacy := false;
    end if;
  end if;

  if v_company_ref is null and v_opportunity_ref is not null then
    select o.company_id::text into v_company_ref from public.opportunities o
    where o.id::text = v_opportunity_ref or o.legacy_id = v_opportunity_ref
    order by case when v_opportunity_is_legacy then o.legacy_id = v_opportunity_ref else o.id::text = v_opportunity_ref end desc
    limit 1;
    v_company_is_legacy := false;
  end if;

  if v_company_ref is null and kind = 'workspace_comments' and v_item_id is not null then
    select item into v_item
    from public.crm_state s cross join lateral jsonb_array_elements(
      case when jsonb_typeof(s.data) = 'array' then s.data else '[]'::jsonb end
    ) item
    where s.key = 'dsh-v1-workspace-items' and item->>'id' = v_item_id limit 1;
    if v_item is not null then
      return dsh_audit.resolve_client('workspace_items', v_item_id, v_item);
    end if;
  end if;

  if v_company_ref is not null then
    select c.name into v_name from public.companies c
    where c.id::text = v_company_ref or c.legacy_id = v_company_ref
    order by case when v_company_is_legacy then c.legacy_id = v_company_ref else c.id::text = v_company_ref end desc
    limit 1;
  end if;
  return coalesce(v_name, 'Sem cliente vinculado');
end;
$$;

create or replace function dsh_audit.write_change(
  kind text, record_id text, old_data jsonb, new_data jsonb, origin text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := dsh_audit.clean_row(old_data);
  v_new jsonb := dsh_audit.clean_row(new_data);
  v_row jsonb := coalesce(new_data, old_data, '{}'::jsonb);
  v_action text;
  v_changes jsonb;
  v_actor uuid := auth.uid();
  v_name text;
  v_label text;
  v_client text;
begin
  if old_data is not null and new_data is not null and v_old = v_new then return; end if;
  v_action := case when old_data is null then 'INSERT' when new_data is null then 'DELETE' else 'UPDATE' end;
  select coalesce(jsonb_object_agg(fields.key, jsonb_build_object('before',v_old->fields.key,'after',v_new->fields.key)), '{}'::jsonb)
  into v_changes
  from (select jsonb_object_keys(v_old) as key union select jsonb_object_keys(v_new)) fields
  where (v_old->fields.key) is distinct from (v_new->fields.key);

  select coalesce(nullif(p.full_name,''),u.email,u.id::text) into v_name
  from auth.users u left join public.profiles p on p.id = u.id where u.id = v_actor;
  v_name := coalesce(v_name, v_actor::text, 'Sistema / administrador do banco');
  v_label := left(coalesce(nullif(v_row->>'title',''),nullif(v_row->>'name',''),
    nullif(v_row->>'full_name',''),nullif(v_row->>'text',''),nullif(v_row->>'content',''),
    nullif(v_row->>'description',''),nullif(v_row->>'product',''),kind || ' #' || record_id), 200);
  v_client := dsh_audit.resolve_client(kind, record_id, v_row);
  if v_client = 'Sem cliente vinculado' and old_data is not null then
    v_client := dsh_audit.resolve_client(kind, record_id, old_data);
  end if;

  insert into public.crm_audit_log (actor_id,actor_name,entity_type,entity_id,entity_label,client_name,action,changes,source)
  values (v_actor,v_name,kind,record_id,v_label,v_client,v_action,v_changes,origin);
end;
$$;

-- Enriquece tambem o historico ja coletado, quando o vinculo ainda pode ser
-- reconstruido pelo registro atual ou pelos valores antes/depois gravados.
with reconstructed as (
  select l.id, coalesce(
    jsonb_object_agg(e.key,coalesce(e.value->'after',e.value->'before')) filter (where e.key is not null),
    '{}'::jsonb
  ) as row_data
  from public.crm_audit_log l left join lateral jsonb_each(l.changes) e on true
  group by l.id
)
update public.crm_audit_log l
set client_name = dsh_audit.resolve_client(l.entity_type,l.entity_id,r.row_data)
from reconstructed r
where r.id = l.id and l.client_name = 'Sem cliente vinculado';

create or replace function dsh_audit.capture_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_old jsonb; v_new jsonb;
begin
  if TG_OP <> 'INSERT' then v_old := to_jsonb(old); end if;
  if TG_OP <> 'DELETE' then v_new := to_jsonb(new); end if;
  -- Perfis: somente dados de identificacao e permissoes, nunca credenciais.
  if TG_TABLE_NAME = 'profiles' then
    if v_old is not null then
      select jsonb_object_agg(key,value) into v_old from jsonb_each(v_old)
      where key = any(array['id','full_name','name','email','role','can_view_dashboard']);
    end if;
    if v_new is not null then
      select jsonb_object_agg(key,value) into v_new from jsonb_each(v_new)
      where key = any(array['id','full_name','name','email','role','can_view_dashboard']);
    end if;
  end if;
  perform dsh_audit.write_change(TG_TABLE_NAME, coalesce(v_new->>'id',v_old->>'id'),v_old,v_new,'table');
  return null;
end;
$$;

-- O Workspace e documentos ainda usam colecoes JSON. Compara por ID,
-- ignorando reordenacao e atualizacoes de cache, nao pelo autor declarado no item.
create or replace function dsh_audit.state_items(state_key text, payload jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare result jsonb;
begin
  if payload is null or payload = 'null'::jsonb then return '{}'::jsonb; end if;
  if state_key = 'dsh-v1-loss-reasons' and jsonb_typeof(payload) = 'object' then
    select coalesce(jsonb_object_agg(key,jsonb_build_object('dealId',key,'reason',value)), '{}'::jsonb)
    into result from jsonb_each(payload);
    return result;
  end if;
  if jsonb_typeof(payload) = 'array' then
    if state_key = any(array['dsh-v1-company-segments','dsh-v1-stages','dsh-v1-loss-reason-options'])
      and not exists (select 1 from jsonb_array_elements(payload) item where jsonb_typeof(item) <> 'string') then
      select coalesce(jsonb_object_agg(item #>> '{}',jsonb_build_object('name',item)), '{}'::jsonb)
      into result from jsonb_array_elements(payload) item;
      if state_key = 'dsh-v1-stages' then
        result := result || jsonb_build_object('_order',jsonb_build_object('name','Ordem das etapas','items',payload));
      end if;
      return result;
    end if;
    if not exists (select 1 from jsonb_array_elements(payload) item
      where jsonb_typeof(item) <> 'object' or nullif(item->>'id','') is null)
      and (select count(distinct item->>'id') from jsonb_array_elements(payload) item) = jsonb_array_length(payload) then
      select coalesce(jsonb_object_agg(item->>'id',item), '{}'::jsonb) into result from jsonb_array_elements(payload) item;
      return result;
    end if;
  end if;
  -- Nao bloqueia dados legados sem ID, mas preserva a alteracao da colecao.
  return jsonb_build_object('_collection',jsonb_build_object('data',payload));
end;
$$;

create or replace function dsh_audit.capture_state()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_key text; v_kind text; v_old jsonb; v_new jsonb; entry record;
begin
  -- Trata inclusive troca da chave em SQL, como remocao + inclusao.
  for v_key in select distinct k from unnest(array[
    case when TG_OP <> 'INSERT' then old.key end,
    case when TG_OP <> 'DELETE' then new.key end
  ]) k where k is not null loop
    v_kind := case v_key
      when 'dsh-v1-interactions' then 'interactions'
      when 'dsh-v1-opportunity-files' then 'documents'
      when 'dsh-v1-workspace-items' then 'workspace_items'
      when 'dsh-v1-workspace-comments' then 'workspace_comments'
      when 'dsh-v1-company-segments' then 'segments'
      when 'dsh-v1-stages' then 'stages'
      when 'dsh-v1-stage-history' then 'stage_history'
      when 'dsh-v1-loss-reasons' then 'loss_reasons'
      when 'dsh-v1-loss-reason-options' then 'loss_reason_options'
      when 'dsh-v1-pipedrive-import-meta' then 'imports'
      else null end;
    -- Espelhos das tabelas relacionais nao geram registros duplicados.
    if v_kind is null then continue; end if;
    v_old := dsh_audit.state_items(v_key,case when TG_OP <> 'INSERT' and old.key = v_key then old.data end);
    v_new := dsh_audit.state_items(v_key,case when TG_OP <> 'DELETE' and new.key = v_key then new.data end);
    for entry in
      select coalesce(a.key,b.key) as id, a.value as before_data, b.value as after_data
      from jsonb_each(v_old) a full join jsonb_each(v_new) b on a.key = b.key
      where a.value is distinct from b.value
    loop
      perform dsh_audit.write_change(v_kind,entry.id,entry.before_data,entry.after_data,'crm_state');
    end loop;
  end loop;
  return null;
end;
$$;

revoke all on all functions in schema dsh_audit from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['companies','contacts','opportunities','activities','notes','contracts','products','profiles'] loop
    execute format('drop trigger if exists dsh_audit_capture on public.%I',table_name);
    execute format('create trigger dsh_audit_capture after insert or update or delete on public.%I for each row execute function dsh_audit.capture_row()',table_name);
  end loop;
end;
$$;
drop trigger if exists dsh_audit_capture on public.crm_state;
create trigger dsh_audit_capture after insert or update or delete on public.crm_state
for each row execute function dsh_audit.capture_state();

notify pgrst, 'reload schema';
commit;
