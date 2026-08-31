import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import AuditPanel from '../../src/components/AuditPanel';
import '../../src/style.css';

// Somente fixture local. Nenhuma chamada ao Supabase ou dado real do CRM.
const rows = Array.from({length:61}, (_, i) => ({
  id:61-i, occurred_at:new Date(Date.UTC(2026,7,31,18,0,-i)).toISOString(),
  actor_id:i % 2 ? 'owner' : 'paulo', actor_name:i % 2 ? 'Sergio Paulo' : 'Paulo',
  entity_type:'opportunities', entity_id:String(i), entity_label:`Oportunidade de teste ${i+1}`,
  action:['UPDATE','INSERT','DELETE'][i%3], source:'table', transaction_id:1000+i,
  changes:{value:{before:5000,after:6200},title:{before:'Proposta inicial',after:'Proposta revisada'},
    description:{before:null,after:'Somente dados fictícios. <script>alert("não executar")</script>'}},
}));
let fail = false;
const client = {
  rpc:() => ({abortSignal:() => Promise.resolve({data:[{id:'owner',name:'Sergio Paulo'},{id:'paulo',name:'Paulo'}]})}),
  from:() => {
    let result = [...rows]; let start=0; let end=49; let single=false;
    const query = {
      select:() => query, order:() => query, abortSignal:() => query,
      eq:(key,value) => {result=result.filter(row=>row[key]===value);return query;},
      is:(key,value) => {result=result.filter(row=>row[key]===value);return query;},
      gte:(key,value) => {result=result.filter(row=>new Date(row[key])>=new Date(value));return query;},
      lt:(key,value) => {result=result.filter(row=>new Date(row[key])<new Date(value));return query;},
      ilike:(key,value) => {result=result.filter(row=>row[key].toLowerCase().includes(value.slice(1,-1).toLowerCase()));return query;},
      range:(a,b) => {start=a;end=b;return query;}, single:() => {single=true;return query;},
      then:(resolve,reject) => Promise.resolve(fail ? {error:{code:'42501'}} : {data:single?result[0]:result.slice(start,end+1),count:result.length}).then(resolve,reject),
    }; return query;
  },
};
function Preview() {
  const [allowed,setAllowed] = useState(true);
  return <main style={{padding:16,maxWidth:1450,margin:'auto'}}>
    <style>{`@media(max-width:700px){.formGrid{grid-template-columns:1fr}.panel{padding:14px}.tableWrap{overflow:auto}.tableWrap>table{min-width:680px}}`}</style>
    <p>TESTE LOCAL · DADOS FICTÍCIOS</p>
    <button onClick={()=>setAllowed(v=>!v)}>Alternar conta autorizada</button>
    <button onClick={()=>{fail=!fail;}}>Alternar falha de consulta</button>
    <AuditPanel key={String(allowed)} access={{allowed,userId:allowed?'owner':'paulo',enabledAt:'2026-08-31T15:00:00Z'}} client={client}/>
  </main>;
}
createRoot(document.getElementById('root')).render(<Preview/>);
