import React, { useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, KanbanSquare, Building2, Users, BriefcaseBusiness, CalendarDays, Plus, Search, Edit3, Trash2, MessageSquare, CheckCircle2, Clock3, CircleDollarSign, X, Save, Sparkles, Phone, Mail, UserRound, Filter, BellRing, TrendingUp, AlertTriangle, Lock } from 'lucide-react';
import './style.css';
import { supabase } from './lib/supabase';

const STAGES = ['Lead Captado','Primeiro Contato','Reunião Agendada','Levantamento','Proposta Enviada','Negociação','Ganho','Perdido'];
const USERS = ['Sergio','Oyas','Katia','Paulo','Reserva'];
const INITIAL_PRODUCTS = ['SAC+','SAC 24h','Inside Sales','Help Desk','Back Office','Ouvidorias','Custom'];

const ACCESS_USERS = [
  { name: 'Sergio', role: 'CEO', canViewDashboard: true },
  { name: 'Katia', role: 'Comercial', canViewDashboard: false },
  { name: 'Paulo', role: 'Comercial', canViewDashboard: false },
  { name: 'Oyas', role: 'Comercial', canViewDashboard: false },
  { name: 'Reserva', role: 'Leitura', canViewDashboard: false },
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

        const mapped = (data || []).map(c => ({
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
        }));

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

        const mapped = (data || []).map(c => ({
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
        }));

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
function useDeals(){
  const [deals, saveDealsToCrmState] = useStore('dsh-v1-deals', initialDeals);

  useEffect(() => {
    let cancelled = false;

    async function loadDeals(){
      try {
        const { data, error } = await supabase
          .from('opportunities')
          .select(`
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
            companies:company_id (
              legacy_id
            ),
            contacts:contact_id (
              legacy_id
            )
          `)
          .order('created_at', { ascending: false });

        if(error) throw error;

        console.log('SUPABASE DEALS:', data);

        const mapped = (data || []).map(d => ({
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
          owner: '',
          probability: Number(d.probability || 0),
          closeDate: d.expected_close_date || '',
          description: d.description || '',
          nextStep: d.next_step || '',
          priority: d.priority || 'Média'
        }));

        console.log('MAPPED DEALS:', mapped);

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
function useActivities(){
  const [activities, saveActivitiesToCrmState] = useStore('dsh-v1-activities', initialActivities);

  useEffect(() => {
    let cancelled = false;

    async function loadActivities(){
      try {
        const { data, error } = await supabase
          .from('activities')
          .select(`
            id,
            opportunity_id,
            title,
            due_date,
            status,
            notes,
            owner,
            legacy_id,
            activity_type,
            created_at,
            opportunities:opportunity_id (
              legacy_id
            )
          `)
          .order('created_at', { ascending: false });

        if(error) throw error;

        console.log('SUPABASE ACTIVITIES:', data);

        const mapped = (data || []).map(a => ({
          id: a.legacy_id || a.id,
          supabaseId: a.id,
          dealId: a.opportunities?.legacy_id || a.opportunity_id,
          type: a.activity_type || 'Ligação',
          title: a.title || '',
          dueDate: a.due_date || '',
          status: a.status || 'Pendente',
          owner: a.owner || '',
          notes: a.notes || ''
        }));

        console.log('MAPPED ACTIVITIES:', mapped);

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
  const [date, time=''] = String(value).replace('T',' ').split(' ');
  const formattedDate = formatDate(date);
  return time ? `${formattedDate} ${time.slice(0,5)}` : formattedDate;
}
function openLinkedEntity(setter, id){ if(setter && id) setter(id); }
function sameId(a,b){ return String(a ?? '') === String(b ?? ''); }
function byId(list,id){ return (Array.isArray(list) ? list : []).find(item => sameId(item?.id,id)); }
function safeText(value){ return String(value ?? ''); }
function safeArray(value){ return Array.isArray(value) ? value : []; }
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


function LoginScreen({onLogin}){
  const [selected,setSelected] = useState('Sergio');
  const user = ACCESS_USERS.find(u=>u.name===selected) || ACCESS_USERS[0];
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
        <div style={{width:'42px',height:'42px',borderRadius:'11px',background:'linear-gradient(135deg,#0878ff 0%,#bde9ff 100%)',display:'grid',placeItems:'center',fontWeight:900,color:'#061b34',fontSize:'22px',flex:'0 0 auto'}}>D</div>
        <strong style={{fontSize:'18px',color:'#0878ff',letterSpacing:'-.02em'}}>Sales Hub</strong>
      </div>

      <h1 style={{margin:'0 0 10px',fontSize:'40px',lineHeight:1.05,letterSpacing:'-.04em',color:'#061b34',fontWeight:900}}>Daleth Sales Hub</h1>
      <p style={{margin:'0 0 26px',fontSize:'20px',color:'#65758a'}}>Escolha seu perfil de acesso.</p>
      <div style={{height:'1px',background:'#dbe7f3',marginBottom:'24px'}} />

      <label style={{display:'block',marginBottom:'24px'}}>
        <span style={{display:'block',fontWeight:900,fontSize:'15px',textTransform:'uppercase',letterSpacing:'.06em',color:'#061b34',marginBottom:'12px'}}>Usuário</span>
        <div style={{position:'relative',height:'54px'}}>
          <UserRound size={21} style={{position:'absolute',left:'18px',top:'50%',transform:'translateY(-50%)',color:'#12345a',pointerEvents:'none',zIndex:2}} />
          <select value={selected} onChange={e=>setSelected(e.target.value)} style={{
            width:'100%',
            height:'54px',
            border:'1px solid #cbd8e6',
            borderRadius:'12px',
            padding:'0 54px 0 58px',
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
          }}>
            {ACCESS_USERS.map(u=><option key={u.name} value={u.name}>{u.name} — {u.role}</option>)}
          </select>
          <span style={{position:'absolute',right:'18px',top:'50%',transform:'translateY(-50%)',color:'#061b34',fontSize:'24px',lineHeight:1,pointerEvents:'none'}}>⌄</span>
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
          <CheckCircle2 size={30} color="#0b7cff" />
        </div>
        <div>
          <b style={{display:'block',fontSize:'22px',color:'#061b34',marginBottom:'6px',fontWeight:900}}>{user.role}</b>
          <span style={{fontSize:'16px',color:'#64748b'}}>{user.canViewDashboard ? 'Acesso completo, incluindo Dashboard executivo.' : 'Acesso operacional, sem Dashboard executivo.'}</span>
        </div>
      </div>

      <button className="saveBtn" onClick={()=>onLogin(user)} style={{
        width:'100%',
        justifyContent:'center',
        minHeight:'58px',
        borderRadius:'14px',
        fontSize:'20px',
        fontWeight:900,
        background:'linear-gradient(135deg,#0078ff 0%,#005eea 100%)',
        boxShadow:'0 12px 24px rgba(0,110,255,.20)'
      }}>Entrar →</button>

      <div style={{height:'1px',background:'#dbe7f3',margin:'28px 0 18px'}} />
      <p style={{display:'flex',alignItems:'center',gap:'14px',fontSize:'15px',color:'#64748b',margin:0}}>
        <Lock size={19} /> Controle provisório de perfis. A segurança real será feita na etapa Supabase Auth.
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
      --ux-blue:#0b7cff;
      --ux-blue-soft:#eef6ff;
      --ux-shadow:0 12px 34px rgba(15,23,42,.07);
      --ux-radius:18px;
    }
    body{background:var(--ux-bg)!important;}
    .app{grid-template-columns:80px minmax(0,1fr)!important;background:var(--ux-bg)!important;}
    .sidebar{width:80px!important;min-width:80px!important;padding:18px 12px!important;border-right:1px solid var(--ux-border)!important;background:#ffffff!important;box-shadow:8px 0 28px rgba(15,23,42,.04)!important;align-items:center!important;}
    .brand{height:48px!important;display:grid!important;place-items:center!important;margin-bottom:18px!important;padding:0!important;}
    .brandLogo{max-width:44px!important;max-height:44px!important;object-fit:contain!important;}
    .sidebar nav{width:100%!important;display:flex!important;flex-direction:column!important;gap:10px!important;align-items:center!important;}
    .sidebar nav button{width:52px!important;height:52px!important;min-height:52px!important;padding:0!important;display:grid!important;place-items:center!important;border-radius:16px!important;position:relative!important;color:#64748b!important;background:transparent!important;border:1px solid transparent!important;transition:all .18s ease!important;}
    .sidebar nav button svg{width:21px!important;height:21px!important;margin:0!important;}
    .sidebar nav button:hover{background:var(--ux-blue-soft)!important;color:var(--ux-blue)!important;transform:translateY(-1px)!important;}
    .sidebar nav button.active{background:linear-gradient(135deg,#0b7cff 0%,#005eea 100%)!important;color:#fff!important;box-shadow:0 10px 22px rgba(11,124,255,.24)!important;}
    .sidebar nav button::after{content:attr(data-label);position:absolute;left:64px;top:50%;transform:translateY(-50%);background:#0f172a;color:#fff;font-size:13px;font-weight:700;padding:8px 10px;border-radius:10px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s ease, transform .15s ease;z-index:50;box-shadow:0 10px 24px rgba(15,23,42,.18);}
    .sidebar nav button:hover::after{opacity:1;transform:translateY(-50%) translateX(4px);}
    .navLabel{display:none!important;}
    .sidebarBox{width:52px!important;height:52px!important;margin-top:auto!important;padding:0!important;border-radius:50%!important;display:grid!important;place-items:center!important;background:#f1f6fd!important;border:1px solid var(--ux-border)!important;overflow:hidden!important;position:relative!important;}
    .sidebarBox b{font-size:0!important;}
    .sidebarBox b::after{content:'DS';font-size:15px;font-weight:900;color:#0b7cff;}
    .sidebarBox span{display:none!important;}
    .main{padding:22px 28px 32px!important;min-width:0!important;}
    .topbar{background:rgba(255,255,255,.9)!important;backdrop-filter:blur(14px)!important;border:1px solid var(--ux-border)!important;border-radius:24px!important;padding:18px 20px!important;margin-bottom:22px!important;box-shadow:var(--ux-shadow)!important;align-items:center!important;gap:18px!important;}
    .uxHeaderTitle{min-width:260px!important;}
    .uxHeaderTitle h1{font-size:26px!important;line-height:1.02!important;letter-spacing:-.04em!important;color:var(--ux-text)!important;margin:0!important;font-weight:900!important;}
    .uxHeaderTitle p{margin:5px 0 0!important;color:var(--ux-muted)!important;font-size:14px!important;font-weight:600!important;}
    .uxEyebrow{display:inline-flex!important;align-items:center!important;gap:6px!important;color:var(--ux-blue)!important;background:var(--ux-blue-soft)!important;border:1px solid #d8ebff!important;border-radius:999px!important;padding:5px 10px!important;font-size:12px!important;font-weight:900!important;margin-bottom:8px!important;}
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
    .column{min-width:205px!important;width:205px!important;padding:12px!important;border-radius:18px!important;border:1px solid var(--ux-border)!important;background:#fff!important;box-shadow:0 8px 20px rgba(15,23,42,.04)!important;}
    .column h3{font-size:13px!important;line-height:1.2!important;margin-bottom:10px!important;gap:6px!important;}
    .column h3 small{width:24px!important;height:24px!important;min-width:24px!important;font-size:12px!important;}
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
  const [currentUser,setCurrentUser] = useStore('dsh-v1-current-user', null);
  const [companies,setCompanies] = useCompanies();
  const [contacts,setContacts] = useContacts();
  const [deals,setDeals] = useDeals();
  const [activities,setActivities] = useActivities();
  const [notes,setNotes] = useStore('dsh-v1-notes', initialNotes);
  const [interactions,setInteractions] = useStore('dsh-v1-interactions', initialInteractions);
  const [contracts,setContracts] = useStore('dsh-v1-contracts', initialContracts);
  const [products,setProducts] = useProducts();
  const [pipedriveImportMeta,setPipedriveImportMeta] = useStore('dsh-v1-pipedrive-import-meta', null);
  const [stages,setStages] = useStore('dsh-v1-stages', STAGES);
  const [selectedDealId,setSelectedDealId] = useState(null);
  const [selectedCompanyId,setSelectedCompanyId] = useState(null);
  const [selectedContactId,setSelectedContactId] = useState(null);
  const [selectedActivityId,setSelectedActivityId] = useState(null);
  const [selectedProductName,setSelectedProductName] = useState(null);

  if(!currentUser) return <LoginScreen onLogin={setCurrentUser}/>;
  const selectedDeal = byId(deals, selectedDealId);
  const selectedCompany = byId(companies, selectedCompanyId);
  const selectedContact = byId(contacts, selectedContactId);
  const selectedActivity = byId(activities, selectedActivityId);
  const isCEO = currentUser?.canViewDashboard === true;
  const allMenu = [
    ['dashboard','Dashboard',LayoutDashboard], ['pipeline','Pipeline',KanbanSquare], ['deals','Oportunidades',BriefcaseBusiness],
    ['contracts','Contratos',CheckCircle2], ['activities','Atividades',CalendarDays], ['companies','Empresas',Building2], ['contacts','Contatos',Users], ['products','Produtos',Sparkles], ['imports','Importação',Filter], ['matrix','Matriz Daleth',Sparkles]
  ];
  const menu = isCEO ? allMenu : allMenu.filter(([id]) => !['dashboard','imports'].includes(id));
  const activePage = (!isCEO && page === 'dashboard') ? 'deals' : page;
  const pendingActivities = activities.filter(a => a.status !== 'Concluída');
  const overdueCount = pendingActivities.filter(a => a.dueDate && a.dueDate < today()).length;
  const meetingsTodayCount = pendingActivities.filter(a => a.dueDate === today() && String(a.type || '').toLowerCase().includes('reuni')).length;
  const proposalsWithoutFollowup = deals.filter(d =>
    d.stage === 'Proposta Enviada' &&
    !pendingActivities.some(a => sameId(a.dealId, d.id) && a.dueDate && a.dueDate >= today())
  ).length;
  const alertTotal = overdueCount + meetingsTodayCount + proposalsWithoutFollowup;
  const alertText = `${overdueCount} atividades vencidas · ${proposalsWithoutFollowup} propostas sem follow-up · ${meetingsTodayCount} reuniões hoje`;
  const context = { currentUser, companies,setCompanies,contacts,setContacts,deals,setDeals,activities,setActivities,notes,setNotes,interactions,setInteractions,contracts,setContracts,products,setProducts,pipedriveImportMeta,setPipedriveImportMeta,stages,setStages,setSelectedDealId,setSelectedCompanyId,setSelectedContactId,setSelectedActivityId,setSelectedProductName,query };
  const navigate = (id) => {
    setPage(id);
    setQuery('');
    setSelectedDealId(null);
    setSelectedCompanyId(null);
    setSelectedContactId(null);
    setSelectedActivityId(null);
    setSelectedProductName(null);
  };
  return <div className="app">
    <UXStyle/>
    <aside className="sidebar">
      <div className="brand"><img className="brandLogo" src="/daleth-logo.svg" alt="Daleth Sales Hub" /></div>
      <nav>{menu.map(([id,label,Icon]) => <button key={id} title={label} aria-label={label} data-label={label} className={activePage===id?'active':''} onClick={()=>navigate(id)}><Icon size={18}/><span className="navLabel">{label}</span></button>)}</nav>
      <div className="sidebarBox"><b>Perfil ativo</b><span>{currentUser.name} · {currentUser.role}</span></div>
    </aside>
    <main className="main">
      <header className="topbar uxTopbar"><div className="uxHeaderTitle"><span className="uxEyebrow">{menu.find(m=>m[0]===activePage)?.[1] || 'Workspace'}</span><h1>Daleth Sales Hub</h1><p>Customer Acquisition Platform</p></div><div className="topActions"><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar empresas, contatos e oportunidades..."/></div><div className="notification"><BellRing size={18}/><span>{alertTotal}</span><div><b>Alertas comerciais</b><small>{alertText}</small></div></div><div className="notification" style={{minWidth:'150px'}}><UserRound size={18}/><div><b>{currentUser.name}</b><small>{currentUser.role}</small></div></div><button className="mini" onClick={()=>{ setQuery(''); setSelectedDealId(null); setSelectedProductName(null); setCurrentUser(null); }}><X size={15}/>Sair</button></div></header>
      {selectedDeal ? <DealDetailPage deal={selectedDeal} {...context} onBack={()=>setSelectedDealId(null)}/> : (query.trim() ? <GlobalSearch {...context}/> : <>
        {activePage==='dashboard' && isCEO && <Dashboard {...context}/>} {activePage==='pipeline' && <Pipeline {...context}/>} {activePage==='deals' && <Deals {...context}/>} {activePage==='contracts' && <Contracts {...context}/>} {activePage==='activities' && <Activities {...context}/>} {activePage==='companies' && <Companies {...context}/>} {activePage==='contacts' && <Contacts {...context}/>} {activePage==='products' && <Products {...context}/>} {activePage==='imports' && isCEO && <PipedriveImport {...context}/>} {activePage==='matrix' && <Matrix {...context}/>}    
      </>)}
    </main>
    {selectedCompany && <CompanyModal company={selectedCompany} companies={companies} setCompanies={setCompanies} contacts={contacts} setSelectedContactId={setSelectedContactId} onClose={()=>setSelectedCompanyId(null)}/>}
    {selectedContact && <ContactModal contact={selectedContact} contacts={contacts} setContacts={setContacts} companies={companies} setSelectedCompanyId={setSelectedCompanyId} onClose={()=>setSelectedContactId(null)}/>}
    {selectedActivity && <ActivityModal activity={selectedActivity} activities={activities} setActivities={setActivities} deals={deals} onClose={()=>setSelectedActivityId(null)}/>}  
    {selectedProductName && <ProductInfoModal product={selectedProductName} onClose={()=>setSelectedProductName(null)}/>}
  </div>;
}


function GlobalSearch({query,companies,contacts,deals,activities,contracts,setSelectedDealId,setSelectedCompanyId,setSelectedContactId,setSelectedActivityId}){
  const q = query.trim().toLowerCase();
  const includes = (...values) => values.join(' ').toLowerCase().includes(q);
  const companyResults = companies.filter(c => includes(c.name,c.segment,c.site,c.status,c.notes)).slice(0,8);
  const contactResults = contacts.filter(c => includes(c.name,c.role,c.email,c.phone,c.whatsapp,c.notes)).slice(0,8);
  const dealResults = deals.filter(d => includes(d.title,d.product,d.owner,d.stage,d.description,d.nextStep)).slice(0,12);
  const contractResults = contracts.filter(c => {
    const company = byId(companies,c.companyId);
    return includes(company?.name,c.product,c.owner,c.status,c.notes);
  }).slice(0,8);
  const activityResults = activities.filter(a => includes(a.title,a.type,a.owner,a.status,a.notes)).slice(0,8);
  const total = companyResults.length + contactResults.length + dealResults.length + contractResults.length + activityResults.length;
  return <>
    <Panel title={`Busca no CRM: ${query}`}>
      <p className="muted">Resultados encontrados nas principais áreas do Sales Hub. Clique em “Abrir” para visualizar a oportunidade.</p>
      {!total && <p className="muted">Nenhum resultado encontrado.</p>}
    </Panel>
    <section className="grid2 compact">
      <Panel title="Oportunidades">
        <DashboardTable headers={['Oportunidade','Empresa','Etapa','Valor total','Ações']}>
          {dealResults.length ? dealResults.map(d=><tr key={d.id}><td><b>{d.title}</b><span>{d.product}</span></td><td>{byId(companies,d.companyId)?.name || '-'}</td><td>{d.stage}</td><td>{moneyShort(dealTcv(d))}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedDealId(d.id)}}><Edit3 size={15}/>Abrir</button></td></tr>) : <tr><td>Nenhuma oportunidade</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
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
        <DashboardTable headers={['Cliente','Produto','Receita mensal','Status']}>
          {contractResults.length ? contractResults.map(c=>{ const company = byId(companies,c.companyId); return <tr key={c.id}><td><b>{company?.name || 'Sem cliente'}</b></td><td>{c.product}</td><td>{moneyShort(contractMrr(c))}</td><td>{c.status}</td></tr> }) : <tr><td>Nenhum contrato</td><td>-</td><td>-</td><td>-</td></tr>}
        </DashboardTable>
      </Panel>
    </section>
    <Panel title="Atividades">
      <DashboardTable headers={['Atividade','Tipo','Data','Responsável','Ações']}>
        {activityResults.length ? activityResults.map(a=><tr key={a.id} onClick={()=>setSelectedActivityId(a.id)} style={{cursor:'pointer'}}><td><b>{a.title}</b><span>{a.notes}</span></td><td>{a.type}</td><td>{formatDate(a.dueDate)}</td><td>{a.owner || '-'}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedActivityId(a.id)}}><Edit3 size={15}/>Abrir</button></td></tr>) : <tr><td>Nenhuma atividade</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
      </DashboardTable>
    </Panel>
  </>;
}

function Dashboard({deals,companies,contacts,activities,contracts,interactions,setSelectedDealId,setSelectedActivityId}){
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

  const stageRows = STAGES.map(stage => {
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
    .sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)))
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
      {selectedSummary === 'pending' && <DashboardTable headers={['Atividade','Oportunidade','Data','Responsável','Ações']}>
        {pending.length ? pending.slice().sort((a,b)=>String(a.dueDate || '').localeCompare(String(b.dueDate || ''))).slice(0,12).map(a=>{
          const deal = byId(deals,a.dealId);
          return <tr key={a.id} onClick={()=>setSelectedActivityId?.(a.id)} style={{cursor:'pointer'}}><td><b>{a.title}</b><span>{a.type}</span></td><td>{deal?.title || '-'}</td><td>{formatDate(a.dueDate)}</td><td>{a.owner || '-'}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedActivityId?.(a.id)}}><Edit3 size={15}/>Abrir</button></td></tr>
        }) : <tr><td>Nenhuma atividade pendente</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
      </DashboardTable>}
      {selectedSummary === 'activeContracts' && <DashboardTable headers={['Cliente','Produto','Receita mensal','Término','Tempo restante']}>
        {activeContracts.length ? activeContracts.slice().sort((a,b)=>contractMrr(b)-contractMrr(a)).slice(0,12).map(c=>{
          const company = byId(companies,c.companyId);
          return <tr key={c.id}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.notes}</span></td><td>{c.product || '-'}</td><td>{moneyShort(contractMrr(c))}</td><td>{formatDate(c.endDate)}</td><td>{monthsRemaining(c.endDate)} meses</td></tr>
        }) : <tr><td>Nenhum contrato ativo</td><td>-</td><td>{moneyShort(0)}</td><td>-</td><td>-</td></tr>}
      </DashboardTable>}
      {selectedSummary === 'expiring90' && <DashboardTable headers={['Cliente','Produto','Término','Tempo restante','Receita mensal']}>
        {expiring90.length ? expiring90.slice().sort((a,b)=>String(a.endDate || '').localeCompare(String(b.endDate || ''))).map(c=>{
          const company = byId(companies,c.companyId);
          return <tr key={c.id}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.notes}</span></td><td>{c.product || '-'}</td><td>{formatDate(c.endDate)}</td><td>{monthsRemaining(c.endDate)} meses</td><td>{moneyShort(contractMrr(c))}</td></tr>
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
        <DashboardTable headers={['Atividade','Oportunidade','Vencimento','Responsável','Ações']}>
          {overdueActivities.length ? overdueActivities.map(a=>{
            const deal = byId(deals,a.dealId);
            return <tr key={a.id} onClick={()=>setSelectedActivityId?.(a.id)} style={{cursor:'pointer'}} title="Clique para abrir esta atividade"><td><b>{a.title}</b><span>{a.type}</span></td><td>{deal?.title || '-'}</td><td><b style={{color:'#dc2626'}}>{formatDate(a.dueDate)}</b></td><td>{a.owner}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedActivityId?.(a.id)}}><Edit3 size={15}/>Abrir</button></td></tr>
          }) : <tr><td>Nenhuma atividade vencida</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
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
    border: active ? '1px solid #0878ff' : '1px solid #edf2f7',
    background: active ? 'linear-gradient(180deg,#eef7ff 0%,#ffffff 100%)' : 'linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)',
    borderRadius:'18px',
    padding:'14px',
    minHeight:'86px',
    cursor:onClick ? 'pointer' : 'default',
    boxShadow: active ? '0 12px 28px rgba(8,120,255,.14)' : 'none',
    transform: active ? 'translateY(-1px)' : 'none',
    transition:'all .18s ease'
  }}>
    <div style={{display:'flex',alignItems:'center',gap:'8px',color:'#0878ff',marginBottom:'10px'}}>
      <Icon size={17}/>
      <span style={{fontSize:'12px',fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</span>
    </div>
    <strong style={{fontSize:'22px',letterSpacing:'-.03em',color:'#061b34'}}>{value}</strong>
  </div>;
}
function Panel({title,children}){ return <section className="panel"><h2>{title}</h2>{children}</section>; }
function DashboardTable({headers,children}){ return <div className="tableWrap dashboardTable"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }

function Pipeline({stages,setStages,deals,setDeals,companies,setSelectedDealId}){
  const [newStage,setNewStage] = useState('');
  const [selectedStage,setSelectedStage] = useState(null);
  const move = (deal, stage) => setDeals(deals.map(d => sameId(d.id,deal.id) ? {...d, stage} : d));
  const stageDeals = selectedStage ? deals.filter(d=>d.stage===selectedStage) : [];
  return <>
    <div className="toolbar"><input placeholder="Nova etapa customizável" value={newStage} onChange={e=>setNewStage(e.target.value)}/><button onClick={()=>{ if(newStage.trim()){ setStages([...stages,newStage.trim()]); setNewStage(''); }}}><Plus size={16}/>Adicionar etapa</button></div>
    <section className="kanban">{stages.map(stage => <div className="column" key={stage}><h3 onClick={()=>setSelectedStage(stage)} style={{cursor:'pointer'}} title="Clique para listar as oportunidades desta etapa">{stage}<small>{deals.filter(d=>d.stage===stage).length}</small></h3>{deals.filter(d=>d.stage===stage).map(d => <article className="dealCard" key={d.id}><div onClick={()=>setSelectedDealId(d.id)}><b>{d.title}</b><span>{byId(companies,d.companyId)?.name || 'Sem empresa'}</span><strong>{money(dealTcv(d))}</strong></div><select value={d.stage} onChange={e=>move(d,e.target.value)}>{stages.map(s=><option key={s}>{s}</option>)}</select></article>)}</div>)}</section>
    {selectedStage && <Panel title={`Oportunidades em ${selectedStage}`}>
      <DashboardTable headers={['Oportunidade','Empresa','Responsável','Valor total','Ações']}>
        {stageDeals.length ? stageDeals.map(d=><tr key={d.id} onClick={()=>setSelectedDealId(d.id)} style={{cursor:'pointer'}}><td><b>{d.title}</b><span>{d.nextStep}</span></td><td>{byId(companies,d.companyId)?.name || '-'}</td><td>{d.owner || '-'}</td><td>{moneyShort(dealTcv(d))}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedDealId(d.id)}}><Edit3 size={15}/>Abrir</button></td></tr>) : <tr><td>Nenhuma oportunidade nesta etapa</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
      </DashboardTable>
      <button className="mini" onClick={()=>setSelectedStage(null)} style={{marginTop:'12px'}}><X size={15}/>Fechar lista</button>
    </Panel>}
  </>;
}

function Deals({deals,setDeals,companies,contacts,products,stages,setSelectedDealId,query}){
  const empty = { title:'', companyId:companies[0]?.id||'', contactId:'', product:'SAC+', value:0, setup:0, contractMonths:12, stage:stages[0], owner:'Sergio', probability:30, closeDate:'', description:'', nextStep:'', priority:'Média' };
  const [form,setFormBase] = useState(empty);
  const [filters,setFilters] = useState({ companyId:'', product:'', stage:'', owner:'' });
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
    return matchesQuery && matchesCompany && matchesProduct && matchesStage && matchesOwner;
  });
  const add = () => { if(!form.title.trim()) return; setDeals([{...form,id:Date.now(),value:Number(form.value),setup:Number(form.setup),contractMonths:Number(form.contractMonths||12),probability:Number(form.probability||30)},...deals]); setFormBase(empty); };
  const removeDeal = (id) => { if(!window.confirm('Deseja realmente excluir esta oportunidade?')) return; setDeals(deals.filter(d => !sameId(d.id,id))); };
  const clearFilters = () => setFilters({ companyId:'', product:'', stage:'', owner:'' });
  return <>
    <Panel title="Nova oportunidade"><div className="formGrid"><Input label="Título" field="title" form={form} setForm={setForm}/><Select label="Empresa" field="companyId" form={form} setForm={setForm} options={safeArray(companies).map(c=>[c.id,c.name])}/><Select label="Contato" field="contactId" form={form} setForm={setForm} options={[["", availableContacts.length ? "Selecione" : "Sem contatos desta empresa"],...availableContacts.map(c=>[c.id,c.name])]}/><Select label="Produto" field="product" form={form} setForm={setForm} options={safeArray(products).map(p=>[p,p])}/><Input label="Receita mensal" field="value" form={form} setForm={setForm} type="number"/><Input label="Implantação" field="setup" form={form} setForm={setForm} type="number"/><Input label="Prazo contratual (meses)" field="contractMonths" form={form} setForm={setForm} type="number"/><Input label="Probabilidade %" field="probability" form={form} setForm={setForm} type="number"/><Select label="Etapa" field="stage" form={form} setForm={setForm} options={safeArray(stages).map(s=>[s,s])}/><Select label="Responsável" field="owner" form={form} setForm={setForm} options={USERS.map(u=>[u,u])}/><Input label="Fechamento previsto" field="closeDate" form={form} setForm={setForm} type="date"/><label><span>Valor total do contrato</span><input value={money(dealTcv(form))} readOnly/></label><button className="saveBtn" onClick={add}><Plus size={16}/>Criar oportunidade</button></div></Panel>
    <Panel title="Filtros de oportunidades"><div className="formGrid">
      <Select label="Empresa" field="companyId" form={filters} setForm={setFilters} options={[["","Todas"],...safeArray(companies).map(c=>[c.id,c.name])]}/>
      <Select label="Produto" field="product" form={filters} setForm={setFilters} options={[["","Todos"],...safeArray(products).map(p=>[p,p])]}/>
      <Select label="Etapa" field="stage" form={filters} setForm={setFilters} options={[["","Todas"],...safeArray(stages).map(s=>[s,s])]}/>
      <Select label="Responsável" field="owner" form={filters} setForm={setFilters} options={[["","Todos"],...USERS.map(u=>[u,u])]}/>
      <button className="saveBtn" onClick={clearFilters}><Filter size={16}/>Limpar filtros</button>
    </div></Panel>
    <Panel title={`Oportunidades (${list.length})`}><Table headers={['Oportunidade','Empresa','Produto','Receita mensal','Prazo','Valor total','Etapa','Responsável','Ações']}>{list.map(d=><tr key={d.id} onClick={()=>setSelectedDealId(d.id)} style={{cursor:'pointer'}}><td><b>{d.title}</b><span>{d.nextStep}</span></td><td>{byId(companies,d.companyId)?.name}</td><td>{d.product}</td><td>{money(dealMrr(d))}</td><td>{dealMonths(d)} meses</td><td><b>{money(dealTcv(d))}</b></td><td><span className="pill">{d.stage}</span></td><td>{d.owner}</td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedDealId(d.id)}}><Edit3 size={15}/>Abrir</button><button className="mini" onClick={(e)=>{e.stopPropagation(); removeDeal(d.id)}}><Trash2 size={15}/>Excluir</button></div></td></tr>)}</Table></Panel>
  </>;
}

function DealDetailPage({deal,onBack,currentUser,companies=[],contacts=[],deals=[],setDeals,activities=[],setActivities,notes=[],setNotes,interactions=[],setInteractions,contracts=[],setContracts,products=INITIAL_PRODUCTS,stages=STAGES,setSelectedCompanyId,setSelectedContactId,setSelectedProductName}){
  const [tab,setTab] = useState('dados');
  const [draft,setDraft] = useState({contractMonths:12, setup:0, probability:30, ...deal});
  const [note,setNote] = useState('');
  const [activity,setActivity] = useState({type:'Follow-up',title:'',dueDate:today(),owner:deal.owner || currentUser?.name || 'Sergio',status:'Pendente',notes:''});
  const [interaction,setInteraction] = useState({type:'Ligação',dateTime:new Date().toISOString().slice(0,16),owner:currentUser?.name || deal.owner || 'Sergio',description:'',nextAction:'',nextDueDate:''});

  const company = byId(companies, deal.companyId);
  const contact = byId(contacts, deal.contactId);
  const dealNotes = safeArray(notes).filter(n=>sameId(n.dealId, deal.id));
  const dealActivities = safeArray(activities).filter(a=>sameId(a.dealId, deal.id));
  const dealInteractions = safeArray(interactions).filter(i=>sameId(i.dealId, deal.id));

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

  const save = () => {
    setDeals(deals.map(d=>sameId(d.id,deal.id) ? {...draft,value:Number(draft.value),setup:Number(draft.setup),contractMonths:Number(draft.contractMonths||12),probability:Number(draft.probability||30)} : d));
    window.alert('Alterações salvas.');
  };
  const addNote = () => { if(!note.trim()) return; setNotes([{id:Date.now(),dealId:deal.id,user:currentUser?.name || 'Sergio',date:today(),text:note},...notes]); setNote(''); };
  const addActivity = () => { if(!activity.title.trim()) return; setActivities([{...activity,id:Date.now(),dealId:deal.id},...activities]); setActivity({...activity,title:'',notes:''}); };
  const addInteraction = () => {
    if(!interaction.description.trim()) return;
    setInteractions([{...interaction,id:Date.now(),dealId:deal.id,createdAt:new Date().toISOString()},...safeArray(interactions)]);
    if(interaction.nextAction.trim()){
      setDeals(deals.map(d=>sameId(d.id,deal.id) ? {...d,nextStep:interaction.nextAction} : d));
      setDraft({...draft,nextStep:interaction.nextAction});
    }
    setInteraction({type:'Ligação',dateTime:new Date().toISOString().slice(0,16),owner:currentUser?.name || deal.owner || 'Sergio',description:'',nextAction:'',nextDueDate:''});
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
            <button className="mini" onClick={()=>openLinkedEntity(setSelectedCompanyId, deal.companyId)} disabled={!company}>{company?.name || 'Sem empresa'}</button>
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

    <div className="tabs" style={{marginBottom:'18px'}}>{['dados','historico','atividades','contrato','matriz'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t === 'dados' ? 'Dados' : t === 'historico' ? 'Histórico' : t === 'atividades' ? 'Atividades' : t === 'contrato' ? 'Contrato' : 'Matriz'}</button>)}</div>

    {tab==='dados' && <Panel title="Dados da oportunidade"><div className="formGrid modalGrid"><Input label="Título" field="title" form={draft} setForm={setDraft}/><Select label="Etapa" field="stage" form={draft} setForm={setDraft} options={safeArray(stages).map(s=>[s,s])}/><Select label="Responsável" field="owner" form={draft} setForm={setDraft} options={USERS.map(u=>[u,u])}/><Select label="Produto" field="product" form={draft} setForm={setDraft} options={safeArray(products).map(p=>[p,p])}/><Input label="Receita mensal" field="value" form={draft} setForm={setDraft} type="number"/><Input label="Implantação" field="setup" form={draft} setForm={setDraft} type="number"/><Input label="Prazo contratual (meses)" field="contractMonths" form={draft} setForm={setDraft} type="number"/><Input label="Probabilidade %" field="probability" form={draft} setForm={setDraft} type="number"/><Input label="Fechamento previsto" field="closeDate" form={draft} setForm={setDraft} type="date"/><Input label="Próximo passo" field="nextStep" form={draft} setForm={setDraft}/><label><span>Valor total do contrato</span><input value={money(dealTcv(draft))} readOnly/></label><label><span>Receita anualizada</span><input value={money(dealArr(draft))} readOnly/></label><Textarea label="Descrição" field="description" form={draft} setForm={setDraft}/><button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button></div></Panel>}

    {tab==='historico' && <>
      <Panel title="Nova interação"><div className="formGrid modalGrid">
        <Select label="Tipo" field="type" form={interaction} setForm={setInteraction} options={['Ligação','Reunião','E-mail','WhatsApp','Anotação'].map(x=>[x,x])}/>
        <Input label="Data e hora" field="dateTime" form={interaction} setForm={setInteraction} type="datetime-local"/>
        <Select label="Responsável" field="owner" form={interaction} setForm={setInteraction} options={USERS.map(u=>[u,u])}/>
        <Input label="Próxima ação" field="nextAction" form={interaction} setForm={setInteraction}/>
        <Input label="Prazo da próxima ação" field="nextDueDate" form={interaction} setForm={setInteraction} type="date"/>
        <Textarea label="Descrição da tratativa" field="description" form={interaction} setForm={setInteraction}/>
        <button className="saveBtn" onClick={addInteraction}><MessageSquare size={16}/>Registrar interação</button>
      </div></Panel>
      <Panel title="Linha do tempo da oportunidade">
        <div className="timeline">{timeline.length ? timeline.map(item=><div className="timelineItem" key={item.id}><b>{interactionIcon(item.type)} {item.type}</b><span>{formatDateTime(item.date)} · {item.owner}</span><p>{item.description}</p>{item.nextAction && <p><b>Próxima ação:</b> {item.nextAction}{item.nextDueDate ? ` · Prazo: ${formatDate(item.nextDueDate)}` : ''}</p>}</div>) : <p className="muted">Nenhuma tratativa registrada ainda.</p>}</div>
      </Panel>
    </>}

    {tab==='atividades' && <Panel title="Atividades da oportunidade"><div className="formGrid"><Select label="Tipo" field="type" form={activity} setForm={setActivity} options={['Follow-up','Ligação','E-mail','WhatsApp','Reunião','Proposta'].map(x=>[x,x])}/><Input label="Título" field="title" form={activity} setForm={setActivity}/><Input label="Data" field="dueDate" form={activity} setForm={setActivity} type="date"/><Select label="Responsável" field="owner" form={activity} setForm={setActivity} options={USERS.map(u=>[u,u])}/><Textarea label="Observações" field="notes" form={activity} setForm={setActivity}/><button className="saveBtn" onClick={addActivity}><Plus size={16}/>Criar atividade</button></div><div className="timeline">{dealActivities.map(a=><div className="timelineItem" key={a.id}><b>{a.type}: {a.title}</b><span>{formatDate(a.dueDate)} · {a.owner} · {a.status}</span><p>{a.notes}</p></div>)}</div></Panel>}

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
  const [tab,setTab] = useState('geral');
  const [draft,setDraft] = useState({contractMonths:12, setup:0, probability:30, ...deal});
  const [note,setNote] = useState('');
  const [activity,setActivity] = useState({type:'Follow-up',title:'',dueDate:today(),owner:deal.owner,status:'Pendente',notes:''});
  const save = () => { setDeals(deals.map(d=>sameId(d.id,deal.id) ? {...draft,value:Number(draft.value),setup:Number(draft.setup),contractMonths:Number(draft.contractMonths||12),probability:Number(draft.probability||30)} : d)); onClose(); };
  const addNote = () => { if(!note.trim()) return; setNotes([{id:Date.now(),dealId:deal.id,user:'Sergio',date:today(),text:note},...notes]); setNote(''); };
  const addActivity = () => { if(!activity.title.trim()) return; setActivities([{...activity,id:Date.now(),dealId:deal.id},...activities]); setActivity({...activity,title:'',notes:''}); };
  const dealNotes = notes.filter(n=>String(n.dealId)===String(deal.id));
  const dealActivities = activities.filter(a=>String(a.dealId)===String(deal.id));
  return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><div><h2>{deal.title}</h2><span>{byId(companies,deal.companyId)?.name} · Receita mensal {money(dealMrr(deal))} · Valor total {money(dealTcv(deal))}</span></div><button className="iconBtn" onClick={onClose}><X/></button></div><div className="tabs">{['geral','timeline','atividades','matriz'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</div>
    {tab==='geral' && <div className="formGrid modalGrid"><Input label="Título" field="title" form={draft} setForm={setDraft}/><Select label="Etapa" field="stage" form={draft} setForm={setDraft} options={safeArray(stages).map(s=>[s,s])}/><Select label="Responsável" field="owner" form={draft} setForm={setDraft} options={USERS.map(u=>[u,u])}/><Select label="Produto" field="product" form={draft} setForm={setDraft} options={safeArray(products).map(p=>[p,p])}/><Input label="Receita mensal" field="value" form={draft} setForm={setDraft} type="number"/><Input label="Implantação" field="setup" form={draft} setForm={setDraft} type="number"/><Input label="Prazo contratual (meses)" field="contractMonths" form={draft} setForm={setDraft} type="number"/><Input label="Probabilidade %" field="probability" form={draft} setForm={setDraft} type="number"/><Input label="Fechamento previsto" field="closeDate" form={draft} setForm={setDraft} type="date"/><Input label="Próximo passo" field="nextStep" form={draft} setForm={setDraft}/><label><span>Valor total do contrato</span><input value={money(dealTcv(draft))} readOnly/></label><label><span>Receita anualizada</span><input value={money(dealArr(draft))} readOnly/></label><Textarea label="Descrição" field="description" form={draft} setForm={setDraft}/><button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button></div>}
    {tab==='timeline' && <div><div className="noteBox"><textarea placeholder="Adicionar comentário, registro de reunião, ligação, WhatsApp..." value={note} onChange={e=>setNote(e.target.value)}></textarea><button onClick={addNote}><MessageSquare size={16}/>Adicionar comentário</button></div><div className="timeline">{dealNotes.map(n=><div className="timelineItem" key={n.id}><b>{n.user || n.userName || n.user_name || 'Daleth'}</b><span>{formatDate(n.date || n.noteDate || n.note_date)}</span><p>{n.text || n.note || ''}</p></div>)}</div></div>}
    {tab==='atividades' && <div><div className="formGrid"><Select label="Tipo" field="type" form={activity} setForm={setActivity} options={['Follow-up','Ligação','E-mail','WhatsApp','Reunião','Proposta'].map(x=>[x,x])}/><Input label="Título" field="title" form={activity} setForm={setActivity}/><Input label="Data" field="dueDate" form={activity} setForm={setActivity} type="date"/><Select label="Responsável" field="owner" form={activity} setForm={setActivity} options={USERS.map(u=>[u,u])}/><button className="saveBtn" onClick={addActivity}><Plus size={16}/>Criar atividade</button></div><div className="timeline">{dealActivities.map(a=><div className="timelineItem" key={a.id}><b>{a.type}: {a.title}</b><span>{formatDate(a.dueDate)} · {a.owner} · {a.status}</span><p>{a.notes}</p></div>)}</div></div>}
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

function Activities({activities,setActivities,deals,query,setSelectedActivityId}){
  const list = activities.filter(a => (a.title+a.type+a.owner+a.status).toLowerCase().includes(query.toLowerCase()));
  const toggle = (id) => setActivities(activities.map(a=>sameId(a.id,id) ? {...a,status:a.status==='Concluída'?'Pendente':'Concluída'} : a));
  const removeActivity = (id) => { if(!window.confirm('Deseja realmente excluir esta atividade?')) return; setActivities(activities.filter(a => !sameId(a.id,id))); };
  return <Panel title="Atividades e follow-ups"><Table headers={['Status','Tipo','Atividade','Oportunidade','Data','Responsável','Ações']}>{list.map(a=><tr key={a.id} onClick={()=>setSelectedActivityId(a.id)} style={{cursor:'pointer'}}><td><button className="mini" onClick={(e)=>{e.stopPropagation(); toggle(a.id)}}>{a.status}</button></td><td>{a.type}</td><td><b>{a.title}</b><span>{a.notes}</span></td><td>{byId(deals,a.dealId)?.title}</td><td>{formatDate(a.dueDate)}</td><td>{a.owner}</td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedActivityId(a.id)}}><Edit3 size={15}/>Abrir</button><button className="mini" onClick={(e)=>{e.stopPropagation(); removeActivity(a.id)}}><Trash2 size={15}/>Excluir</button></div></td></tr>)}</Table></Panel>;
}

function Companies({companies,setCompanies,query,setSelectedCompanyId}){
  const empty = { name:'', segment:'', cnpj:'', site:'', status:'Prospect', phone:'', email:'', notes:'' };
  const [form,setForm] = useState(empty);
  const list = companies.filter(c => (c.name+c.segment+c.site+c.status).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));;
  const add = () => { if(!form.name.trim()) return; setCompanies([{...form,id:Date.now()},...companies]); setForm(empty); };
  const removeCompany = (id) => { if(!window.confirm('Deseja realmente excluir esta empresa?')) return; setCompanies(companies.filter(c => !sameId(c.id,id))); };
  return <><Panel title="Nova empresa"><div className="formGrid"><Input label="Nome fantasia" field="name" form={form} setForm={setForm}/><Input label="Segmento" field="segment" form={form} setForm={setForm}/><Input label="Site" field="site" form={form} setForm={setForm}/><Input label="CNPJ" field="cnpj" form={form} setForm={setForm}/><button className="saveBtn" onClick={add}><Plus size={16}/>Salvar empresa</button></div></Panel><Panel title="Empresas"><Table headers={['Empresa','Segmento','Site','Status','Ações']}>{list.map(c=><tr key={c.id} onClick={()=>setSelectedCompanyId(c.id)} style={{cursor:'pointer'}}><td><b>{c.name}</b><span>{c.notes}</span></td><td>{c.segment}</td><td>{c.site}</td><td><span className="pill">{c.status}</span></td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedCompanyId(c.id)}}><Edit3 size={15}/>Abrir</button><button className="mini" onClick={(e)=>{e.stopPropagation(); removeCompany(c.id)}}><Trash2 size={15}/>Excluir</button></div></td></tr>)}</Table></Panel></>;
}
function Contacts({contacts,setContacts,companies,query,setSelectedContactId}){
  const empty = { companyId:companies[0]?.id||'', name:'', role:'', email:'', phone:'', whatsapp:'', type:'Decisor', linkedin:'', notes:'' };
  const [form,setForm] = useState(empty);
  const list = contacts.filter(c => (c.name+c.role+c.email+c.phone+c.whatsapp).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
  const add = () => { if(!form.name.trim()) return; setContacts([{...form,id:Date.now()},...contacts]); setForm(empty); };
  const removeContact = (id) => { if(!window.confirm('Deseja realmente excluir este contato?')) return; setContacts(contacts.filter(c => !sameId(c.id,id))); };
  return <><Panel title="Novo contato"><div className="formGrid"><Input label="Nome" field="name" form={form} setForm={setForm}/><Select label="Empresa" field="companyId" form={form} setForm={setForm} options={safeArray(companies).map(c=>[c.id,c.name])}/><Input label="Cargo" field="role" form={form} setForm={setForm}/><Input label="E-mail" field="email" form={form} setForm={setForm}/><Input label="Telefone" field="phone" form={form} setForm={setForm}/><button className="saveBtn" onClick={add}><Plus size={16}/>Salvar contato</button></div></Panel><Panel title="Contatos"><Table headers={['Contato','Empresa','Cargo','E-mail','Telefone','Tipo','Ações']}>{list.map(c=><tr key={c.id} onClick={()=>setSelectedContactId(c.id)} style={{cursor:'pointer'}}><td><b>{c.name}</b></td><td>{byId(companies,c.companyId)?.name}</td><td>{c.role}</td><td>{c.email}</td><td>{c.phone}</td><td>{c.type}</td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><button className="mini" onClick={(e)=>{e.stopPropagation(); setSelectedContactId(c.id)}}><Edit3 size={15}/>Abrir</button><button className="mini" onClick={(e)=>{e.stopPropagation(); removeContact(c.id)}}><Trash2 size={15}/>Excluir</button></div></td></tr>)}</Table></Panel></>;
}

function Contracts({contracts,setContracts,deals,companies,products,query}){
  const empty = { companyId:companies[0]?.id||'', dealId:'', product:'SAC+', startDate:today(), endDate:addMonths(today(),12), mrr:0, setup:0, contractMonths:12, owner:'Sergio', status:'Ativo', notes:'' };
  const [form,setForm] = useState(empty);
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

  const add = () => {
    if(!form.companyId) return;
    const months = Number(form.contractMonths || 12);
    setContracts([{...form,id:Date.now(),mrr:Number(form.mrr),setup:Number(form.setup),contractMonths:months,endDate:form.endDate || addMonths(form.startDate, months)},...contracts]);
    setForm(empty);
  };
  const removeContract = (id) => { if(!window.confirm('Deseja realmente excluir este contrato?')) return; setContracts(contracts.filter(c => c.id !== id)); };
  const importWonDeals = () => {
    const existingDealIds = new Set(contracts.map(c=>String(c.dealId || '')));
    const newContracts = wonDeals
      .filter(d=>!existingDealIds.has(String(d.id)))
      .map(d=>({
        id: Date.now() + d.id,
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
    setContracts([...newContracts,...contracts]);
  };

  return <>
    <section className="cards">
      <Kpi icon={CircleDollarSign} label="Receita mensal contratada" value={moneyShort(totalMrr)}/>
      <Kpi icon={TrendingUp} label="Receita anualizada contratada" value={moneyShort(arr)}/>
      <Kpi icon={BriefcaseBusiness} label="Contratos ativos" value={active.length}/>
      <Kpi icon={AlertTriangle} label="Receita em risco 90 dias" value={moneyShort(risk90)}/>
    </section>

    <Panel title="Novo contrato"><div className="formGrid">
      <Select label="Cliente" field="companyId" form={form} setForm={setForm} options={safeArray(companies).map(c=>[c.id,c.name])}/>
      <Select label="Produto" field="product" form={form} setForm={setForm} options={safeArray(products).map(p=>[p,p])}/>
      <Input label="Início do contrato" field="startDate" form={form} setForm={setForm} type="date"/>
      <Input label="Término do contrato" field="endDate" form={form} setForm={setForm} type="date"/>
      <Input label="Receita mensal" field="mrr" form={form} setForm={setForm} type="number"/>
      <Input label="Implantação" field="setup" form={form} setForm={setForm} type="number"/>
      <Input label="Prazo contratual (meses)" field="contractMonths" form={form} setForm={setForm} type="number"/>
      <Select label="Responsável" field="owner" form={form} setForm={setForm} options={USERS.map(u=>[u,u])}/>
      <Select label="Status" field="status" form={form} setForm={setForm} options={['Ativo','Renovando','Encerrado','Suspenso'].map(s=>[s,s])}/>
      <button className="saveBtn" onClick={add}><Plus size={16}/>Criar contrato</button>
      <button className="saveBtn" onClick={importWonDeals}><CheckCircle2 size={16}/>Gerar contratos das oportunidades ganhas</button>
    </div></Panel>

    <section className="grid2 compact">
      <Panel title="Contratos vencendo em 90 dias">
        <DashboardTable headers={['Cliente','Término','Tempo restante','Receita mensal']}>
          {expiring90.length ? expiring90.sort((a,b)=>String(a.endDate).localeCompare(String(b.endDate))).map(c=>{
            const company = byId(companies,c.companyId);
            return <tr key={c.id}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.product}</span></td><td>{formatDate(c.endDate)}</td><td>{monthsRemaining(c.endDate)} meses</td><td>{moneyShort(contractMrr(c))}</td></tr>
          }) : <tr><td>Nenhum contrato vencendo</td><td>-</td><td>-</td><td>{moneyShort(0)}</td></tr>}
        </DashboardTable>
      </Panel>

      <Panel title="Carteira ativa por cliente">
        <DashboardTable headers={['Cliente','Status','Tempo restante','Receita mensal']}>
          {active.length ? active.slice().sort((a,b)=>contractMrr(b)-contractMrr(a)).slice(0,6).map(c=>{
            const company = byId(companies,c.companyId);
            return <tr key={c.id}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.product}</span></td><td><span className="pill">{contractStatus(c)}</span></td><td>{monthsRemaining(c.endDate)} meses</td><td>{moneyShort(contractMrr(c))}</td></tr>
          }) : <tr><td>Nenhum contrato ativo</td><td>-</td><td>-</td><td>{moneyShort(0)}</td></tr>}
        </DashboardTable>
      </Panel>
    </section>

    <Panel title="Todos os contratos"><Table headers={['Cliente','Produto','Início','Término','Tempo restante','Receita mensal','Valor total do contrato','Status','Responsável','Ações']}>
      {list.map(c=>{
        const company = byId(companies,c.companyId);
        return <tr key={c.id}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.notes}</span></td><td>{c.product}</td><td>{formatDate(c.startDate)}</td><td>{formatDate(c.endDate)}</td><td>{monthsRemaining(c.endDate)} meses</td><td>{moneyShort(contractMrr(c))}</td><td>{moneyShort(contractTcv(c))}</td><td><span className="pill">{contractStatus(c)}</span></td><td>{c.owner}</td><td><button className="mini" onClick={()=>removeContract(c.id)}><Trash2 size={15}/>Excluir</button></td></tr>
      })}
    </Table></Panel>
  </>;
}



function CompanyModal({company,onClose,companies,setCompanies,contacts=[],setSelectedContactId}){
  const [draft,setDraft] = useState({...company});
  const linkedContacts = safeArray(contacts).filter(c=>sameId(c.companyId, company.id));
  const save = () => { setCompanies(companies.map(c=>sameId(c.id,company.id) ? draft : c)); onClose(); };
  const openContact = (id) => {
    if(!setSelectedContactId) return;
    onClose();
    setSelectedContactId(id);
  };
  return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><div><h2>{company.name}</h2><span>Cadastro da empresa</span></div><button className="iconBtn" onClick={onClose}><X/></button></div>
    <div className="formGrid modalGrid"><Input label="Nome fantasia" field="name" form={draft} setForm={setDraft}/><Input label="Segmento" field="segment" form={draft} setForm={setDraft}/><Input label="CNPJ" field="cnpj" form={draft} setForm={setDraft}/><Input label="Site" field="site" form={draft} setForm={setDraft}/><Input label="Status" field="status" form={draft} setForm={setDraft}/><Input label="Telefone" field="phone" form={draft} setForm={setDraft}/><Input label="E-mail" field="email" form={draft} setForm={setDraft}/><Textarea label="Observações" field="notes" form={draft} setForm={setDraft}/><button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button></div>
    <Panel title={`Contatos vinculados (${linkedContacts.length})`}>
      <DashboardTable headers={['Contato','Cargo','E-mail','Telefone / WhatsApp','Tipo','Ações']}>
        {linkedContacts.length ? linkedContacts.map(c=><tr key={c.id} onClick={()=>openContact(c.id)} style={{cursor:'pointer'}}><td><b>{c.name}</b><span>{c.notes}</span></td><td>{c.role || '-'}</td><td>{c.email || '-'}</td><td>{c.whatsapp || c.phone || '-'}</td><td>{c.type || '-'}</td><td><button className="mini" onClick={(e)=>{e.stopPropagation(); openContact(c.id)}}><Edit3 size={15}/>Abrir contato</button></td></tr>) : <tr><td>Nenhum contato vinculado</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>}
      </DashboardTable>
    </Panel>
  </div></div>;
}

function ContactModal({contact,onClose,contacts,setContacts,companies,setSelectedCompanyId}){
  const [draft,setDraft] = useState({...contact});
  const company = byId(companies, draft.companyId);
  const save = () => { setContacts(contacts.map(c=>sameId(c.id,contact.id) ? draft : c)); onClose(); };
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
    <div className="formGrid modalGrid"><Input label="Nome" field="name" form={draft} setForm={setDraft}/><Select label="Empresa" field="companyId" form={draft} setForm={setDraft} options={safeArray(companies).map(c=>[c.id,c.name])}/><Input label="Cargo" field="role" form={draft} setForm={setDraft}/><Input label="E-mail" field="email" form={draft} setForm={setDraft}/><Input label="Telefone" field="phone" form={draft} setForm={setDraft}/><Input label="WhatsApp" field="whatsapp" form={draft} setForm={setDraft}/><Input label="LinkedIn" field="linkedin" form={draft} setForm={setDraft}/><Select label="Tipo" field="type" form={draft} setForm={setDraft} options={['Decisor','Influenciador','Usuário','Financeiro','Outros'].map(x=>[x,x])}/><Textarea label="Observações" field="notes" form={draft} setForm={setDraft}/><button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button></div>
  </div></div>;
}

function ActivityModal({activity,onClose,activities,setActivities,deals}){
  const [draft,setDraft] = useState({...activity});
  const save = () => { setActivities(activities.map(a=>sameId(a.id,activity.id) ? draft : a)); onClose(); };
  return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><div><h2>{activity.title}</h2><span>{byId(deals,activity.dealId)?.title || 'Atividade sem oportunidade vinculada'}</span></div><button className="iconBtn" onClick={onClose}><X/></button></div>
    <div className="formGrid modalGrid"><Select label="Status" field="status" form={draft} setForm={setDraft} options={['Pendente','Concluída'].map(x=>[x,x])}/><Select label="Tipo" field="type" form={draft} setForm={setDraft} options={['Follow-up','Ligação','E-mail','WhatsApp','Reunião','Proposta'].map(x=>[x,x])}/><Input label="Título" field="title" form={draft} setForm={setDraft}/><Select label="Oportunidade" field="dealId" form={draft} setForm={setDraft} options={[['','Sem oportunidade'],...safeArray(deals).map(d=>[d.id,d.title])]}/><Input label="Data" field="dueDate" form={draft} setForm={setDraft} type="date"/><Select label="Responsável" field="owner" form={draft} setForm={setDraft} options={USERS.map(u=>[u,u])}/><Textarea label="Observações" field="notes" form={draft} setForm={setDraft}/><button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button></div>
  </div></div>;
}


function ProductInfoModal({product,onClose}){
  return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><div><h2>{product}</h2><span>Cadastro de produto</span></div><button className="iconBtn" onClick={onClose}><X/></button></div>
    <Panel title="Dados do produto"><p className="muted">Produto cadastrado no Daleth Sales Hub. Os detalhes avançados de produto poderão ser ampliados em uma próxima sprint.</p><div className="formGrid modalGrid"><label><span>Nome do produto</span><input value={product} readOnly/></label></div></Panel>
  </div></div>;
}

function Products({products,setProducts,query}){
  const [name,setName] = useState('');
  const list = products.filter(p => p.toLowerCase().includes(query.toLowerCase()));
  const add = () => {
    const clean = name.trim();
    if(!clean) return;
    if(products.some(p => p.toLowerCase() === clean.toLowerCase())){
      window.alert('Este produto já está cadastrado.');
      return;
    }
    setProducts([...products, clean]);
    setName('');
  };
  const removeProduct = (product) => {
    if(['SAC+','SAC 24h','Inside Sales','Help Desk','Back Office','Ouvidorias','Custom'].includes(product)){
      if(!window.confirm('Este é um produto padrão. Deseja realmente excluir?')) return;
    } else if(!window.confirm('Deseja realmente excluir este produto?')) return;
    setProducts(products.filter(p => p !== product));
  };
  return <>
    <Panel title="Cadastro de produtos"><div className="formGrid"><label><span>Novo produto</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Atendimento bilíngue" onKeyDown={e=>{ if(e.key==='Enter') add(); }}/></label><button className="saveBtn" onClick={add}><Plus size={16}/>Adicionar produto</button></div></Panel>
    <Panel title="Produtos cadastrados"><Table headers={['Produto','Ações']}>{list.map(p=><tr key={p}><td><b>{p}</b></td><td><button className="mini" onClick={()=>removeProduct(p)}><Trash2 size={15}/>Excluir</button></td></tr>)}</Table></Panel>
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

  const importData = (raw, mode='merge') => {
    const data = normalizeData(raw);
    const counts = {
      companies: data.companies.length,
      contacts: data.contacts.length,
      deals: data.deals.length,
      activities: data.activities.length,
      notes: data.notes.length
    };

    if(mode === 'replace'){
      if(!window.confirm('Substituir a base atual pelos dados importados do Pipedrive? Esta ação troca Empresas, Contatos, Oportunidades, Atividades e Notas.')) return;
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

    const meta = {
      importedAt: new Date().toISOString(),
      mode,
      counts
    };
    setPipedriveImportMeta(meta);
    setStatus(`Importação concluída: ${counts.companies} empresas, ${counts.contacts} contatos, ${counts.deals} oportunidades, ${counts.activities} atividades e ${counts.notes} notas.`);
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
