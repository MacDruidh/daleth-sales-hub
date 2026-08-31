export const AUDIT_MODULES = {
  companies: 'Empresas', contacts: 'Contatos', opportunities: 'Oportunidades',
  activities: 'Atividades e calendário', notes: 'Notas do histórico',
  interactions: 'Interações do histórico', contracts: 'Contratos', products: 'Produtos',
  documents: 'Documentos e links', workspace_items: 'Demandas do Workspace',
  workspace_comments: 'Comentários do Workspace', profiles: 'Perfis e permissões',
  segments: 'Segmentos', stages: 'Etapas do pipeline', stage_history: 'Histórico de etapas',
  loss_reasons: 'Perdas das oportunidades', loss_reason_options: 'Cadastro de motivos de perda',
  imports: 'Importação e restauração',
};
export const AUDIT_ACTIONS = { INSERT: 'Inclusão', UPDATE: 'Alteração', DELETE: 'Exclusão' };
export const AUDIT_PAGE_SIZE = 50;
export const AUDIT_TIME_ZONE = 'America/Sao_Paulo';
export const AUDIT_FIELDS = {
  id: 'Identificador', legacy_id: 'Identificador de origem', name: 'Nome', title: 'Título',
  company_id: 'ID da empresa', companyId: 'ID da empresa', contact_id: 'ID do contato',
  contactId: 'ID do contato', opportunity_id: 'ID da oportunidade', dealId: 'ID da oportunidade',
  full_name: 'Nome completo', email: 'E-mail', role: 'Cargo / perfil',
  can_view_dashboard: 'Acesso ao Dashboard', segment: 'Segmento', status: 'Status',
  cnpj: 'CNPJ', site: 'Site', website: 'Site', phone: 'Telefone 1', whatsapp: 'Telefone 2',
  linkedin: 'LinkedIn', notes: 'Observações', type: 'Tipo', contact_type: 'Tipo de contato',
  activity_type: 'Tipo da atividade', description: 'Descrição', text: 'Texto', content: 'Texto',
  user: 'Autor informado no registro', user_name: 'Autor informado no registro',
  owner: 'Responsável do cadastro', product: 'Produto', products: 'Produtos',
  value: 'Receita mensal', mrr: 'Receita mensal', setup_value: 'Implantação', setup: 'Implantação',
  contract_months: 'Prazo contratual (meses)', contractMonths: 'Prazo contratual (meses)',
  probability: 'Probabilidade (%)', stage: 'Etapa', expected_close_date: 'Fechamento previsto',
  closeDate: 'Fechamento previsto', next_step: 'Próximo passo', nextStep: 'Próximo passo',
  nextAction: 'Próxima ação', priority: 'Prioridade', due_date: 'Data da atividade',
  dueDate: 'Data prevista', due_time: 'Horário', dueTime: 'Horário',
  meeting_link: 'Link da reunião', meetingLink: 'Link da reunião',
  note_date: 'Data da nota', date: 'Data', dateTime: 'Data e hora da interação',
  start_date: 'Início do contrato', end_date: 'Fim do contrato',
  document_url: 'Link do contrato', documentUrl: 'Link do contrato',
  category: 'Categoria', url: 'Link', isDir: 'Pasta', links: 'Links',
  assignedTo: 'Responsável pela demanda', requestedBy: 'Solicitante informado',
  itemId: 'ID da demanda', reason: 'Motivo da perda', loss_reason: 'Motivo da perda',
  lossReason: 'Motivo da perda', fromStage: 'Etapa anterior', toStage: 'Nova etapa',
  items: 'Ordem / itens', data: 'Dados da coleção',
};

export function auditDateTime(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Não informado';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: AUDIT_TIME_ZONE, dateStyle: 'short', timeStyle: 'medium',
  }).format(new Date(value));
}

export function auditDateBounds(from, to) {
  const parse = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Informe uma data válida.');
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Informe uma data válida.');
    return date;
  };
  if (from) parse(from);
  if (to) parse(to);
  if (from && to && from > to) throw new Error('A data inicial deve ser anterior ou igual à final.');
  const start = from ? `${from}T00:00:00-03:00` : null;
  let end = null;
  if (to) {
    const next = parse(to);
    next.setUTCDate(next.getUTCDate() + 1);
    end = `${next.toISOString().slice(0, 10)}T00:00:00-03:00`;
  }
  return { start, end };
}

export function auditValue(field, value) {
  if (value === null || value === undefined || value === '') return '(vazio)';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (['value','mrr','setup','setup_value'].includes(field) && Number.isFinite(Number(value))) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return String(value);
}

export function auditError(error) {
  if (['PGRST205','PGRST202','42P01','42883'].includes(error?.code)) {
    return 'A auditoria ainda não está ativada no banco. É necessário aplicar supabase/audit.sql no Supabase.';
  }
  if (['42501','PGRST301','PGRST302'].includes(error?.code) || [401,403].includes(error?.status)) {
    return 'Sua sessão não tem autorização para consultar a auditoria. Entre novamente com a conta autorizada.';
  }
  return 'Não foi possível consultar a auditoria. Verifique a conexão e clique em Atualizar.';
}

// Filtra e pagina no servidor; detalhes grandes so sao lidos ao expandir um item.
export function auditListQuery(client, filters, page = 0) {
  const { start, end } = auditDateBounds(filters.from, filters.to);
  let query = client.from('crm_audit_log').select(
    'id,occurred_at,actor_id,actor_name,entity_type,entity_id,entity_label,action,source',
    { count: 'exact' }
  ).order('occurred_at', { ascending: false }).order('id', { ascending: false });
  if (filters.actor === 'system') query = query.is('actor_id', null);
  else if (filters.actor) query = query.eq('actor_id', filters.actor);
  if (filters.module) query = query.eq('entity_type', filters.module);
  if (filters.action) query = query.eq('action', filters.action);
  if (start) query = query.gte('occurred_at', start);
  if (end) query = query.lt('occurred_at', end);
  const search = String(filters.search || '').trim();
  if (search) query = query.ilike('entity_label', `%${search.replace(/[\\%_]/g, '\\$&')}%`);
  const offset = Math.max(0, page) * AUDIT_PAGE_SIZE;
  return query.range(offset, offset + AUDIT_PAGE_SIZE - 1);
}
