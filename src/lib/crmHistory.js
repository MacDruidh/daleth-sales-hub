export const CRM_TIME_ZONE = 'America/Sao_Paulo';

export function crmDateParts(value = new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: CRM_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(value).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}

export function dateOnlyFromCrmValue(value) {
  if (!value) return '';
  const raw = String(value).trim();
  // Calendar dates and local input values are not UTC instants.
  if (/^\d{4}-\d{2}-\d{2}(?:$|[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$)/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const parts = crmDateParts(parsed);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatDate(value) {
  if (!value) return '-';
  const date = dateOnlyFromCrmValue(value);
  return date ? date.split('-').reverse().join('/') : String(value);
}

export function formatDateTime(value) {
  if (!value) return '-';
  const raw = String(value).trim();
  const local = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (local) return `${formatDate(local[1])} ${local[2]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return formatDate(raw);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: CRM_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(parsed).replace(',', '');
}

export function historySortValue(value) {
  if (!value) return 0;
  const raw = String(value).trim().replace(' ', 'T');
  const local = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/.test(raw);
  const timestamp = Date.parse(local ? `${raw.length === 10 ? raw + 'T00:00:00' : raw}-03:00` : raw);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function cleanLegacyNote(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/<[^>]*$/g, '')
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos);|&#(?:\d+|x[\da-f]+);/gi, entity => {
      const named = {'&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'"};
      if (named[entity.toLowerCase()] !== undefined) return named[entity.toLowerCase()];
      const hex = /^&#x/i.test(entity);
      const code = parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
      return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }).trim();
}

export function dealHistory(deal, interactions = [], activities = [], notes = []) {
  const linked = item => item?.dealId !== undefined && deal?.id !== undefined && String(item.dealId) === String(deal.id);
  const array = value => Array.isArray(value) ? value : [];
  return [
    ...array(interactions).filter(linked).map(item => ({
      id: `interaction-${item.id}`, rawId: item.id, source: 'interaction', type: item.type || 'Interação',
      owner: item.owner || item.user || 'Daleth', date: item.dateTime || item.createdAt || item.date || '',
      description: item.description || '', nextAction: item.nextAction || '', nextDueDate: item.nextDueDate || ''
    })),
    ...array(notes).filter(linked).map(item => {
      const raw = item.text || item.note || item.content || '';
      const description = cleanLegacyNote(raw);
      return {
        id: `note-${item.id}`, source: 'note', type: 'Anotação', owner: item.user || item.userName || item.user_name || 'Daleth',
        date: String(item.date || item.noteDate || item.note_date || item.createdAt || item.created_at || '').slice(0, 10),
        description, nextAction: '', nextDueDate: '',
        possiblyIncomplete: Boolean(item.pipedriveId || item.legacy_id || item.legacyId) && /(?:\.{3}|…)\s*$/.test(description || raw)
      };
    }),
    ...array(activities).filter(item => linked(item) && item.status === 'Concluída').map(item => {
      const date = String(item.dueDate || item.date || '').slice(0, 10);
      return {
        id: `activity-${item.id}`, source: 'activity', type: item.type || 'Atividade', owner: item.owner || 'Daleth',
        date: date && item.dueTime ? `${date}T${String(item.dueTime).slice(0, 5)}` : date,
        description: `${item.title || ''}${item.notes ? ' - ' + item.notes : ''}`, nextAction: '', nextDueDate: ''
      };
    })
  ].sort((a, b) => historySortValue(b.date) - historySortValue(a.date));
}
