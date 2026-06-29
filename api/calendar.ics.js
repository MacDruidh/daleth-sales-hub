import { createClient } from '@supabase/supabase-js';

const CRM_TIME_ZONE = 'America/Sao_Paulo';
const DEFAULT_DURATION_MINUTES = 60;

function env(name){
  return process.env[name] || '';
}

function text(value){
  return String(value ?? '').trim();
}

function escapeIcs(value){
  return text(value)
    .replace(/\\/g,'\\\\')
    .replace(/\n/g,'\\n')
    .replace(/\r/g,'')
    .replace(/,/g,'\\,')
    .replace(/;/g,'\\;');
}

function foldLine(line){
  const value = String(line);
  const chunks = [];
  let current = value;
  while(Buffer.byteLength(current,'utf8') > 73){
    let size = 0;
    let index = 0;
    for(const char of current){
      const nextSize = size + Buffer.byteLength(char,'utf8');
      if(nextSize > 73) break;
      size = nextSize;
      index += char.length;
    }
    chunks.push(current.slice(0,index));
    current = ` ${current.slice(index)}`;
  }
  chunks.push(current);
  return chunks.join('\r\n');
}

function line(name,value){
  return foldLine(`${name}:${value}`);
}

function dateOnly(value){
  const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}${match[2]}${match[3]}` : '';
}

function localDateTime(date,time){
  const cleanDate = dateOnly(date);
  const cleanTime = text(time).slice(0,5).replace(':','');
  if(!cleanDate || cleanTime.length !== 4) return '';
  return `${cleanDate}T${cleanTime}00`;
}

function addMinutesToLocal(date,time,minutes){
  const [year,month,day] = text(date).slice(0,10).split('-').map(Number);
  const [hour=0,minute=0] = text(time).slice(0,5).split(':').map(Number);
  if(!year || !month || !day) return '';
  const local = new Date(Date.UTC(year,month - 1,day,hour,minute));
  local.setUTCMinutes(local.getUTCMinutes() + minutes);
  return [
    String(local.getUTCFullYear()).padStart(4,'0'),
    String(local.getUTCMonth() + 1).padStart(2,'0'),
    String(local.getUTCDate()).padStart(2,'0'),
    'T',
    String(local.getUTCHours()).padStart(2,'0'),
    String(local.getUTCMinutes()).padStart(2,'0'),
    '00'
  ].join('');
}

function addOneDay(date){
  const [year,month,day] = text(date).slice(0,10).split('-').map(Number);
  if(!year || !month || !day) return '';
  const local = new Date(Date.UTC(year,month - 1,day,12));
  local.setUTCDate(local.getUTCDate() + 1);
  return `${local.getUTCFullYear()}${String(local.getUTCMonth() + 1).padStart(2,'0')}${String(local.getUTCDate()).padStart(2,'0')}`;
}

function utcStamp(value=new Date()){
  const date = value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) return utcStamp(new Date());
  return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
}

function activitySummary(activity){
  const type = text(activity.activity_type || activity.type || 'Atividade');
  const title = text(activity.title || 'Atividade');
  return title.toLowerCase().includes(type.toLowerCase()) ? title : `${type}: ${title}`;
}

function activityDescription(activity){
  const opportunity = activity.opportunities?.title;
  const company = activity.opportunities?.companies?.name;
  return [
    opportunity ? `Oportunidade: ${opportunity}` : '',
    company ? `Empresa: ${company}` : '',
    activity.owner ? `Responsável: ${activity.owner}` : '',
    activity.status ? `Status: ${activity.status}` : '',
    activity.meeting_link ? `Link: ${activity.meeting_link}` : '',
    activity.notes ? `Observações: ${activity.notes}` : '',
  ].filter(Boolean).join('\n');
}

function activityEvent(activity, origin){
  const id = activity.legacy_id || activity.id;
  const uid = `daleth-activity-${id}@daleth-sales-hub`;
  const startDate = dateOnly(activity.due_date);
  const startDateTime = localDateTime(activity.due_date,activity.due_time);
  const modified = activity.updated_at || activity.created_at || new Date();
  const rows = [
    'BEGIN:VEVENT',
    line('UID',escapeIcs(uid)),
    line('DTSTAMP',utcStamp()),
    line('LAST-MODIFIED',utcStamp(modified)),
    line('SUMMARY',escapeIcs(activitySummary(activity))),
    line('DESCRIPTION',escapeIcs(activityDescription(activity))),
    line('STATUS','CONFIRMED'),
  ];

  if(startDateTime){
    rows.push(foldLine(`DTSTART;TZID=${CRM_TIME_ZONE}:${startDateTime}`));
    rows.push(foldLine(`DTEND;TZID=${CRM_TIME_ZONE}:${addMinutesToLocal(activity.due_date,activity.due_time,DEFAULT_DURATION_MINUTES)}`));
  } else if(startDate) {
    rows.push(foldLine(`DTSTART;VALUE=DATE:${startDate}`));
    rows.push(foldLine(`DTEND;VALUE=DATE:${addOneDay(activity.due_date)}`));
  }

  if(activity.meeting_link){
    rows.push(line('LOCATION',escapeIcs(activity.meeting_link)));
    rows.push(line('URL',escapeIcs(activity.meeting_link)));
  } else if(origin) {
    rows.push(line('URL',escapeIcs(origin)));
  }

  rows.push(
    'BEGIN:VALARM',
    line('TRIGGER','-PT5M'),
    line('ACTION','DISPLAY'),
    line('DESCRIPTION',escapeIcs(activitySummary(activity))),
    'END:VALARM',
    'END:VEVENT'
  );
  return rows;
}

function calendarName({owner,type,status}){
  const parts = ['Daleth Sales Hub'];
  if(owner) parts.push(owner);
  if(type) parts.push(type);
  if(status) parts.push(status);
  return parts.join(' - ');
}

function buildCalendar(activities,filters,origin){
  const rows = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Daleth AC//Daleth Sales Hub//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    line('X-WR-CALNAME',escapeIcs(calendarName(filters))),
    line('X-WR-TIMEZONE',CRM_TIME_ZONE),
    'BEGIN:VTIMEZONE',
    line('TZID',CRM_TIME_ZONE),
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:GMT-3',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  activities.forEach(activity => rows.push(...activityEvent(activity,origin)));
  rows.push('END:VCALENDAR');
  return `${rows.join('\r\n')}\r\n`;
}

export default async function handler(request,response){
  const expectedToken = env('CALENDAR_FEED_TOKEN') || env('VITE_CALENDAR_FEED_TOKEN');
  const url = new URL(request.url,`https://${request.headers.host || 'crm.daleth.com.br'}`);
  const token = url.searchParams.get('token') || '';

  if(expectedToken && token !== expectedToken){
    response.status(401).setHeader('Content-Type','text/plain; charset=utf-8').send('Calendário não autorizado.');
    return;
  }

  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const supabaseKey = env('SUPABASE_SERVICE_ROLE_KEY') || env('VITE_SUPABASE_ANON_KEY');
  if(!supabaseUrl || !supabaseKey){
    response.status(500).setHeader('Content-Type','text/plain; charset=utf-8').send('Supabase não configurado para o calendário.');
    return;
  }

  const owner = text(url.searchParams.get('owner'));
  const type = text(url.searchParams.get('type'));
  const status = text(url.searchParams.get('status'));
  const includeCompleted = url.searchParams.get('includeCompleted') === '1';
  const supabase = createClient(supabaseUrl,supabaseKey,{auth:{persistSession:false}});

  let query = supabase
    .from('activities')
    .select(`
      id,
      legacy_id,
      opportunity_id,
      title,
      due_date,
      due_time,
      meeting_link,
      status,
      notes,
      owner,
      type,
      activity_type,
      created_at,
      updated_at,
      opportunities:opportunity_id (
        id,
        legacy_id,
        title,
        companies:company_id (
          name
        )
      )
    `)
    .not('due_date','is',null)
    .order('due_date',{ascending:true})
    .order('due_time',{ascending:true});

  if(owner) query = query.eq('owner',owner);
  if(type) query = query.or(`type.eq.${type},activity_type.eq.${type}`);
  if(status) query = query.eq('status',status);
  if(!status && !includeCompleted) query = query.neq('status','Concluída');

  const { data, error } = await query;
  if(error){
    response.status(500).setHeader('Content-Type','text/plain; charset=utf-8').send(`Falha ao gerar calendário: ${error.message}`);
    return;
  }

  const body = buildCalendar(data || [],{owner,type,status},url.origin);
  response
    .status(200)
    .setHeader('Content-Type','text/calendar; charset=utf-8')
    .setHeader('Content-Disposition','inline; filename="daleth-sales-hub.ics"')
    .setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600')
    .send(body);
}
