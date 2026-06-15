import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, KanbanSquare, Building2, Users, BriefcaseBusiness, CalendarDays, Plus, Search, Edit3, Trash2, MessageSquare, CheckCircle2, Clock3, CircleDollarSign, X, Save, Sparkles, Phone, Mail, UserRound, Filter, BellRing, TrendingUp, AlertTriangle, Lock } from 'lucide-react';
import './style.css';

const STAGES = ['Lead Captado','Primeiro Contato','Reunião Agendada','Levantamento','Proposta Enviada','Negociação','Ganho','Perdido'];
const USERS = ['Sergio','Oyas','Katia','Paulo','Reserva'];
const PRODUCTS = ['SAC+','Contact Center','Atendimento ANAC 24/7','Inside Sales','BPO','CX / Ouvidoria','Parceria Comercial'];

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
  { id: 2, title: 'Atendimento ANAC 24/7', companyId: 2, contactId: '', product: 'Atendimento ANAC 24/7', value: 45000, setup: 60000, contractMonths: 36, stage: 'Levantamento', owner: 'Oyas', probability: 40, closeDate: '2026-08-01', description: 'Discovery para operação de companhia aérea internacional.', nextStep: 'Mapear volumes e canais obrigatórios.', priority: 'Alta' },
  { id: 3, title: 'Parceria Franquear', companyId: 3, contactId: 2, product: 'Parceria Comercial', value: 12000, setup: 0, contractMonths: 24, stage: 'Negociação', owner: 'Sergio', probability: 70, closeDate: '2026-06-30', description: 'Modelo de indicação para redes de franquias.', nextStep: 'Formalizar contrato de parceria.', priority: 'Média' },
];
const initialActivities = [
  { id: 1, dealId: 1, type: 'Follow-up', title: 'Ligar para Michele', dueDate: '2026-06-15', owner: 'Sergio', status: 'Pendente', notes: 'Confirmar se a proposta foi avaliada.' },
  { id: 2, dealId: 2, type: 'Reunião', title: 'Discovery operacional', dueDate: '2026-06-20', owner: 'Oyas', status: 'Pendente', notes: 'Levantar volumes, idiomas e canais.' },
];
const initialNotes = [
  { id: 1, dealId: 1, user: 'Sergio', date: '2026-06-10', text: 'Cliente demonstrou interesse em SAC+ para franquias. Enviar proposta revisada com cenários por quantidade de unidades.' },
  { id: 2, dealId: 3, user: 'Sergio', date: '2026-06-10', text: 'Parceria com comissão de 15% sobre faturamento bruto da rede indicada.' },
];

const initialContracts = [];

function useStore(key, initial){
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; } catch { return initial; }
  });
  const save = (next) => { setValue(next); localStorage.setItem(key, JSON.stringify(next)); };
  return [value, save];
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
function dealMrr(d){ return Number(d?.value || 0); }
function dealSetup(d){ return Number(d?.setup || 0); }
function dealMonths(d){ return Math.max(1, Number(d?.contractMonths || 12)); }
function dealTcv(d){ return (dealMrr(d) * dealMonths(d)) + dealSetup(d); }
function dealArr(d){ return dealMrr(d) * 12; }
function dealWeightedTcv(d){ return dealTcv(d) * (Number(d?.probability || 0) / 100); }
function dealSegment(d, companies){ return companies.find(c=>c.id===Number(d.companyId))?.segment || 'Sem segmento'; }

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
      width:'min(860px,92vw)',
      background:'#ffffff',
      border:'1px solid #dbe7f3',
      borderRadius:'26px',
      boxShadow:'0 22px 70px rgba(3,32,64,.10)',
      padding:'38px 44px'
    }}>
      <div style={{display:'flex',alignItems:'center',gap:'18px',marginBottom:'36px'}}>
        <img src="/daleth-logo.svg" alt="Daleth Sales Hub" style={{height:'44px',width:'44px',objectFit:'contain',flex:'0 0 auto'}} />
        <strong style={{fontSize:'18px',color:'#0878ff',letterSpacing:'-.02em'}}>Sales Hub</strong>
      </div>

      <h1 style={{margin:'0 0 10px',fontSize:'44px',lineHeight:1.05,letterSpacing:'-.04em',color:'#061b34',fontWeight:900}}>Daleth Sales Hub</h1>
      <p style={{margin:'0 0 28px',fontSize:'22px',color:'#65758a'}}>Escolha seu perfil de acesso.</p>
      <div style={{height:'1px',background:'#dbe7f3',marginBottom:'24px'}} />

      <label style={{display:'block',marginBottom:'24px'}}>
        <span style={{display:'block',fontWeight:900,fontSize:'16px',textTransform:'uppercase',letterSpacing:'.06em',color:'#061b34',marginBottom:'14px'}}>Usuário</span>
        <div style={{position:'relative'}}>
          <UserRound size={22} style={{position:'absolute',left:'20px',top:'50%',transform:'translateY(-50%)',color:'#12345a',pointerEvents:'none',zIndex:1}} />
          <select value={selected} onChange={e=>setSelected(e.target.value)} style={{
            width:'100%',
            height:'56px',
            border:'1px solid #cbd8e6',
            borderRadius:'12px',
            padding:'0 54px 0 62px',
            fontSize:'20px',
            fontWeight:400,
            color:'#061b34',
            background:'#fff',
            outline:'none',
            boxShadow:'0 1px 0 rgba(6,27,52,.03)'
          }}>
            {ACCESS_USERS.map(u=><option key={u.name} value={u.name}>{u.name} — {u.role}</option>)}
          </select>
        </div>
      </label>

      <div style={{
        display:'flex',
        alignItems:'center',
        gap:'24px',
        background:'linear-gradient(135deg,#f2f8ff 0%,#eaf4ff 100%)',
        borderRadius:'18px',
        padding:'22px 26px',
        marginBottom:'26px'
      }}>
        <div style={{
          width:'68px',
          height:'68px',
          borderRadius:'50%',
          display:'grid',
          placeItems:'center',
          background:'rgba(13,116,255,.10)',
          flex:'0 0 auto'
        }}>
          <CheckCircle2 size={32} color="#0b7cff" />
        </div>
        <div>
          <b style={{display:'block',fontSize:'24px',color:'#061b34',marginBottom:'8px',fontWeight:900}}>{user.role}</b>
          <span style={{fontSize:'18px',color:'#64748b'}}>{user.canViewDashboard ? 'Acesso completo, incluindo Dashboard executivo.' : 'Acesso operacional, sem Dashboard executivo.'}</span>
        </div>
      </div>

      <button className="saveBtn" onClick={()=>onLogin(user)} style={{
        width:'100%',
        justifyContent:'center',
        minHeight:'62px',
        borderRadius:'14px',
        fontSize:'22px',
        fontWeight:900,
        background:'linear-gradient(135deg,#0078ff 0%,#005eea 100%)',
        boxShadow:'0 12px 24px rgba(0,110,255,.20)'
      }}>Entrar →</button>

      <div style={{height:'1px',background:'#dbe7f3',margin:'30px 0 20px'}} />
      <p style={{display:'flex',alignItems:'center',gap:'14px',fontSize:'16px',color:'#64748b',margin:0}}>
        <Lock size={20} /> Controle provisório de perfis. A segurança real será feita na etapa Supabase Auth.
      </p>
    </section>
  </div>;
}

function App(){
  const [page,setPage] = useState('dashboard');
  const [query,setQuery] = useState('');
  const [currentUser,setCurrentUser] = useStore('dsh-v1-current-user', null);
  const [companies,setCompanies] = useStore('dsh-v1-companies', initialCompanies);
  const [contacts,setContacts] = useStore('dsh-v1-contacts', initialContacts);
  const [deals,setDeals] = useStore('dsh-v1-deals', initialDeals);
  const [activities,setActivities] = useStore('dsh-v1-activities', initialActivities);
  const [notes,setNotes] = useStore('dsh-v1-notes', initialNotes);
  const [contracts,setContracts] = useStore('dsh-v1-contracts', initialContracts);
  const [stages,setStages] = useStore('dsh-v1-stages', STAGES);
  const [selectedDealId,setSelectedDealId] = useState(null);

  if(!currentUser) return <LoginScreen onLogin={setCurrentUser}/>;
  const selectedDeal = deals.find(d => d.id === selectedDealId);
  const isCEO = currentUser?.canViewDashboard === true;
  const allMenu = [
    ['dashboard','Dashboard',LayoutDashboard], ['pipeline','Pipeline',KanbanSquare], ['deals','Oportunidades',BriefcaseBusiness],
    ['contracts','Contratos',CheckCircle2], ['activities','Atividades',CalendarDays], ['companies','Empresas',Building2], ['contacts','Contatos',Users], ['matrix','Matriz Daleth',Sparkles]
  ];
  const menu = isCEO ? allMenu : allMenu.filter(([id]) => id !== 'dashboard');
  const activePage = (!isCEO && page === 'dashboard') ? 'deals' : page;
  const context = { companies,setCompanies,contacts,setContacts,deals,setDeals,activities,setActivities,notes,setNotes,contracts,setContracts,stages,setStages,setSelectedDealId,query };
  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><img className="brandLogo" src="/daleth-logo.svg" alt="Daleth Sales Hub" /></div>
      <nav>{menu.map(([id,label,Icon]) => <button key={id} className={activePage===id?'active':''} onClick={()=>setPage(id)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="sidebarBox"><b>Perfil ativo</b><span>{currentUser.name} · {currentUser.role}</span></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><h1>{menu.find(m=>m[0]===activePage)?.[1]}</h1><p>CRM comercial interno da Daleth AC.</p></div><div className="topActions"><div className="notification"><BellRing size={18}/><span>3</span><div><b>Alertas comerciais</b><small>3 atividades vencidas · 2 propostas sem follow-up · 1 reunião hoje</small></div></div><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar no CRM"/></div><div className="notification" style={{minWidth:'170px'}}><UserRound size={18}/><div><b>{currentUser.name}</b><small>{currentUser.role}</small></div></div><button className="mini" onClick={()=>setCurrentUser(null)}><X size={15}/>Sair</button></div></header>
      {activePage==='dashboard' && isCEO && <Dashboard {...context}/>} {activePage==='pipeline' && <Pipeline {...context}/>} {activePage==='deals' && <Deals {...context}/>} {activePage==='contracts' && <Contracts {...context}/>} {activePage==='activities' && <Activities {...context}/>} {activePage==='companies' && <Companies {...context}/>} {activePage==='contacts' && <Contacts {...context}/>} {activePage==='matrix' && <Matrix {...context}/>}    
    </main>
    {selectedDeal && <DealModal deal={selectedDeal} {...context} onClose={()=>setSelectedDealId(null)}/>}  
  </div>;
}

function Dashboard({deals,companies,contacts,activities,contracts,setSelectedDealId}){
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

  return <>
    <section className="cards">
      <Kpi icon={CircleDollarSign} label="Receita mensal potencial" value={moneyShort(openMrr)}/>
      <Kpi icon={BriefcaseBusiness} label="Valor total do pipeline" value={moneyShort(openTcv)}/>
      <Kpi icon={TrendingUp} label="Receita anualizada potencial" value={moneyShort(openArr)}/>
      <Kpi icon={CheckCircle2} label="Forecast ponderado" value={moneyShort(weightedTcv)}/>
    </section>
    <section className="cards">
      <Kpi icon={Clock3} label="Forecast 30 dias" value={moneyShort(forecast30)}/>
      <Kpi icon={CalendarDays} label="Forecast 90 dias" value={moneyShort(forecast90)}/>
      <Kpi icon={CheckCircle2} label="Receita mensal contratada" value={moneyShort(activeContractMrr || wonMrr)}/>
      <Kpi icon={BriefcaseBusiness} label="Atividades pendentes" value={pending.length}/>
    </section>

    <section className="cards">
      <Kpi icon={AlertTriangle} label="Receita em risco 90d" value={moneyShort(revenueAtRisk90)}/>
      <Kpi icon={CalendarDays} label="Contratos vencendo 90d" value={expiring90.length}/>
      <Kpi icon={TrendingUp} label="Receita anualizada contratada" value={moneyShort(activeContractArr)}/>
      <Kpi icon={BriefcaseBusiness} label="Contratos ativos" value={activeContracts.length}/>
    </section>

    <section className="grid2">
      <Panel title="Pipeline por etapa">
        <DashboardTable headers={['Etapa','Oportunidades','Valor total (R$)']}>
          {stageRows.map(row=><tr key={row.label}><td>{row.label}</td><td>{row.count}</td><td><b>{moneyShort(row.total)}</b></td></tr>)}
          <tr className="totalRow"><td>Total</td><td>{open.length}</td><td>{moneyShort(openTcv)}</td></tr>
        </DashboardTable>
      </Panel>

      <Panel title="Pipeline por segmento">
        <DashboardTable headers={['Segmento','Oportunidades','Valor total (R$)']}>
          {segmentRows.length ? segmentRows.map(row=><tr key={row.label}><td>{row.label}</td><td>{row.count}</td><td><b>{moneyShort(row.total)}</b></td></tr>) : <tr><td>Nenhum segmento</td><td>0</td><td>{moneyShort(0)}</td></tr>}
          <tr className="totalRow"><td>Total</td><td>{open.length}</td><td>{moneyShort(openTcv)}</td></tr>
        </DashboardTable>
      </Panel>
    </section>

    <section className="grid2 compact">
      <Panel title="Top oportunidades">
        <DashboardTable headers={['Cliente','Etapa','Valor total (R$)','Fechamento']}>
          {topDeals.map(d=><tr key={d.id} onClick={()=>setSelectedDealId(d.id)}><td><b>{companies.find(c=>c.id===Number(d.companyId))?.name || d.title}</b><span>{d.title}</span></td><td>{d.stage}</td><td>{moneyShort(dealTcv(d))}</td><td>{d.closeDate || '-'}</td></tr>)}
        </DashboardTable>
      </Panel>

      <Panel title="Atividades vencidas">
        <DashboardTable headers={['Atividade','Oportunidade','Vencimento','Responsável']}>
          {overdueActivities.length ? overdueActivities.map(a=>{
            const deal = deals.find(d=>d.id===Number(a.dealId));
            return <tr key={a.id}><td><b>{a.title}</b><span>{a.type}</span></td><td>{deal?.title || '-'}</td><td><b style={{color:'#dc2626'}}>{a.dueDate}</b></td><td>{a.owner}</td></tr>
          }) : <tr><td>Nenhuma atividade vencida</td><td>-</td><td>-</td><td>-</td></tr>}
        </DashboardTable>
      </Panel>
    </section>
  </>;
}
function Kpi({icon:Icon,label,value}){ return <div className="kpi"><Icon size={24}/><span>{label}</span><strong>{value}</strong></div>; }
function Panel({title,children}){ return <section className="panel"><h2>{title}</h2>{children}</section>; }
function DashboardTable({headers,children}){ return <div className="tableWrap dashboardTable"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }

function Pipeline({stages,setStages,deals,setDeals,companies,setSelectedDealId}){
  const [newStage,setNewStage] = useState('');
  const move = (deal, stage) => setDeals(deals.map(d => d.id===deal.id ? {...d, stage} : d));
  return <>
    <div className="toolbar"><input placeholder="Nova etapa customizável" value={newStage} onChange={e=>setNewStage(e.target.value)}/><button onClick={()=>{ if(newStage.trim()){ setStages([...stages,newStage.trim()]); setNewStage(''); }}}><Plus size={16}/>Adicionar etapa</button></div>
    <section className="kanban">{stages.map(stage => <div className="column" key={stage}><h3>{stage}<small>{deals.filter(d=>d.stage===stage).length}</small></h3>{deals.filter(d=>d.stage===stage).map(d => <article className="dealCard" key={d.id}><div onClick={()=>setSelectedDealId(d.id)}><b>{d.title}</b><span>{companies.find(c=>c.id===Number(d.companyId))?.name || 'Sem empresa'}</span><strong>{money(dealTcv(d))}</strong></div><select value={d.stage} onChange={e=>move(d,e.target.value)}>{stages.map(s=><option key={s}>{s}</option>)}</select></article>)}</div>)}</section>
  </>;
}

function Deals({deals,setDeals,companies,contacts,stages,setSelectedDealId,query}){
  const empty = { title:'', companyId:companies[0]?.id||'', contactId:'', product:'SAC+', value:0, setup:0, contractMonths:12, stage:stages[0], owner:'Sergio', probability:30, closeDate:'', description:'', nextStep:'', priority:'Média' };
  const [form,setForm] = useState(empty);
  const list = deals.filter(d => (d.title+d.product+d.owner+d.stage).toLowerCase().includes(query.toLowerCase()));
  const add = () => { if(!form.title.trim()) return; setDeals([{...form,id:Date.now(),value:Number(form.value),setup:Number(form.setup),contractMonths:Number(form.contractMonths||12),probability:Number(form.probability||30)},...deals]); setForm(empty); };
  const removeDeal = (id) => { if(!window.confirm('Deseja realmente excluir esta oportunidade?')) return; setDeals(deals.filter(d => d.id !== id)); };
  return <>
    <Panel title="Nova oportunidade"><div className="formGrid"><Input label="Título" field="title" form={form} setForm={setForm}/><Select label="Empresa" field="companyId" form={form} setForm={setForm} options={companies.map(c=>[c.id,c.name])}/><Select label="Contato" field="contactId" form={form} setForm={setForm} options={[["","Sem contato"],...contacts.map(c=>[c.id,c.name])]}/><Select label="Produto" field="product" form={form} setForm={setForm} options={PRODUCTS.map(p=>[p,p])}/><Input label="Receita mensal" field="value" form={form} setForm={setForm} type="number"/><Input label="Setup" field="setup" form={form} setForm={setForm} type="number"/><Input label="Prazo contratual (meses)" field="contractMonths" form={form} setForm={setForm} type="number"/><Input label="Probabilidade %" field="probability" form={form} setForm={setForm} type="number"/><Select label="Etapa" field="stage" form={form} setForm={setForm} options={stages.map(s=>[s,s])}/><Select label="Responsável" field="owner" form={form} setForm={setForm} options={USERS.map(u=>[u,u])}/><Input label="Fechamento previsto" field="closeDate" form={form} setForm={setForm} type="date"/><label><span>Valor total calculado</span><input value={money(dealTcv(form))} readOnly/></label><button className="saveBtn" onClick={add}><Plus size={16}/>Criar oportunidade</button></div></Panel>
    <Panel title="Oportunidades"><Table headers={['Oportunidade','Empresa','Produto','Receita mensal','Prazo','Valor total','Etapa','Responsável','Ações']}>{list.map(d=><tr key={d.id}><td><b>{d.title}</b><span>{d.nextStep}</span></td><td>{companies.find(c=>c.id===Number(d.companyId))?.name}</td><td>{d.product}</td><td>{money(dealMrr(d))}</td><td>{dealMonths(d)} meses</td><td><b>{money(dealTcv(d))}</b></td><td><span className="pill">{d.stage}</span></td><td>{d.owner}</td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><button className="mini" onClick={()=>setSelectedDealId(d.id)}><Edit3 size={15}/>Abrir</button><button className="mini" onClick={()=>removeDeal(d.id)}><Trash2 size={15}/>Excluir</button></div></td></tr>)}</Table></Panel>
  </>;
}

function DealModal({deal,onClose,companies,contacts,deals,setDeals,activities,setActivities,notes,setNotes,contracts,setContracts,stages}){
  const [tab,setTab] = useState('geral');
  const [draft,setDraft] = useState({contractMonths:12, setup:0, probability:30, ...deal});
  const [note,setNote] = useState('');
  const [activity,setActivity] = useState({type:'Follow-up',title:'',dueDate:today(),owner:deal.owner,status:'Pendente',notes:''});
  const save = () => { setDeals(deals.map(d=>d.id===deal.id ? {...draft,value:Number(draft.value),setup:Number(draft.setup),contractMonths:Number(draft.contractMonths||12),probability:Number(draft.probability||30)} : d)); };
  const addNote = () => { if(!note.trim()) return; setNotes([{id:Date.now(),dealId:deal.id,user:'Sergio',date:today(),text:note},...notes]); setNote(''); };
  const addActivity = () => { if(!activity.title.trim()) return; setActivities([{...activity,id:Date.now(),dealId:deal.id},...activities]); setActivity({...activity,title:'',notes:''}); };
  const dealNotes = notes.filter(n=>n.dealId===deal.id);
  const dealActivities = activities.filter(a=>a.dealId===deal.id);
  return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><div><h2>{deal.title}</h2><span>{companies.find(c=>c.id===Number(deal.companyId))?.name} · Receita mensal {money(dealMrr(deal))} · Valor total {money(dealTcv(deal))}</span></div><button className="iconBtn" onClick={onClose}><X/></button></div><div className="tabs">{['geral','timeline','atividades','matriz'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</div>
    {tab==='geral' && <div className="formGrid modalGrid"><Input label="Título" field="title" form={draft} setForm={setDraft}/><Select label="Etapa" field="stage" form={draft} setForm={setDraft} options={stages.map(s=>[s,s])}/><Select label="Responsável" field="owner" form={draft} setForm={setDraft} options={USERS.map(u=>[u,u])}/><Select label="Produto" field="product" form={draft} setForm={setDraft} options={PRODUCTS.map(p=>[p,p])}/><Input label="Receita mensal" field="value" form={draft} setForm={setDraft} type="number"/><Input label="Setup" field="setup" form={draft} setForm={setDraft} type="number"/><Input label="Prazo contratual (meses)" field="contractMonths" form={draft} setForm={setDraft} type="number"/><Input label="Probabilidade %" field="probability" form={draft} setForm={setDraft} type="number"/><Input label="Fechamento previsto" field="closeDate" form={draft} setForm={setDraft} type="date"/><Input label="Próximo passo" field="nextStep" form={draft} setForm={setDraft}/><label><span>Valor total calculado</span><input value={money(dealTcv(draft))} readOnly/></label><label><span>Receita anualizada calculada</span><input value={money(dealArr(draft))} readOnly/></label><Textarea label="Descrição" field="description" form={draft} setForm={setDraft}/><button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button></div>}
    {tab==='timeline' && <div><div className="noteBox"><textarea placeholder="Adicionar comentário, registro de reunião, ligação, WhatsApp..." value={note} onChange={e=>setNote(e.target.value)}></textarea><button onClick={addNote}><MessageSquare size={16}/>Adicionar comentário</button></div><div className="timeline">{dealNotes.map(n=><div className="timelineItem" key={n.id}><b>{n.user}</b><span>{n.date}</span><p>{n.text}</p></div>)}</div></div>}
    {tab==='atividades' && <div><div className="formGrid"><Select label="Tipo" field="type" form={activity} setForm={setActivity} options={['Follow-up','Ligação','E-mail','WhatsApp','Reunião','Proposta'].map(x=>[x,x])}/><Input label="Título" field="title" form={activity} setForm={setActivity}/><Input label="Data" field="dueDate" form={activity} setForm={setActivity} type="date"/><Select label="Responsável" field="owner" form={activity} setForm={setActivity} options={USERS.map(u=>[u,u])}/><button className="saveBtn" onClick={addActivity}><Plus size={16}/>Criar atividade</button></div><div className="timeline">{dealActivities.map(a=><div className="timelineItem" key={a.id}><b>{a.type}: {a.title}</b><span>{a.dueDate} · {a.owner} · {a.status}</span><p>{a.notes}</p></div>)}</div></div>}
    {tab==='matriz' && <SolutionSuggestions deal={draft} companies={companies}/>}  
  </div></div>;
}

function Activities({activities,setActivities,deals,query}){
  const list = activities.filter(a => (a.title+a.type+a.owner+a.status).toLowerCase().includes(query.toLowerCase()));
  const toggle = (id) => setActivities(activities.map(a=>a.id===id ? {...a,status:a.status==='Concluída'?'Pendente':'Concluída'} : a));
  const removeActivity = (id) => { if(!window.confirm('Deseja realmente excluir esta atividade?')) return; setActivities(activities.filter(a => a.id !== id)); };
  return <Panel title="Atividades e follow-ups"><Table headers={['Status','Tipo','Atividade','Oportunidade','Data','Responsável','Ações']}>{list.map(a=><tr key={a.id}><td><button className="mini" onClick={()=>toggle(a.id)}>{a.status}</button></td><td>{a.type}</td><td><b>{a.title}</b><span>{a.notes}</span></td><td>{deals.find(d=>d.id===a.dealId)?.title}</td><td>{a.dueDate}</td><td>{a.owner}</td><td><button className="mini" onClick={()=>removeActivity(a.id)}><Trash2 size={15}/>Excluir</button></td></tr>)}</Table></Panel>;
}

function Companies({companies,setCompanies,query}){
  const empty = { name:'', segment:'', cnpj:'', site:'', status:'Prospect', phone:'', email:'', notes:'' };
  const [form,setForm] = useState(empty);
  const list = companies.filter(c => (c.name+c.segment+c.site+c.status).toLowerCase().includes(query.toLowerCase()));
  const add = () => { if(!form.name.trim()) return; setCompanies([{...form,id:Date.now()},...companies]); setForm(empty); };
  const removeCompany = (id) => { if(!window.confirm('Deseja realmente excluir esta empresa?')) return; setCompanies(companies.filter(c => c.id !== id)); };
  return <><Panel title="Nova empresa"><div className="formGrid"><Input label="Nome fantasia" field="name" form={form} setForm={setForm}/><Input label="Segmento" field="segment" form={form} setForm={setForm}/><Input label="Site" field="site" form={form} setForm={setForm}/><Input label="CNPJ" field="cnpj" form={form} setForm={setForm}/><button className="saveBtn" onClick={add}><Plus size={16}/>Salvar empresa</button></div></Panel><Panel title="Empresas"><Table headers={['Empresa','Segmento','Site','Status','Ações']}>{list.map(c=><tr key={c.id}><td><b>{c.name}</b><span>{c.notes}</span></td><td>{c.segment}</td><td>{c.site}</td><td><span className="pill">{c.status}</span></td><td><button className="mini" onClick={()=>removeCompany(c.id)}><Trash2 size={15}/>Excluir</button></td></tr>)}</Table></Panel></>;
}
function Contacts({contacts,setContacts,companies,query}){
  const empty = { companyId:companies[0]?.id||'', name:'', role:'', email:'', phone:'', whatsapp:'', type:'Decisor', linkedin:'', notes:'' };
  const [form,setForm] = useState(empty);
  const list = contacts.filter(c => (c.name+c.role+c.email+c.phone).toLowerCase().includes(query.toLowerCase()));
  const add = () => { if(!form.name.trim()) return; setContacts([{...form,id:Date.now()},...contacts]); setForm(empty); };
  const removeContact = (id) => { if(!window.confirm('Deseja realmente excluir este contato?')) return; setContacts(contacts.filter(c => c.id !== id)); };
  return <><Panel title="Novo contato"><div className="formGrid"><Input label="Nome" field="name" form={form} setForm={setForm}/><Select label="Empresa" field="companyId" form={form} setForm={setForm} options={companies.map(c=>[c.id,c.name])}/><Input label="Cargo" field="role" form={form} setForm={setForm}/><Input label="E-mail" field="email" form={form} setForm={setForm}/><Input label="Telefone" field="phone" form={form} setForm={setForm}/><button className="saveBtn" onClick={add}><Plus size={16}/>Salvar contato</button></div></Panel><Panel title="Contatos"><Table headers={['Contato','Empresa','Cargo','E-mail','Telefone','Tipo','Ações']}>{list.map(c=><tr key={c.id}><td><b>{c.name}</b></td><td>{companies.find(x=>x.id===Number(c.companyId))?.name}</td><td>{c.role}</td><td>{c.email}</td><td>{c.phone}</td><td>{c.type}</td><td><button className="mini" onClick={()=>removeContact(c.id)}><Trash2 size={15}/>Excluir</button></td></tr>)}</Table></Panel></>;
}

function Contracts({contracts,setContracts,deals,companies,query}){
  const empty = { companyId:companies[0]?.id||'', dealId:'', product:'SAC+', startDate:today(), endDate:addMonths(today(),12), mrr:0, setup:0, contractMonths:12, owner:'Sergio', status:'Ativo', notes:'' };
  const [form,setForm] = useState(empty);
  const list = contracts.filter(c => {
    const company = companies.find(x=>x.id===Number(c.companyId));
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
      <Kpi icon={AlertTriangle} label="Receita em risco 90d" value={moneyShort(risk90)}/>
    </section>

    <Panel title="Novo contrato"><div className="formGrid">
      <Select label="Cliente" field="companyId" form={form} setForm={setForm} options={companies.map(c=>[c.id,c.name])}/>
      <Select label="Produto" field="product" form={form} setForm={setForm} options={PRODUCTS.map(p=>[p,p])}/>
      <Input label="Data início" field="startDate" form={form} setForm={setForm} type="date"/>
      <Input label="Data fim" field="endDate" form={form} setForm={setForm} type="date"/>
      <Input label="Receita mensal" field="mrr" form={form} setForm={setForm} type="number"/>
      <Input label="Setup" field="setup" form={form} setForm={setForm} type="number"/>
      <Input label="Prazo contratual (meses)" field="contractMonths" form={form} setForm={setForm} type="number"/>
      <Select label="Responsável" field="owner" form={form} setForm={setForm} options={USERS.map(u=>[u,u])}/>
      <Select label="Status" field="status" form={form} setForm={setForm} options={['Ativo','Renovação','Encerrado','Suspenso'].map(s=>[s,s])}/>
      <button className="saveBtn" onClick={add}><Plus size={16}/>Criar contrato</button>
      <button className="saveBtn" onClick={importWonDeals}><CheckCircle2 size={16}/>Gerar de ganhos</button>
    </div></Panel>

    <section className="grid2 compact">
      <Panel title="Contratos vencendo em 90 dias">
        <DashboardTable headers={['Cliente','Fim','Meses','Receita mensal']}>
          {expiring90.length ? expiring90.sort((a,b)=>String(a.endDate).localeCompare(String(b.endDate))).map(c=>{
            const company = companies.find(x=>x.id===Number(c.companyId));
            return <tr key={c.id}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.product}</span></td><td>{c.endDate}</td><td>{monthsRemaining(c.endDate)}</td><td>{moneyShort(contractMrr(c))}</td></tr>
          }) : <tr><td>Nenhum contrato vencendo</td><td>-</td><td>-</td><td>{moneyShort(0)}</td></tr>}
        </DashboardTable>
      </Panel>

      <Panel title="Carteira ativa por cliente">
        <DashboardTable headers={['Cliente','Status','Meses restantes','Receita mensal']}>
          {active.length ? active.slice().sort((a,b)=>contractMrr(b)-contractMrr(a)).slice(0,6).map(c=>{
            const company = companies.find(x=>x.id===Number(c.companyId));
            return <tr key={c.id}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.product}</span></td><td><span className="pill">{contractStatus(c)}</span></td><td>{monthsRemaining(c.endDate)}</td><td>{moneyShort(contractMrr(c))}</td></tr>
          }) : <tr><td>Nenhum contrato ativo</td><td>-</td><td>-</td><td>{moneyShort(0)}</td></tr>}
        </DashboardTable>
      </Panel>
    </section>

    <Panel title="Todos os contratos"><Table headers={['Cliente','Produto','Início','Fim','Meses restantes','Receita mensal','Valor total','Status','Responsável','Ações']}>
      {list.map(c=>{
        const company = companies.find(x=>x.id===Number(c.companyId));
        return <tr key={c.id}><td><b>{company?.name || 'Sem cliente'}</b><span>{c.notes}</span></td><td>{c.product}</td><td>{c.startDate}</td><td>{c.endDate}</td><td>{monthsRemaining(c.endDate)}</td><td>{moneyShort(contractMrr(c))}</td><td>{moneyShort(contractTcv(c))}</td><td><span className="pill">{contractStatus(c)}</span></td><td>{c.owner}</td><td><button className="mini" onClick={()=>removeContract(c.id)}><Trash2 size={15}/>Excluir</button></td></tr>
      })}
    </Table></Panel>
  </>;
}

function Matrix({deals,companies}){ return <Panel title="Matriz de Soluções Daleth"><p className="muted">Sugestões automáticas por segmento. Esta será a base para gerar propostas e apresentações futuramente.</p>{deals.map(d=><div className="matrixCard" key={d.id}><h3>{d.title}</h3><p className="muted">Receita mensal {money(dealMrr(d))} · Prazo {dealMonths(d)} meses · Valor total {money(dealTcv(d))}</p><SolutionSuggestions deal={d} companies={companies}/></div>)}</Panel>; }
function SolutionSuggestions({deal,companies}){
  const company = companies.find(c=>c.id===Number(deal.companyId));
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
