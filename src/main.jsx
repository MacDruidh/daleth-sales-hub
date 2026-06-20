import React, { useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, KanbanSquare, Building2, Users, BriefcaseBusiness, CalendarDays, Plus, Search, Edit3, Trash2, MessageSquare, CheckCircle2, Clock3, CircleDollarSign, X, Save, Sparkles, Phone, Mail, UserRound, Filter, BellRing, TrendingUp, AlertTriangle, Lock, Package, GripVertical, ChevronLeft, ChevronRight, List, ExternalLink, Link2, FileText, FolderOpen, ImagePlus, Paperclip } from 'lucide-react';
import './style.css';
import './calendar.css';
import { supabase } from './lib/supabase';

const STAGES = ['Lead Captado','Primeiro Contato','Reunião Agendada','Levantamento','Proposta Enviada','Negociação','Ganho','Perdido'];
const USERS = ['Sergio','Oyas','Katia','Paulo','Reserva'];
const INITIAL_PRODUCTS = ['SAC+','SAC 24h','Inside Sales','Help Desk','Back Office','Ouvidorias','Custom'];
const DROPBOX_APP_KEY = String(import.meta.env.VITE_DROPBOX_APP_KEY || '8vzktcmec9285zy').trim();
const EMAIL_SENDING_ENABLED = false;
const DOCUMENT_CATEGORIES = ['Proposta','Contrato','Briefing','Apresentação','Planilha','Escopo','Operacional','Financeiro','Outros'];
const INITIAL_EMAIL_TEMPLATES = [
  {id:'proposal-followup',name:'Follow-up de proposta',subject:'Proposta Daleth AC | {{empresa}}',body:'Olá {{contato}},\n\nGostaria de saber se conseguiu avaliar nossa proposta para {{produto}}.\n\nFico à disposição para esclarecer qualquer ponto e alinharmos os próximos passos.\n\nAtenciosamente,\n{{responsavel}}'},
  {id:'meeting-confirmation',name:'Confirmação de reunião',subject:'Confirmação de reunião | Daleth AC',body:'Olá {{contato}},\n\nConfirmamos nossa reunião para conversarmos sobre {{produto}}.\n\nCaso precise ajustar o horário, por favor, me avise.\n\nAtenciosamente,\n{{responsavel}}'},
  {id:'first-contact',name:'Primeiro contato',subject:'Daleth AC | {{empresa}}',body:'Olá {{contato}},\n\nMeu nome é {{responsavel}} e faço parte da Daleth AC. Gostaria de conversar sobre como podemos apoiar a operação da {{empresa}} com nossa solução {{produto}}.\n\nPodemos agendar uma breve conversa?\n\nAtenciosamente,\n{{responsavel}}'},
];
let dropboxChooserPromise;

const ACCESS_USERS = [
  { name: 'Sergio', role: 'CEO', canViewDashboard: true },
  { name: 'Katia', role: 'Comercial', canViewDashboard: false },
  { name: 'Paulo', role: 'Comercial', canViewDashboard: false },
  { name: 'Oyas', role: 'Comercial', canViewDashboard: false },
  { name: 'Reserva', role: 'Reserva', canViewDashboard: false },
];

const initialCompanies = [
  { id: 1, name: 'Cacau Show', segment: 'Franquias', cnpj: '', site: 'cacaushow.com.br', status: 'Prospect', phone: '', email: '', notes: 'Rede de franquias com alto potencial para SAC+.' },
  { id: 2, name: 'Turkish Airlines', segment: 'Aviação', cnpj: '', site: 'turkishairlines.com', status: 'Prospect', phone: '', email: '', notes: 'Potencial operação SAC 24/7 aderente às normas ANAC.' },
  { id: 3, name: 'Franquear', segment: 'Parceiro Comercial', cnpj: '', site: 'franquear.com.br', status: 'Parceiro', phone: '', email: '', notes: 'Parceiro para redes de franquias. Comissão prevista: 15%.' },
];
const initialContacts = [
  { id: 1, companyId: 1, name: 'Michele', role: 'CX / Comercial', email: '', phone: '', whatsapp: '', type: 'Decisor', linkedin: '', notes: '' },
  { id: 2, companyId: 3, name: 'Contato Comercial', role: 'Parcerias', email: '', phone: '', whatsapp: '', type: 'Influenciador', linkedin: '', notes: '' },
];
const initialDeals = [
  { id: 1, title: 'SAC+ para rede de franquias', companyId: 1, contactId: 1, product: 'SAC+', value: 18900, setup: 0, contractMonths: 12, stage: 'Proposta Enviada', owner: 'Sergio', probability: 60, closeDate: '2026-07-15', description: 'Proposta para atendimento multicanal da rede.', nextStep: 'Follow-up sobre proposta enviada.', priority: 'Alta' },
  { id: 2, title: 'Atendimento ANAC 24/7', companyId: 2, contactId: '', product: 'SAC 24h', value: 45000, setup: 60000, contractMonths: 36, stage: 'Levantamento', owner: 'Oyas', probability: 40, closeDate: '2026-08-01', description: 'Discovery para operação de companhia aérea internacional.', nextStep: 'Mapear volumes e canais obrigatórios.', priority: 'Alta' },
  { id: 3, title: 'Parceria Franquear', companyId: 3, contactId: 2, product: 'Custom', value: 12000, setup: 0, contractMonths: 24, stage: 'Negociação', owner: 'Sergio', probability: 70, closeDate: '2026-06-30', description: 'Modelo de indicação para redes de franquias.', nextStep: 'Formalizar contrato de parceria.', priority: 'Média' },
];
const initialActivities = [
  { id: 1, dealId: 1, type: 'Follow-up', title: 'Ligar para Michele', dueDate: '2026-06-15', owner: 'Sergio', status: 'Pendente', notes: 'Confirmar se a proposta foi avaliada.' },
  { id: 2, dealId: 2, type: 'Reunião', title: 'Discovery operacional', dueDate: '2026-06-20', owner: 'Oyas', status: 'Pendente', notes: 'Levantar volumes, idiomas e canais.' },
];
const initialNotes = [
  { id: 1, dealId: 1, user: 'Sergio', date: '2026-06-10', text: 'Cliente demonstrou interesse em SAC+ para franquias. Enviar proposta revisada com cenários por quantidade de unidades.' },
  { id: 2, dealId: 3, user: 'Sergio', date: '2026-06-10', text: 'Parceria com comissão de 15% sobre faturamento bruto da rede indicada.' },
];

const initialInteractions = [];

const initialContracts = [];

function useStore(key, initial){
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; } catch { return initial; }
  });

  useEffect(() => {
    let cancelled = false;

    async function loadFromSupabase(){
      try {
        const { data, error } = await supabase
          .from('crm_state')
          .select('data')
          .eq('key', key)
          .maybeSingle();

        if(error) throw error;

        const localValue = (() => {
          try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
        })();

        const nextValue = data?.data ?? localValue ?? initial;

        if(!cancelled){
          setValue(nextValue);
          localStorage.setItem(key, JSON.stringify(nextValue));
        }

        if(!data?.data){
          await supabase.from('crm_state').upsert({
            key,
            data: nextValue,
            updated_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.warn('Supabase indisponível para', key, error);
      }
    }

    loadFromSupabase();

    return () => { cancelled = true; };
  }, [key]);

  const save = (next) => {
    setValue(next);
    localStorage.setItem(key, JSON.stringify(next));

    supabase.from('crm_state').upsert({
      key,
      data: next,
      updated_at: new Date().toISOString()
    }).then(({error}) => {
      if(error) console.warn('Falha ao salvar no Supabase:', key, error);
    });
  };

  return [value, save];
}
function useProducts(){
  const [products, setProductsState] = useState(INITIAL_PRODUCTS);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts(){
      try {
        const { data, error } = await supabase
          .from('products')
          .select('name')
          .order('name');

        if(error) throw error;

        const names = (data || []).map(p => p.name).filter(Boolean);

        if(!cancelled){
          setProductsState(names.length ? names : INITIAL_PRODUCTS);
        }
      } catch (error) {
        console.warn('Falha ao carregar produtos relacionais:', error);
      }
    }

    loadProducts();

    return () => { cancelled = true; };
  }, []);

  const setProducts = async (next) => {
    const resolved = typeof next === 'function' ? next(products) : next;
    const clean = [...new Set((resolved || []).map(p => String(p).trim()).filter(Boolean))];

    setProductsState(clean);

    try {
      const current = products;
      const toAdd = clean.filter(p => !current.some(c => c.toLowerCase() === p.toLowerCase()));
      const toRemove = current.filter(p => !clean.some(c => c.toLowerCase() === p.toLowerCase()));

      if(toAdd.length){
        const { error } = await supabase
          .from('products')
          .insert(toAdd.map(name => ({ name })));

        if(error) throw error;
      }

      if(toRemove.length){
        const { error } = await supabase
          .from('products')
          .delete()
          .in('name', toRemove);

        if(error) throw error;
      }
    } catch (error) {
      console.warn('Falha ao salvar produtos relacionais:', error);
    }
  };

  return [products, setProducts]; 
}

function mapCompanyFromDb(c){
  return {
    id: c.legacy_id || c.id,
    supabaseId: c.id,
    name: c.name || '',
    segment: c.segment || '',
    cnpj: c.cnpj || '',
    site: c.site || c.website || '',
    status: c.status || '',
    phone: c.phone || '',
    email: c.email || '',
    notes: c.notes || ''
  };
}

function companyToDb(company){
  return {
    legacy_id: company.legacy_id || company.legacyId || (company.pipedriveId ? String(company.id) : null),
    name: company.name || '',
    segment: company.segment || null,
    cnpj: company.cnpj || null,
    site: company.site || null,
    website: company.site || null,
    status: company.status || 'Prospect',
    phone: company.phone || null,
    email: company.email || null,
    notes: company.notes || null
  };
}

async function saveCompanyToSupabase(company){
  const payload = companyToDb(company);
  const query = company.supabaseId
    ? supabase.from('companies').update(payload).eq('id', company.supabaseId)
    : supabase.from('companies').insert(payload);

  const { data, error } = await query.select('id,name,segment,cnpj,site,website,status,phone,email,notes,legacy_id').single();

  if(error) throw error;
  return mapCompanyFromDb(data);
}

async function deleteCompanyFromSupabase(company){
  const dbId = company?.supabaseId;
  if(!dbId) return;

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', dbId);

  if(error) throw error;
}

function useCompanies(){
  const [companies, saveCompaniesToCrmState] = useStore('dsh-v1-companies', initialCompanies);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies(){
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id,name,segment,cnpj,site,website,status,phone,email,notes,legacy_id')
          .order('name');

        if(error) throw error;

        const mapped = (data || []).map(mapCompanyFromDb);

        if(!cancelled && mapped.length){
          saveCompaniesToCrmState(mapped);
        }
      } catch (error) {
        console.warn('Falha ao carregar empresas relacionais:', error);
      }
    }

    loadCompanies();

    return () => { cancelled = true; };
  }, []);

  return [companies, saveCompaniesToCrmState];
}

function companyDbIdFromUiId(companies, companyId){
  const company = safeArray(companies).find(c => sameId(c.id, companyId));
  return company?.supabaseId || (company ? company.id : companyId) || null;
}

function mapContactFromDb(c){
  return {
    id: c.legacy_id || c.id,
    supabaseId: c.id,
    companyId: c.companies?.legacy_id || c.company_id,
    name: c.name || '',
    role: c.role || '',
    email: c.email || '',
    phone: c.phone || '',
    whatsapp: c.whatsapp || '',
    type: c.contact_type || c.type || '',
    linkedin: c.linkedin || '',
    notes: c.notes || ''
  };
}

function contactToDb(contact, companies){
  const companyId = companyDbIdFromUiId(companies, contact.companyId);

  return {
    legacy_id: contact.legacy_id || contact.legacyId || (contact.pipedriveId ? String(contact.id) : null),
    company_id: companyId || null,
    name: contact.name || '',
    role: contact.role || null,
    email: contact.email || null,
    phone: contact.phone || null,
    whatsapp: contact.whatsapp || null,
    linkedin: contact.linkedin || null,
    type: contact.type || null,
    contact_type: contact.type || null,
    notes: contact.notes || null
  };
}

async function saveContactToSupabase(contact, companies){
  const payload = contactToDb(contact, companies);
  const query = contact.supabaseId
    ? supabase.from('contacts').update(payload).eq('id', contact.supabaseId)
    : supabase.from('contacts').insert(payload);

  const { data, error } = await query.select(`
    id,
    company_id,
    name,
    role,
    email,
    phone,
    whatsapp,
    linkedin,
    type,
    contact_type,
    notes,
    legacy_id,
    companies:company_id (
      legacy_id
    )
  `).single();

  if(error) throw error;
  return mapContactFromDb(data);
}

async function deleteContactFromSupabase(contact){
  const dbId = contact?.supabaseId;
  if(!dbId) return;

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', dbId);

  if(error) throw error;
}

function useContacts(){
  const [contacts, saveContactsToCrmState] = useStore('dsh-v1-contacts', initialContacts);

  useEffect(() => {
    let cancelled = false;

    async function loadContacts(){
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select(`
            id,
            company_id,
            name,
            role,
            email,
            phone,
            whatsapp,
            linkedin,
            type,
            contact_type,
            notes,
            legacy_id,
            companies:company_id (
              legacy_id
            )
          `)
          .order('name');

        if(error) throw error;

        const mapped = (data || []).map(mapContactFromDb);

        if(!cancelled && mapped.length){
          saveContactsToCrmState(mapped);
        }
      } catch (error) {
        console.warn('Falha ao carregar contatos relacionais:', error);
      }
    }

    loadContacts();

    return () => { cancelled = true; };
  }, []);

  return [contacts, saveContactsToCrmState];
}

function contactDbIdFromUiId(contacts, contactId){
  if(!contactId) return null;
  const contact = safeArray(contacts).find(c => sameId(c.id, contactId));
  return contact?.supabaseId || (contact ? contact.id : contactId) || null;
}

function mapDealFromDb(d){
  return {
    id: d.legacy_id || d.id,
    supabaseId: d.id,
    companyId: d.companies?.legacy_id || d.company_id,
    contactId: d.contacts?.legacy_id || d.contact_id || '',
    title: d.title || '',
    product: d.product || '',
    value: Number(d.value || 0),
    setup: Number(d.setup_value || 0),
    contractMonths: Number(d.contract_months || 12),
    stage: d.stage || 'Lead Captado',
    owner: d.owner || '',
    probability: Number(d.probability || 0),
    closeDate: d.expected_close_date || '',
    description: d.description || '',
    nextStep: d.next_step || '',
    priority: d.priority || 'Média'
  };
}

function dealToDb(deal, companies, contacts){
  return {
    legacy_id: deal.legacy_id || deal.legacyId || (deal.pipedriveId ? String(deal.id) : null),
    company_id: companyDbIdFromUiId(companies, deal.companyId),
    contact_id: contactDbIdFromUiId(contacts, deal.contactId),
    title: deal.title || '',
    product: deal.product || null,
    value: Number(deal.value || 0),
    setup_value: Number(deal.setup || 0),
    contract_months: Number(deal.contractMonths || 12),
    probability: Number(deal.probability || 30),
    expected_close_date: deal.closeDate || null,
    status: deal.status || null,
    stage: deal.stage || 'Lead Captado',
    description: deal.description || null,
    next_step: deal.nextStep || null,
    priority: deal.priority || 'Média',
    owner: deal.owner || null
  };
}

const DEAL_SELECT = `
  id,
  company_id,
  contact_id,
  title,
  product,
  value,
  setup_value,
  contract_months,
  probability,
  expected_close_date,
  status,
  legacy_id,
  stage,
  description,
  next_step,
  priority,
  owner,
  companies:company_id (
    legacy_id
  ),
  contacts:contact_id (
    legacy_id
  )
`;

async function saveDealToSupabase(deal, companies, contacts){
  const payload = dealToDb(deal, companies, contacts);
  const query = deal.supabaseId
    ? supabase.from('opportunities').update(payload).eq('id', deal.supabaseId)
    : supabase.from('opportunities').insert(payload);

  const { data, error } = await query.select(DEAL_SELECT).single();

  if(error) throw error;
  return mapDealFromDb(data);
}

async function deleteDealFromSupabase(deal){
  const dbId = deal?.supabaseId;
  if(!dbId) return;

  const { error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', dbId);

  if(error) throw error;
}

function useDeals(){
  const [deals, saveDealsToCrmState] = useStore('dsh-v1-deals', initialDeals);

  useEffect(() => {
    let cancelled = false;

    async function loadDeals(){
      try {
        const { data, error } = await supabase
          .from('opportunities')
          .select(DEAL_SELECT)
          .order('created_at', { ascending: false });

        if(error) throw error;

        const mapped = (data || []).map(mapDealFromDb);

        if(!cancelled && mapped.length){
          saveDealsToCrmState(mapped);
        }
      } catch (error) {
        console.error('Falha ao carregar oportunidades relacionais:', error);
      }
    }

    loadDeals();

    return () => {
      cancelled = true;
    };
  }, []);

  return [deals, saveDealsToCrmState];
}

function dealDbIdFromUiId(deals, dealId){
  if(!dealId) return null;
  const deal = safeArray(deals).find(d => sameId(d.id, dealId));
  return deal?.supabaseId || (deal ? deal.id : dealId) || null;
}
async function resolveDealDbIdFromUiId(deals, dealId){
  if(!dealId) return null;
  const deal = safeArray(deals).find(d => sameId(d.id, dealId));
  if(deal?.supabaseId) return deal.supabaseId;

  const candidateId = deal ? deal.id : dealId;
  if(!candidateId) return null;

  const queryValue = String(candidateId);
  const numericId = Number(queryValue);
  const filter = Number.isFinite(numericId) && queryValue.trim() !== ''
    ? `legacy_id.eq.${queryValue},id.eq.${numericId}`
    : `legacy_id.eq.${queryValue}`;

  const { data, error } = await supabase
    .from('opportunities')
    .select('id,legacy_id')
    .or(filter)
    .limit(1);

  if(error){
    console.warn('Falha ao resolver ID da oportunidade no Supabase:', error);
    return null;
  }

  return data?.[0]?.id || null;
}

function mapActivityFromDb(a){
  return {
    id: a.legacy_id || a.id,
    supabaseId: a.id,
    dealId: a.opportunities?.legacy_id || a.opportunity_id,
    type: a.activity_type || a.type || 'Ligação',
    title: a.title || '',
    dueDate: a.due_date || '',
    dueTime: a.due_time ? String(a.due_time).slice(0,5) : '',
    meetingLink: a.meeting_link || '',
    status: a.status || 'Pendente',
    owner: a.owner || '',
    notes: a.notes || ''
  };
}

function activityToDb(activity, deals, opportunityIdOverride){
  return {
    legacy_id: activity.legacy_id || activity.legacyId || (activity.pipedriveId ? String(activity.id) : null),
    opportunity_id: opportunityIdOverride !== undefined ? opportunityIdOverride : dealDbIdFromUiId(deals, activity.dealId),
    title: activity.title || '',
    due_date: activity.dueDate || null,
    due_time: activity.dueTime || null,
    meeting_link: activity.meetingLink || null,
    status: activity.status || 'Pendente',
    notes: activity.notes || null,
    owner: activity.owner || null,
    type: activity.type || 'Follow-up',
    activity_type: activity.type || 'Follow-up'
  };
}

const ACTIVITY_SELECT = `
  id,
  opportunity_id,
  title,
  due_date,
  due_time,
  meeting_link,
  status,
  notes,
  owner,
  type,
  legacy_id,
  activity_type,
  created_at,
  opportunities:opportunity_id (
    legacy_id
  )
`;
const ACTIVITY_LEGACY_SELECT = `
  id,
  opportunity_id,
  title,
  due_date,
  status,
  notes,
  owner,
  type,
  legacy_id,
  activity_type,
  created_at,
  opportunities:opportunity_id (
    legacy_id
  )
`;
function isMissingActivityFieldError(error){
  const message = `${String(error?.message || '')} ${String(error?.details || '')} ${String(error?.hint || '')} ${String(error?.code || '')}`;
  return message.includes('due_time') || message.includes('meeting_link');
}
function isActivityRelationError(error){
  const message = `${String(error?.message || '')} ${String(error?.details || '')} ${String(error?.hint || '')} ${String(error?.code || '')}`.toLowerCase();
  return message.includes('opportunity_id') || message.includes('foreign key') || message.includes('23503');
}
function supabaseErrorText(error){
  return [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(' · ') || 'Erro não detalhado.';
}
async function runActivityMutation(activity, payload, selectQuery){
  const query = activity.supabaseId
    ? supabase.from('activities').update(payload).eq('id', activity.supabaseId)
    : supabase.from('activities').insert(payload);
  return query.select(selectQuery).single();
}

async function saveActivityToSupabase(activity, deals){
  const resolvedOpportunityId = await resolveDealDbIdFromUiId(deals, activity.dealId);
  const payload = activityToDb(activity, deals, resolvedOpportunityId);

  let { data, error } = await runActivityMutation(activity, payload, ACTIVITY_SELECT);

  if(error && isMissingActivityFieldError(error)){
    const legacyPayload = {...payload};
    delete legacyPayload.due_time;
    delete legacyPayload.meeting_link;
    const legacyResult = await runActivityMutation(activity, legacyPayload, ACTIVITY_LEGACY_SELECT);
    data = legacyResult.data;
    error = legacyResult.error;
    if(data){
      return {...mapActivityFromDb(data), dueTime: activity.dueTime || '', meetingLink: activity.meetingLink || ''};
    }
  }

  if(error && isActivityRelationError(error)){
    const unlinkedPayload = {...payload, opportunity_id: null};
    let unlinkedResult = await runActivityMutation(activity, unlinkedPayload, ACTIVITY_SELECT);
    if(unlinkedResult.error && isMissingActivityFieldError(unlinkedResult.error)){
      const legacyUnlinkedPayload = {...unlinkedPayload};
      delete legacyUnlinkedPayload.due_time;
      delete legacyUnlinkedPayload.meeting_link;
      unlinkedResult = await runActivityMutation(activity, legacyUnlinkedPayload, ACTIVITY_LEGACY_SELECT);
    }
    data = unlinkedResult.data;
    error = unlinkedResult.error;
    if(data){
      return {...mapActivityFromDb(data), dealId: activity.dealId, dueTime: activity.dueTime || '', meetingLink: activity.meetingLink || ''};
    }
  }

  if(error) throw error;
  return mapActivityFromDb(data);
}

async function deleteActivityFromSupabase(activity){
  const dbId = activity?.supabaseId;
  if(!dbId) return;

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', dbId);

  if(error) throw error;
}

function mapNoteFromDb(n){
  return {
    id: n.legacy_id || n.id,
    supabaseId: n.id,
    dealId: n.opportunities?.legacy_id || n.opportunity_id,
    user: n.user_name || '',
    date: n.note_date || '',
    text: n.content || ''
  };
}

function noteToDb(note, deals){
  return {
    legacy_id: note.legacy_id || note.legacyId || (note.pipedriveId ? String(note.id) : null),
    opportunity_id: dealDbIdFromUiId(deals, note.dealId),
    user_name: note.user || note.userName || note.user_name || 'Daleth',
    note_date: note.date || note.noteDate || note.note_date || today(),
    content: note.text || note.note || note.content || ''
  };
}

const NOTE_SELECT = `
  id,
  opportunity_id,
  user_name,
  note_date,
  content,
  created_at,
  legacy_id,
  opportunities:opportunity_id (
    legacy_id
  )
`;

async function saveNoteToSupabase(note, deals){
  const payload = noteToDb(note, deals);
  const query = note.supabaseId
    ? supabase.from('notes').update(payload).eq('id', note.supabaseId)
    : supabase.from('notes').insert(payload);

  const { data, error } = await query.select(NOTE_SELECT).single();

  if(error) throw error;
  return mapNoteFromDb(data);
}

function useActivities(){
  const [activities, saveActivitiesToCrmState] = useStore('dsh-v1-activities', initialActivities);

  useEffect(() => {
    let cancelled = false;

    async function loadActivities(){
      try {
        let { data, error } = await supabase
          .from('activities')
          .select(ACTIVITY_SELECT)
          .order('created_at', { ascending: false });

        if(error && isMissingActivityFieldError(error)){
          const legacyResult = await supabase
            .from('activities')
            .select(ACTIVITY_LEGACY_SELECT)
            .order('created_at', { ascending: false });
          data = legacyResult.data;
          error = legacyResult.error;
        }

        if(error) throw error;

        const mapped = (data || []).map(mapActivityFromDb);

        if(!cancelled && mapped.length){
          saveActivitiesToCrmState(mapped);
        }
      } catch (error) {
        console.error('Falha ao carregar atividades relacionais:', error);
      }
    }

    loadActivities();

    return () => {
      cancelled = true;
    };
  }, []);

  return [activities, saveActivitiesToCrmState];
}
function useNotes(){
  const [notes, saveNotesToCrmState] = useStore('dsh-v1-notes', initialNotes);

  useEffect(() => {
    let cancelled = false;

    async function loadNotes(){
      try {
        const { data, error } = await supabase
          .from('notes')
          .select(NOTE_SELECT)
          .order('note_date', { ascending: false });

        if(error) throw error;

        const mapped = (data || []).map(mapNoteFromDb);

        if(!cancelled && mapped.length){
          saveNotesToCrmState(mapped);
        }
      } catch (error) {
        console.error('Falha ao carregar notas relacionais:', error);
      }
    }

    loadNotes();

    return () => {
      cancelled = true;
    };
  }, []);

  return [notes, saveNotesToCrmState];
}

function mapContractFromDb(c){
  return {
    id: c.legacy_id || c.id,
    supabaseId: c.id,
    companyId: c.companies?.legacy_id || c.company_id,
    dealId: c.opportunities?.legacy_id || c.opportunity_id || '',
    product: c.product || '',
    owner: c.owner || '',
    mrr: Number(c.mrr || 0),
    setup: Number(c.setup || 0),
    contractMonths: Number(c.contract_months || 12),
    startDate: c.start_date || '',
    endDate: c.end_date || '',
    status: c.status || 'Ativo',
    notes: c.notes || ''
  };
}

function contractToDb(contract, companies, deals){
  return {
    legacy_id: contract.legacy_id || contract.legacyId || (contract.pipedriveId ? String(contract.id) : null),
    company_id: companyDbIdFromUiId(companies, contract.companyId),
    opportunity_id: dealDbIdFromUiId(deals, contract.dealId),
    product: contract.product || null,
    owner: contract.owner || null,
    mrr: Number(contract.mrr || 0),
    setup: Number(contract.setup || 0),
    contract_months: Number(contract.contractMonths || 12),
    start_date: contract.startDate || null,
    end_date: contract.endDate || null,
    status: contract.status || 'Ativo',
    notes: contract.notes || null
  };
}

const CONTRACT_SELECT = `
  *,
  companies!contracts_company_id_fkey (
    legacy_id
  ),
  opportunities!contracts_opportunity_id_fkey (
    legacy_id
  )
`;

async function saveContractToSupabase(contract, companies, deals){
  const payload = contractToDb(contract, companies, deals);
  const query = contract.supabaseId
    ? supabase.from('contracts').update(payload).eq('id', contract.supabaseId)
    : supabase.from('contracts').insert(payload);

  const { data, error } = await query.select(CONTRACT_SELECT).single();

  if(error) throw error;
  return mapContractFromDb(data);
}

async function deleteContractFromSupabase(contract){
  const dbId = contract?.supabaseId;
  if(!dbId) return;

  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', dbId);

  if(error) throw error;
}

function useContracts(){
  const [contracts, saveContractsToCrmState] = useStore('dsh-v1-contracts', initialContracts);

  useEffect(() => {
    let cancelled = false;

    async function loadContracts(){
      try {
        const { data, error } = await supabase
        .from('contracts')
        .select(CONTRACT_SELECT)
        .order('created_at', { ascending: false });

        if(error) throw error;
        const mapped = (data || []).map(mapContractFromDb);
        if(!cancelled){
          saveContractsToCrmState(mapped);
        }
      } catch(error){
        console.error('Falha ao carregar contratos:', error);
      }
    }

    loadContracts();

    return () => {
      cancelled = true;
    };
  }, []);

  return [contracts, saveContractsToCrmState];
}
function money(v){ return Number(v||0).toLocaleString('pt-BR',{ style:'currency', currency:'BRL' }); }
function moneyShort(v){
  const n = Number(v || 0);
  const abs = Math.abs(n);
  if (abs >= 1000000) return `R$ ${(n/1000000).toLocaleString('pt-BR',{ minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`;
  if (abs >= 1000) return `R$ ${(n/1000).toLocaleString('pt-BR',{ minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
  return money(n);
}
function today(){ return new Date().toISOString().slice(0,10); }
function formatDate(value){
  if(!value) return '-';
  const raw = String(value).slice(0,10);
  const parts = raw.split('-');
  if(parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return String(value);
}
function formatDateTime(value){
  if(!value) return '-';
  const timestamp = String(value);
  if(timestamp.includes('T')){
    const parsed = new Date(timestamp);
    if(!Number.isNaN(parsed.getTime())){
      return new Intl.DateTimeFormat('pt-BR',{
        timeZone:'America/Sao_Paulo',
        day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
      }).format(parsed).replace(',', '');
    }
  }
  const [date, time=''] = timestamp.replace('T',' ').split(' ');
  const formattedDate = formatDate(date);
  return time ? `${formattedDate} ${time.slice(0,5)}` : formattedDate;
}
function formatActivityDateTime(activity){
  const date = formatDate(activity?.dueDate);
  return activity?.dueTime ? `${date} ${String(activity.dueTime).slice(0,5)}` : date;
}
function openLinkedEntity(setter, id){ if(setter && id) setter(id); }
function sameId(a,b){ return String(a ?? '') === String(b ?? ''); }
function byId(list,id){ return (Array.isArray(list) ? list : []).find(item => sameId(item?.id,id)); }
function safeText(value){ return String(value ?? ''); }
function safeArray(value){ return Array.isArray(value) ? value : []; }
function normalizedLookup(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
}
function digitsOnly(value){ return String(value || '').replace(/\D/g,''); }
function entityCode(prefix, entity){
  const raw = entity?.legacyId || entity?.legacy_id || entity?.id || '';
  const clean = String(raw).replace(/\D/g,'') || String(raw);
  return `${prefix}${clean.padStart(4,'0')}`;
}
function websiteHref(value){
  const site = String(value || '').trim();
  if(!site) return '';
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
}
function normalizedSite(value){
  return String(value || '').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/$/,'');
}
function dropboxHref(value){
  const link = String(value || '').trim();
  if(!link) return '';
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}
function isDropboxLink(value){
  try {
    const hostname = new URL(dropboxHref(value)).hostname.toLowerCase();
    return hostname === 'dropbox.com' || hostname.endsWith('.dropbox.com') || hostname === 'db.tt' || hostname.endsWith('.dropboxusercontent.com');
  } catch {
    return false;
  }
}
function normalizedDropboxLink(value){
  return dropboxHref(value).toLowerCase().replace(/([?&])dl=[01](&|$)/,'$1').replace(/[?&]$/,'').replace(/\/$/,'');
}
function applyEmailVariables(text,values){
  return String(text || '').replace(/{{\s*(contato|empresa|produto|responsavel|oportunidade)\s*}}/gi,(_match,key)=>String(values[String(key).toLowerCase()] || ''));
}
function loadDropboxChooser(){
  if(window.Dropbox?.choose) return Promise.resolve(window.Dropbox);
  if(!DROPBOX_APP_KEY) return Promise.reject(new Error('A integração com o Dropbox ainda não foi configurada.'));
  if(dropboxChooserPromise) return dropboxChooserPromise;
  dropboxChooserPromise = new Promise((resolve,reject)=>{
    const existing = document.getElementById('dropboxjs');
    if(existing){
      existing.addEventListener('load',()=>window.Dropbox?.choose ? resolve(window.Dropbox) : reject(new Error('O seletor do Dropbox não foi carregado.')),{once:true});
      existing.addEventListener('error',()=>reject(new Error('Não foi possível abrir o Dropbox agora.')),{once:true});
      return;
    }
    const script = document.createElement('script');
    script.id = 'dropboxjs';
    script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
    script.dataset.appKey = DROPBOX_APP_KEY;
    script.onload = ()=>window.Dropbox?.choose ? resolve(window.Dropbox) : reject(new Error('O seletor do Dropbox não foi carregado.'));
    script.onerror = ()=>reject(new Error('Não foi possível abrir o Dropbox agora.'));
    document.head.appendChild(script);
  });
  return dropboxChooserPromise;
}
async function chooseFromDropbox(onSuccess){
  try {
    const Dropbox = await loadDropboxChooser();
    Dropbox.choose({
      success: files=>onSuccess(safeArray(files)),
      linkType:'preview',
      multiselect:true,
      folderselect:true,
    });
  } catch (error) {
    window.alert(error?.message || 'Não foi possível abrir o Dropbox agora.');
  }
}
function companyForDeal(deal, companies, contacts){
  const direct = byId(companies, deal?.companyId);
  if(direct) return direct;
  const contact = byId(contacts, deal?.contactId);
  const viaContact = byId(companies, contact?.companyId);
  if(viaContact) return viaContact;
  const title = normalizedLookup(deal?.title);
  return safeArray(companies).find(company => {
    const name = normalizedLookup(company?.name);
    return name.length >= 4 && title.includes(name);
  });
}
function optionsIncludingCurrent(values, current){
  const items = [current, ...safeArray(values)].map(value => String(value || '').trim()).filter(Boolean);
  return items.filter((value, index) => items.findIndex(item => item.toLowerCase() === value.toLowerCase()) === index);
}
function dealMrr(d){ return Number(d?.value || 0); }
function dealSetup(d){ return Number(d?.setup || 0); }
function dealMonths(d){ return Math.max(1, Number(d?.contractMonths || 12)); }
function dealTcv(d){ return (dealMrr(d) * dealMonths(d)) + dealSetup(d); }
function dealArr(d){ return dealMrr(d) * 12; }
function dealWeightedTcv(d){ return dealTcv(d) * (Number(d?.probability || 0) / 100); }
function dealSegment(d, companies){ return byId(companies,d?.companyId)?.segment || 'Sem segmento'; }

function addMonths(dateString, months){
  const date = new Date((dateString || today()) + 'T00:00:00');
  date.setMonth(date.getMonth() + Number(months || 0));
  return date.toISOString().slice(0,10);
}
function daysUntil(dateString){
  if(!dateString) return null;
  const end = new Date(dateString + 'T00:00:00');
  const start = new Date(today() + 'T00:00:00');
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}
function monthsRemaining(dateString){
  const days = daysUntil(dateString);
  if(days === null) return '-';
  return Math.max(0, Math.ceil(days / 30));
}
function contractMrr(c){ return Number(c?.mrr || 0); }
function contractTcv(c){ return contractMrr(c) * Math.max(1, Number(c?.contractMonths || 12)) + Number(c?.setup || 0); }
function contractStatus(c){
  if(c.status && c.status !== 'Ativo') return c.status;
  const days = daysUntil(c.endDate);
  if(days !== null && days < 0) return 'Encerrado';
  return c.status || 'Ativo';
}

function fallbackUserFromEmail(email){
  return { name: email?.split('@')[0] || 'Usuário', role: 'Reserva', canViewDashboard: false, email };
}
function canRoleViewDashboard(role, explicitPermission = false){
  return explicitPermission === true || ['CEO','Comercial'].includes(role);
}

function withTimeout(promise, ms, message){
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}

async function loadUserProfile(authUser){
  if(!authUser?.id) return null;

  const { data, error } = await withTimeout(
    supabase
      .from('profiles')
      .select('full_name, role, can_view_dashboard')
      .eq('id', authUser.id)
      .maybeSingle(),
    8000,
    'Tempo excedido ao carregar perfil.'
  );

  if(error) throw error;

  if(data){
    return {
      id: authUser.id,
      email: authUser.email,
      name: data.full_name || authUser.email,
      role: data.role || 'Comercial',
      canViewDashboard: canRoleViewDashboard(data.role || 'Comercial', data.can_view_dashboard === true)
    };
  }

  return {
    ...fallbackUserFromEmail(authUser.email),
    id: authUser.id
  };
}

function mapProfileFromDb(profile){
  return {
    id: profile.id,
    name: profile.full_name || '',
    role: profile.role || 'Comercial',
    canViewDashboard: canRoleViewDashboard(profile.role || 'Comercial', profile.can_view_dashboard === true),
    createdAt: profile.created_at || '',
    updatedAt: profile.updated_at || ''
  };
}

function profileToDb(profile){
  return {
    full_name: profile.name || '',
    role: profile.role || 'Comercial',
    can_view_dashboard: canRoleViewDashboard(profile.role || 'Comercial', profile.canViewDashboard === true)
  };
}

async function saveProfileToSupabase(profile){
  const { data, error } = await supabase
    .from('profiles')
    .update(profileToDb(profile))
    .eq('id', profile.id)
    .select('id,full_name,role,can_view_dashboard,created_at,updated_at')
    .single();

  if(error) throw error;
  return mapProfileFromDb(data);
}

function useProfiles(enabled){
  const [profiles,setProfiles] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');

  useEffect(() => {
    if(!enabled) return;
    let cancelled = false;

    async function loadProfiles(){
      setLoading(true);
      setError('');
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id,full_name,role,can_view_dashboard,created_at,updated_at')
          .order('full_name');

        if(error) throw error;
        if(!cancelled){
          setProfiles((data || []).map(mapProfileFromDb));
          if(!data?.length) setError('Nenhum perfil foi retornado pela sessão atual. Saia e entre novamente com o usuário CEO.');
        }
      } catch (err) {
        console.warn('Falha ao carregar perfis:', err);
        if(!cancelled) setError('Não foi possível carregar perfis. Confira se o arquivo supabase/schema.sql já foi aplicado no painel do Supabase.');
      } finally {
        if(!cancelled) setLoading(false);
      }
    }

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { profiles, setProfiles, loading, error };
}


function LoginScreen({onLogin}){
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [loading,setLoading] = useState(false);
  const [resetLoading,setResetLoading] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');

  const signIn = async (event) => {
    event?.preventDefault?.();
    if(!email.trim() || !password) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        }),
        10000,
        'Tempo excedido ao entrar.'
      );

      if(signInError) throw signInError;

      const profile = await loadUserProfile(data.user);
      onLogin(profile);
    } catch (err) {
      console.warn('Falha no login Supabase:', err);
      setError(err?.message?.includes('Tempo excedido') ? 'O login demorou demais. Tente novamente em alguns segundos.' : 'Não foi possível entrar. Confira e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async () => {
    const cleanEmail = email.trim();
    setError('');
    setMessage('');

    if(!cleanEmail){
      setError('Informe seu e-mail para receber o link de redefinição de senha.');
      return;
    }

    setResetLoading(true);

    try {
      const { error: resetError } = await withTimeout(
        supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin
        }),
        10000,
        'Tempo excedido ao enviar redefinição.'
      );

      if(resetError) throw resetError;
      setMessage('Enviamos um link de redefinição para este e-mail.');
    } catch (err) {
      console.warn('Falha ao enviar redefinição de senha:', err);
      setError('Não foi possível enviar o link de redefinição agora.');
    } finally {
      setResetLoading(false);
    }
  };

  return <div className="app" style={{
    minHeight:'100vh',
    display:'grid',
    placeItems:'center',
    background:'linear-gradient(135deg,#f7fbff 0%,#edf6ff 52%,#f9fbff 100%)',
    padding:'28px'
  }}>
    <section style={{
      width:'min(820px,92vw)',
      background:'#ffffff',
      border:'1px solid #dbe7f3',
      borderRadius:'26px',
      boxShadow:'0 22px 70px rgba(3,32,64,.10)',
      padding:'36px 42px'
    }}>
      <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'34px'}}>
        <div style={{width:'42px',height:'42px',borderRadius:'11px',background:'#e6f8fd',display:'grid',placeItems:'center',flex:'0 0 auto',overflow:'hidden'}}>
          <img src="/daleth-star.png" alt="Daleth AC" style={{width:'34px',height:'34px',objectFit:'contain'}} />
        </div>
        <strong style={{fontSize:'18px',color:'#00A0D1',letterSpacing:'-.02em'}}>Sales Hub</strong>
      </div>

      <h1 style={{margin:'0 0 10px',fontSize:'40px',lineHeight:1.05,letterSpacing:'-.04em',color:'#061b34',fontWeight:900}}>Daleth Sales Hub</h1>
      <p style={{margin:'0 0 26px',fontSize:'20px',color:'#65758a'}}>Entre com seu acesso Daleth.</p>
      <div style={{height:'1px',background:'#dbe7f3',marginBottom:'24px'}} />

      <form onSubmit={signIn}>
      <label style={{display:'block',marginBottom:'18px'}}>
        <span style={{display:'block',fontWeight:900,fontSize:'15px',textTransform:'uppercase',letterSpacing:'.06em',color:'#061b34',marginBottom:'12px'}}>E-mail</span>
        <div style={{position:'relative',height:'54px'}}>
          <Mail size={21} style={{position:'absolute',left:'18px',top:'50%',transform:'translateY(-50%)',color:'#12345a',pointerEvents:'none',zIndex:2}} />
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" placeholder="seuemail@daleth.com.br" style={{
            width:'100%',
            height:'54px',
            border:'1px solid #cbd8e6',
            borderRadius:'12px',
            padding:'0 18px 0 58px',
            fontSize:'18px',
            fontWeight:400,
            color:'#061b34',
            background:'#fff',
            outline:'none',
            boxShadow:'0 1px 0 rgba(6,27,52,.03)',
            appearance:'none',
            WebkitAppearance:'none',
            MozAppearance:'none',
            lineHeight:'54px'
          }} />
        </div>
      </label>

      <label style={{display:'block',marginBottom:'24px'}}>
        <span style={{display:'block',fontWeight:900,fontSize:'15px',textTransform:'uppercase',letterSpacing:'.06em',color:'#061b34',marginBottom:'12px'}}>Senha</span>
        <div style={{position:'relative',height:'54px'}}>
          <Lock size={21} style={{position:'absolute',left:'18px',top:'50%',transform:'translateY(-50%)',color:'#12345a',pointerEvents:'none',zIndex:2}} />
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="Sua senha" style={{
            width:'100%',
            height:'54px',
            border:'1px solid #cbd8e6',
            borderRadius:'12px',
            padding:'0 18px 0 58px',
            fontSize:'18px',
            fontWeight:400,
            color:'#061b34',
            background:'#fff',
            outline:'none',
            boxShadow:'0 1px 0 rgba(6,27,52,.03)',
            lineHeight:'54px'
          }} />
        </div>
      </label>

      <div style={{
        display:'flex',
        alignItems:'center',
        gap:'20px',
        background:'linear-gradient(135deg,#f2f8ff 0%,#eaf4ff 100%)',
        borderRadius:'18px',
        padding:'20px 24px',
        marginBottom:'24px'
      }}>
        <div style={{
          width:'62px',
          height:'62px',
          borderRadius:'50%',
          display:'grid',
          placeItems:'center',
          background:'rgba(13,116,255,.10)',
          flex:'0 0 auto'
        }}>
          <CheckCircle2 size={30} color="#00A0D1" />
        </div>
        <div>
          <b style={{display:'block',fontSize:'22px',color:'#061b34',marginBottom:'6px',fontWeight:900}}>Supabase Auth</b>
          <span style={{fontSize:'16px',color:'#64748b'}}>Seu perfil e permissões serão carregados da tabela profiles.</span>
        </div>
      </div>

      {error && <p style={{margin:'0 0 18px',color:'#dc2626',fontWeight:800}}>{error}</p>}
      {message && <p style={{margin:'0 0 18px',color:'#047857',fontWeight:800}}>{message}</p>}

      <button className="saveBtn" type="submit" disabled={loading} style={{
        width:'100%',
        justifyContent:'center',
        minHeight:'58px',
        borderRadius:'14px',
        fontSize:'20px',
        fontWeight:900,
        background:'linear-gradient(135deg,#00A0D1 0%,#008bb8 100%)',
        boxShadow:'0 12px 24px rgba(0,160,209,.20)'
      }}>{loading ? 'Entrando...' : 'Entrar'}</button>

      <button type="button" onClick={sendPasswordReset} disabled={resetLoading} style={{
        width:'100%',
        marginTop:'14px',
        minHeight:'44px',
        border:'1px solid #cbd8e6',
        borderRadius:'12px',
        background:'#ffffff',
        color:'#075fb8',
        fontSize:'16px',
        fontWeight:900,
        cursor:'pointer'
      }}>{resetLoading ? 'Enviando...' : 'Esqueci minha senha'}</button>
      </form>

      <div style={{height:'1px',background:'#dbe7f3',margin:'28px 0 18px'}} />
      <p style={{display:'flex',alignItems:'center',gap:'14px',fontSize:'15px',color:'#64748b',margin:0}}>
        <Lock size={19} /> Acesso protegido pelo Supabase Auth.
      </p>
    </section>
  </div>;
}

function UXStyle(){
  return <style>{`
    :root{
      --ux-bg:#f6f8fb;
      --ux-surface:#ffffff;
      --ux-border:#e5edf6;
      --ux-text:#0f172a;
      --ux-muted:#64748b;
      --ux-blue:#00A0D1;
      --ux-blue-soft:#e6f8fd;
      --ux-shadow:0 12px 34px rgba(15,23,42,.07);
      --ux-radius:18px;
    }
    body{background:var(--ux-bg)!important;}
    .app{grid-template-columns:80px minmax(0,1fr)!important;background:var(--ux-bg)!important;}
    .sidebar{width:80px!important;min-width:80px!important;padding:18px 12px!important;border-right:1px solid var(--ux-border)!important;background:#ffffff!important;box-shadow:8px 0 28px rgba(15,23,42,.04)!important;align-items:center!important;}
    .brand{height:56px!important;width:100%!important;display:grid!important;place-items:center!important;margin-bottom:14px!important;padding:0!important;}
    .brandLogo{max-width:44px!important;max-height:44px!important;object-fit:contain!important;}
    .brand div{display:none!important;}
    .sidebar nav{width:100%!important;display:flex!important;flex-direction:column!important;gap:10px!important;align-items:center!important;}
    .sidebar nav button{width:52px!important;height:52px!important;min-height:52px!important;padding:0!important;display:grid!important;place-items:center!important;border-radius:16px!important;position:relative!important;color:#64748b!important;background:transparent!important;border:1px solid transparent!important;transition:all .18s ease!important;}
    .sidebar nav button svg{width:21px!important;height:21px!important;margin:0!important;}
    .sidebar nav button:hover{background:var(--ux-blue-soft)!important;color:var(--ux-blue)!important;transform:translateY(-1px)!important;}
    .sidebar nav button.active{background:linear-gradient(135deg,#00A0D1 0%,#008bb8 100%)!important;color:#fff!important;box-shadow:0 10px 22px rgba(0,160,209,.24)!important;}
    .sidebar nav button::after{content:attr(data-label);position:absolute;left:64px;top:50%;transform:translateY(-50%);background:#0f172a;color:#fff;font-size:13px;font-weight:700;padding:8px 10px;border-radius:10px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s ease, transform .15s ease;z-index:50;box-shadow:0 10px 24px rgba(15,23,42,.18);}
    .sidebar nav button:hover::after{opacity:1;transform:translateY(-50%) translateX(4px);}
    .navLabel{display:none!important;}
    .sidebarBox{width:52px!important;height:52px!important;margin-top:auto!important;padding:7px!important;border-radius:50%!important;display:grid!important;place-items:center!important;background:#e6f8fd!important;border:1px solid #c9eef8!important;overflow:hidden!important;position:relative!important;}
    .sidebarBox b{display:none!important;}
    .sidebarBox::after{content:'';width:100%!important;height:100%!important;background:url('/daleth-star.png') center/contain no-repeat!important;display:block!important;}
    .sidebarBox span{display:none!important;}
    .main{padding:22px 28px 32px!important;min-width:0!important;}
    .topbar{background:rgba(255,255,255,.9)!important;backdrop-filter:blur(14px)!important;border:1px solid var(--ux-border)!important;border-radius:24px!important;padding:18px 20px!important;margin-bottom:22px!important;box-shadow:var(--ux-shadow)!important;align-items:center!important;gap:18px!important;}
    .uxHeaderTitle{min-width:260px!important;}
    .uxHeaderTitle h1{font-size:26px!important;line-height:1.02!important;letter-spacing:-.04em!important;color:var(--ux-text)!important;margin:0!important;font-weight:900!important;}
    .uxHeaderTitle p{margin:5px 0 0!important;color:var(--ux-muted)!important;font-size:14px!important;font-weight:600!important;}
    .uxEyebrow{display:inline-flex!important;align-items:center!important;gap:6px!important;color:var(--ux-blue)!important;background:var(--ux-blue-soft)!important;border:1px solid #c9eef8!important;border-radius:999px!important;padding:5px 10px!important;font-size:12px!important;font-weight:900!important;margin-bottom:8px!important;}
    .topActions{flex:1!important;justify-content:flex-end!important;gap:12px!important;}
    .search{min-width:min(440px,36vw)!important;height:46px!important;background:#f8fbff!important;border:1px solid var(--ux-border)!important;border-radius:16px!important;padding:0 14px!important;}
    .search input{font-size:14px!important;}
    .notification{border:1px solid var(--ux-border)!important;border-radius:16px!important;background:#fff!important;box-shadow:0 6px 18px rgba(15,23,42,.04)!important;}
    .panel,.kpi,.dealCard,.matrixCard{border-radius:var(--ux-radius)!important;border:1px solid var(--ux-border)!important;box-shadow:0 10px 28px rgba(15,23,42,.05)!important;background:var(--ux-surface)!important;}
    .cards{gap:16px!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;}
    .kpi{padding:18px!important;}
    .kpi strong{font-size:clamp(22px,2vw,32px)!important;letter-spacing:-.04em!important;}
    .grid2{gap:18px!important;}
    .tableWrap table{font-size:13px!important;}
    .kanban{gap:10px!important;overflow-x:auto!important;padding-bottom:12px!important;align-items:flex-start!important;}
    .column{min-width:205px!important;width:205px!important;max-height:calc(100vh - 230px)!important;padding:12px!important;border-radius:18px!important;border:1px solid var(--ux-border)!important;background:#fff!important;box-shadow:0 8px 20px rgba(15,23,42,.04)!important;display:flex!important;flex-direction:column!important;}
    .column.stageDragging{opacity:.55!important;}
    .column.stageDropTarget{border-color:var(--ux-blue)!important;box-shadow:0 0 0 3px rgba(0,160,209,.14),0 8px 20px rgba(15,23,42,.04)!important;}
    .column h3{font-size:13px!important;line-height:1.2!important;margin-bottom:10px!important;gap:6px!important;}
    .column h3 small{width:24px!important;height:24px!important;min-width:24px!important;font-size:12px!important;}
    .stageHeader{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;align-items:start!important;margin-bottom:10px!important;}
    .stageName{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:8px!important;width:100%!important;border:0!important;background:transparent!important;padding:0!important;text-align:left!important;color:var(--ux-text)!important;font-weight:900!important;font-size:13px!important;line-height:1.25!important;cursor:pointer!important;}
    .stageName span{min-width:0!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;word-break:break-word!important;}
    .stageName small{display:grid!important;place-items:center!important;width:24px!important;height:24px!important;min-width:24px!important;border-radius:999px!important;background:var(--ux-blue-soft)!important;color:var(--ux-blue)!important;font-size:12px!important;font-weight:900!important;}
    .stageActions{display:flex!important;gap:6px!important;justify-content:flex-start!important;flex-wrap:wrap!important;}
    .stageActions button{width:28px!important;height:28px!important;padding:0!important;display:grid!important;place-items:center!important;border-radius:9px!important;}
    .stageDragHandle{cursor:grab!important;}
    .stageDragHandle:active{cursor:grabbing!important;}
    .stageEdit{display:grid!important;gap:8px!important;margin-bottom:10px!important;}
    .stageEdit input{width:100%!important;min-width:0!important;}
    .stageEditActions{display:flex!important;gap:6px!important;flex-wrap:wrap!important;}
    .stageCards{min-height:0!important;overflow-y:auto!important;overscroll-behavior:contain!important;padding-right:4px!important;}
    .stageCards::-webkit-scrollbar{width:8px!important;}
    .stageCards::-webkit-scrollbar-thumb{background:#cbd5e1!important;border-radius:999px!important;}
    .bulkActions{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;flex-wrap:wrap!important;margin-bottom:12px!important;padding:10px 12px!important;border:1px solid var(--ux-border)!important;border-radius:14px!important;background:#f8fbfd!important;}
    .bulkActions span{color:var(--ux-muted)!important;font-size:13px!important;font-weight:800!important;}
    .rowSelect{width:18px!important;height:18px!important;accent-color:var(--ux-blue)!important;cursor:pointer!important;}
    .timelineItem{position:relative!important;}
    .timelineNote:hover::after{content:attr(data-full-note);position:absolute;left:18px;top:calc(100% + 8px);width:min(520px,72vw);max-height:260px;overflow:auto;white-space:pre-wrap;background:#0f172a;color:#fff;border-radius:14px;padding:14px 16px;font-size:13px;line-height:1.5;font-weight:500;box-shadow:0 18px 44px rgba(15,23,42,.28);z-index:80;}
    .dealCard{padding:10px!important;margin-bottom:10px!important;border-radius:14px!important;}
    .dealCard b{font-size:13px!important;line-height:1.25!important;display:block!important;}
    .dealCard span{font-size:12px!important;line-height:1.25!important;}
    .dealCard strong{font-size:13px!important;margin-top:6px!important;}
    .dealCard select{margin-top:8px!important;min-height:34px!important;font-size:12px!important;border-radius:10px!important;}
    .toolbar{gap:10px!important;}
    .mini,.saveBtn{border-radius:12px!important;}
    @media(max-width:1100px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))!important;}.topbar{align-items:flex-start!important;flex-direction:column!important;}.topActions{width:100%!important;justify-content:flex-start!important;flex-wrap:wrap!important;}.search{min-width:100%!important;}}
  `}</style>;
}

function App(){
  const [page,setPage] = useState('dashboard');
  const [query,setQuery] = useState('');
  const [currentUser,setCurrentUser] = useState(null);
  const [companies,setCompanies] = useCompanies();
  const [contacts,setContacts] = useContacts();
  const [deals,setDeals] = useDeals();
  const [activities,setActivities] = useActivities();
  const [notes,setNotes] = useNotes();
  const [interactions,setInteractions] = useStore('dsh-v1-interactions', initialInteractions);
  const [opportunityFiles,setOpportunityFiles] = useStore('dsh-v1-opportunity-files', []);
  const [emailLogs,setEmailLogs] = useStore('dsh-v1-email-logs', []);
  const [emailTemplates,setEmailTemplates] = useStore('dsh-v1-email-templates', INITIAL_EMAIL_TEMPLATES);
  const [emailSignatures,setEmailSignatures] = useStore('dsh-v1-email-signatures', {});
  const [contracts,setContracts] = useContracts();
  const [products,setProducts] = useProducts();
  const [pipedriveImportMeta,setPipedriveImportMeta] = useStore('dsh-v1-pipedrive-import-meta', null);
  const [stages,setStages] = useStore('dsh-v1-stages', STAGES);
  const [selectedDealId,setSelectedDealId] = useState(null);
  const [selectedCompanyId,setSelectedCompanyId] = useState(null);
  const [selectedContactId,setSelectedContactId] = useState(null);
  const [selectedContractId,setSelectedContractId] = useState(null);
  const [selectedActivityId,setSelectedActivityId] = useState(null);
  const [selectedProductName,setSelectedProductName] = useState(null);
  const [authReady,setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function restoreSession(){
      try {
        const { data } = await Promise.race([
          supabase.auth.getSession(),
          new Promise(resolve => setTimeout(() => resolve({ data: { session: null } }), 4000))
        ]);
        const authUser = data?.session?.user;
        if(authUser){
          const profile = await loadUserProfile(authUser);
          if(active) setCurrentUser(profile);
        } else if(active) {
          setCurrentUser(null);
        }
      } catch (error) {
        console.warn('Falha ao restaurar sessão Supabase:', error);
      } finally {
        if(active) setAuthReady(true);
      }
    }

    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if(!active) return;
      if(session?.user){
        try {
          const profile = await loadUserProfile(session.user);
          if(active) setCurrentUser(profile);
        } catch (error) {
          console.warn('Falha ao carregar perfil Supabase:', error);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  if(!authReady) return <div className="app" style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f6f8fb',color:'#061b34',fontWeight:900}}>Carregando acesso...</div>;
  if(!currentUser) return <LoginScreen onLogin={setCurrentUser}/>;
  const selectedDeal = byId(deals, selectedDealId);
  const selectedCompany = byId(companies, selectedCompanyId);
  const selectedContact = byId(contacts, selectedContactId);
  const selectedContract = byId(contracts, selectedContractId);
  const selectedActivity = byId(activities, selectedActivityId);
  const canViewDashboard = currentUser?.canViewDashboard === true;
  const isCEO = currentUser?.role === 'CEO';
  const canWrite = ['CEO','Comercial'].includes(currentUser?.role);
  const allMenu = [
    ['dashboard','Dashboard',LayoutDashboard], ['pipeline','Pipeline',KanbanSquare], ['deals','Oportunidades',BriefcaseBusiness],
    ['contracts','Contratos',CheckCircle2], ['activities','Atividades',CalendarDays], ['documents','Documentos',FolderOpen], ['companies','Empresas',Building2], ['contacts','Contatos',UserRound], ['products','Produtos',Package], ['imports','Importação',Filter], ['profiles','Perfis',Lock], ['matrix','Matriz Daleth',Sparkles]
  ];
  const menu = allMenu.filter(([id]) => {
    if(id === 'dashboard') return canViewDashboard;
    if(['imports','profiles'].includes(id)) return isCEO;
    return true;
  });
  const activePage = (!canViewDashboard && page === 'dashboard') ? 'deals' : page;
  const pendingActivities = activities.filter(a => a.status !== 'Concluída');
  const overdueCount = pendingActivities.filter(a => a.dueDate && a.dueDate < today()).length;
  const meetingsTodayCount = pendingActivities.filter(a => a.dueDate === today() && String(a.type || '').toLowerCase().includes('reuni')).length;
  const proposalsWithoutFollowup = deals.filter(d =>
    d.stage === 'Proposta Enviada' &&
    !pendingActivities.some(a => sameId(a.dealId, d.id) && a.dueDate && a.dueDate >= today())
  ).length;
  const alertTotal = overdueCount + meetingsTodayCount + proposalsWithoutFollowup;
  const alertText = `${overdueCount} atividades vencidas · ${proposalsWithoutFollowup} propostas sem follow-up · ${meetingsTodayCount} reuniões hoje`;
  const context = { currentUser, canWrite, companies,setCompanies,contacts,setContacts,deals,setDeals,activities,setActivities,notes,setNotes,interactions,setInteractions,opportunityFiles,setOpportunityFiles,emailLogs,setEmailLogs,emailTemplates,setEmailTemplates,emailSignatures,setEmailSignatures,contracts,setContracts,products,setProducts,pipedriveImportMeta,setPipedriveImportMeta,stages,setStages,setSelectedDealId,setSelectedCompanyId,setSelectedContactId,setSelectedContractId,setSelectedActivityId,setSelectedProductName,query };
  const logout = async () => {
    setQuery('');
    setSelectedDealId(null);
    setSelectedProductName(null);
    setSelectedContractId(null);
    await supabase.auth.signOut();
    setCurrentUser(null);
  };
  const navigate = (id) => {
    setPage(id);
    setQuery('');
    setSelectedDealId(null);
    setSelectedCompanyId(null);
    setSelectedContactId(null);
    setSelectedContractId(null);
    setSelectedActivityId(null);
    setSelectedProductName(null);
  };
  return <div className="app">
    <UXStyle/>
    <aside className="sidebar">
      <div className="brand" style={{alignItems:'center'}}>
        <img src="/daleth-star.png" alt="Daleth AC" style={{width:'42px',height:'42px',objectFit:'contain',flex:'0 0 auto'}} />
        <div><b>Daleth</b><span>Sales Hub</span></div>
      </div>
      <nav>{menu.map(([id,label,Icon]) => <button key={id} title={label} aria-label={label} data-label={label} className={activePage===id?'active':''} onClick={()=>navigate(id)}><Icon size={18}/><span className="navLabel">{label}</span></button>)}</nav>
      <div className="sidebarBox"><b>Perfil ativo</b><span>{currentUser.name} · {currentUser.role}</span></div>
    </aside>
    <main className="main">
      <header className="topbar uxTopbar"><div className="uxHeaderTitle"><span className="uxEyebrow">{menu.find(m=>m[0]===activePage)?.[1] || 'Workspace'}</span><h1>Daleth Sales Hub</h1><p>Customer Acquisition Platform</p></div><div className="topActions"><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar empresas, contatos e oportunidades..."/></div><div className="notification"><BellRing size={18}/><span>{alertTotal}</span><div><b>Alertas comerciais</b><small>{alertText}</small></div></div><div className="notification" style={{minWidth:'150px'}}><UserRound size={18}/><div><b>{currentUser.name}</b><small>{currentUser.role}</small></div></div><button className="mini" onClick={logout}><X size={15}/>Sair</button></div></header>
      {selectedDeal ? <DealDetailPage deal={selectedDeal} {...context} onBack={()=>setSelectedDealId(null)}/> : (query.trim() ? <GlobalSearch {...context}/> : <>
        {activePage==='dashboard' && canViewDashboard && <Dashboard {...context}/>} {activePage==='pipeline' && <Pipeline {...context}/>} {activePage==='deals' && <Deals {...context}/>} {activePage==='contracts' && <Contracts {...context}/>} {activePage==='activities' && <Activities {...context}/>} {activePage==='documents' && <Documents {...context}/>} {activePage==='companies' && <Companies {...context}/>} {activePage==='contacts' && <Contacts {...context}/>} {activePage==='products' && <Products {...context}/>} {activePage==='imports' && isCEO && <PipedriveImport {...context}/>} {activePage==='profiles' && isCEO && <ProfilesAdmin {...context}/>} {activePage==='matrix' && <Matrix {...context}/>}
      </>)}
    </main>
    {selectedCompany && <CompanyModal company={selectedCompany} companies={companies} setCompanies={setCompanies} contacts={contacts} setSelectedContactId={setSelectedContactId} canWrite={canWrite} onClose={()=>setSelectedCompanyId(null)}/>}
    {selectedContact && <ContactModal contact={selectedContact} contacts={contacts} setContacts={setContacts} companies={companies} setSelectedCompanyId={setSelectedCompanyId} canWrite={canWrite} onClose={()=>setSelectedContactId(null)}/>}
    {selectedContract && <ContractModal contract={selectedContract} contracts={contracts} setContracts={setContracts} companies={companies} deals={deals} products={products} setSelectedCompanyId={setSelectedCompanyId} setSelectedDealId={setSelectedDealId} setSelectedProductName={setSelectedProductName} canWrite={canWrite} onClose={()=>setSelectedContractId(null)}/>}
    {selectedActivity && <ActivityModal activity={selectedActivity} activities={activities} setActivities={setActivities} deals={deals} canWrite={canWrite} onClose={()=>setSelectedActivityId(null)}/>}  
    {selectedProductName && <ProductInfoModal product={selectedProductName} products={products} setProducts={setProducts} canWrite={canWrite} onClose={()=>setSelectedProductName(null)}/>}
  </div>;
}


function GlobalSearch({query,companies,contacts,deals,setDeals,activities,contracts,products,canWrite,setSelectedDealId,setSelectedCompanyId,setSelectedContactId,setSelectedContractId,setSelectedActivityId,setSelectedProductName}){
  const q = query.trim().toLowerCase();
  const includes = (...values) => values.join(' ').toLowerCase().includes(q);
  const companyResults = companies.filter(c => includes(c.name,c.segment,c.site,c.status,c.notes)).slice(0,8);
  const contactResults = contacts.filter(c => {
    const company = byId(companies,c.companyId);
    return includes(c.name,c.role,c.email,c.phone,c.whatsapp,c.notes,company?.name,company?.segment);
  }).slice(0,8);
  const matchingDeals = deals.filter(d => {
    const company = byId(companies,d.companyId);
    return includes(d.title,d.product,d.owner,d.stage,d.description,d.nextStep,company?.name,company?.segment);
  });
  const dealResults = matchingDeals
    .sort((a,b)=>String(a.title || '').localeCompare(String(b.title || ''),'pt-BR',{sensitivity:'base'}))
    .slice(0,12);
  const matchingContracts = contracts.filter(c => {
    const company = byId(companies,c.companyId);
    return includes(company?.name,c.product,c.owner,c.status,c.notes);
  });
  const contractResults = matchingContracts.slice(0,8);
  const relatedProducts = new Set([
    ...matchingDeals.map(d=>d.product),
    ...matchingContracts.map(c=>c.product),
  ].filter(Boolean).map(p=>String(p).trim().toLowerCase()));
  const productResults = safeArray(products).filter(p => includes(p) || relatedProducts.has(String(p).trim().toLowerCase())).slice(0,8);
  const activityResults = activities.filter(a => {
    const deal = byId(deals,a.dealId);
    const company = byId(companies,deal?.companyId);
    return includes(
      a.title,a.type,a.owner,a.status,a.notes,
      deal?.title,deal?.product,deal?.owner,deal?.stage,deal?.description,deal?.nextStep,
      company?.name,company?.segment
    );
  }).slice(0,8);
  const total = companyResults.length + contactResults.length + dealResults.length + contractResults.length + productResults.length + activityResults.length;
  const removeDealFromSearch = async (deal) => {
    if(!canWrite) return;
    if(!window.confirm('Deseja realmente excluir esta oportunidade?')) return;
    try {
      await deleteDealFromSupabase(deal);
      setDeals(deals.filter(d => !sameId(d.id, deal.id)));
    } catch (error) {
      console.warn('Falha ao excluir oportunidade pela busca:', error);
      window.alert('Não foi possível excluir esta oportunidade no Supabase agora.');
    }
  };
  return <>
    <Panel title={`Busca no CRM: ${query}`}>
      <p className="muted">Resultados encontrados nas principais áreas do Sales Hub. Clique em uma linha ou em “Abrir” para consultar e editar.</p>
      {!total && <p className="muted">Nenhum resultado encontrado.</p>}
    </Panel>
    <section className="grid2 compact">
      <Panel title="Oportunidades">
        <DashboardTable headers={['Oportunidade','Empresa','Etapa','Valor total','Ações']}>
          {dealResults.length ? dealResults.map(d=><tr key={d.id} onClick={()=>setSelectedDealId(d.id)} style={{cursor:'pointer'}}><td><b>{d.title}</b><span>{d.product}</span></td><td>{byId(companies,d.companyId)?.name || '-'}</td><td>{d.stage}</td><td>{moneyShort(dealTcv(d))}</td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedDealId(d.id)}}><Edit3 size={15}/>Editar</button>{canWrite && <button className="mini" onClick={(e)=>{e.stopPropagation(); removeDealFromSearch(d)}}><Trash2 size={15}/>Excluir</button>}</div></td></tr>) : <tr><td>Nenhuma oportunidade</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
        </DashboardTable>
      </Panel>
      <Panel title="Empresas">
        <DashboardTable headers={['Empresa','Segmento','Status','Ações']}>
          {companyResults.length ? companyResults.map(c=><tr key={c.id} onClick={()=>setSelectedCompanyId(c.id)} style={{cursor:'pointer'}}><td><b>{c.name}</b><span>{c.site}</span></td><td>{c.segment || '-'}</td><td>{c.status || '-'}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedCompanyId(c.id)}}><Edit3 size={15}/>Abrir</button></td></tr>) : <tr><td>Nenhuma empresa</td><td>-</td><td>-</td><td>-</td></tr>}
        </DashboardTable>
      </Panel>
    </section>
    <section className="grid2 compact">
      <Panel title="Contatos">
        <DashboardTable headers={['Contato','Empresa','E-mail','Telefone','Ações']}>
          {contactResults.length ? contactResults.map(c=><tr key={c.id} onClick={()=>setSelectedContactId(c.id)} style={{cursor:'pointer'}}><td><b>{c.name}</b><span>{c.role}</span></td><td>{byId(companies,c.companyId)?.name || '-'}</td><td>{c.email || '-'}</td><td>{c.phone || c.whatsapp || '-'}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedContactId(c.id)}}><Edit3 size={15}/>Abrir</button></td></tr>) : <tr><td>Nenhum contato</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
        </DashboardTable>
      </Panel>
      <Panel title="Contratos">
        <DashboardTable headers={['Cliente','Produto','Receita mensal','Status','Ações']}>
          {contractResults.length ? contractResults.map(c=>{ const company = byId(companies,c.companyId); return <tr key={c.id} onClick={()=>setSelectedContractId?.(c.id)} style={{cursor:'pointer'}}><td><b>{company?.name || 'Sem cliente'}</b></td><td>{c.product}</td><td>{moneyShort(contractMrr(c))}</td><td>{c.status}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedContractId?.(c.id)}}><Edit3 size={15}/>Abrir</button></td></tr> }) : <tr><td>Nenhum contrato</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
        </DashboardTable>
      </Panel>
    </section>
    <section className="grid2 compact">
      <Panel title="Produtos">
        <DashboardTable headers={['Produto','Ações']}>
          {productResults.length ? productResults.map(p=><tr key={p} onClick={()=>setSelectedProductName?.(p)} style={{cursor:'pointer'}}><td><b>{p}</b></td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedProductName?.(p)}}><Edit3 size={15}/>Abrir</button></td></tr>) : <tr><td>Nenhum produto</td><td>-</td></tr>}
        </DashboardTable>
      </Panel>
      <Panel title="Atividades">
        <DashboardTable headers={['Atividade','Tipo','Data','Responsável','Ações']}>
          {activityResults.length ? activityResults.map(a=><tr key={a.id} onClick={()=>setSelectedActivityId(a.id)} style={{cursor:'pointer'}}><td><b>{a.title}</b><span>{a.notes}</span></td><td>{a.type}</td><td>{formatActivityDateTime(a)}{a.meetingLink && <span><a href={a.meetingLink} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>Link chamada</a></span>}</td><td>{a.owner || '-'}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedActivityId(a.id)}}><Edit3 size={15}/>Abrir</button></td></tr>) : <tr><td>Nenhuma atividade</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
        </DashboardTable>
      </Panel>
    </section>
  </>;
}

function Dashboard({deals,companies,contacts,activities,contracts,interactions,stages=STAGES,setSelectedDealId,setSelectedActivityId,setSelectedContractId,setSelectedCompanyId,setSelectedProductName}){
  const [selectedStage,setSelectedStage] = useState(null);
  const [selectedSegment,setSelectedSegment] = useState(null);
  const [selectedSummary,setSelectedSummary] = useState(null);
  const open = deals.filter(d => !['Ganho','Perdido'].includes(d.stage));
  const won = deals.filter(d => d.stage==='Ganho');
  const pending = activities.filter(a => a.status !== 'Concluída');
  const activeContracts = contracts.filter(c => contractStatus(c)==='Ativo');
  const activeContractMrr = activeContracts.reduce((s,c)=>s+contractMrr(c),0);
  const activeContractArr = activeContractMrr * 12;
  const expiring90 = activeContracts.filter(c => { const days = daysUntil(c.endDate); return days !== null && days <= 90; });
  const revenueAtRisk90 = expiring90.reduce((s,c)=>s+contractMrr(c),0);
  const openMrr = open.reduce((s,d)=>s + dealMrr(d),0);
  const openSetup = open.reduce((s,d)=>s + dealSetup(d),0);
  const openTcv = open.reduce((s,d)=>s + dealTcv(d),0);
  const openArr = open.reduce((s,d)=>s + dealArr(d),0);
  const weightedTcv = open.reduce((s,d)=>s + dealWeightedTcv(d),0);
  const wonMrr = won.reduce((s,d)=>s + dealMrr(d),0);
  const wonTcv = won.reduce((s,d)=>s + dealTcv(d),0);
  const thisMonth = today().slice(0,7);
  const next90 = new Date();
  next90.setDate(next90.getDate()+90);
  const forecast30 = open.reduce((s,d)=>s + (d.closeDate?.startsWith(thisMonth) ? dealWeightedTcv(d) : 0),0);
  const forecast90 = open.reduce((s,d)=>{
    if(!d.closeDate) return s;
    const date = new Date(d.closeDate + 'T00:00:00');
    return date <= next90 ? s + dealWeightedTcv(d) : s;
  },0);

  const stageRows = safeArray(stages).map(stage => {
    const stageDeals = open.filter(d=>d.stage===stage);
    return {
      label: stage,
      count: stageDeals.length,
      total: stageDeals.reduce((s,d)=>s+dealTcv(d),0)
    };
  });

  const segmentRows = Object.entries(open.reduce((acc,d)=>{
    const seg = dealSegment(d, companies);
    if(!acc[seg]) acc[seg] = {label: seg, count: 0, total: 0};
    acc[seg].count += 1;
    acc[seg].total += dealTcv(d);
    return acc;
  },{})).map(([,row])=>row).sort((a,b)=>b.total-a.total);

  const topDeals = [...open].sort((a,b)=>dealTcv(b)-dealTcv(a)).slice(0,5);
  const overdueActivities = pending
    .filter(a => a.dueDate && a.dueDate < today())
    .sort((a,b)=>(String(a.dueDate) + String(a.dueTime || '')).localeCompare(String(b.dueDate) + String(b.dueTime || '')))
    .slice(0,5);

  const lastTouchDate = (deal) => {
    const dates = [
      ...safeArray(interactions).filter(i=>sameId(i.dealId,deal.id)).map(i=>i.dateTime || i.createdAt || i.date),
      ...safeArray(activities).filter(a=>sameId(a.dealId,deal.id) && a.status === 'Concluída').map(a=>a.dueDate || a.date),
    ].filter(Boolean).sort((a,b)=>String(b).localeCompare(String(a)));
    return dates[0] || deal.closeDate || deal.createdAt || '';
  };

  const noContactDeals = open
    .map(d => {
      const last = lastTouchDate(d);
      const days = last ? Math.max(0, Math.floor((new Date(today() + 'T00:00:00') - new Date(String(last).slice(0,10) + 'T00:00:00')) / 86400000)) : 999;
      return {...d, daysWithoutContact: days};
    })
    .filter(d => d.daysWithoutContact >= 15)
    .sort((a,b)=>b.daysWithoutContact-a.daysWithoutContact)
    .slice(0,5);

  return <>
    <section style={{
      display:'grid',
      gridTemplateColumns:'minmax(320px, 1.15fr) minmax(320px, .85fr)',
      gap:'20px',
      marginBottom:'20px'
    }}>
      <div style={{
        border:'1px solid #dbe7f3',
        borderRadius:'26px',
        background:'linear-gradient(135deg,#ffffff 0%,#eef7ff 58%,#f7fbff 100%)',
        boxShadow:'0 20px 55px rgba(15, 23, 42, .08)',
        padding:'28px',
        minHeight:'210px',
        display:'flex',
        flexDirection:'column',
        justifyContent:'space-between'
      }}>
        <div>
          <span style={{
            display:'inline-flex',
            alignItems:'center',
            gap:'8px',
            padding:'8px 12px',
            borderRadius:'999px',
            background:'rgba(0,120,255,.10)',
            color:'#075fb8',
            fontSize:'13px',
            fontWeight:900,
            textTransform:'uppercase',
            letterSpacing:'.05em'
          }}><TrendingUp size={15}/> Visão executiva</span>
          <h2 style={{
            margin:'18px 0 8px',
            fontSize:'34px',
            lineHeight:1.05,
            letterSpacing:'-.045em',
            color:'#061b34'
          }}>Pipeline comercial da Daleth AC</h2>
          <p style={{margin:0,color:'#64748b',fontSize:'16px',maxWidth:'680px'}}>
            Receita recorrente, contratos e oportunidades abertas em uma visão única para tomada de decisão.
          </p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px',marginTop:'22px'}}>
          <div style={{background:'#fff',border:'1px solid #e4edf7',borderRadius:'18px',padding:'16px'}}>
            <span style={{display:'block',fontSize:'12px',fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em'}}>Receita mensal contratada</span>
            <strong style={{display:'block',fontSize:'25px',marginTop:'8px',color:'#061b34'}}>{moneyShort(activeContractMrr || wonMrr)}</strong>
          </div>
          <div style={{background:'#fff',border:'1px solid #e4edf7',borderRadius:'18px',padding:'16px'}}>
            <span style={{display:'block',fontSize:'12px',fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em'}}>Valor total do pipeline</span>
            <strong style={{display:'block',fontSize:'25px',marginTop:'8px',color:'#061b34'}}>{moneyShort(openTcv)}</strong>
          </div>
          <div style={{background:'#fff',border:'1px solid #e4edf7',borderRadius:'18px',padding:'16px'}}>
            <span style={{display:'block',fontSize:'12px',fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em'}}>Previsão ponderada</span>
            <strong style={{display:'block',fontSize:'25px',marginTop:'8px',color:'#061b34'}}>{moneyShort(weightedTcv)}</strong>
          </div>
        </div>
      </div>

      <div style={{
        border:'1px solid #dbe7f3',
        borderRadius:'26px',
        background:'#ffffff',
        boxShadow:'0 20px 55px rgba(15, 23, 42, .07)',
        padding:'24px'
      }}>
        <h2 style={{margin:'0 0 16px',fontSize:'20px',color:'#061b34'}}>Resumo operacional</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'12px'}}>
          <MiniMetric icon={Clock3} label="Previsão 30 dias" value={moneyShort(forecast30)} />
          <MiniMetric icon={CalendarDays} label="Previsão 90 dias" value={moneyShort(forecast90)} />
          <MiniMetric icon={AlertTriangle} label="Receita em risco" value={moneyShort(revenueAtRisk90)} />
          <MiniMetric icon={BriefcaseBusiness} label="Atividades pendentes" value={pending.length} onClick={()=>setSelectedSummary(selectedSummary === "pending" ? null : "pending")} active={selectedSummary === "pending"} />
          <MiniMetric icon={CheckCircle2} label="Contratos ativos" value={activeContracts.length} onClick={()=>setSelectedSummary(selectedSummary === "activeContracts" ? null : "activeContracts")} active={selectedSummary === "activeContracts"} />
          <MiniMetric icon={CalendarDays} label="Vencendo 90 dias" value={expiring90.length} onClick={()=>setSelectedSummary(selectedSummary === "expiring90" ? null : "expiring90")} active={selectedSummary === "expiring90"} />
        </div>
      </div>
    </section>

    {selectedSummary && <Panel title={selectedSummary === 'pending' ? 'Atividades pendentes' : selectedSummary === 'activeContracts' ? 'Contratos ativos' : 'Contratos vencendo em 90 dias'}>
      {selectedSummary === 'pending' && <DashboardTable headers={['Atividade','Oportunidade','Data e hora','Link','Responsável','Ações']}>
        {pending.length ? pending.slice().sort((a,b)=>(String(a.dueDate || '') + String(a.dueTime || '')).localeCompare(String(b.dueDate || '') + String(b.dueTime || ''))).slice(0,12).map(a=>{
          const deal = byId(deals,a.dealId);
          return <tr key={a.id} onClick={()=>setSelectedActivityId?.(a.id)} style={{cursor:'pointer'}}><td><b>{a.title}</b><span>{a.type}</span></td><td>{deal?.title || '-'}</td><td>{formatActivityDateTime(a)}</td><td>{a.meetingLink ? <a href={a.meetingLink} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>Abrir chamada</a> : '-'}</td><td>{a.owner || '-'}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedActivityId?.(a.id)}}><Edit3 size={15}/>Abrir</button></td></tr>
        }) : <tr><td>Nenhuma atividade pendente</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
      </DashboardTable>}
      {selectedSummary === 'activeContracts' && <DashboardTable headers={['Cliente','Produto','Receita mensal','Término','Tempo restante']}>
        {activeContracts.length ? activeContracts.slice().sort((a,b)=>contractMrr(b)-contractMrr(a)).slice(0,12).map(c=>{
          const company = byId(companies,c.companyId);
          return <tr key={c.id} onClick={()=>setSelectedContractId?.(c.id)} style={{cursor:'pointer'}}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.notes}</span></td><td>{c.product || '-'}</td><td>{moneyShort(contractMrr(c))}</td><td>{formatDate(c.endDate)}</td><td>{monthsRemaining(c.endDate)} meses</td></tr>
        }) : <tr><td>Nenhum contrato ativo</td><td>-</td><td>{moneyShort(0)}</td><td>-</td><td>-</td></tr>}
      </DashboardTable>}
      {selectedSummary === 'expiring90' && <DashboardTable headers={['Cliente','Produto','Término','Tempo restante','Receita mensal']}>
        {expiring90.length ? expiring90.slice().sort((a,b)=>String(a.endDate || '').localeCompare(String(b.endDate || ''))).map(c=>{
          const company = byId(companies,c.companyId);
          return <tr key={c.id} onClick={()=>setSelectedContractId?.(c.id)} style={{cursor:'pointer'}}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.notes}</span></td><td>{c.product || '-'}</td><td>{formatDate(c.endDate)}</td><td>{monthsRemaining(c.endDate)} meses</td><td>{moneyShort(contractMrr(c))}</td></tr>
        }) : <tr><td>Nenhum contrato vencendo em 90 dias</td><td>-</td><td>-</td><td>-</td><td>{moneyShort(0)}</td></tr>}
      </DashboardTable>}
    </Panel>}

    <section className="cards" style={{gridTemplateColumns:'repeat(4,minmax(170px,1fr))'}}>
      <Kpi icon={CircleDollarSign} label="Receita mensal potencial" value={moneyShort(openMrr)}/>
      <Kpi icon={TrendingUp} label="Receita anualizada potencial" value={moneyShort(openArr)}/>
      <Kpi icon={BriefcaseBusiness} label="Valor total dos contratos" value={moneyShort(openTcv)}/>
      <Kpi icon={CheckCircle2} label="Receita anualizada contratada" value={moneyShort(activeContractArr)}/>
    </section>

    <section className="grid2" style={{alignItems:'start'}}>
      <Panel title="Pipeline por etapa">
        <DashboardTable headers={['Etapa','Oportunidades','Valor total','Ações']}>
          {stageRows.map(row=><tr key={row.label} onClick={()=>setSelectedStage(selectedStage===row.label ? null : row.label)} style={{cursor:'pointer'}} title="Clique para ver as oportunidades desta etapa"><td>{row.label}</td><td>{row.count}</td><td><b>{moneyShort(row.total)}</b></td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedStage(selectedStage===row.label ? null : row.label)}}>{selectedStage===row.label ? 'Fechar' : 'Ver oportunidades'}</button></td></tr>)}
          <tr className="totalRow"><td>Total</td><td>{open.length}</td><td>{moneyShort(openTcv)}</td><td>-</td></tr>
        </DashboardTable>
        {selectedStage && <div style={{marginTop:'18px'}}>
          <h3 style={{fontSize:'18px',margin:'0 0 10px'}}>Oportunidades em {selectedStage}</h3>
          <DashboardTable headers={['Oportunidade','Empresa','Responsável','Valor total','Ações']}>
            {open.filter(d=>d.stage===selectedStage).length ? open.filter(d=>d.stage===selectedStage).map(d=><tr key={d.id} onClick={()=>setSelectedDealId(d.id)} style={{cursor:'pointer'}}><td><b>{d.title}</b><span>{d.nextStep}</span></td><td>{byId(companies,d.companyId)?.name || '-'}</td><td>{d.owner || '-'}</td><td>{moneyShort(dealTcv(d))}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedDealId(d.id)}}><Edit3 size={15}/>Abrir</button></td></tr>) : <tr><td>Nenhuma oportunidade nesta etapa</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
          </DashboardTable>
        </div>}
      </Panel>

      <Panel title="Pipeline por segmento">
        <DashboardTable headers={['Segmento','Oportunidades','Valor total','Ações']}>
          {segmentRows.length ? segmentRows.map(row=><tr key={row.label} onClick={()=>setSelectedSegment(selectedSegment===row.label ? null : row.label)} style={{cursor:'pointer'}} title="Clique para ver as oportunidades deste segmento"><td>{row.label}</td><td>{row.count}</td><td><b>{moneyShort(row.total)}</b></td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedSegment(selectedSegment===row.label ? null : row.label)}}>{selectedSegment===row.label ? 'Fechar' : 'Ver oportunidades'}</button></td></tr>) : <tr><td>Nenhum segmento</td><td>0</td><td>{moneyShort(0)}</td><td>-</td></tr>}
          <tr className="totalRow"><td>Total</td><td>{open.length}</td><td>{moneyShort(openTcv)}</td><td>-</td></tr>
        </DashboardTable>
        {selectedSegment && <div style={{marginTop:'18px'}}>
          <h3 style={{fontSize:'18px',margin:'0 0 10px'}}>Oportunidades em {selectedSegment}</h3>
          <DashboardTable headers={['Oportunidade','Empresa','Etapa','Valor total','Ações']}>
            {open.filter(d=>dealSegment(d,companies)===selectedSegment).length ? open.filter(d=>dealSegment(d,companies)===selectedSegment).map(d=><tr key={d.id} onClick={()=>setSelectedDealId(d.id)} style={{cursor:'pointer'}}><td><b>{d.title}</b><span>{d.nextStep}</span></td><td>{byId(companies,d.companyId)?.name || '-'}</td><td>{d.stage || '-'}</td><td>{moneyShort(dealTcv(d))}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedDealId(d.id)}}><Edit3 size={15}/>Abrir</button></td></tr>) : <tr><td>Nenhuma oportunidade neste segmento</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
          </DashboardTable>
        </div>}
      </Panel>
    </section>

    <section className="grid2 compact">
      <Panel title="Top oportunidades">
        <DashboardTable headers={['Cliente','Etapa','Valor total','Fechamento']}>
          {topDeals.map(d=><tr key={d.id} onClick={()=>setSelectedDealId(d.id)} style={{cursor:'pointer'}}><td><b>{byId(companies,d.companyId)?.name || d.title}</b><span>{d.title}</span></td><td>{d.stage}</td><td>{moneyShort(dealTcv(d))}</td><td>{formatDate(d.closeDate)}</td></tr>)}
        </DashboardTable>
      </Panel>

      <Panel title="Atividades vencidas">
        <DashboardTable headers={['Atividade','Oportunidade','Vencimento','Link','Responsável','Ações']}>
          {overdueActivities.length ? overdueActivities.map(a=>{
            const deal = byId(deals,a.dealId);
            return <tr key={a.id} onClick={()=>setSelectedActivityId?.(a.id)} style={{cursor:'pointer'}} title="Clique para abrir esta atividade"><td><b>{a.title}</b><span>{a.type}</span></td><td>{deal?.title || '-'}</td><td><b style={{color:'#dc2626'}}>{formatActivityDateTime(a)}</b></td><td>{a.meetingLink ? <a href={a.meetingLink} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>Abrir chamada</a> : '-'}</td><td>{a.owner}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedActivityId?.(a.id)}}><Edit3 size={15}/>Abrir</button></td></tr>
          }) : <tr><td>Nenhuma atividade vencida</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
        </DashboardTable>
      </Panel>
    </section>

    <Panel title="Oportunidades sem contato há mais de 15 dias">
      <DashboardTable headers={['Oportunidade','Empresa','Etapa','Dias sem contato','Valor total','Ações']}>
        {noContactDeals.length ? noContactDeals.map(d=><tr key={d.id} onClick={()=>setSelectedDealId(d.id)} style={{cursor:'pointer'}}><td><b>{d.title}</b><span>{d.nextStep}</span></td><td>{byId(companies,d.companyId)?.name || '-'}</td><td>{d.stage || '-'}</td><td><b style={{color:d.daysWithoutContact >= 30 ? '#dc2626' : '#b45309'}}>{d.daysWithoutContact} dias</b></td><td>{moneyShort(dealTcv(d))}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedDealId(d.id)}}><Edit3 size={15}/>Abrir</button></td></tr>) : <tr><td>Nenhuma oportunidade sem contato crítico</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
      </DashboardTable>
    </Panel>

  </>;
}
function Kpi({icon:Icon,label,value}){ return <div className="kpi"><Icon size={24}/><span>{label}</span><strong>{value}</strong></div>; }
function MiniMetric({icon:Icon,label,value,onClick,active=false}){
  return <div onClick={onClick} title={onClick ? 'Clique para abrir' : undefined} style={{
    border: active ? '1px solid #00A0D1' : '1px solid #edf2f7',
    background: active ? 'linear-gradient(180deg,#eef7ff 0%,#ffffff 100%)' : 'linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)',
    borderRadius:'18px',
    padding:'14px',
    minHeight:'86px',
    cursor:onClick ? 'pointer' : 'default',
    boxShadow: active ? '0 12px 28px rgba(8,120,255,.14)' : 'none',
    transform: active ? 'translateY(-1px)' : 'none',
    transition:'all .18s ease'
  }}>
    <div style={{display:'flex',alignItems:'center',gap:'8px',color:'#00A0D1',marginBottom:'10px'}}>
      <Icon size={17}/>
      <span style={{fontSize:'12px',fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</span>
    </div>
    <strong style={{fontSize:'22px',letterSpacing:'-.03em',color:'#061b34'}}>{value}</strong>
  </div>;
}
function Panel({title,children}){ return <section className="panel"><h2>{title}</h2>{children}</section>; }
function DashboardTable({headers,children}){ return <div className="tableWrap dashboardTable"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }

function Pipeline({stages,setStages,deals,setDeals,companies,contacts,setSelectedDealId,canWrite}){
  const [newStage,setNewStage] = useState('');
  const [selectedStage,setSelectedStage] = useState(null);
  const [editingStage,setEditingStage] = useState(null);
  const [editingValue,setEditingValue] = useState('');
  const [draggingStage,setDraggingStage] = useState(null);
  const [dragOverStage,setDragOverStage] = useState(null);
  const stageExists = (name, ignoreStage = null) => safeArray(stages).some(stage =>
    stage !== ignoreStage && stage.toLowerCase() === name.toLowerCase()
  );
  const addStage = () => {
    const name = newStage.trim();
    if(!name) return;
    if(stageExists(name)){
      window.alert('Já existe uma etapa com esse nome.');
      return;
    }
    setStages([...stages, name]);
    setNewStage('');
  };
  const move = async (deal, stage) => {
    if(!canWrite) return;
    const nextDeal = {...deal, stage};
    setDeals(deals.map(d => sameId(d.id,deal.id) ? nextDeal : d));
    try {
      const saved = await saveDealToSupabase(nextDeal, companies, contacts);
      setDeals(deals.map(d => sameId(d.id,deal.id) ? saved : d));
    } catch (error) {
      console.warn('Falha ao atualizar etapa no Supabase:', error);
      window.alert('Etapa alterada localmente. O Supabase não aceitou a atualização agora.');
    }
  };
  const startEditStage = (stage) => {
    if(!canWrite) return;
    setEditingStage(stage);
    setEditingValue(stage);
  };
  const cancelEditStage = () => {
    setEditingStage(null);
    setEditingValue('');
  };
  const renameStage = async (oldStage) => {
    if(!canWrite) return;
    const nextName = editingValue.trim();
    if(!nextName) {
      window.alert('Informe um nome para a etapa.');
      return;
    }
    if(nextName === oldStage) {
      cancelEditStage();
      return;
    }
    if(stageExists(nextName, oldStage)) {
      window.alert('Já existe uma etapa com esse nome.');
      return;
    }

    const nextStages = stages.map(stage => stage === oldStage ? nextName : stage);
    const nextDeals = deals.map(deal => deal.stage === oldStage ? {...deal, stage: nextName} : deal);
    const changedDeals = nextDeals.filter(deal => deal.stage === nextName && deals.some(current => sameId(current.id, deal.id) && current.stage === oldStage));

    setStages(nextStages);
    setDeals(nextDeals);
    if(selectedStage === oldStage) setSelectedStage(nextName);
    cancelEditStage();

    if(changedDeals.length){
      const results = await Promise.allSettled(changedDeals.map(deal => saveDealToSupabase(deal, companies, contacts)));
      if(results.some(result => result.status === 'rejected')) {
        window.alert('A etapa foi renomeada na tela, mas algumas oportunidades não sincronizaram com o Supabase agora.');
      }
    }
  };
  const deleteStage = (stage) => {
    if(!canWrite) return;
    const count = deals.filter(deal => deal.stage === stage).length;
    if(count){
      window.alert(`Esta etapa tem ${count} oportunidade(s). Mova ou renomeie essas oportunidades antes de excluir a etapa.`);
      return;
    }
    if(stages.length <= 1){
      window.alert('O pipeline precisa manter pelo menos uma etapa.');
      return;
    }
    if(!window.confirm(`Excluir a etapa "${stage}"?`)) return;
    setStages(stages.filter(item => item !== stage));
    if(selectedStage === stage) setSelectedStage(null);
    if(editingStage === stage) cancelEditStage();
  };
  const reorderStage = (fromStage, toStage) => {
    if(!canWrite || !fromStage || !toStage || fromStage === toStage) return;
    const fromIndex = stages.indexOf(fromStage);
    const toIndex = stages.indexOf(toStage);
    if(fromIndex < 0 || toIndex < 0) return;

    const nextStages = [...stages];
    const [movedStage] = nextStages.splice(fromIndex, 1);
    nextStages.splice(toIndex, 0, movedStage);
    setStages(nextStages);
  };
  const startStageDrag = (event, stage) => {
    if(!canWrite || editingStage) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', stage);
    setDraggingStage(stage);
  };
  const overStage = (event, stage) => {
    if(!canWrite || !draggingStage || draggingStage === stage) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };
  const dropStage = (event, stage) => {
    if(!canWrite) return;
    event.preventDefault();
    reorderStage(event.dataTransfer.getData('text/plain') || draggingStage, stage);
    setDraggingStage(null);
    setDragOverStage(null);
  };
  const endStageDrag = () => {
    setDraggingStage(null);
    setDragOverStage(null);
  };
  const stageDeals = selectedStage ? deals.filter(d=>d.stage===selectedStage) : [];
  return <>
    {canWrite && <div className="toolbar"><input placeholder="Nova etapa customizável" value={newStage} onChange={e=>setNewStage(e.target.value)} onKeyDown={e=>{ if(e.key === 'Enter') addStage(); }}/><button onClick={addStage}><Plus size={16}/>Adicionar etapa</button></div>}
    <section className="kanban">{stages.map(stage => {
      const currentStageDeals = deals.filter(d=>d.stage===stage);
      return <div
        className={`column ${draggingStage===stage ? 'stageDragging' : ''} ${dragOverStage===stage && draggingStage!==stage ? 'stageDropTarget' : ''}`}
        key={stage}
        onDragOver={e=>overStage(e, stage)}
        onDragLeave={()=>{ if(dragOverStage === stage) setDragOverStage(null); }}
        onDrop={e=>dropStage(e, stage)}
      >
        {editingStage === stage ? <div className="stageEdit">
          <input value={editingValue} onChange={e=>setEditingValue(e.target.value)} onKeyDown={e=>{ if(e.key === 'Enter') renameStage(stage); if(e.key === 'Escape') cancelEditStage(); }} autoFocus/>
          <div className="stageEditActions">
            <button className="mini" onClick={()=>renameStage(stage)}><Save size={15}/>Salvar</button>
            <button className="mini" onClick={cancelEditStage}><X size={15}/>Cancelar</button>
          </div>
        </div> : <div className="stageHeader">
          <button type="button" className="stageName" onClick={()=>setSelectedStage(stage)} title="Clique para listar as oportunidades desta etapa"><span>{stage}</span><small>{currentStageDeals.length}</small></button>
          {canWrite && <div className="stageActions">
            <button className="mini stageDragHandle" draggable onDragStart={e=>startStageDrag(e, stage)} onDragEnd={endStageDrag} title="Arrastar etapa" aria-label={`Arrastar ${stage}`}><GripVertical size={14}/></button>
            <button className="mini" onClick={()=>startEditStage(stage)} title="Renomear etapa" aria-label={`Renomear ${stage}`}><Edit3 size={14}/></button>
            <button className="mini" onClick={()=>deleteStage(stage)} title="Excluir etapa" aria-label={`Excluir ${stage}`}><Trash2 size={14}/></button>
          </div>}
        </div>}
        <div className="stageCards">
          {currentStageDeals.map(d => <article className="dealCard" key={d.id}><div onClick={()=>setSelectedDealId(d.id)}><b>{d.title}</b><span>{byId(companies,d.companyId)?.name || 'Sem empresa'}</span><strong>{money(dealTcv(d))}</strong></div><select value={d.stage} onChange={e=>move(d,e.target.value)} disabled={!canWrite}>{stages.map(s=><option key={s}>{s}</option>)}</select></article>)}
        </div>
      </div>;
    })}</section>
    {selectedStage && <Panel title={`Oportunidades em ${selectedStage}`}>
      <DashboardTable headers={['Oportunidade','Empresa','Responsável','Valor total','Ações']}>
        {stageDeals.length ? stageDeals.map(d=><tr key={d.id} onClick={()=>setSelectedDealId(d.id)} style={{cursor:'pointer'}}><td><b>{d.title}</b><span>{d.nextStep}</span></td><td>{byId(companies,d.companyId)?.name || '-'}</td><td>{d.owner || '-'}</td><td>{moneyShort(dealTcv(d))}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedDealId(d.id)}}><Edit3 size={15}/>Abrir</button></td></tr>) : <tr><td>Nenhuma oportunidade nesta etapa</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
      </DashboardTable>
      <button className="mini" onClick={()=>setSelectedStage(null)} style={{marginTop:'12px'}}><X size={15}/>Fechar lista</button>
    </Panel>}
  </>;
}

function Deals({currentUser,deals,setDeals,companies,contacts,products,stages,notes,setNotes,setSelectedDealId,setSelectedProductName,query,canWrite}){
  const empty = { title:'', companyId:companies[0]?.id||'', contactId:'', product:'SAC+', value:0, setup:0, contractMonths:12, stage:stages[0], owner:'Sergio', probability:30, closeDate:'', description:'', nextStep:'', priority:'Média' };
  const [form,setFormBase] = useState(empty);
  const [filters,setFilters] = useState({ companyId:'', product:'', stage:'', owner:'', closeBeforeMonth:'' });
  const [selectedDealIds,setSelectedDealIds] = useState([]);
  const setForm = (next) => {
    const resolved = typeof next === 'function' ? next(form) : next;
    if(!sameId(resolved.companyId, form.companyId)){
      const allowed = safeArray(contacts).filter(c=>sameId(c.companyId,resolved.companyId));
      setFormBase({...resolved, contactId: allowed.some(c=>sameId(c.id,resolved.contactId)) ? resolved.contactId : ''});
    } else {
      setFormBase(resolved);
    }
  };
  const availableContacts = safeArray(contacts).filter(c=>sameId(c.companyId, form.companyId));
  const list = deals.filter(d => {
    const matchesQuery = (safeText(d.title)+safeText(d.product)+safeText(d.owner)+safeText(d.stage)+safeText(d.description)+safeText(d.nextStep)).toLowerCase().includes(query.toLowerCase());
    const matchesCompany = !filters.companyId || sameId(d.companyId, filters.companyId);
    const matchesProduct = !filters.product || d.product === filters.product;
    const matchesStage = !filters.stage || d.stage === filters.stage;
    const matchesOwner = !filters.owner || d.owner === filters.owner;
    const matchesCloseBefore = !filters.closeBeforeMonth || (d.closeDate && d.closeDate < `${filters.closeBeforeMonth}-01`);
    return matchesQuery && matchesCompany && matchesProduct && matchesStage && matchesOwner && matchesCloseBefore;
  }).sort((a,b)=>String(a.title || '').localeCompare(String(b.title || ''),'pt-BR',{sensitivity:'base'}));
  const selectedDeals = deals.filter(deal => selectedDealIds.some(id => sameId(id, deal.id)));
  const visibleSelectedCount = list.filter(deal => selectedDealIds.some(id => sameId(id, deal.id))).length;
  const allVisibleSelected = list.length > 0 && visibleSelectedCount === list.length;
  useEffect(() => {
    setSelectedDealIds(ids => ids.filter(id => deals.some(deal => sameId(deal.id, id))));
  }, [deals]);
  const creationNoteFor = (deal) => ({
    dealId: deal.id,
    user: currentUser?.name || deal.owner || 'Sergio',
    date: today(),
    text: `Oportunidade criada em ${formatDate(today())}.`
  });
  const saveCreationNote = async (deal, allDeals) => {
    const nextNote = creationNoteFor(deal);
    try {
      const savedNote = await saveNoteToSupabase(nextNote, allDeals);
      setNotes([savedNote,...safeArray(notes)]);
    } catch (error) {
      console.warn('Falha ao salvar nota automática no Supabase:', error);
      setNotes([{...nextNote,id:Date.now()},...safeArray(notes)]);
    }
  };
  const add = async () => {
    if(!canWrite) return;
    if(!form.title.trim()) return;
    const similarDeal = deals.find(deal =>
      normalizedLookup(deal.title) === normalizedLookup(form.title) ||
      (sameId(deal.companyId, form.companyId) && normalizedLookup(deal.product) === normalizedLookup(form.product) && normalizedLookup(deal.title).includes(normalizedLookup(form.title)))
    );
    if(similarDeal && !window.confirm(`Existe uma oportunidade ${entityCode('O',similarDeal)} - ${similarDeal.title} com dados semelhantes. Deseja incluir mesmo assim?`)) return;
    const nextDeal = {
      ...form,
      value: Number(form.value),
      setup: Number(form.setup),
      contractMonths: Number(form.contractMonths || 12),
      probability: Number(form.probability || 30)
    };
    try {
      const saved = await saveDealToSupabase(nextDeal, companies, contacts);
      const nextDeals = [saved,...deals];
      setDeals(nextDeals);
      await saveCreationNote(saved, nextDeals);
      setFormBase(empty);
    } catch (error) {
      console.warn('Falha ao salvar oportunidade no Supabase:', error);
      const localDeal = {...nextDeal,id:Date.now()};
      setDeals([localDeal,...deals]);
      setNotes([{...creationNoteFor(localDeal),id:Date.now()+1},...safeArray(notes)]);
      setFormBase(empty);
      window.alert('Oportunidade salva localmente. O Supabase não aceitou a gravação agora.');
    }
  };
  const removeDeal = async (deal) => {
    if(!canWrite) return;
    if(!window.confirm('Deseja realmente excluir esta oportunidade?')) return;
    try {
      await deleteDealFromSupabase(deal);
      setDeals(deals.filter(d => !sameId(d.id,deal.id)));
    } catch (error) {
      console.warn('Falha ao excluir oportunidade no Supabase:', error);
      window.alert('Não foi possível excluir esta oportunidade no Supabase agora.');
    }
  };
  const toggleDealSelection = (dealId) => {
    setSelectedDealIds(ids => ids.some(id => sameId(id, dealId)) ? ids.filter(id => !sameId(id, dealId)) : [...ids, dealId]);
  };
  const toggleVisibleSelection = () => {
    if(allVisibleSelected){
      setSelectedDealIds(ids => ids.filter(id => !list.some(deal => sameId(deal.id, id))));
    } else {
      setSelectedDealIds(ids => [...ids, ...list.filter(deal => !ids.some(id => sameId(id, deal.id))).map(deal => deal.id)]);
    }
  };
  const removeSelectedDeals = async () => {
    if(!canWrite || !selectedDeals.length) return;
    if(!window.confirm(`Deseja realmente excluir ${selectedDeals.length} oportunidade(s) selecionada(s)?`)) return;
    const results = await Promise.allSettled(selectedDeals.map(deal => deleteDealFromSupabase(deal)));
    const failedIds = selectedDeals
      .filter((deal, index) => results[index].status === 'rejected')
      .map(deal => deal.id);
    const removedIds = selectedDeals
      .filter((deal, index) => results[index].status === 'fulfilled')
      .map(deal => deal.id);

    if(removedIds.length){
      setDeals(deals.filter(deal => !removedIds.some(id => sameId(id, deal.id))));
    }
    setSelectedDealIds(ids => ids.filter(id => failedIds.some(failedId => sameId(failedId, id))));
    if(failedIds.length){
      window.alert(`${failedIds.length} oportunidade(s) não puderam ser excluídas no Supabase agora.`);
    }
  };
  const clearFilters = () => setFilters({ companyId:'', product:'', stage:'', owner:'', closeBeforeMonth:'' });
  return <>
    {canWrite && <Panel title="Nova oportunidade"><div className="formGrid"><Input label="Título" field="title" form={form} setForm={setForm}/><Select label="Empresa" field="companyId" form={form} setForm={setForm} options={safeArray(companies).map(c=>[c.id,c.name])}/><Select label="Contato" field="contactId" form={form} setForm={setForm} options={[["", availableContacts.length ? "Selecione" : "Sem contatos desta empresa"],...availableContacts.map(c=>[c.id,c.name])]}/><Select label="Produto" field="product" form={form} setForm={setForm} options={safeArray(products).map(p=>[p,p])}/><Input label="Receita mensal" field="value" form={form} setForm={setForm} type="number"/><Input label="Implantação" field="setup" form={form} setForm={setForm} type="number"/><Input label="Prazo contratual (meses)" field="contractMonths" form={form} setForm={setForm} type="number"/><Input label="Probabilidade %" field="probability" form={form} setForm={setForm} type="number"/><Select label="Etapa" field="stage" form={form} setForm={setForm} options={safeArray(stages).map(s=>[s,s])}/><Select label="Responsável" field="owner" form={form} setForm={setForm} options={USERS.map(u=>[u,u])}/><Input label="Fechamento previsto" field="closeDate" form={form} setForm={setForm} type="date"/><label><span>Valor total do contrato</span><input value={money(dealTcv(form))} readOnly/></label><button className="saveBtn" onClick={add}><Plus size={16}/>Criar oportunidade</button></div></Panel>}
    <Panel title="Filtros de oportunidades"><div className="formGrid">
      <Select label="Empresa" field="companyId" form={filters} setForm={setFilters} options={[["","Todas"],...safeArray(companies).map(c=>[c.id,c.name])]}/>
      <Select label="Produto" field="product" form={filters} setForm={setFilters} options={[["","Todos"],...safeArray(products).map(p=>[p,p])]}/>
      <Select label="Etapa" field="stage" form={filters} setForm={setFilters} options={[["","Todas"],...safeArray(stages).map(s=>[s,s])]}/>
      <Select label="Responsável" field="owner" form={filters} setForm={setFilters} options={[["","Todos"],...USERS.map(u=>[u,u])]}/>
      <Input label="Fechamento anterior a" field="closeBeforeMonth" form={filters} setForm={setFilters} type="month"/>
      <button className="saveBtn" onClick={clearFilters}><Filter size={16}/>Limpar filtros</button>
    </div></Panel>
    <Panel title={`Oportunidades (${list.length})`}>
      {canWrite && <div className="bulkActions">
        <label style={{display:'inline-flex',alignItems:'center',gap:'8px',cursor:'pointer'}}><input className="rowSelect" type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection}/>Selecionar visíveis</label>
        <span>{selectedDeals.length} selecionada(s)</span>
        <button className="mini" onClick={removeSelectedDeals} disabled={!selectedDeals.length}><Trash2 size={15}/>Excluir selecionadas</button>
      </div>}
      <Table headers={['Sel.','Oportunidade','Empresa','Produto','Receita mensal','Prazo','Valor total','Etapa','Responsável','Ações']}>{list.map(d=>{ const linkedCompany = companyForDeal(d,companies,contacts); return <tr key={d.id} onClick={()=>setSelectedDealId(d.id)} style={{cursor:'pointer'}}><td><input className="rowSelect" type="checkbox" checked={selectedDealIds.some(id=>sameId(id,d.id))} onChange={(e)=>{e.stopPropagation(); toggleDealSelection(d.id);}} onClick={e=>e.stopPropagation()} disabled={!canWrite}/></td><td><b>{d.title}</b><span>{d.nextStep}</span></td><td>{linkedCompany?.name || '-'}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedProductName?.(d.product)}} disabled={!d.product}>{d.product || '-'}</button></td><td>{money(dealMrr(d))}</td><td>{dealMonths(d)} meses</td><td><b>{money(dealTcv(d))}</b></td><td><span className="pill">{d.stage}</span></td><td>{d.owner}</td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedDealId(d.id)}}><Edit3 size={15}/>Abrir</button>{canWrite && <button className="mini" onClick={(e)=>{e.stopPropagation(); removeDeal(d)}}><Trash2 size={15}/>Excluir</button>}</div></td></tr>})}</Table>
    </Panel>
  </>;
}

function DealDetailPage({deal,onBack,currentUser,canWrite,companies=[],contacts=[],deals=[],setDeals,activities=[],setActivities,notes=[],setNotes,interactions=[],setInteractions,opportunityFiles=[],setOpportunityFiles,emailLogs=[],setEmailLogs,emailTemplates=INITIAL_EMAIL_TEMPLATES,setEmailTemplates,emailSignatures={},setEmailSignatures,contracts=[],setContracts,products=INITIAL_PRODUCTS,stages=STAGES,setSelectedCompanyId,setSelectedContactId,setSelectedActivityId,setSelectedProductName}){
  const initialContact = byId(contacts, deal.contactId);
  const inferredCompany = companyForDeal(deal, companies, contacts);
  const [tab,setTab] = useState('dados');
  const [draft,setDraft] = useState({contractMonths:12, setup:0, probability:30, ...deal, companyId:inferredCompany?.id || deal.companyId});
  const [note,setNote] = useState('');
  const [activity,setActivity] = useState({type:'Follow-up',title:'',dueDate:today(),dueTime:'',meetingLink:'',owner:deal.owner || currentUser?.name || 'Sergio',status:'Pendente',notes:''});
  const [interaction,setInteraction] = useState({type:'Ligação',dateTime:new Date().toISOString().slice(0,16),owner:currentUser?.name || deal.owner || 'Sergio',description:'',nextAction:'',nextDueDate:''});
  const emptyFile = {id:'',name:'',url:'',category:'Proposta',notes:'',owner:currentUser?.name || deal.owner || 'Sergio'};
  const [fileDraft,setFileDraft] = useState(emptyFile);
  const [emailDraft,setEmailDraft] = useState({to:initialContact?.email || inferredCompany?.email || '',cc:'',subject:'',body:''});
  const [selectedEmailTemplate,setSelectedEmailTemplate] = useState('');
  const [sendingEmail,setSendingEmail] = useState(false);
  const [selectedAttachmentIds,setSelectedAttachmentIds] = useState([]);
  const signatureKey = String(currentUser?.email || currentUser?.id || currentUser?.name || 'daleth').toLowerCase();
  const emailSignature = emailSignatures?.[signatureKey] || null;
  const [includeSignature,setIncludeSignature] = useState(Boolean(emailSignature));

  useEffect(() => {
    if(emailSignature) setIncludeSignature(true);
  }, [emailSignature?.updatedAt]);

  const company = byId(companies, draft.companyId) || inferredCompany;
  const contact = initialContact;
  const dealNotes = safeArray(notes).filter(n=>sameId(n.dealId, deal.id));
  const dealActivities = safeArray(activities).filter(a=>sameId(a.dealId, deal.id));
  const dealInteractions = safeArray(interactions).filter(i=>sameId(i.dealId, deal.id));
  const dealFiles = safeArray(opportunityFiles).filter(file=>sameId(file.dealId,deal.id)).sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  const attachableFiles = safeArray(opportunityFiles).filter(file=>file?.url && file.isDir !== true).sort((a,b)=>{
    const aHere = sameId(a.dealId,deal.id) ? 1 : 0;
    const bHere = sameId(b.dealId,deal.id) ? 1 : 0;
    return bHere - aHere || String(a.name||'').localeCompare(String(b.name||''),'pt-BR');
  });
  const dealEmails = safeArray(emailLogs).filter(email=>sameId(email.dealId,deal.id)).sort((a,b)=>String(b.sentAt||'').localeCompare(String(a.sentAt||'')));

  const timeline = [
    ...dealInteractions.map(i => ({
      id:`interaction-${i.id}`,
      source:'interaction',
      type:i.type || 'Interação',
      owner:i.owner || i.user || 'Daleth',
      date:i.dateTime || i.createdAt || i.date || '',
      description:i.description || '',
      nextAction:i.nextAction || '',
      nextDueDate:i.nextDueDate || ''
    })),
    ...dealNotes.map(n => ({
      id:`note-${n.id}`,
      source:'note',
      type:'Anotação',
      owner:n.user || n.userName || n.user_name || 'Daleth',
      date:n.date || n.noteDate || n.note_date || n.createdAt || n.created_at || '',
      description:n.text || n.note || n.content || '',
      nextAction:'',
      nextDueDate:''
    })),
    ...dealEmails.map(email => ({
      id:`email-${email.id}`,
      source:'email',
      type:'E-mail enviado',
      owner:email.owner || 'Daleth',
      date:email.sentAt || '',
      description:`${email.subject || 'Sem assunto'} · Para: ${email.to || '-'}`,
      nextAction:'',
      nextDueDate:''
    })),
    ...dealActivities.filter(a=>String(a.status||'') === 'Concluída').map(a => ({
      id:`activity-${a.id}`,
      source:'activity',
      type:a.type || 'Atividade',
      owner:a.owner || 'Daleth',
      date:a.dueDate || a.date || '',
      description:`${a.title || ''}${a.notes ? ' — ' + a.notes : ''}`,
      nextAction:'',
      nextDueDate:''
    }))
  ].sort((a,b)=>String(b.date || '').localeCompare(String(a.date || '')));

  const latest = timeline[0];
  const latestNext = timeline.find(t=>t.nextAction);

  const save = async () => {
    if(!canWrite) return;
    const nextDeal = {
      ...draft,
      value: Number(draft.value),
      setup: Number(draft.setup),
      contractMonths: Number(draft.contractMonths || 12),
      probability: Number(draft.probability || 30)
    };
    try {
      const saved = await saveDealToSupabase(nextDeal, companies, contacts);
      setDeals(deals.map(d=>sameId(d.id,deal.id) ? saved : d));
      setDraft(saved);
      window.alert('Alterações salvas.');
    } catch (error) {
      console.warn('Falha ao atualizar oportunidade no Supabase:', error);
      setDeals(deals.map(d=>sameId(d.id,deal.id) ? nextDeal : d));
      setDraft(nextDeal);
      window.alert('Alterações salvas localmente. O Supabase não aceitou a atualização agora.');
    }
  };
  const addNote = async () => {
    if(!canWrite) return;
    if(!note.trim()) return;
    const nextNote = {dealId:deal.id,user:currentUser?.name || 'Sergio',date:today(),text:note};
    try {
      const saved = await saveNoteToSupabase(nextNote, deals);
      setNotes([saved,...notes]);
      setNote('');
    } catch (error) {
      console.warn('Falha ao salvar nota no Supabase:', error);
      setNotes([{...nextNote,id:Date.now()},...notes]);
      setNote('');
      window.alert('Nota salva localmente. O Supabase não aceitou a gravação agora.');
    }
  };
  const addActivity = async () => {
    if(!canWrite) return;
    if(!activity.title.trim()) return;
    const nextActivity = {...activity,dealId:deal.id};
    try {
      const saved = await saveActivityToSupabase(nextActivity, deals);
      setActivities([saved,...activities]);
      setActivity({...activity,title:'',dueTime:'',meetingLink:'',notes:''});
    } catch (error) {
      console.warn('Falha ao salvar atividade no Supabase:', error);
      setActivities([{...nextActivity,id:Date.now()},...activities]);
      setActivity({...activity,title:'',dueTime:'',meetingLink:'',notes:''});
      window.alert(`Atividade salva localmente. O Supabase não aceitou a gravação agora: ${supabaseErrorText(error)}`);
    }
  };
  const addInteraction = () => {
    if(!canWrite) return;
    if(!interaction.description.trim()) return;
    setInteractions([{...interaction,id:Date.now(),dealId:deal.id,createdAt:new Date().toISOString()},...safeArray(interactions)]);
    if(interaction.nextAction.trim()){
      setDeals(deals.map(d=>sameId(d.id,deal.id) ? {...d,nextStep:interaction.nextAction} : d));
      setDraft({...draft,nextStep:interaction.nextAction});
    }
    setInteraction({type:'Ligação',dateTime:new Date().toISOString().slice(0,16),owner:currentUser?.name || deal.owner || 'Sergio',description:'',nextAction:'',nextDueDate:''});
  };
  const saveFileLink = () => {
    if(!canWrite || !setOpportunityFiles) return;
    if(!fileDraft.name.trim() || !fileDraft.url.trim()){
      window.alert('Informe o nome do arquivo e o link do Dropbox.');
      return;
    }
    if(!isDropboxLink(fileDraft.url)){
      window.alert('Informe um link válido do Dropbox.');
      return;
    }
    const duplicate = dealFiles.find(file => !sameId(file.id,fileDraft.id) && normalizedDropboxLink(file.url) === normalizedDropboxLink(fileDraft.url));
    if(duplicate){
      window.alert(`Este link já está cadastrado como "${duplicate.name}".`);
      return;
    }
    const now = new Date().toISOString();
    if(fileDraft.id){
      setOpportunityFiles(safeArray(opportunityFiles).map(file=>sameId(file.id,fileDraft.id) ? {...file,...fileDraft,url:dropboxHref(fileDraft.url),updatedAt:now} : file));
    } else {
      setOpportunityFiles([{...fileDraft,id:`file-${Date.now()}`,dealId:deal.id,url:dropboxHref(fileDraft.url),createdAt:now,updatedAt:now},...safeArray(opportunityFiles)]);
    }
    setFileDraft(emptyFile);
  };
  const addFilesFromDropbox = (selectedFiles) => {
    if(!canWrite || !setOpportunityFiles) return;
    const knownLinks = new Set(dealFiles.map(file=>normalizedDropboxLink(file.url)));
    const now = new Date().toISOString();
    const additions = safeArray(selectedFiles).filter(file=>file?.link && !knownLinks.has(normalizedDropboxLink(file.link))).map((file,index)=>({
      id:`file-${Date.now()}-${index}`,
      dealId:deal.id,
      companyId:company?.id || '',
      name:file.name || (file.isDir ? 'Pasta do Dropbox' : 'Arquivo do Dropbox'),
      url:dropboxHref(file.link),
      category:fileDraft.category || 'Outros',
      notes:fileDraft.notes || '',
      owner:fileDraft.owner || currentUser?.name || deal.owner || 'Sergio',
      isDir:file.isDir === true,
      dropboxId:file.id || '',
      bytes:Number(file.bytes || 0),
      createdAt:now,
      updatedAt:now,
    }));
    if(!additions.length){
      window.alert('Os itens selecionados já estão vinculados a esta oportunidade.');
      return;
    }
    setOpportunityFiles([...additions,...safeArray(opportunityFiles)]);
    setFileDraft(emptyFile);
  };
  const editFileLink = (file) => setFileDraft({id:file.id,name:file.name||'',url:file.url||'',category:file.category||'Outros',notes:file.notes||'',owner:file.owner||currentUser?.name||'Sergio'});
  const removeFileLink = (file) => {
    if(!canWrite || !setOpportunityFiles) return;
    if(!window.confirm(`Remover o vínculo "${file.name}" do CRM? O arquivo não será excluído do Dropbox.`)) return;
    setOpportunityFiles(safeArray(opportunityFiles).filter(item=>!sameId(item.id,file.id)));
    if(sameId(fileDraft.id,file.id)) setFileDraft(emptyFile);
  };
  const emailVariables = {
    contato:contact?.name || 'cliente',
    empresa:company?.name || '',
    produto:draft.product || '',
    responsavel:currentUser?.name || draft.owner || 'Daleth AC',
    oportunidade:draft.title || '',
  };
  const applyEmailTemplate = (templateId) => {
    setSelectedEmailTemplate(templateId);
    const template = safeArray(emailTemplates).find(item=>sameId(item.id,templateId));
    if(!template) return;
    setEmailDraft({...emailDraft,subject:applyEmailVariables(template.subject,emailVariables),body:applyEmailVariables(template.body,emailVariables)});
  };
  const saveCurrentEmailAsTemplate = () => {
    if(!setEmailTemplates || !emailDraft.subject.trim() || !emailDraft.body.trim()) return;
    const name = window.prompt('Nome do novo modelo de e-mail:');
    if(!name?.trim()) return;
    const template = {id:`email-template-${Date.now()}`,name:name.trim(),subject:emailDraft.subject,body:emailDraft.body};
    setEmailTemplates([...safeArray(emailTemplates),template]);
    setSelectedEmailTemplate(template.id);
  };
  const removeSelectedEmailTemplate = () => {
    if(!setEmailTemplates || !selectedEmailTemplate) return;
    const template = safeArray(emailTemplates).find(item=>sameId(item.id,selectedEmailTemplate));
    if(!template || !window.confirm(`Excluir o modelo "${template.name}"?`)) return;
    setEmailTemplates(safeArray(emailTemplates).filter(item=>!sameId(item.id,selectedEmailTemplate)));
    setSelectedEmailTemplate('');
  };
  const saveEmailSignature = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if(!file || !setEmailSignatures) return;
    if(file.type !== 'image/png'){
      window.alert('Selecione uma imagem no formato PNG.');
      return;
    }
    if(file.size > 600 * 1024){
      window.alert('A assinatura deve ter no máximo 600 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setEmailSignatures({...emailSignatures,[signatureKey]:{name:file.name,dataUrl,updatedAt:new Date().toISOString()}});
      setIncludeSignature(true);
    };
    reader.onerror = () => window.alert('Não foi possível ler a imagem da assinatura.');
    reader.readAsDataURL(file);
  };
  const removeEmailSignature = () => {
    if(!setEmailSignatures || !emailSignature || !window.confirm('Remover sua assinatura de e-mail?')) return;
    const next = {...emailSignatures};
    delete next[signatureKey];
    setEmailSignatures(next);
    setIncludeSignature(false);
  };
  const toggleEmailAttachment = (file) => {
    const selected = selectedAttachmentIds.some(id=>sameId(id,file.id));
    if(selected){
      setSelectedAttachmentIds(selectedAttachmentIds.filter(id=>!sameId(id,file.id)));
      return;
    }
    if(selectedAttachmentIds.length >= 5){
      window.alert('Você pode enviar até 5 anexos por e-mail.');
      return;
    }
    const selectedBytes = attachableFiles.filter(item=>selectedAttachmentIds.some(id=>sameId(id,item.id))).reduce((total,item)=>total+Number(item.bytes||0),0);
    if(Number(file.bytes||0) > 10 * 1024 * 1024 || selectedBytes + Number(file.bytes||0) > 20 * 1024 * 1024){
      window.alert('Cada arquivo pode ter até 10 MB e o total dos anexos até 20 MB.');
      return;
    }
    setSelectedAttachmentIds([...selectedAttachmentIds,file.id]);
  };
  const sendEmail = async () => {
    if(!canWrite || sendingEmail || !setEmailLogs) return;
    if(!emailDraft.to.trim() || !emailDraft.subject.trim() || !emailDraft.body.trim()){
      window.alert('Informe destinatário, assunto e mensagem.');
      return;
    }
    setSendingEmail(true);
    try {
      const {data:{session}} = await supabase.auth.getSession();
      if(!session?.access_token) throw new Error('Sua sessão expirou. Entre novamente no CRM.');
      const selectedAttachments = attachableFiles.filter(file=>selectedAttachmentIds.some(id=>sameId(id,file.id))).map(file=>({name:file.name,url:file.url,bytes:Number(file.bytes||0)}));
      const response = await fetch('/api/send-email',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
        body:JSON.stringify({to:emailDraft.to.trim(),cc:emailDraft.cc.trim(),subject:emailDraft.subject.trim(),body:emailDraft.body.trim(),signature:includeSignature ? emailSignature?.dataUrl || '' : '',attachments:selectedAttachments}),
      });
      const result = await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(result.error || 'Não foi possível enviar o e-mail.');
      const sentAt = new Date().toISOString();
      setEmailLogs([{id:`email-${Date.now()}`,messageId:result.messageId||'',dealId:deal.id,companyId:company?.id||'',contactId:contact?.id||'',to:emailDraft.to.trim(),cc:emailDraft.cc.trim(),subject:emailDraft.subject.trim(),body:emailDraft.body.trim(),attachments:selectedAttachments.map(item=>item.name),hasSignature:Boolean(includeSignature && emailSignature),owner:currentUser?.name||draft.owner||'Daleth',sender:result.sender||'crm@daleth.com.br',sentAt,status:result.status||'Aceito pelo servidor'},...safeArray(emailLogs)]);
      setEmailDraft({...emailDraft,subject:'',body:''});
      setSelectedAttachmentIds([]);
      setSelectedEmailTemplate('');
      window.alert('E-mail enviado e registrado no histórico.');
    } catch (error) {
      window.alert(error?.message || 'Não foi possível enviar o e-mail.');
    } finally {
      setSendingEmail(false);
    }
  };

  const interactionIcon = (type) => {
    const t = String(type || '').toLowerCase();
    if(t.includes('liga')) return '📞';
    if(t.includes('reuni')) return '🤝';
    if(t.includes('e-mail') || t.includes('email')) return '📧';
    if(t.includes('whats')) return '💬';
    return '📝';
  };

  return <>
    <Panel title="Oportunidade">
      <div style={{display:'flex',justifyContent:'space-between',gap:'16px',alignItems:'flex-start',flexWrap:'wrap'}}>
        <div>
          <button className="mini" onClick={onBack} style={{marginBottom:'14px'}}><X size={15}/>Voltar</button>
          <h2 style={{fontSize:'28px',margin:'0 0 8px'}}>{deal.title}</h2>
          <p className="muted" style={{margin:0,display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
            <button className="mini" onClick={()=>openLinkedEntity(setSelectedCompanyId, company?.id)} disabled={!company}>{company?.name || 'Sem empresa'}</button>
            {contact?.name && <button className="mini" onClick={()=>openLinkedEntity(setSelectedContactId, deal.contactId)}>{contact.name}</button>}
            <button className="mini" onClick={()=>setSelectedProductName?.(draft.product)} disabled={!draft.product}>{draft.product || 'Sem produto'}</button>
          </p>
        </div>
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
          <span className="pill">{draft.stage}</span>
          <span className="pill">{draft.owner || 'Sem responsável'}</span>
        </div>
      </div>
    </Panel>

    <section className="cards">
      <Kpi icon={CircleDollarSign} label="Receita mensal" value={moneyShort(dealMrr(draft))}/>
      <Kpi icon={BriefcaseBusiness} label="Valor total do contrato" value={moneyShort(dealTcv(draft))}/>
      <Kpi icon={CheckCircle2} label="Última interação" value={latest?.date ? formatDate(latest.date) : 'Sem histórico'}/>
      <Kpi icon={MessageSquare} label="Interações" value={dealInteractions.length}/>
      <Kpi icon={Clock3} label="Próxima ação" value={latestNext?.nextAction || 'Não definida'}/>
    </section>

    <div className="tabs" style={{marginBottom:'18px',overflowX:'auto'}}>{['dados','historico','atividades','emails','arquivos','contrato','matriz'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t === 'dados' ? 'Dados' : t === 'historico' ? 'Histórico' : t === 'atividades' ? 'Atividades' : t === 'emails' ? `E-mails (${dealEmails.length})` : t === 'arquivos' ? `Arquivos (${dealFiles.length})` : t === 'contrato' ? 'Contrato' : 'Matriz'}</button>)}</div>

    {tab==='dados' && <Panel title="Dados da oportunidade"><div className="formGrid modalGrid"><Input label="Título" field="title" form={draft} setForm={setDraft}/><Select label="Empresa" field="companyId" form={draft} setForm={setDraft} options={safeArray(companies).map(c=>[c.id,c.name])}/><Select label="Etapa" field="stage" form={draft} setForm={setDraft} options={safeArray(stages).map(s=>[s,s])}/><Select label="Responsável" field="owner" form={draft} setForm={setDraft} options={USERS.map(u=>[u,u])}/><Select label="Produto" field="product" form={draft} setForm={setDraft} options={optionsIncludingCurrent(products,draft.product).map(p=>[p,p])}/><Input label="Receita mensal" field="value" form={draft} setForm={setDraft} type="number"/><Input label="Implantação" field="setup" form={draft} setForm={setDraft} type="number"/><Input label="Prazo contratual (meses)" field="contractMonths" form={draft} setForm={setDraft} type="number"/><Input label="Probabilidade %" field="probability" form={draft} setForm={setDraft} type="number"/><Input label="Fechamento previsto" field="closeDate" form={draft} setForm={setDraft} type="date"/><Input label="Próximo passo" field="nextStep" form={draft} setForm={setDraft}/><label><span>Valor total do contrato</span><input value={money(dealTcv(draft))} readOnly/></label><label><span>Receita anualizada</span><input value={money(dealArr(draft))} readOnly/></label><Textarea label="Descrição" field="description" form={draft} setForm={setDraft}/>{canWrite && <button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button>}</div></Panel>}

    {tab==='historico' && <>
      {canWrite && <Panel title="Nova interação"><div className="formGrid modalGrid">
        <Select label="Tipo" field="type" form={interaction} setForm={setInteraction} options={['Ligação','Reunião','E-mail','WhatsApp','Anotação'].map(x=>[x,x])}/>
        <Input label="Data e hora" field="dateTime" form={interaction} setForm={setInteraction} type="datetime-local"/>
        <Select label="Responsável" field="owner" form={interaction} setForm={setInteraction} options={USERS.map(u=>[u,u])}/>
        <Input label="Próxima ação" field="nextAction" form={interaction} setForm={setInteraction}/>
        <Input label="Prazo da próxima ação" field="nextDueDate" form={interaction} setForm={setInteraction} type="date"/>
        <Textarea label="Descrição da tratativa" field="description" form={interaction} setForm={setInteraction}/>
        <button className="saveBtn" onClick={addInteraction}><MessageSquare size={16}/>Registrar interação</button>
      </div></Panel>}
      <Panel title="Linha do tempo da oportunidade">
        <div className="timeline">{timeline.length ? timeline.map(item=><div className={`timelineItem ${item.source === 'note' ? 'timelineNote' : ''}`} data-full-note={item.source === 'note' ? item.description : undefined} title={item.source === 'note' ? 'Passe o cursor para ver a anotação completa' : undefined} key={item.id}><b>{interactionIcon(item.type)} {item.type}</b><span>{formatDateTime(item.date)} · {item.owner}</span><p>{item.description}</p>{item.nextAction && <p><b>Próxima ação:</b> {item.nextAction}{item.nextDueDate ? ` · Prazo: ${formatDate(item.nextDueDate)}` : ''}</p>}</div>) : <p className="muted">Nenhuma tratativa registrada ainda.</p>}</div>
      </Panel>
    </>}

    {tab==='atividades' && <Panel title="Atividades da oportunidade">{canWrite && <div className="formGrid"><Select label="Tipo" field="type" form={activity} setForm={setActivity} options={['Follow-up','Ligação','E-mail','WhatsApp','Reunião','Proposta'].map(x=>[x,x])}/><Input label="Título" field="title" form={activity} setForm={setActivity}/><Input label="Data" field="dueDate" form={activity} setForm={setActivity} type="date"/><Input label="Hora" field="dueTime" form={activity} setForm={setActivity} type="time"/><Input label="Link chamada" field="meetingLink" form={activity} setForm={setActivity} type="url"/><Select label="Responsável" field="owner" form={activity} setForm={setActivity} options={USERS.map(u=>[u,u])}/><Textarea label="Observações" field="notes" form={activity} setForm={setActivity}/><button className="saveBtn" onClick={addActivity}><Plus size={16}/>Criar atividade</button></div>}<div className="timeline">{dealActivities.map(a=><div className="timelineItem" key={a.id}><div style={{display:'flex',justifyContent:'space-between',gap:'12px',alignItems:'flex-start',flexWrap:'wrap'}}><b>{a.type}: {a.title}</b>{canWrite && <button className="mini" onClick={()=>setSelectedActivityId?.(a.id)}><Edit3 size={15}/>Editar</button>}</div><span>{formatActivityDateTime(a)} · {a.owner} · {a.status}</span>{a.meetingLink && <p><a href={a.meetingLink} target="_blank" rel="noreferrer">Abrir chamada</a></p>}<p>{a.notes}</p></div>)}</div></Panel>}

    {tab==='emails' && <>
      {!EMAIL_SENDING_ENABLED && <Panel title="Envio temporariamente desativado"><p className="muted" style={{margin:0}}>O histórico permanece disponível. O envio pelo Daleth Sales Hub está pausado.</p></Panel>}
      {canWrite && EMAIL_SENDING_ENABLED && <Panel title="Novo e-mail"><div className="formGrid modalGrid">
        <label><span>Modelo</span><select value={selectedEmailTemplate} onChange={e=>applyEmailTemplate(e.target.value)}><option value="">Sem modelo</option>{safeArray(emailTemplates).map(template=><option value={template.id} key={template.id}>{template.name}</option>)}</select></label>
        <Input label="Para" field="to" form={emailDraft} setForm={setEmailDraft} type="email"/>
        <Input label="Cc" field="cc" form={emailDraft} setForm={setEmailDraft} type="email"/>
        <Input label="Assunto" field="subject" form={emailDraft} setForm={setEmailDraft}/>
        <Textarea label="Mensagem" field="body" form={emailDraft} setForm={setEmailDraft}/>
        <div style={{gridColumn:'1 / -1'}}>
          <span style={{display:'block',fontWeight:900,fontSize:'13px',textTransform:'uppercase',color:'#64748b',marginBottom:'8px'}}>Assinatura PNG</span>
          <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
            {emailSignature && <img src={emailSignature.dataUrl} alt="Prévia da assinatura" style={{maxWidth:'320px',maxHeight:'110px',objectFit:'contain',border:'1px solid #dbe7f3',borderRadius:'8px',background:'#fff',padding:'6px'}}/>}
            {emailSignature && <label style={{display:'inline-flex',alignItems:'center',gap:'7px',fontWeight:800}}><input type="checkbox" checked={includeSignature} onChange={e=>setIncludeSignature(e.target.checked)}/>Incluir neste e-mail</label>}
            <label className="mini" style={{cursor:'pointer'}}><ImagePlus size={15}/>{emailSignature ? 'Trocar assinatura' : 'Adicionar assinatura'}<input type="file" accept="image/png" onChange={saveEmailSignature} style={{display:'none'}}/></label>
            {emailSignature && <button className="mini" onClick={removeEmailSignature}><Trash2 size={15}/>Remover assinatura</button>}
          </div>
        </div>
        <div style={{gridColumn:'1 / -1'}}>
          <span style={{display:'block',fontWeight:900,fontSize:'13px',textTransform:'uppercase',color:'#64748b',marginBottom:'8px'}}>Anexos do Dropbox ({selectedAttachmentIds.length}/5)</span>
          {attachableFiles.length ? <div style={{display:'grid',gap:'7px',maxHeight:'220px',overflowY:'auto',padding:'10px',border:'1px solid #dbe7f3',borderRadius:'10px',background:'#f8fbfd'}}>{attachableFiles.map(file=><label key={file.id} style={{display:'flex',alignItems:'center',gap:'9px',cursor:'pointer',fontWeight:700}}><input type="checkbox" checked={selectedAttachmentIds.some(id=>sameId(id,file.id))} onChange={()=>toggleEmailAttachment(file)}/><Paperclip size={15}/><span>{file.name}</span><small style={{marginLeft:'auto',color:'#64748b'}}>{sameId(file.dealId,deal.id) ? 'Nesta oportunidade' : 'Documentos'}</small></label>)}</div> : <p className="muted" style={{margin:0}}>Nenhum arquivo disponível. Adicione-o em Arquivos ou Documentos usando o Dropbox.</p>}
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}><button className="saveBtn" onClick={sendEmail} disabled={sendingEmail}><Mail size={16}/>{sendingEmail ? 'Enviando...' : 'Enviar e-mail'}</button><button className="mini" onClick={saveCurrentEmailAsTemplate}><Save size={15}/>Salvar como modelo</button>{selectedEmailTemplate && <button className="mini" onClick={removeSelectedEmailTemplate}><Trash2 size={15}/>Excluir modelo</button>}</div>
      </div></Panel>}
      <Panel title={`E-mails enviados (${dealEmails.length})`}><Table headers={['Data','Destinatário','Assunto','Anexos','Responsável','Status']}>{dealEmails.length ? dealEmails.map(email=><tr key={email.id}><td>{formatDateTime(email.sentAt)}</td><td><b>{email.to}</b>{email.cc && <span>Cc: {email.cc}</span>}</td><td><b>{email.subject}</b><span>{email.body}</span></td><td>{safeArray(email.attachments).length ? safeArray(email.attachments).join(', ') : '-'}</td><td>{email.owner||'-'}</td><td><span className="pill">{email.status||'Enviado'}</span></td></tr>) : <tr><td>Nenhum e-mail enviado</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}</Table></Panel>
    </>}

    {tab==='arquivos' && <>
      {canWrite && <Panel title={fileDraft.id ? 'Editar vínculo de arquivo' : 'Novo vínculo de arquivo'}><div className="formGrid modalGrid"><Input label="Nome do arquivo" field="name" form={fileDraft} setForm={setFileDraft}/><Input label="Link do Dropbox" field="url" form={fileDraft} setForm={setFileDraft} type="url"/><Select label="Categoria" field="category" form={fileDraft} setForm={setFileDraft} options={DOCUMENT_CATEGORIES.map(x=>[x,x])}/><Select label="Responsável" field="owner" form={fileDraft} setForm={setFileDraft} options={USERS.map(u=>[u,u])}/><Textarea label="Observações" field="notes" form={fileDraft} setForm={setFileDraft}/><div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>{!fileDraft.id && <button className="saveBtn" onClick={()=>chooseFromDropbox(addFilesFromDropbox)}><FolderOpen size={16}/>Selecionar no Dropbox</button>}<button className={fileDraft.id ? 'saveBtn' : 'mini'} onClick={saveFileLink}><Link2 size={16}/>{fileDraft.id ? 'Salvar alterações' : 'Adicionar link manual'}</button>{fileDraft.id && <button className="mini" onClick={()=>setFileDraft(emptyFile)}><X size={15}/>Cancelar</button>}</div></div></Panel>}
      <Panel title={`Arquivos vinculados (${dealFiles.length})`}>
        <Table headers={['Arquivo','Categoria','Observações','Responsável','Atualizado','Ações']}>{dealFiles.length ? dealFiles.map(file=><tr key={file.id}><td><b style={{display:'flex',alignItems:'center',gap:'7px'}}>{file.isDir ? <FolderOpen size={16}/> : <FileText size={16}/>} {file.name}</b></td><td><span className="pill">{file.category||'Outros'}</span></td><td>{file.notes||'-'}</td><td>{file.owner||'-'}</td><td>{formatDate(file.updatedAt||file.createdAt)}</td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><a className="mini" style={{textDecoration:'none'}} href={dropboxHref(file.url)} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Abrir</a>{canWrite && <button className="mini" onClick={()=>editFileLink(file)}><Edit3 size={15}/>Editar</button>}{canWrite && <button className="mini" onClick={()=>removeFileLink(file)}><Trash2 size={15}/>Remover</button>}</div></td></tr>) : <tr><td>Nenhum arquivo vinculado</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}</Table>
      </Panel>
    </>}

    {tab==='contrato' && <Panel title="Resumo Comercial"><div className="formGrid modalGrid">
<label><span>Empresa</span><input value={company?.name || ''} readOnly/></label>
<label><span>Produto</span><input value={draft.product || ''} readOnly/></label>
<label><span>Receita mensal</span><input value={money(dealMrr(draft))} readOnly/></label>
<label><span>Implantação</span><input value={money(dealSetup(draft))} readOnly/></label>
<label><span>Prazo contratual</span><input value={`${dealMonths(draft)} meses`} readOnly/></label>
<label><span>Valor total do contrato</span><input value={money(dealTcv(draft))} readOnly/></label>
<label><span>Fechamento previsto</span><input value={formatDate(draft.closeDate)} readOnly/></label>
<label><span>Responsável</span><input value={draft.owner || ''} readOnly/></label>
</div></Panel>}

    {tab==='matriz' && <Panel title="Matriz de soluções"><SolutionSuggestions deal={draft} companies={companies}/></Panel>}
  </>;
}

function DealModal({deal,onClose,companies=[],contacts=[],deals=[],setDeals,activities=[],setActivities,notes=[],setNotes,contracts=[],setContracts,products=INITIAL_PRODUCTS,stages=STAGES}){
  const inferredCompany = companyForDeal(deal, companies, contacts);
  const [tab,setTab] = useState('geral');
  const [draft,setDraft] = useState({contractMonths:12, setup:0, probability:30, ...deal, companyId:inferredCompany?.id || deal.companyId});
  const [note,setNote] = useState('');
  const [activity,setActivity] = useState({type:'Follow-up',title:'',dueDate:today(),dueTime:'',meetingLink:'',owner:deal.owner,status:'Pendente',notes:''});
  const save = async () => {
    const nextDeal = {
      ...draft,
      value: Number(draft.value),
      setup: Number(draft.setup),
      contractMonths: Number(draft.contractMonths || 12),
      probability: Number(draft.probability || 30)
    };
    try {
      const saved = await saveDealToSupabase(nextDeal, companies, contacts);
      setDeals(deals.map(d=>sameId(d.id,deal.id) ? saved : d));
      onClose();
    } catch (error) {
      console.warn('Falha ao atualizar oportunidade no Supabase:', error);
      setDeals(deals.map(d=>sameId(d.id,deal.id) ? nextDeal : d));
      onClose();
      window.alert('Alterações salvas localmente. O Supabase não aceitou a atualização agora.');
    }
  };
  const addNote = async () => {
    if(!note.trim()) return;
    const nextNote = {dealId:deal.id,user:'Sergio',date:today(),text:note};
    try {
      const saved = await saveNoteToSupabase(nextNote, deals);
      setNotes([saved,...notes]);
      setNote('');
    } catch (error) {
      console.warn('Falha ao salvar nota no Supabase:', error);
      setNotes([{...nextNote,id:Date.now()},...notes]);
      setNote('');
      window.alert('Nota salva localmente. O Supabase não aceitou a gravação agora.');
    }
  };
  const addActivity = async () => {
    if(!activity.title.trim()) return;
    const nextActivity = {...activity,dealId:deal.id};
    try {
      const saved = await saveActivityToSupabase(nextActivity, deals);
      setActivities([saved,...activities]);
      setActivity({...activity,title:'',dueTime:'',meetingLink:'',notes:''});
    } catch (error) {
      console.warn('Falha ao salvar atividade no Supabase:', error);
      setActivities([{...nextActivity,id:Date.now()},...activities]);
      setActivity({...activity,title:'',dueTime:'',meetingLink:'',notes:''});
      window.alert(`Atividade salva localmente. O Supabase não aceitou a gravação agora: ${supabaseErrorText(error)}`);
    }
  };
  const dealNotes = notes.filter(n=>String(n.dealId)===String(deal.id));
  const dealActivities = activities.filter(a=>String(a.dealId)===String(deal.id));
  return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><div><h2>{deal.title}</h2><span>{byId(companies,deal.companyId)?.name} · Receita mensal {money(dealMrr(deal))} · Valor total {money(dealTcv(deal))}</span></div><button className="iconBtn" onClick={onClose}><X/></button></div><div className="tabs">{['geral','timeline','atividades','matriz'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</div>
    {tab==='geral' && <div className="formGrid modalGrid"><Input label="Título" field="title" form={draft} setForm={setDraft}/><Select label="Empresa" field="companyId" form={draft} setForm={setDraft} options={safeArray(companies).map(c=>[c.id,c.name])}/><Select label="Etapa" field="stage" form={draft} setForm={setDraft} options={safeArray(stages).map(s=>[s,s])}/><Select label="Responsável" field="owner" form={draft} setForm={setDraft} options={USERS.map(u=>[u,u])}/><Select label="Produto" field="product" form={draft} setForm={setDraft} options={optionsIncludingCurrent(products,draft.product).map(p=>[p,p])}/><Input label="Receita mensal" field="value" form={draft} setForm={setDraft} type="number"/><Input label="Implantação" field="setup" form={draft} setForm={setDraft} type="number"/><Input label="Prazo contratual (meses)" field="contractMonths" form={draft} setForm={setDraft} type="number"/><Input label="Probabilidade %" field="probability" form={draft} setForm={setDraft} type="number"/><Input label="Fechamento previsto" field="closeDate" form={draft} setForm={setDraft} type="date"/><Input label="Próximo passo" field="nextStep" form={draft} setForm={setDraft}/><label><span>Valor total do contrato</span><input value={money(dealTcv(draft))} readOnly/></label><label><span>Receita anualizada</span><input value={money(dealArr(draft))} readOnly/></label><Textarea label="Descrição" field="description" form={draft} setForm={setDraft}/><button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button></div>}
    {tab==='timeline' && <div><div className="noteBox"><textarea placeholder="Adicionar comentário, registro de reunião, ligação, WhatsApp..." value={note} onChange={e=>setNote(e.target.value)}></textarea><button onClick={addNote}><MessageSquare size={16}/>Adicionar comentário</button></div><div className="timeline">{dealNotes.map(n=><div className="timelineItem" key={n.id}><b>{n.user || n.userName || n.user_name || 'Daleth'}</b><span>{formatDate(n.date || n.noteDate || n.note_date)}</span><p>{n.text || n.note || ''}</p></div>)}</div></div>}
    {tab==='atividades' && <div><div className="formGrid"><Select label="Tipo" field="type" form={activity} setForm={setActivity} options={['Follow-up','Ligação','E-mail','WhatsApp','Reunião','Proposta'].map(x=>[x,x])}/><Input label="Título" field="title" form={activity} setForm={setActivity}/><Input label="Data" field="dueDate" form={activity} setForm={setActivity} type="date"/><Input label="Hora" field="dueTime" form={activity} setForm={setActivity} type="time"/><Input label="Link chamada" field="meetingLink" form={activity} setForm={setActivity} type="url"/><Select label="Responsável" field="owner" form={activity} setForm={setActivity} options={USERS.map(u=>[u,u])}/><button className="saveBtn" onClick={addActivity}><Plus size={16}/>Criar atividade</button></div><div className="timeline">{dealActivities.map(a=><div className="timelineItem" key={a.id}><b>{a.type}: {a.title}</b><span>{formatActivityDateTime(a)} · {a.owner} · {a.status}</span>{a.meetingLink && <p><a href={a.meetingLink} target="_blank" rel="noreferrer">Abrir chamada</a></p>}<p>{a.notes}</p></div>)}</div></div>}
    {tab==='contrato' && <Panel title="Resumo Comercial"><div className="formGrid modalGrid">
<label><span>Empresa</span><input value={company?.name || ''} readOnly/></label>
<label><span>Produto</span><input value={draft.product || ''} readOnly/></label>
<label><span>Receita mensal</span><input value={money(dealMrr(draft))} readOnly/></label>
<label><span>Implantação</span><input value={money(dealSetup(draft))} readOnly/></label>
<label><span>Prazo contratual</span><input value={`${dealMonths(draft)} meses`} readOnly/></label>
<label><span>Valor total do contrato</span><input value={money(dealTcv(draft))} readOnly/></label>
<label><span>Fechamento previsto</span><input value={formatDate(draft.closeDate)} readOnly/></label>
<label><span>Responsável</span><input value={draft.owner || ''} readOnly/></label>
</div></Panel>}

    {tab==='matriz' && <SolutionSuggestions deal={draft} companies={companies}/>}  
  </div></div>;
}

function Documents({opportunityFiles=[],setOpportunityFiles,companies=[],contacts=[],deals=[],currentUser,canWrite,setSelectedDealId,setSelectedCompanyId}){
  const emptyDocument = {id:'',name:'',url:'',companyId:'',dealId:'',category:'Proposta',owner:currentUser?.name || 'Sergio',notes:'',isDir:false};
  const [draft,setDraft] = useState(emptyDocument);
  const [filters,setFilters] = useState({text:'',companyId:'',category:'',kind:''});
  const companyOf = (document) => byId(companies,document.companyId) || companyForDeal(byId(deals,document.dealId),companies,contacts);
  const dealOptions = safeArray(deals).filter(deal=>!draft.companyId || sameId(companyForDeal(deal,companies,contacts)?.id,draft.companyId));
  const documents = safeArray(opportunityFiles).filter(document=>{
    const company = companyOf(document);
    const deal = byId(deals,document.dealId);
    const text = `${document.name||''} ${document.category||''} ${document.owner||''} ${document.notes||''} ${company?.name||''} ${deal?.title||''}`.toLowerCase();
    return (!filters.text || text.includes(filters.text.toLowerCase())) &&
      (!filters.companyId || sameId(company?.id,filters.companyId)) &&
      (!filters.category || document.category === filters.category) &&
      (!filters.kind || (filters.kind === 'folder' ? document.isDir === true : document.isDir !== true));
  }).sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));

  const resetDraft = () => setDraft({...emptyDocument,owner:currentUser?.name || 'Sergio'});
  const saveManualDocument = () => {
    if(!canWrite || !setOpportunityFiles) return;
    if(!draft.name.trim() || !draft.url.trim()){
      window.alert('Informe o nome e o link do Dropbox.');
      return;
    }
    if(!isDropboxLink(draft.url)){
      window.alert('Informe um link válido do Dropbox.');
      return;
    }
    const duplicate = safeArray(opportunityFiles).find(document=>!sameId(document.id,draft.id) && normalizedDropboxLink(document.url) === normalizedDropboxLink(draft.url));
    if(duplicate){
      window.alert(`Este link já está cadastrado como "${duplicate.name}".`);
      return;
    }
    const now = new Date().toISOString();
    const linkedDeal = byId(deals,draft.dealId);
    const next = {...draft,companyId:draft.companyId || companyForDeal(linkedDeal,companies,contacts)?.id || '',url:dropboxHref(draft.url),updatedAt:now};
    if(draft.id) setOpportunityFiles(safeArray(opportunityFiles).map(document=>sameId(document.id,draft.id) ? {...document,...next} : document));
    else setOpportunityFiles([{...next,id:`file-${Date.now()}`,createdAt:now},...safeArray(opportunityFiles)]);
    resetDraft();
  };
  const addDropboxDocuments = (selectedFiles) => {
    if(!canWrite || !setOpportunityFiles) return;
    const knownLinks = new Set(safeArray(opportunityFiles).map(document=>normalizedDropboxLink(document.url)));
    const now = new Date().toISOString();
    const linkedDeal = byId(deals,draft.dealId);
    const companyId = draft.companyId || companyForDeal(linkedDeal,companies,contacts)?.id || '';
    const additions = safeArray(selectedFiles).filter(file=>file?.link && !knownLinks.has(normalizedDropboxLink(file.link))).map((file,index)=>({
      id:`file-${Date.now()}-${index}`,
      name:file.name || (file.isDir ? 'Pasta do Dropbox' : 'Arquivo do Dropbox'),
      url:dropboxHref(file.link),
      companyId,
      dealId:draft.dealId || '',
      category:draft.category || 'Outros',
      owner:draft.owner || currentUser?.name || 'Sergio',
      notes:draft.notes || '',
      isDir:file.isDir === true,
      dropboxId:file.id || '',
      bytes:Number(file.bytes || 0),
      createdAt:now,
      updatedAt:now,
    }));
    if(!additions.length){
      window.alert('Os itens selecionados já estão cadastrados no CRM.');
      return;
    }
    setOpportunityFiles([...additions,...safeArray(opportunityFiles)]);
    resetDraft();
  };
  const editDocument = (document) => setDraft({
    id:document.id,name:document.name||'',url:document.url||'',companyId:companyOf(document)?.id||'',dealId:document.dealId||'',category:document.category||'Outros',owner:document.owner||currentUser?.name||'Sergio',notes:document.notes||'',isDir:document.isDir===true,
  });
  const removeDocument = (document) => {
    if(!canWrite || !setOpportunityFiles) return;
    if(!window.confirm(`Remover o vínculo "${document.name}" do CRM? O item não será excluído do Dropbox.`)) return;
    setOpportunityFiles(safeArray(opportunityFiles).filter(item=>!sameId(item.id,document.id)));
    if(sameId(draft.id,document.id)) resetDraft();
  };

  return <>
    {canWrite && <Panel title={draft.id ? 'Editar documento' : 'Adicionar documentos'}>
      <div className="formGrid modalGrid">
        <label><span>Empresa</span><select value={draft.companyId} onChange={e=>setDraft({...draft,companyId:e.target.value,dealId:''})}><option value="">Sem empresa</option>{[...safeArray(companies)].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(company=><option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
        <label><span>Oportunidade</span><select value={draft.dealId} onChange={e=>{const deal=byId(deals,e.target.value);setDraft({...draft,dealId:e.target.value,companyId:draft.companyId||companyForDeal(deal,companies,contacts)?.id||''})}}><option value="">Sem oportunidade</option>{dealOptions.map(deal=><option value={deal.id} key={deal.id}>{deal.title}</option>)}</select></label>
        <Select label="Categoria" field="category" form={draft} setForm={setDraft} options={DOCUMENT_CATEGORIES.map(category=>[category,category])}/>
        <Select label="Responsável" field="owner" form={draft} setForm={setDraft} options={USERS.map(user=>[user,user])}/>
        {draft.id && <label><span>Tipo</span><select value={draft.isDir ? 'folder' : 'file'} onChange={e=>setDraft({...draft,isDir:e.target.value==='folder'})}><option value="file">Arquivo</option><option value="folder">Pasta</option></select></label>}
        <Input label="Nome" field="name" form={draft} setForm={setDraft}/>
        <Input label="Link do Dropbox" field="url" form={draft} setForm={setDraft} type="url"/>
        <Textarea label="Observações" field="notes" form={draft} setForm={setDraft}/>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          {!draft.id && <button className="saveBtn" onClick={()=>chooseFromDropbox(addDropboxDocuments)}><FolderOpen size={16}/>Selecionar no Dropbox</button>}
          <button className={draft.id ? 'saveBtn' : 'mini'} onClick={saveManualDocument}><Link2 size={16}/>{draft.id ? 'Salvar alterações' : 'Adicionar link manual'}</button>
          {draft.id && <button className="mini" onClick={resetDraft}><X size={15}/>Cancelar</button>}
        </div>
      </div>
    </Panel>}
    <Panel title={`Documentos (${documents.length})`}>
      <div className="formGrid" style={{marginBottom:'16px'}}>
        <label><span>Buscar</span><input value={filters.text} onChange={e=>setFilters({...filters,text:e.target.value})} placeholder="Documento, cliente ou oportunidade"/></label>
        <label><span>Empresa</span><select value={filters.companyId} onChange={e=>setFilters({...filters,companyId:e.target.value})}><option value="">Todas</option>{[...safeArray(companies)].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).map(company=><option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
        <label><span>Categoria</span><select value={filters.category} onChange={e=>setFilters({...filters,category:e.target.value})}><option value="">Todas</option>{DOCUMENT_CATEGORIES.map(category=><option value={category} key={category}>{category}</option>)}</select></label>
        <label><span>Tipo</span><select value={filters.kind} onChange={e=>setFilters({...filters,kind:e.target.value})}><option value="">Todos</option><option value="folder">Pastas</option><option value="file">Arquivos</option></select></label>
      </div>
      <Table headers={['Documento','Empresa','Oportunidade','Categoria','Responsável','Atualizado','Ações']}>{documents.length ? documents.map(document=>{const company=companyOf(document);const deal=byId(deals,document.dealId);return <tr key={document.id}><td><b style={{display:'flex',alignItems:'center',gap:'7px'}}>{document.isDir ? <FolderOpen size={16}/> : <FileText size={16}/>} {document.name}</b><span>{document.notes||''}</span></td><td>{company ? <button className="mini" onClick={()=>setSelectedCompanyId?.(company.id)}>{company.name}</button> : '-'}</td><td>{deal ? <button className="mini" onClick={()=>setSelectedDealId?.(deal.id)}>{deal.title}</button> : '-'}</td><td><span className="pill">{document.category||'Outros'}</span></td><td>{document.owner||'-'}</td><td>{formatDate(document.updatedAt||document.createdAt)}</td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><a className="mini" style={{textDecoration:'none'}} href={dropboxHref(document.url)} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Abrir</a>{canWrite && <button className="mini" onClick={()=>editDocument(document)}><Edit3 size={15}/>Editar</button>}{canWrite && <button className="mini" onClick={()=>removeDocument(document)}><Trash2 size={15}/>Remover</button>}</div></td></tr>}) : <tr><td>Nenhum documento encontrado</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}</Table>
    </Panel>
  </>;
}

function Activities({activities,setActivities,deals,query,setSelectedActivityId,canWrite}){
  const [view,setView] = useState('list');
  const [month,setMonth] = useState(() => new Date(`${today()}T12:00:00`));
  const [calendarFilters,setCalendarFilters] = useState({owner:'',type:'',status:''});
  const list = activities.filter(a => (a.title+a.type+a.owner+a.status).toLowerCase().includes(query.toLowerCase()));
  const calendarActivities = list.filter(a =>
    a.dueDate &&
    (!calendarFilters.owner || a.owner === calendarFilters.owner) &&
    (!calendarFilters.type || a.type === calendarFilters.type) &&
    (!calendarFilters.status || a.status === calendarFilters.status)
  );
  const owners = [...new Set(safeArray(activities).map(a=>a.owner).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const types = [...new Set(safeArray(activities).map(a=>a.type).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const calendarStart = new Date(year,monthIndex,1 - new Date(year,monthIndex,1).getDay());
  const calendarDays = Array.from({length:42},(_,index)=>{
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate()+index);
    return date;
  });
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const monthLabel = month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const monthPrefix = `${year}-${String(monthIndex+1).padStart(2,'0')}`;
  const monthActivityCount = calendarActivities.filter(a=>String(a.dueDate||'').startsWith(monthPrefix)).length;
  const changeMonth = (offset) => setMonth(new Date(year,monthIndex+offset,1,12));
  const activityColor = (type) => {
    const normalized = String(type || '').toLowerCase();
    if(normalized.includes('reuni')) return '#007fa8';
    if(normalized.includes('liga')) return '#16865f';
    if(normalized.includes('whats')) return '#218a72';
    if(normalized.includes('proposta')) return '#b36b00';
    if(normalized.includes('mail')) return '#6d5aa8';
    return '#426783';
  };
  const toggle = async (activity) => {
    if(!canWrite) return;
    const nextActivity = {...activity,status:activity.status==='Concluída'?'Pendente':'Concluída'};
    setActivities(activities.map(a=>sameId(a.id,activity.id) ? nextActivity : a));
    try {
      const saved = await saveActivityToSupabase(nextActivity, deals);
      setActivities(activities.map(a=>sameId(a.id,activity.id) ? saved : a));
    } catch (error) {
      console.warn('Falha ao atualizar atividade no Supabase:', error);
      window.alert('Status alterado localmente. O Supabase não aceitou a atualização agora.');
    }
  };
  const removeActivity = async (activity) => {
    if(!canWrite) return;
    if(!window.confirm('Deseja realmente excluir esta atividade?')) return;
    try {
      await deleteActivityFromSupabase(activity);
      setActivities(activities.filter(a => !sameId(a.id,activity.id)));
    } catch (error) {
      console.warn('Falha ao excluir atividade no Supabase:', error);
      window.alert('Não foi possível excluir esta atividade no Supabase agora.');
    }
  };
  return <Panel title={`Atividades (${list.length})`}>
    <div className="activityViewBar">
      <div className="activityViewSwitch" aria-label="Visualização de atividades">
        <button className={view==='list'?'active':''} onClick={()=>setView('list')}><List size={16}/>Lista</button>
        <button className={view==='calendar'?'active':''} onClick={()=>setView('calendar')}><CalendarDays size={16}/>Calendário</button>
      </div>
      {view==='calendar' && <div className="calendarNav">
        <button className="iconBtn" title="Mês anterior" onClick={()=>changeMonth(-1)}><ChevronLeft size={18}/></button>
        <button className="mini" onClick={()=>setMonth(new Date(`${today()}T12:00:00`))}>Hoje</button>
        <button className="iconBtn" title="Próximo mês" onClick={()=>changeMonth(1)}><ChevronRight size={18}/></button>
      </div>}
    </div>

    {view==='list' && <Table headers={['Status','Tipo','Atividade','Oportunidade','Data e hora','Link','Responsável','Ações']}>{list.map(a=><tr key={a.id} onClick={()=>setSelectedActivityId(a.id)} style={{cursor:'pointer'}}><td>{canWrite ? <button className="mini" onClick={(e)=>{e.stopPropagation(); toggle(a)}}>{a.status}</button> : a.status}</td><td>{a.type}</td><td><b>{a.title}</b><span>{a.notes}</span></td><td>{byId(deals,a.dealId)?.title}</td><td>{formatActivityDateTime(a)}</td><td>{a.meetingLink ? <a href={a.meetingLink} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>Abrir chamada</a> : '-'}</td><td>{a.owner}</td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedActivityId(a.id)}}><Edit3 size={15}/>Abrir</button>{canWrite && <button className="mini" onClick={(e)=>{e.stopPropagation(); removeActivity(a)}}><Trash2 size={15}/>Excluir</button>}</div></td></tr>)}</Table>}

    {view==='calendar' && <>
      <div className="calendarFilters">
        <label><span>Responsável</span><select value={calendarFilters.owner} onChange={e=>setCalendarFilters({...calendarFilters,owner:e.target.value})}><option value="">Todos</option>{owners.map(owner=><option value={owner} key={owner}>{owner}</option>)}</select></label>
        <label><span>Tipo</span><select value={calendarFilters.type} onChange={e=>setCalendarFilters({...calendarFilters,type:e.target.value})}><option value="">Todos</option>{types.map(type=><option value={type} key={type}>{type}</option>)}</select></label>
        <label><span>Status</span><select value={calendarFilters.status} onChange={e=>setCalendarFilters({...calendarFilters,status:e.target.value})}><option value="">Todos</option><option value="Pendente">Pendentes</option><option value="Concluída">Concluídas</option></select></label>
      </div>
      <div className="calendarTitle"><h3>{monthLabel}</h3><span>{monthActivityCount} atividade(s) neste mês</span></div>
      <div className="calendarScroll">
        <div className="activityCalendar">
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(day=><div className="calendarWeekday" key={day}>{day}</div>)}
          {calendarDays.map(date=>{
            const key = dateKey(date);
            const dayActivities = calendarActivities.filter(a=>String(a.dueDate||'').slice(0,10)===key).sort((a,b)=>String(a.dueTime||'').localeCompare(String(b.dueTime||'')));
            return <div className={`calendarDay ${date.getMonth()!==monthIndex?'outsideMonth':''} ${key===today()?'today':''}`} key={key}>
              <div className="calendarDayNumber"><span>{date.getDate()}</span>{key===today() && <small>Hoje</small>}</div>
              <div className="calendarEvents">
                {dayActivities.slice(0,3).map(a=><button className={`calendarEvent ${a.status==='Concluída'?'completed':''}`} style={{borderLeftColor:activityColor(a.type)}} title={`${formatActivityDateTime(a)} · ${a.title} · ${byId(deals,a.dealId)?.title || 'Sem oportunidade'}`} onClick={()=>setSelectedActivityId(a.id)} key={a.id}><b>{a.dueTime ? String(a.dueTime).slice(0,5) : 'Dia'} · {a.title}</b><span>{a.owner || 'Sem responsável'}</span></button>)}
                {dayActivities.length>3 && <button className="calendarMore" onClick={()=>setSelectedActivityId(dayActivities[3].id)}>+ {dayActivities.length-3} atividade(s)</button>}
              </div>
            </div>;
          })}
        </div>
      </div>
    </>}
  </Panel>;
}

function Companies({companies,setCompanies,query,setSelectedCompanyId,canWrite}){
  const empty = { name:'', segment:'', cnpj:'', site:'', status:'Prospect', phone:'', email:'', notes:'' };
  const [form,setForm] = useState(empty);
  const list = companies.filter(c => (c.name+c.segment+c.site+c.status).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));;
  const add = async () => {
    if(!canWrite) return;
    if(!form.name.trim()) return;
    const duplicate = companies.find(company =>
      normalizedLookup(company.name) === normalizedLookup(form.name) ||
      (digitsOnly(form.cnpj) && digitsOnly(company.cnpj) === digitsOnly(form.cnpj)) ||
      (normalizedSite(form.site) && normalizedSite(company.site) === normalizedSite(form.site))
    );
    if(duplicate){
      if(window.confirm(`A empresa ${entityCode('E',duplicate)} - ${duplicate.name} já existe. Deseja abrir o cadastro existente para edição?`)){
        setSelectedCompanyId(duplicate.id);
      }
      return;
    }
    try {
      const saved = await saveCompanyToSupabase(form);
      setCompanies([saved,...companies]);
      setForm(empty);
    } catch (error) {
      console.warn('Falha ao salvar empresa no Supabase:', error);
      const fallback = {...form,id:Date.now()};
      setCompanies([fallback,...companies]);
      setForm(empty);
      window.alert('Empresa salva localmente. O Supabase não aceitou a gravação agora.');
    }
  };
  const removeCompany = async (company) => {
    if(!canWrite) return;
    if(!window.confirm('Deseja realmente excluir esta empresa?')) return;
    try {
      await deleteCompanyFromSupabase(company);
      setCompanies(companies.filter(c => !sameId(c.id,company.id)));
    } catch (error) {
      console.warn('Falha ao excluir empresa no Supabase:', error);
      window.alert('Não foi possível excluir esta empresa no Supabase agora.');
    }
  };
  return <>{canWrite && <Panel title="Nova empresa"><div className="formGrid"><Input label="Nome fantasia" field="name" form={form} setForm={setForm}/><Input label="Segmento" field="segment" form={form} setForm={setForm}/><Input label="Site" field="site" form={form} setForm={setForm}/><Input label="CNPJ" field="cnpj" form={form} setForm={setForm}/><button className="saveBtn" onClick={add}><Plus size={16}/>Salvar empresa</button></div></Panel>}<Panel title={`Empresas (${list.length})`}><Table headers={['Empresa','Segmento','Site','Status','Ações']}>{list.map(c=><tr key={c.id} onClick={()=>setSelectedCompanyId(c.id)} style={{cursor:'pointer'}}><td><b>{c.name}</b><span>{c.notes}</span></td><td>{c.segment}</td><td>{c.site ? <a href={websiteHref(c.site)} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>{c.site}</a> : '-'}</td><td><span className="pill">{c.status}</span></td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedCompanyId(c.id)}}><Edit3 size={15}/>Abrir</button>{canWrite && <button className="mini" onClick={(e)=>{e.stopPropagation(); removeCompany(c)}}><Trash2 size={15}/>Excluir</button>}</div></td></tr>)}</Table></Panel></>;
}
function Contacts({contacts,setContacts,companies,query,setSelectedContactId,canWrite}){
  const empty = { companyId:companies[0]?.id||'', name:'', role:'', email:'', phone:'', whatsapp:'', type:'Decisor', linkedin:'', notes:'' };
  const [form,setForm] = useState(empty);
  const list = contacts.filter(c => (c.name+c.role+c.email+c.phone+c.whatsapp).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
  const add = async () => {
    if(!canWrite) return;
    if(!form.name.trim()) return;
    try {
      const saved = await saveContactToSupabase(form, companies);
      setContacts([saved,...contacts]);
      setForm(empty);
    } catch (error) {
      console.warn('Falha ao salvar contato no Supabase:', error);
      const fallback = {...form,id:Date.now()};
      setContacts([fallback,...contacts]);
      setForm(empty);
      window.alert('Contato salvo localmente. O Supabase não aceitou a gravação agora.');
    }
  };
  const removeContact = async (contact) => {
    if(!canWrite) return;
    if(!window.confirm('Deseja realmente excluir este contato?')) return;
    try {
      await deleteContactFromSupabase(contact);
      setContacts(contacts.filter(c => !sameId(c.id,contact.id)));
    } catch (error) {
      console.warn('Falha ao excluir contato no Supabase:', error);
      window.alert('Não foi possível excluir este contato no Supabase agora.');
    }
  };
  return <>{canWrite && <Panel title="Novo contato"><div className="formGrid"><Input label="Nome" field="name" form={form} setForm={setForm}/><Select label="Empresa" field="companyId" form={form} setForm={setForm} options={safeArray(companies).map(c=>[c.id,c.name])}/><Input label="Cargo" field="role" form={form} setForm={setForm}/><Input label="E-mail" field="email" form={form} setForm={setForm}/><Input label="Telefone" field="phone" form={form} setForm={setForm}/><button className="saveBtn" onClick={add}><Plus size={16}/>Salvar contato</button></div></Panel>}<Panel title={`Contatos (${list.length})`}><Table headers={['Contato','Empresa','Cargo','E-mail','Telefone','Tipo','Ações']}>{list.map(c=><tr key={c.id} onClick={()=>setSelectedContactId(c.id)} style={{cursor:'pointer'}}><td><b>{c.name}</b></td><td>{byId(companies,c.companyId)?.name}</td><td>{c.role}</td><td>{c.email}</td><td>{c.phone}</td><td>{c.type}</td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedContactId(c.id)}}><Edit3 size={15}/>Abrir</button>{canWrite && <button className="mini" onClick={(e)=>{e.stopPropagation(); removeContact(c)}}><Trash2 size={15}/>Excluir</button>}</div></td></tr>)}</Table></Panel></>;
}

function Contracts({contracts,setContracts,deals,companies,products,query,canWrite,setSelectedContractId}){
  const empty = { companyId:companies[0]?.id||'', dealId:'', product:'SAC+', startDate:today(), endDate:addMonths(today(),12), mrr:0, setup:0, contractMonths:12, owner:'Sergio', status:'Ativo', notes:'' };
  const [form,setForm] = useState(empty);
  const calculatedEndDate = addMonths(form.startDate, Number(form.contractMonths || 12));
  const list = contracts.filter(c => {
    const company = byId(companies,c.companyId);
    return ((company?.name||'') + c.product + c.owner + c.status + c.notes).toLowerCase().includes(query.toLowerCase());
  });
  const active = contracts.filter(c=>contractStatus(c)==='Ativo');
  const totalMrr = active.reduce((s,c)=>s+contractMrr(c),0);
  const arr = totalMrr * 12;
  const expiring90 = active.filter(c => { const days = daysUntil(c.endDate); return days !== null && days <= 90; });
  const risk90 = expiring90.reduce((s,c)=>s+contractMrr(c),0);
  const wonDeals = deals.filter(d=>d.stage==='Ganho');

  const add = async () => {
    if(!canWrite) return;
    if(!form.companyId) return;
    const months = Number(form.contractMonths || 12);
    const nextContract = {...form,mrr:Number(form.mrr),setup:Number(form.setup),contractMonths:months,endDate:addMonths(form.startDate, months)};
    try {
      const saved = await saveContractToSupabase(nextContract, companies, deals);
      setContracts([saved,...contracts]);
      setForm(empty);
    } catch (error) {
      console.warn('Falha ao salvar contrato no Supabase:', error);
      setContracts([{...nextContract,id:Date.now()},...contracts]);
      setForm(empty);
      window.alert('Contrato salvo localmente. O Supabase não aceitou a gravação agora.');
    }
  };
  const removeContract = async (contract) => {
    if(!canWrite) return;
    if(!window.confirm('Deseja realmente excluir este contrato?')) return;
    try {
      await deleteContractFromSupabase(contract);
      setContracts(contracts.filter(c => !sameId(c.id, contract.id)));
    } catch (error) {
      console.warn('Falha ao excluir contrato no Supabase:', error);
      window.alert('Não foi possível excluir este contrato no Supabase agora.');
    }
  };
  const importWonDeals = async () => {
    if(!canWrite) return;
    const existingDealIds = new Set(contracts.map(c=>String(c.dealId || '')));
    const newContracts = wonDeals
      .filter(d=>!existingDealIds.has(String(d.id)))
      .map(d=>({
        dealId: d.id,
        companyId: d.companyId,
        product: d.product,
        startDate: d.closeDate || today(),
        endDate: addMonths(d.closeDate || today(), dealMonths(d)),
        mrr: dealMrr(d),
        setup: dealSetup(d),
        contractMonths: dealMonths(d),
        owner: d.owner,
        status: 'Ativo',
        notes: `Contrato gerado a partir da oportunidade: ${d.title}`
      }));
    if(!newContracts.length){ window.alert('Não há oportunidades ganhas novas para converter em contrato.'); return; }
    try {
      const savedContracts = [];
      for(const contract of newContracts){
        savedContracts.push(await saveContractToSupabase(contract, companies, deals));
      }
      setContracts([...savedContracts,...contracts]);
    } catch (error) {
      console.warn('Falha ao gerar contratos no Supabase:', error);
      setContracts([...newContracts.map((c,index)=>({...c,id:Date.now()+index})),...contracts]);
      window.alert('Contratos gerados localmente. O Supabase não aceitou a gravação agora.');
    }
  };

  return <>
    <section className="cards">
      <Kpi icon={CircleDollarSign} label="Receita mensal contratada" value={moneyShort(totalMrr)}/>
      <Kpi icon={TrendingUp} label="Receita anualizada contratada" value={moneyShort(arr)}/>
      <Kpi icon={BriefcaseBusiness} label="Contratos ativos" value={active.length}/>
      <Kpi icon={AlertTriangle} label="Receita em risco 90 dias" value={moneyShort(risk90)}/>
    </section>

    {canWrite && <Panel title="Novo contrato"><div className="formGrid">
      <Select label="Cliente" field="companyId" form={form} setForm={setForm} options={safeArray(companies).map(c=>[c.id,c.name])}/>
      <Select label="Produto" field="product" form={form} setForm={setForm} options={safeArray(products).map(p=>[p,p])}/>
      <Input label="Início do contrato" field="startDate" form={form} setForm={setForm} type="date"/>
      <label title="Inserir prazo contratual"><span>Término do contrato</span><input type="date" value={calculatedEndDate} readOnly aria-readonly="true"/></label>
      <Input label="Receita mensal" field="mrr" form={form} setForm={setForm} type="number"/>
      <Input label="Implantação" field="setup" form={form} setForm={setForm} type="number"/>
      <Input label="Prazo contratual (meses)" field="contractMonths" form={form} setForm={setForm} type="number"/>
      <Select label="Responsável" field="owner" form={form} setForm={setForm} options={USERS.map(u=>[u,u])}/>
      <Select label="Status" field="status" form={form} setForm={setForm} options={['Ativo','Renovando','Encerrado','Suspenso'].map(s=>[s,s])}/>
      <button className="saveBtn" onClick={add}><Plus size={16}/>Criar contrato</button>
      <button className="saveBtn" onClick={importWonDeals}><CheckCircle2 size={16}/>Gerar contratos das oportunidades ganhas</button>
    </div></Panel>}

    <section className="grid2 compact">
      <Panel title="Contratos vencendo em 90 dias">
        <DashboardTable headers={['Cliente','Término','Tempo restante','Receita mensal']}>
          {expiring90.length ? expiring90.sort((a,b)=>String(a.endDate).localeCompare(String(b.endDate))).map(c=>{
            const company = byId(companies,c.companyId);
            return <tr key={c.id} onClick={()=>setSelectedContractId?.(c.id)} style={{cursor:'pointer'}}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.product}</span></td><td>{formatDate(c.endDate)}</td><td>{monthsRemaining(c.endDate)} meses</td><td>{moneyShort(contractMrr(c))}</td></tr>
          }) : <tr><td>Nenhum contrato vencendo</td><td>-</td><td>-</td><td>{moneyShort(0)}</td></tr>}
        </DashboardTable>
      </Panel>

      <Panel title="Carteira ativa por cliente">
        <DashboardTable headers={['Cliente','Status','Tempo restante','Receita mensal']}>
          {active.length ? active.slice().sort((a,b)=>contractMrr(b)-contractMrr(a)).slice(0,6).map(c=>{
            const company = byId(companies,c.companyId);
            return <tr key={c.id} onClick={()=>setSelectedContractId?.(c.id)} style={{cursor:'pointer'}}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.product}</span></td><td><span className="pill">{contractStatus(c)}</span></td><td>{monthsRemaining(c.endDate)} meses</td><td>{moneyShort(contractMrr(c))}</td></tr>
          }) : <tr><td>Nenhum contrato ativo</td><td>-</td><td>-</td><td>{moneyShort(0)}</td></tr>}
        </DashboardTable>
      </Panel>
    </section>

    <Panel title="Todos os contratos"><Table headers={['Cliente','Produto','Início','Término','Tempo restante','Receita mensal','Valor total do contrato','Status','Responsável','Ações']}>
      {list.map(c=>{
        const company = byId(companies,c.companyId);
        return <tr key={c.id} onClick={()=>setSelectedContractId?.(c.id)} style={{cursor:'pointer'}}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.notes}</span></td><td>{c.product}</td><td>{formatDate(c.startDate)}</td><td>{formatDate(c.endDate)}</td><td>{monthsRemaining(c.endDate)} meses</td><td>{moneyShort(contractMrr(c))}</td><td>{moneyShort(contractTcv(c))}</td><td><span className="pill">{contractStatus(c)}</span></td><td>{c.owner}</td><td>{canWrite ? <button className="mini" onClick={(e)=>{e.stopPropagation(); removeContract(c)}}><Trash2 size={15}/>Excluir</button> : '-'}</td></tr>
      })}
    </Table></Panel>
  </>;
}


function ContractModal({contract,onClose,contracts,setContracts,companies,deals,products,setSelectedCompanyId,setSelectedDealId,setSelectedProductName,canWrite}){
  const [draft,setDraft] = useState({...contract});
  const company = byId(companies, draft.companyId);
  const deal = byId(deals, draft.dealId);
  const calculatedEndDate = addMonths(draft.startDate, Number(draft.contractMonths || 12));

  const openCompany = () => {
    if(!company || !setSelectedCompanyId) return;
    onClose();
    setSelectedCompanyId(company.id);
  };

  const openDeal = () => {
    if(!deal || !setSelectedDealId) return;
    onClose();
    setSelectedDealId(deal.id);
  };

  const openProduct = () => {
    if(!draft.product || !setSelectedProductName) return;
    onClose();
    setSelectedProductName(draft.product);
  };

  const save = async () => {
    if(!canWrite) return;
    const months = Number(draft.contractMonths || 12);
    const nextDraft = {
      ...draft,
      mrr: Number(draft.mrr || 0),
      setup: Number(draft.setup || 0),
      contractMonths: months,
      endDate: addMonths(draft.startDate, months)
    };

    try {
      const saved = await saveContractToSupabase(nextDraft, companies, deals);
      setContracts(contracts.map(c=>sameId(c.id, contract.id) ? saved : c));
      onClose();
    } catch (error) {
      console.warn('Falha ao atualizar contrato no Supabase:', error);
      setContracts(contracts.map(c=>sameId(c.id, contract.id) ? nextDraft : c));
      onClose();
      window.alert('Alterações salvas localmente. O Supabase não aceitou a atualização agora.');
    }
  };

  return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><div><h2>{company?.name || 'Contrato'}</h2><span>{draft.product || 'Produto não informado'} · {contractStatus(draft)}</span></div><button className="iconBtn" onClick={onClose}><X/></button></div>
    <Panel title="Vínculos do contrato">
      <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
        <button className="mini" onClick={openCompany} disabled={!company}><Building2 size={15}/>{company?.name || 'Sem cliente'}</button>
        <button className="mini" onClick={openDeal} disabled={!deal}><BriefcaseBusiness size={15}/>{deal?.title || 'Sem oportunidade'}</button>
        <button className="mini" onClick={openProduct} disabled={!draft.product}><Sparkles size={15}/>{draft.product || 'Sem produto'}</button>
      </div>
    </Panel>
    <Panel title="Dados do contrato">
      <div className="formGrid modalGrid">
        <Select label="Cliente" field="companyId" form={draft} setForm={setDraft} options={safeArray(companies).map(c=>[c.id,c.name])}/>
        <Select label="Produto" field="product" form={draft} setForm={setDraft} options={safeArray(products).map(p=>[p,p])}/>
        <Select label="Oportunidade" field="dealId" form={draft} setForm={setDraft} options={[['','Sem oportunidade'],...safeArray(deals).map(d=>[d.id,d.title])]}/>
        <Input label="Início do contrato" field="startDate" form={draft} setForm={setDraft} type="date"/>
        <label title="Inserir prazo contratual"><span>Término do contrato</span><input type="date" value={calculatedEndDate} readOnly aria-readonly="true"/></label>
        <Input label="Prazo contratual (meses)" field="contractMonths" form={draft} setForm={setDraft} type="number"/>
        <Input label="Receita mensal" field="mrr" form={draft} setForm={setDraft} type="number"/>
        <Input label="Implantação" field="setup" form={draft} setForm={setDraft} type="number"/>
        <Select label="Responsável" field="owner" form={draft} setForm={setDraft} options={USERS.map(u=>[u,u])}/>
        <Select label="Status" field="status" form={draft} setForm={setDraft} options={['Ativo','Renovando','Encerrado','Suspenso'].map(s=>[s,s])}/>
        <label><span>Valor total do contrato</span><input value={money(contractTcv({...draft,endDate:calculatedEndDate}))} readOnly/></label>
        <Textarea label="Observações" field="notes" form={draft} setForm={setDraft}/>
        {canWrite && <button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button>}
      </div>
    </Panel>
  </div></div>;
}



function CompanyModal({company,onClose,companies,setCompanies,contacts=[],setSelectedContactId,canWrite}){
  const [draft,setDraft] = useState({...company});
  const linkedContacts = safeArray(contacts).filter(c=>sameId(c.companyId, company.id));
  const save = async () => {
    if(!canWrite) return;
    try {
      const saved = await saveCompanyToSupabase(draft);
      setCompanies(companies.map(c=>sameId(c.id,company.id) ? saved : c));
      onClose();
    } catch (error) {
      console.warn('Falha ao atualizar empresa no Supabase:', error);
      setCompanies(companies.map(c=>sameId(c.id,company.id) ? draft : c));
      onClose();
      window.alert('Alterações salvas localmente. O Supabase não aceitou a atualização agora.');
    }
  };
  const openContact = (id) => {
    if(!setSelectedContactId) return;
    onClose();
    setSelectedContactId(id);
  };
  return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><div><h2>{company.name}</h2><span>Cadastro da empresa</span></div><button className="iconBtn" onClick={onClose}><X/></button></div>
    <div className="formGrid modalGrid"><Input label="Nome fantasia" field="name" form={draft} setForm={setDraft}/><Input label="Segmento" field="segment" form={draft} setForm={setDraft}/><Input label="CNPJ" field="cnpj" form={draft} setForm={setDraft}/><Input label="Site" field="site" form={draft} setForm={setDraft}/><Input label="Status" field="status" form={draft} setForm={setDraft}/><Input label="Telefone" field="phone" form={draft} setForm={setDraft}/><Input label="E-mail" field="email" form={draft} setForm={setDraft}/><Textarea label="Observações" field="notes" form={draft} setForm={setDraft}/>{canWrite && <button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button>}</div>
    <Panel title={`Contatos vinculados (${linkedContacts.length})`}>
      <DashboardTable headers={['Contato','Cargo','E-mail','Telefone / WhatsApp','Tipo','Ações']}>
        {linkedContacts.length ? linkedContacts.map(c=><tr key={c.id} onClick={()=>openContact(c.id)} style={{cursor:'pointer'}}><td><b>{c.name}</b><span>{c.notes}</span></td><td>{c.role || '-'}</td><td>{c.email || '-'}</td><td>{c.whatsapp || c.phone || '-'}</td><td>{c.type || '-'}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); openContact(c.id)}}><Edit3 size={15}/>Abrir contato</button></td></tr>) : <tr><td>Nenhum contato vinculado</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
      </DashboardTable>
    </Panel>
  </div></div>;
}

function ContactModal({contact,onClose,contacts,setContacts,companies,setSelectedCompanyId,canWrite}){
  const [draft,setDraft] = useState({...contact});
  const company = byId(companies, draft.companyId);
  const save = async () => {
    if(!canWrite) return;
    try {
      const saved = await saveContactToSupabase(draft, companies);
      setContacts(contacts.map(c=>sameId(c.id,contact.id) ? saved : c));
      onClose();
    } catch (error) {
      console.warn('Falha ao atualizar contato no Supabase:', error);
      setContacts(contacts.map(c=>sameId(c.id,contact.id) ? draft : c));
      onClose();
      window.alert('Alterações salvas localmente. O Supabase não aceitou a atualização agora.');
    }
  };
  const openCompany = () => {
    if(!setSelectedCompanyId || !draft.companyId) return;
    onClose();
    setSelectedCompanyId(draft.companyId);
  };
  return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><div><h2>{contact.name}</h2><span>{company?.name || 'Sem empresa vinculada'}</span></div><button className="iconBtn" onClick={onClose}><X/></button></div>
    <Panel title="Empresa vinculada">
      <div style={{display:'flex',justifyContent:'space-between',gap:'14px',alignItems:'center',flexWrap:'wrap'}}>
        <div>
          <b style={{display:'block',fontSize:'18px'}}>{company?.name || 'Sem empresa vinculada'}</b>
          <span className="muted">{company ? `${company.segment || 'Sem segmento'} · ${company.site || 'Sem site'}` : 'Vincule uma empresa no campo abaixo.'}</span>
        </div>
        <button className="mini" onClick={openCompany} disabled={!company}><Building2 size={15}/>Abrir empresa</button>
      </div>
    </Panel>
    <div className="formGrid modalGrid"><Input label="Nome" field="name" form={draft} setForm={setDraft}/><Select label="Empresa" field="companyId" form={draft} setForm={setDraft} options={safeArray(companies).map(c=>[c.id,c.name])}/><Input label="Cargo" field="role" form={draft} setForm={setDraft}/><Input label="E-mail" field="email" form={draft} setForm={setDraft}/><Input label="Telefone" field="phone" form={draft} setForm={setDraft}/><Input label="WhatsApp" field="whatsapp" form={draft} setForm={setDraft}/><Input label="LinkedIn" field="linkedin" form={draft} setForm={setDraft}/><Select label="Tipo" field="type" form={draft} setForm={setDraft} options={['Decisor','Influenciador','Usuário','Financeiro','Outros'].map(x=>[x,x])}/><Textarea label="Observações" field="notes" form={draft} setForm={setDraft}/>{canWrite && <button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button>}</div>
  </div></div>;
}

function ActivityModal({activity,onClose,activities,setActivities,deals,canWrite}){
  const [draft,setDraft] = useState({...activity});
  const save = async () => {
    if(!canWrite) return;
    try {
      const saved = await saveActivityToSupabase(draft, deals);
      setActivities(activities.map(a=>sameId(a.id,activity.id) ? saved : a));
      onClose();
    } catch (error) {
      console.warn('Falha ao atualizar atividade no Supabase:', error);
      setActivities(activities.map(a=>sameId(a.id,activity.id) ? draft : a));
      onClose();
      window.alert('Alterações salvas localmente. O Supabase não aceitou a atualização agora.');
    }
  };
  return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><div><h2>{activity.title}</h2><span>{byId(deals,activity.dealId)?.title || 'Atividade sem oportunidade vinculada'}</span></div><button className="iconBtn" onClick={onClose}><X/></button></div>
    <div className="formGrid modalGrid"><Select label="Status" field="status" form={draft} setForm={setDraft} options={['Pendente','Concluída'].map(x=>[x,x])}/><Select label="Tipo" field="type" form={draft} setForm={setDraft} options={['Follow-up','Ligação','E-mail','WhatsApp','Reunião','Proposta'].map(x=>[x,x])}/><Input label="Título" field="title" form={draft} setForm={setDraft}/><Select label="Oportunidade" field="dealId" form={draft} setForm={setDraft} options={[['','Sem oportunidade'],...safeArray(deals).map(d=>[d.id,d.title])]}/><Input label="Data" field="dueDate" form={draft} setForm={setDraft} type="date"/><Input label="Hora" field="dueTime" form={draft} setForm={setDraft} type="time"/><Input label="Link chamada" field="meetingLink" form={draft} setForm={setDraft} type="url"/><Select label="Responsável" field="owner" form={draft} setForm={setDraft} options={USERS.map(u=>[u,u])}/><Textarea label="Observações" field="notes" form={draft} setForm={setDraft}/>{canWrite && <button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button>}</div>
  </div></div>;
}


function ProductInfoModal({product,onClose,products,setProducts,canWrite}){
  const [name,setName] = useState(product);
  const save = () => {
    if(!canWrite) return;
    const clean = name.trim();
    if(!clean) return;
    if(clean.toLowerCase() !== product.toLowerCase() && products.some(p => p.toLowerCase() === clean.toLowerCase())){
      window.alert('Este produto já está cadastrado.');
      return;
    }
    setProducts(products.map(p => p === product ? clean : p));
    onClose();
  };

  return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><div><h2>{product}</h2><span>Cadastro de produto</span></div><button className="iconBtn" onClick={onClose}><X/></button></div>
    <Panel title="Dados do produto"><p className="muted">Produto cadastrado no Daleth Sales Hub. Os detalhes avançados de produto poderão ser ampliados em uma próxima sprint.</p><div className="formGrid modalGrid"><label><span>Nome do produto</span><input value={name} onChange={e=>setName(e.target.value)} readOnly={!canWrite}/></label>{canWrite && <button className="saveBtn" onClick={save}><Save size={16}/>Salvar produto</button>}</div></Panel>
  </div></div>;
}

function Products({products,setProducts,query,canWrite,setSelectedProductName}){
  const [name,setName] = useState('');
  const list = products.filter(p => p.toLowerCase().includes(query.toLowerCase()));
  const add = () => {
    if(!canWrite) return;
    const clean = name.trim();
    if(!clean) return;
    const duplicate = products.find(product => normalizedLookup(product) === normalizedLookup(clean));
    if(duplicate){
      if(window.confirm(`O produto ${duplicate} já existe. Deseja abrir o cadastro existente?`)) setSelectedProductName?.(duplicate);
      return;
    }
    setProducts([...products, clean]);
    setName('');
  };
  const removeProduct = (product) => {
    if(!canWrite) return;
    if(['SAC+','SAC 24h','Inside Sales','Help Desk','Back Office','Ouvidorias','Custom'].includes(product)){
      if(!window.confirm('Este é um produto padrão. Deseja realmente excluir?')) return;
    } else if(!window.confirm('Deseja realmente excluir este produto?')) return;
    setProducts(products.filter(p => p !== product));
  };
  return <>
    {canWrite && <Panel title="Cadastro de produtos"><div className="formGrid"><label><span>Novo produto</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Atendimento bilíngue" onKeyDown={e=>{ if(e.key==='Enter') add(); }}/></label><button className="saveBtn" onClick={add}><Plus size={16}/>Adicionar produto</button></div></Panel>}
    <Panel title="Produtos cadastrados"><Table headers={['Produto','Ações']}>{list.map(p=><tr key={p} onClick={()=>setSelectedProductName?.(p)} style={{cursor:'pointer'}}><td><b>{p}</b></td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedProductName?.(p)}}><Edit3 size={15}/>Abrir</button>{canWrite && <button className="mini" onClick={(e)=>{e.stopPropagation(); removeProduct(p)}}><Trash2 size={15}/>Excluir</button>}</div></td></tr>)}</Table></Panel>
  </>;
}

function ProfilesAdmin({currentUser}){
  const { profiles, setProfiles, loading, error } = useProfiles(currentUser?.canViewDashboard === true);
  const [status,setStatus] = useState('');

  const updateProfile = async (profile, patch) => {
    const nextProfile = {
      ...profile,
      ...patch
    };

    nextProfile.canViewDashboard = canRoleViewDashboard(nextProfile.role, nextProfile.canViewDashboard);

    setProfiles(profiles.map(item => sameId(item.id, profile.id) ? nextProfile : item));
    setStatus('Salvando perfil...');

    try {
      const saved = await saveProfileToSupabase(nextProfile);
      setProfiles(profiles.map(item => sameId(item.id, profile.id) ? saved : item));
      setStatus('Perfil atualizado.');
    } catch (err) {
      console.warn('Falha ao atualizar perfil:', err);
      setStatus('Não foi possível atualizar este perfil.');
    }
  };

  return <>
    <Panel title="Perfis e permissões">
      <p className="muted">Os usuários são criados no Supabase Auth. Esta tela ajusta o perfil de acesso usado pelo CRM.</p>
      {loading && <p className="muted">Carregando perfis...</p>}
      {error && <p style={{color:'#dc2626',fontWeight:800}}>{error}</p>}
      {status && <p className="muted">{status}</p>}
      <Table headers={['Usuário','Perfil','Dashboard','Atualizado']}>
        {profiles.length ? profiles.map(profile => <tr key={profile.id}>
          <td><b>{profile.name}</b><span>{profile.id}</span></td>
          <td>
            <select value={profile.role} onChange={event=>updateProfile(profile, { role:event.target.value })}>
              {['CEO','Comercial','Reserva'].map(role => <option key={role} value={role}>{role}</option>)}
            </select>
          </td>
          <td>{profile.canViewDashboard ? 'Sim' : 'Não'}</td>
          <td>{formatDateTime(profile.updatedAt)}</td>
        </tr>) : <tr><td>Nenhum perfil encontrado</td><td>-</td><td>-</td><td>-</td></tr>}
      </Table>
    </Panel>
  </>;
}


function PipedriveImport({
  companies,setCompanies,contacts,setContacts,deals,setDeals,activities,setActivities,notes,setNotes,
  pipedriveImportMeta,setPipedriveImportMeta
}){
  const [status,setStatus] = useState('');
  const [preview,setPreview] = useState(null);

  const mergeById = (current, incoming) => {
    const map = new Map(current.map(item => [String(item.id), item]));
    incoming.forEach(item => {
      if(!map.has(String(item.id))) map.set(String(item.id), item);
    });
    return Array.from(map.values());
  };

  const normalizeData = (data) => ({
    companies: Array.isArray(data?.companies) ? data.companies : [],
    contacts: Array.isArray(data?.contacts) ? data.contacts : [],
    deals: Array.isArray(data?.deals) ? data.deals : [],
    activities: Array.isArray(data?.activities) ? data.activities : [],
    notes: Array.isArray(data?.notes) ? data.notes : [],
    counts: data?.counts || {}
  });

  const upsertImportedData = async (data) => {
    const companiesPayload = data.companies.map(companyToDb);
    const { data: savedCompaniesRaw, error: companiesError } = await supabase
      .from('companies')
      .upsert(companiesPayload, { onConflict: 'legacy_id' })
      .select('id,name,segment,cnpj,site,website,status,phone,email,notes,legacy_id');
    if(companiesError) throw companiesError;
    const savedCompanies = (savedCompaniesRaw || []).map(mapCompanyFromDb);

    const contactsPayload = data.contacts.map(contact => contactToDb(contact, savedCompanies));
    const { data: savedContactsRaw, error: contactsError } = await supabase
      .from('contacts')
      .upsert(contactsPayload, { onConflict: 'legacy_id' })
      .select(`
        id,
        company_id,
        name,
        role,
        email,
        phone,
        whatsapp,
        linkedin,
        type,
        contact_type,
        notes,
        legacy_id,
        companies:company_id (
          legacy_id
        )
      `);
    if(contactsError) throw contactsError;
    const savedContacts = (savedContactsRaw || []).map(mapContactFromDb);

    const dealsPayload = data.deals.map(deal => dealToDb(deal, savedCompanies, savedContacts));
    const { data: savedDealsRaw, error: dealsError } = await supabase
      .from('opportunities')
      .upsert(dealsPayload, { onConflict: 'legacy_id' })
      .select(DEAL_SELECT);
    if(dealsError) throw dealsError;
    const savedDeals = (savedDealsRaw || []).map(mapDealFromDb);

    const activitiesPayload = data.activities.map(activity => activityToDb(activity, savedDeals));
    const { data: savedActivitiesRaw, error: activitiesError } = await supabase
      .from('activities')
      .upsert(activitiesPayload, { onConflict: 'legacy_id' })
      .select(ACTIVITY_SELECT);
    if(activitiesError) throw activitiesError;
    const savedActivities = (savedActivitiesRaw || []).map(mapActivityFromDb);

    const notesPayload = data.notes.map(note => noteToDb(note, savedDeals));
    const { data: savedNotesRaw, error: notesError } = await supabase
      .from('notes')
      .upsert(notesPayload, { onConflict: 'legacy_id' })
      .select(NOTE_SELECT);
    if(notesError) throw notesError;
    const savedNotes = (savedNotesRaw || []).map(mapNoteFromDb);

    return {
      companies: savedCompanies,
      contacts: savedContacts,
      deals: savedDeals,
      activities: savedActivities,
      notes: savedNotes
    };
  };

  const importData = async (raw, mode='merge') => {
    const data = normalizeData(raw);
    const counts = {
      companies: data.companies.length,
      contacts: data.contacts.length,
      deals: data.deals.length,
      activities: data.activities.length,
      notes: data.notes.length
    };

    if(mode === 'replace'){
      if(!window.confirm('Substituir a visualização atual pelos dados importados do Pipedrive? No Supabase, a importação faz upsert por ID legado e não apaga registros fora do arquivo.')) return;
    }

    try {
      setStatus('Importando no Supabase: empresas, contatos, oportunidades, atividades e notas...');
      const saved = await upsertImportedData(data);

      if(mode === 'replace'){
        setCompanies(saved.companies);
        setContacts(saved.contacts);
        setDeals(saved.deals);
        setActivities(saved.activities);
        setNotes(saved.notes);
      } else {
        setCompanies(mergeById(companies, saved.companies));
        setContacts(mergeById(contacts, saved.contacts));
        setDeals(mergeById(deals, saved.deals));
        setActivities(mergeById(activities, saved.activities));
        setNotes(mergeById(notes, saved.notes));
      }
    } catch (error) {
      console.warn('Falha ao importar no Supabase:', error);
      if(mode === 'replace'){
        setCompanies(data.companies);
        setContacts(data.contacts);
        setDeals(data.deals);
        setActivities(data.activities);
        setNotes(data.notes);
      } else {
        setCompanies(mergeById(companies, data.companies));
        setContacts(mergeById(contacts, data.contacts));
        setDeals(mergeById(deals, data.deals));
        setActivities(mergeById(activities, data.activities));
        setNotes(mergeById(notes, data.notes));
      }
      setStatus('Supabase não aceitou a importação agora. Os dados foram aplicados localmente neste navegador.');
      return;
    }

    const meta = {
      importedAt: new Date().toISOString(),
      mode,
      counts
    };
    setPipedriveImportMeta(meta);
    setStatus(`Importação concluída no Supabase: ${counts.companies} empresas, ${counts.contacts} contatos, ${counts.deals} oportunidades, ${counts.activities} atividades e ${counts.notes} notas.`);
  };

  const loadDefaultFile = async () => {
    try {
      setStatus('Lendo arquivo /pipedrive-import-daleth.json...');
      const response = await fetch('/pipedrive-import-daleth.json', { cache: 'no-store' });
      if(!response.ok) throw new Error('Arquivo não encontrado em /public.');
      const data = await response.json();
      const normalized = normalizeData(data);
      setPreview(normalized);
      setStatus('Arquivo carregado. Revise os totais e escolha o tipo de importação.');
    } catch (error) {
      setStatus('Não consegui localizar o arquivo padrão. Use o seletor abaixo ou copie o JSON para a pasta public.');
    }
  };

  const loadSelectedFile = (event) => {
    const file = event.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const normalized = normalizeData(data);
        setPreview(normalized);
        setStatus('Arquivo carregado. Revise os totais e escolha o tipo de importação.');
      } catch (error) {
        setStatus('Arquivo inválido. Selecione o JSON de importação gerado para o Daleth Sales Hub.');
      }
    };
    reader.readAsText(file);
  };

  const count = (key) => preview?.[key]?.length || 0;

  return <div>
    <section className="cards">
      <Kpi icon={Building2} label="Empresas no arquivo" value={count('companies')}/>
      <Kpi icon={Users} label="Contatos no arquivo" value={count('contacts')}/>
      <Kpi icon={BriefcaseBusiness} label="Oportunidades no arquivo" value={count('deals')}/>
      <Kpi icon={CalendarDays} label="Atividades no arquivo" value={count('activities')}/>
    </section>

    <section className="grid2">
      <Panel title="Importação Pipedrive">
        <p className="muted">Use esta área para trazer os arquivos exportados do Pipedrive já convertidos para o formato do Daleth Sales Hub.</p>
        <div className="toolbar" style={{alignItems:'center'}}>
          <button onClick={loadDefaultFile}><Filter size={16}/>Carregar arquivo padrão</button>
          <label className="mini" style={{cursor:'pointer',padding:'10px 12px'}}>
            Selecionar JSON
            <input type="file" accept=".json,application/json" onChange={loadSelectedFile} style={{display:'none'}} />
          </label>
        </div>
        {status && <p className="muted" style={{marginTop:'14px'}}>{status}</p>}
        {preview && <div className="toolbar" style={{marginTop:'18px'}}>
          <button className="saveBtn" onClick={()=>importData(preview,'merge')}><Plus size={16}/>Importar preservando dados atuais</button>
          <button className="mini" onClick={()=>importData(preview,'replace')}><Trash2 size={15}/>Substituir base atual</button>
        </div>}
      </Panel>

      <Panel title="Resumo da última importação">
        {pipedriveImportMeta ? <div className="tableWrap"><table><tbody>
          <tr><td><b>Data</b></td><td>{new Date(pipedriveImportMeta.importedAt).toLocaleString('pt-BR')}</td></tr>
          <tr><td><b>Modo</b></td><td>{pipedriveImportMeta.mode === 'replace' ? 'Substituição da base' : 'Acrescentar sem duplicar'}</td></tr>
          <tr><td><b>Empresas</b></td><td>{pipedriveImportMeta.counts?.companies || 0}</td></tr>
          <tr><td><b>Contatos</b></td><td>{pipedriveImportMeta.counts?.contacts || 0}</td></tr>
          <tr><td><b>Oportunidades</b></td><td>{pipedriveImportMeta.counts?.deals || 0}</td></tr>
          <tr><td><b>Atividades</b></td><td>{pipedriveImportMeta.counts?.activities || 0}</td></tr>
          <tr><td><b>Notas</b></td><td>{pipedriveImportMeta.counts?.notes || 0}</td></tr>
        </tbody></table></div> : <p className="muted">Nenhuma importação registrada neste navegador.</p>}
      </Panel>
    </section>

    <Panel title="Mapeamento aplicado">
      <div className="tableWrap"><table><thead><tr><th>Pipedrive</th><th>Daleth Sales Hub</th></tr></thead><tbody>
        <tr><td>Organizações</td><td>Empresas</td></tr>
        <tr><td>Pessoas</td><td>Contatos</td></tr>
        <tr><td>Negócios</td><td>Oportunidades</td></tr>
        <tr><td>Atividades</td><td>Atividades</td></tr>
        <tr><td>Notas vinculadas a negócios</td><td>Histórico da oportunidade</td></tr>
      </tbody></table></div>
      <p className="muted">Os IDs originais do Pipedrive foram preservados no campo interno pipedriveId. Para evitar conflito com cadastros existentes, os novos IDs receberam faixas próprias.</p>
    </Panel>
  </div>;
}


function Matrix({deals,companies}){ return <Panel title="Matriz de Soluções Daleth"><p className="muted">Sugestões automáticas por segmento. Esta será a base para gerar propostas e apresentações futuramente.</p>{deals.map(d=><div className="matrixCard" key={d.id}><h3>{d.title}</h3><p className="muted">Receita mensal {money(dealMrr(d))} · Prazo {dealMonths(d)} meses · Valor total {money(dealTcv(d))}</p><SolutionSuggestions deal={d} companies={companies}/></div>)}</Panel>; }
function SolutionSuggestions({deal,companies}){
  const company = byId(companies,deal.companyId);
  const seg = (company?.segment || '').toLowerCase();
  let items = ['Atendimento multicanal','Relatórios gerenciais','QA e monitoria','NPS/CSAT'];
  if(seg.includes('franqu')) items = ['SAC+ por unidade franqueada','WhatsApp corporativo','Reclame Aqui','PROCON','Padronização de atendimento','Relatórios por rede/unidade'];
  if(seg.includes('avia')) items = ['SAC 24/7 ANAC','Atendimento bilíngue','Telefonia nacional','E-mail e formulários','Contingência operacional','Relatórios de SLA'];
  if(seg.includes('parceiro')) items = ['Controle de indicações','Comissão por faturamento','Pipeline compartilhado','Relatórios de comissão'];
  return <div className="solutions">{items.map(i=><span key={i}><Sparkles size={14}/>{i}</span>)}</div>;
}

function Input({label,field,form,setForm,type='text'}){ return <label><span>{label}</span><input type={type} value={form[field] ?? ''} onChange={e=>setForm({...form,[field]:e.target.value})}/></label>; }
function Textarea({label,field,form,setForm}){ return <label className="wide"><span>{label}</span><textarea value={form[field] ?? ''} onChange={e=>setForm({...form,[field]:e.target.value})}></textarea></label>; }
function Select({label,field,form,setForm,options}){ return <label><span>{label}</span><select value={form[field] ?? ''} onChange={e=>setForm({...form,[field]:e.target.value})}>{options.map(([v,t])=><option value={v} key={String(v)}>{t}</option>)}</select></label>; }
function Table({headers,children}){ return <div className="tableWrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }

createRoot(document.getElementById('root')).render(<App/>);
