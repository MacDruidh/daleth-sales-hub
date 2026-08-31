import React, { useEffect, useState } from 'react';
import { ShieldCheck, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AUDIT_ACTIONS, AUDIT_FIELDS, AUDIT_MODULES, AUDIT_PAGE_SIZE, auditDateTime, auditDateBounds, auditError, auditListQuery, auditValue } from '../lib/audit';
import './audit.css';

export function useAuditAccess(userId) {
  const [access, setAccess] = useState(null);
  useEffect(() => {
    if (!userId) { setAccess(null); return; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    supabase.rpc('crm_audit_access').abortSignal(controller.signal).then(({ data, error }) => {
      if (!controller.signal.aborted) setAccess({ userId, allowed: !error && data?.allowed === true, enabledAt: data?.enabled_at });
    }).catch(() => {
      if (!controller.signal.aborted) setAccess({ userId, allowed: false });
    }).finally(() => clearTimeout(timeout));
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [userId]);
  // Trocar de conta nunca reutiliza a autorizacao da sessao anterior.
  return access?.userId === userId ? access : null;
}

const EMPTY_FILTERS = { actor: '', module: '', action: '', from: '', to: '', search: '' };

function AuditDetails({ entry, client }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    setError('');
    client.from('crm_audit_log').select('changes,transaction_id').eq('id', entry.id).single()
      .abortSignal(controller.signal).then(({ data, error: queryError }) => {
        if (controller.signal.aborted) return;
        if (queryError) setError(auditError(queryError));
        else setDetail(data);
      }).catch(err => { if (!controller.signal.aborted) setError(auditError(err)); });
    return () => controller.abort();
  }, [entry.id, client]);
  return <div className="auditDetails">
    <h3>Detalhes: {entry.entity_label}</h3>
    <p className="muted">Usuário autenticado: {entry.actor_name} · ID: {entry.actor_id || 'Operação sem sessão de usuário'}<br/>
      Registro: {entry.entity_id} · Origem: {entry.source === 'table' ? 'Tabela do CRM' : 'Dados compartilhados do CRM'}
      {detail?.transaction_id ? ` · Operação no banco: ${detail.transaction_id}` : ''}
    </p>
    {error ? <p role="alert" className="auditError">{error}</p> : !detail ? <p role="status">Carregando detalhes...</p> :
      <div className="tableWrap"><table className="auditChanges"><thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead>
        <tbody>{Object.entries(detail.changes || {}).map(([field, change]) => <tr key={field}>
          <th scope="row">{AUDIT_FIELDS[field] || field}</th>
          <td><pre>{auditValue(field, change.before)}</pre></td><td><pre>{auditValue(field, change.after)}</pre></td>
        </tr>)}</tbody>
      </table></div>}
  </div>;
}

export default function AuditPanel({ access, client = supabase }) {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [actors, setActors] = useState([]);
  const [actorsError, setActorsError] = useState('');
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState('');
  const [expanded, setExpanded] = useState(null);
  const allowed = access?.allowed === true;

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    setActorsError('');
    client.rpc('crm_audit_actors').abortSignal(controller.signal).then(({ data, error: queryError }) => {
      if (controller.signal.aborted) return;
      if (queryError) setActorsError(auditError(queryError));
      else setActors(data || []);
    }).catch(err => { if (!controller.signal.aborted) setActorsError(auditError(err)); });
    return () => controller.abort();
  }, [allowed, access?.userId, client, revision]);

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    setRows([]);
    setLoading(true);
    setError('');
    setExpanded(null);
    auditListQuery(client, filters, page).abortSignal(controller.signal)
      .then(({ data, count: total, error: queryError }) => {
        if (controller.signal.aborted) return;
        if (queryError) setError(auditError(queryError));
        else {
          setRows(data || []);
          setCount(total || 0);
          const last = Math.max(0, Math.ceil((total || 0) / AUDIT_PAGE_SIZE) - 1);
          if (page > last) setPage(last);
        }
      }).catch(err => { if (!controller.signal.aborted) setError(auditError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, access?.userId, client, filters, page, revision]);

  if (!allowed) return <section className="panel"><h2>Auditoria restrita</h2><p>Esta conta não tem acesso ao histórico de auditoria.</p></section>;
  const apply = event => {
    event.preventDefault();
    try { auditDateBounds(draft.from, draft.to); }
    catch (err) { setValidation(err.message); return; }
    setValidation(''); setFilters({ ...draft }); setPage(0);
  };
  const field = name => ({ value: draft[name], onChange: event => setDraft({ ...draft, [name]: event.target.value }) });
  const pages = Math.max(1, Math.ceil(count / AUDIT_PAGE_SIZE));

  return <div className="auditPage">
    <section className="panel">
      <div className="auditHeading"><div><h2><ShieldCheck size={23}/> Auditoria do CRM</h2><p className="muted">Quem incluiu, alterou ou excluiu registros. Acesso exclusivo à sua conta.</p></div>
        <button type="button" className="mini" onClick={() => setRevision(value => value + 1)} disabled={loading}><RefreshCw size={16}/>Atualizar</button>
      </div>
      <p className="auditNotice">Coleta desde {auditDateTime(access.enabledAt)} (horário de Brasília). Não é retroativa. Exibe gravações confirmadas no servidor, não tentativas que ficaram somente no cache, acessos ou leituras.</p>
    </section>
    <section className="panel">
      <h2>Filtros da auditoria</h2>
      <form onSubmit={apply}>
        <div className="formGrid">
          <label><span>Usuário que realizou a ação</span><select {...field('actor')}><option value="">Todos os usuários</option>{actors.map(actor => <option key={actor.id} value={actor.id}>{actor.name}{actor.id === access.userId ? ' (você)' : ''}</option>)}<option value="system">Sistema / administrador do banco</option></select></label>
          <label><span>Módulo</span><select {...field('module')}><option value="">Todos os módulos</option>{Object.entries(AUDIT_MODULES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span>Ação</span><select {...field('action')}><option value="">Todas as ações</option>{Object.entries(AUDIT_ACTIONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span>Nome ou título do registro</span><input type="search" maxLength={200} {...field('search')}/></label>
          <label><span>De</span><input type="date" {...field('from')}/></label><label><span>Até</span><input type="date" {...field('to')}/></label>
          <button className="saveBtn" type="submit" disabled={loading}><Filter size={16}/>Aplicar filtros</button>
          <button className="mini" type="button" disabled={loading} onClick={() => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setPage(0); setValidation(''); }}>Limpar filtros</button>
        </div>
        {validation && <p role="alert" className="auditError">{validation}</p>}
        {actorsError && <p role="alert" className="auditError">Lista de usuários: {actorsError}</p>}
      </form>
    </section>
    <section className="panel" aria-busy={loading}>
      <h2>Últimas alterações{!loading && !error ? ` (${count})` : ''}</h2>
      {error ? <p role="alert" className="auditError">{error}</p> : loading ? <p role="status">Consultando auditoria...</p> : !rows.length ?
        <p>Nenhuma ação registrada para os filtros escolhidos. As ações anteriores à ativação não estão disponíveis.</p> : <>
          <div className="tableWrap"><table><thead><tr><th>Data e hora</th><th>Usuário</th><th>Ação</th><th>Módulo</th><th>Registro</th><th>Detalhes</th></tr></thead>
            <tbody>{rows.map(entry => <React.Fragment key={entry.id}>
              <tr><td>{auditDateTime(entry.occurred_at)}</td><td><b>{entry.actor_name}</b></td><td><span className={`auditAction auditAction-${entry.action}`}>{AUDIT_ACTIONS[entry.action] || entry.action}</span></td>
                <td>{AUDIT_MODULES[entry.entity_type] || entry.entity_type}</td><td><b className="auditLabel">{entry.entity_label}</b></td>
                <td><button type="button" className="mini" aria-expanded={expanded === entry.id} onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>{expanded === entry.id ? 'Fechar' : 'Ver alterações'}</button></td></tr>
              {expanded === entry.id && <tr><td colSpan={6}><AuditDetails entry={entry} client={client}/></td></tr>}
            </React.Fragment>)}</tbody>
          </table></div>
          <div className="auditPagination"><span>Página {page + 1} de {pages} · Mais recentes primeiro</span><div>
            <button type="button" className="mini" disabled={page === 0} onClick={() => setPage(value => value - 1)}><ChevronLeft size={16}/>Anterior</button>
            <button type="button" className="mini" disabled={page + 1 >= pages} onClick={() => setPage(value => value + 1)}>Próxima<ChevronRight size={16}/></button>
          </div></div>
        </>}
    </section>
  </div>;
}
