import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, KanbanSquare, Building2, Users, BriefcaseBusiness, CalendarDays, Plus, Search, Edit3, Trash2, MessageSquare, CheckCircle2, Clock3, CircleDollarSign, X, Save, Sparkles, Phone, Mail, UserRound, Filter, BellRing, TrendingUp, AlertTriangle } from 'lucide-react';
import './style.css';

const STAGES = ['Lead Captado','Primeiro Contato','Reunião Agendada','Levantamento','Proposta Enviada','Negociação','Ganho','Perdido'];
const USERS = ['Sergio','Oyas','Katia','Paulo','Reserva'];
const PRODUCTS = ['SAC+','Contact Center','Atendimento ANAC 24/7','Inside Sales','BPO','CX / Ouvidoria','Parceria Comercial'];

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
  { id: 1, title: 'SAC+ para rede de franquias', companyId: 1, contactId: 1, product: 'SAC+', value: 18900, setup: 0, stage: 'Proposta Enviada', owner: 'Sergio', probability: 60, closeDate: '2026-07-15', description: 'Proposta para atendimento multicanal da rede.', nextStep: 'Follow-up sobre proposta enviada.', priority: 'Alta' },
  { id: 2, title: 'Atendimento ANAC 24/7', companyId: 2, contactId: '', product: 'Atendimento ANAC 24/7', value: 45000, setup: 0, stage: 'Levantamento', owner: 'Oyas', probability: 40, closeDate: '2026-08-01', description: 'Discovery para operação de companhia aérea internacional.', nextStep: 'Mapear volumes e canais obrigatórios.', priority: 'Alta' },
  { id: 3, title: 'Parceria Franquear', companyId: 3, contactId: 2, product: 'Parceria Comercial', value: 12000, setup: 0, stage: 'Negociação', owner: 'Sergio', probability: 70, closeDate: '2026-06-30', description: 'Modelo de indicação para redes de franquias.', nextStep: 'Formalizar contrato de parceria.', priority: 'Média' },
];
const initialActivities = [
  { id: 1, dealId: 1, type: 'Follow-up', title: 'Ligar para Michele', dueDate: '2026-06-15', owner: 'Sergio', status: 'Pendente', notes: 'Confirmar se a proposta foi avaliada.' },
  { id: 2, dealId: 2, type: 'Reunião', title: 'Discovery operacional', dueDate: '2026-06-20', owner: 'Oyas', status: 'Pendente', notes: 'Levantar volumes, idiomas e canais.' },
];
const initialNotes = [
  { id: 1, dealId: 1, user: 'Sergio', date: '2026-06-10', text: 'Cliente demonstrou interesse em SAC+ para franquias. Enviar proposta revisada com cenários por quantidade de unidades.' },
  { id: 2, dealId: 3, user: 'Sergio', date: '2026-06-10', text: 'Parceria com comissão de 15% sobre faturamento bruto da rede indicada.' },
];

function useStore(key, initial){
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; } catch { return initial; }
  });
  const save = (next) => { setValue(next); localStorage.setItem(key, JSON.stringify(next)); };
  return [value, save];
}
function money(v){ return Number(v||0).toLocaleString('pt-BR',{ style:'currency', currency:'BRL' }); }
function today(){ return new Date().toISOString().slice(0,10); }

function App(){
  const [page,setPage] = useState('dashboard');
  const [query,setQuery] = useState('');
  const [companies,setCompanies] = useStore('dsh-v1-companies', initialCompanies);
  const [contacts,setContacts] = useStore('dsh-v1-contacts', initialContacts);
  const [deals,setDeals] = useStore('dsh-v1-deals', initialDeals);
  const [activities,setActivities] = useStore('dsh-v1-activities', initialActivities);
  const [notes,setNotes] = useStore('dsh-v1-notes', initialNotes);
  const [stages,setStages] = useStore('dsh-v1-stages', STAGES);
  const [selectedDealId,setSelectedDealId] = useState(null);

  const selectedDeal = deals.find(d => d.id === selectedDealId);
  const menu = [
    ['dashboard','Dashboard',LayoutDashboard], ['pipeline','Pipeline',KanbanSquare], ['deals','Oportunidades',BriefcaseBusiness],
    ['activities','Atividades',CalendarDays], ['companies','Empresas',Building2], ['contacts','Contatos',Users], ['matrix','Matriz Daleth',Sparkles]
  ];
  const context = { companies,setCompanies,contacts,setContacts,deals,setDeals,activities,setActivities,notes,setNotes,stages,setStages,setSelectedDealId,query };
  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><img className="brandLogo" src="/daleth-logo.svg" alt="Daleth Sales Hub" /></div>
      <nav>{menu.map(([id,label,Icon]) => <button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="sidebarBox"><b>Usuários internos</b><span>Sergio, Oyas, Katia, Paulo e Reserva</span></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><h1>{menu.find(m=>m[0]===page)?.[1]}</h1><p>CRM comercial interno da Daleth AC.</p></div><div className="topActions"><div className="notification"><BellRing size={18}/><span>3</span><div><b>Alertas comerciais</b><small>3 atividades vencidas · 2 propostas sem follow-up · 1 reunião hoje</small></div></div><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar no CRM"/></div></div></header>
      {page==='dashboard' && <Dashboard {...context}/>} {page==='pipeline' && <Pipeline {...context}/>} {page==='deals' && <Deals {...context}/>} {page==='activities' && <Activities {...context}/>} {page==='companies' && <Companies {...context}/>} {page==='contacts' && <Contacts {...context}/>} {page==='matrix' && <Matrix {...context}/>}    
    </main>
    {selectedDeal && <DealModal deal={selectedDeal} {...context} onClose={()=>setSelectedDealId(null)}/>}  
  </div>;
}

function Dashboard({deals,companies,contacts,activities,setSelectedDealId}){
  const open = deals.filter(d => !['Ganho','Perdido'].includes(d.stage));
  const won = deals.filter(d => d.stage==='Ganho');
  const pending = activities.filter(a => a.status !== 'Concluída');
  const weighted = open.reduce((s,d)=>s + Number(d.value||0)*(Number(d.probability||0)/100),0);
  const monthlyForecast = [
    ['Junho', open.reduce((s,d)=>s + (d.closeDate?.startsWith('2026-06') ? Number(d.value||0) : 0),0) || 75900],
    ['Julho', open.reduce((s,d)=>s + (d.closeDate?.startsWith('2026-07') ? Number(d.value||0) : 0),0) || 122000],
    ['Agosto', open.reduce((s,d)=>s + (d.closeDate?.startsWith('2026-08') ? Number(d.value||0) : 0),0) || 210000],
  ];
  const conversions = [['Lead → Reunião','42%'],['Reunião → Proposta','78%'],['Proposta → Fechamento','31%']];
  return <>
    <section className="cards">
      <Kpi icon={BriefcaseBusiness} label="Oportunidades abertas" value={open.length}/>
      <Kpi icon={CircleDollarSign} label="Pipeline bruto" value={money(open.reduce((s,d)=>s+Number(d.value||0),0))}/>
      <Kpi icon={CheckCircle2} label="Previsão ponderada" value={money(weighted)}/>
      <Kpi icon={Clock3} label="Atividades pendentes" value={pending.length}/>
    </section>
    <section className="grid2">
      <Panel title="Pipeline por etapa">{STAGES.slice(0,6).map(stage => { const count = deals.filter(d=>d.stage===stage).length; return <div className="bar" key={stage}><span>{stage}</span><b style={{width: `${Math.max(5,count*22)}%`}}></b><em>{count}</em></div>})}</Panel>
      <Panel title="Próximas ações">{pending.slice(0,6).map(a => { const deal = deals.find(d=>d.id===Number(a.dealId)); return <div className="activityRow" key={a.id}><CalendarDays size={17}/><div><b>{a.title}</b><span>{a.dueDate} · {a.owner} · {deal?.title}</span></div></div>})}</Panel>
    </section>
    <section className="grid2 compact">
      <Panel title="Receita prevista"><div className="forecastList">{monthlyForecast.map(([month,value])=><div className="forecastItem" key={month}><span>{month}</span><b>{money(value)}</b></div>)}</div></Panel>
      <Panel title="Conversão do funil"><div className="conversionList">{conversions.map(([label,value])=><div className="conversionItem" key={label}><span><TrendingUp size={16}/>{label}</span><b>{value}</b></div>)}</div></Panel>
    </section>
    <Panel title="Oportunidades prioritárias"><div className="tableWrap"><table><tbody>{open.sort((a,b)=>Number(b.value)-Number(a.value)).slice(0,7).map(d=><tr key={d.id} onClick={()=>setSelectedDealId(d.id)}><td><b>{d.title}</b><span>{companies.find(c=>c.id===Number(d.companyId))?.name}</span></td><td>{d.stage}</td><td>{d.owner}</td><td>{money(d.value)}</td><td>{d.probability}%</td></tr>)}</tbody></table></div></Panel>
  </>;
}
function Kpi({icon:Icon,label,value}){ return <div className="kpi"><Icon size={24}/><span>{label}</span><strong>{value}</strong></div>; }
function Panel({title,children}){ return <section className="panel"><h2>{title}</h2>{children}</section>; }

function Pipeline({stages,setStages,deals,setDeals,companies,setSelectedDealId}){
  const [newStage,setNewStage] = useState('');
  const move = (deal, stage) => setDeals(deals.map(d => d.id===deal.id ? {...d, stage} : d));
  return <>
    <div className="toolbar"><input placeholder="Nova etapa customizável" value={newStage} onChange={e=>setNewStage(e.target.value)}/><button onClick={()=>{ if(newStage.trim()){ setStages([...stages,newStage.trim()]); setNewStage(''); }}}><Plus size={16}/>Adicionar etapa</button></div>
    <section className="kanban">{stages.map(stage => <div className="column" key={stage}><h3>{stage}<small>{deals.filter(d=>d.stage===stage).length}</small></h3>{deals.filter(d=>d.stage===stage).map(d => <article className="dealCard" key={d.id}><div onClick={()=>setSelectedDealId(d.id)}><b>{d.title}</b><span>{companies.find(c=>c.id===Number(d.companyId))?.name || 'Sem empresa'}</span><strong>{money(d.value)}</strong></div><select value={d.stage} onChange={e=>move(d,e.target.value)}>{stages.map(s=><option key={s}>{s}</option>)}</select></article>)}</div>)}</section>
  </>;
}

function Deals({deals,setDeals,companies,contacts,stages,setSelectedDealId,query}){
  const empty = { title:'', companyId:companies[0]?.id||'', contactId:'', product:'SAC+', value:0, setup:0, stage:stages[0], owner:'Sergio', probability:30, closeDate:'', description:'', nextStep:'', priority:'Média' };
  const [form,setForm] = useState(empty);
  const list = deals.filter(d => (d.title+d.product+d.owner+d.stage).toLowerCase().includes(query.toLowerCase()));
  const add = () => { if(!form.title.trim()) return; setDeals([{...form,id:Date.now(),value:Number(form.value),setup:Number(form.setup)},...deals]); setForm(empty); };
  const removeDeal = (id) => { if(!window.confirm('Deseja realmente excluir esta oportunidade?')) return; setDeals(deals.filter(d => d.id !== id)); };
  return <>
    <Panel title="Nova oportunidade"><div className="formGrid"><Input label="Título" field="title" form={form} setForm={setForm}/><Select label="Empresa" field="companyId" form={form} setForm={setForm} options={companies.map(c=>[c.id,c.name])}/><Select label="Contato" field="contactId" form={form} setForm={setForm} options={[['','Sem contato'],...contacts.map(c=>[c.id,c.name])]}/><Select label="Produto" field="product" form={form} setForm={setForm} options={PRODUCTS.map(p=>[p,p])}/><Input label="Valor mensal" field="value" form={form} setForm={setForm} type="number"/><Select label="Etapa" field="stage" form={form} setForm={setForm} options={stages.map(s=>[s,s])}/><Select label="Responsável" field="owner" form={form} setForm={setForm} options={USERS.map(u=>[u,u])}/><Input label="Fechamento previsto" field="closeDate" form={form} setForm={setForm} type="date"/><button className="saveBtn" onClick={add}><Plus size={16}/>Criar oportunidade</button></div></Panel>
    <Panel title="Oportunidades"><Table headers={['Oportunidade','Empresa','Produto','Valor','Etapa','Responsável','Ações']}>{list.map(d=><tr key={d.id}><td><b>{d.title}</b><span>{d.nextStep}</span></td><td>{companies.find(c=>c.id===Number(d.companyId))?.name}</td><td>{d.product}</td><td>{money(d.value)}</td><td><span className="pill">{d.stage}</span></td><td>{d.owner}</td><td><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}><button className="mini" onClick={()=>setSelectedDealId(d.id)}><Edit3 size={15}/>Abrir</button><button className="mini" onClick={()=>removeDeal(d.id)}><Trash2 size={15}/>Excluir</button></div></td></tr>)}</Table></Panel>
  </>;
}

function DealModal({deal,onClose,companies,contacts,deals,setDeals,activities,setActivities,notes,setNotes,stages}){
  const [tab,setTab] = useState('geral');
  const [draft,setDraft] = useState({...deal});
  const [note,setNote] = useState('');
  const [activity,setActivity] = useState({type:'Follow-up',title:'',dueDate:today(),owner:deal.owner,status:'Pendente',notes:''});
  const save = () => { setDeals(deals.map(d=>d.id===deal.id ? {...draft,value:Number(draft.value),setup:Number(draft.setup)} : d)); };
  const addNote = () => { if(!note.trim()) return; setNotes([{id:Date.now(),dealId:deal.id,user:'Sergio',date:today(),text:note},...notes]); setNote(''); };
  const addActivity = () => { if(!activity.title.trim()) return; setActivities([{...activity,id:Date.now(),dealId:deal.id},...activities]); setActivity({...activity,title:'',notes:''}); };
  const dealNotes = notes.filter(n=>n.dealId===deal.id);
  const dealActivities = activities.filter(a=>a.dealId===deal.id);
  return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><div><h2>{deal.title}</h2><span>{companies.find(c=>c.id===Number(deal.companyId))?.name} · {money(deal.value)}</span></div><button className="iconBtn" onClick={onClose}><X/></button></div><div className="tabs">{['geral','timeline','atividades','matriz'].map(t=><button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}</div>
    {tab==='geral' && <div className="formGrid modalGrid"><Input label="Título" field="title" form={draft} setForm={setDraft}/><Select label="Etapa" field="stage" form={draft} setForm={setDraft} options={stages.map(s=>[s,s])}/><Select label="Responsável" field="owner" form={draft} setForm={setDraft} options={USERS.map(u=>[u,u])}/><Select label="Produto" field="product" form={draft} setForm={setDraft} options={PRODUCTS.map(p=>[p,p])}/><Input label="Valor mensal" field="value" form={draft} setForm={setDraft} type="number"/><Input label="Probabilidade %" field="probability" form={draft} setForm={setDraft} type="number"/><Input label="Próximo passo" field="nextStep" form={draft} setForm={setDraft}/><Textarea label="Descrição" field="description" form={draft} setForm={setDraft}/><button className="saveBtn" onClick={save}><Save size={16}/>Salvar alterações</button></div>}
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
function Matrix({deals,companies}){ return <Panel title="Matriz de Soluções Daleth"><p className="muted">Sugestões automáticas por segmento. Esta será a base para gerar propostas e apresentações futuramente.</p>{deals.map(d=><div className="matrixCard" key={d.id}><h3>{d.title}</h3><SolutionSuggestions deal={d} companies={companies}/></div>)}</Panel>; }
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
