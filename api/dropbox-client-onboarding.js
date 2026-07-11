import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const DROPBOX_API = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT_API = 'https://content.dropboxapi.com/2';
const DEFAULT_ROOT_PATH = '/Daleth/1Novos Clientes';

function text(value){
  return String(value ?? '').trim();
}

function json(response,status,payload){
  response.status(status).setHeader('Content-Type','application/json; charset=utf-8').send(JSON.stringify(payload));
}

function folderNameForCompany(companyName){
  return text(companyName)
    .replace(/[\\/:?*"<>|]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,80) || 'Cliente';
}

function fileNameForCompany(companyName){
  return folderNameForCompany(companyName).replace(/[. ]+$/,'') || 'Cliente';
}

function dropboxPath(rootPath,folderName){
  const root = `/${text(rootPath || DEFAULT_ROOT_PATH).replace(/^\/+|\/+$/g,'')}`;
  const safeFolder = text(folderName).replace(/[\\/:?*"<>|]/g,' ').replace(/\s+/g,' ').trim() || 'Cliente';
  return `${root}/${safeFolder}`;
}

async function dropboxFetch(endpoint,token,body){
  const response = await fetch(`${DROPBOX_API}${endpoint}`,{
    method:'POST',
    headers:{
      Authorization:`Bearer ${token}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify(body)
  });
  const data = await response.json().catch(()=>({}));
  if(!response.ok){
    const error = new Error(data?.error_summary || `Dropbox respondeu ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function createFolder(token,path){
  try {
    return await dropboxFetch('/files/create_folder_v2',token,{path,autorename:false});
  } catch (error) {
    if(String(error?.data?.error_summary || '').includes('path/conflict/folder')) {
      return {metadata:{path_display:path,name:path.split('/').pop()},alreadyExists:true};
    }
    throw error;
  }
}

async function createSharedLink(token,path){
  try {
    const data = await dropboxFetch('/sharing/create_shared_link_with_settings',token,{path});
    return data?.url || '';
  } catch (error) {
    const summary = String(error?.data?.error_summary || '');
    if(summary.includes('shared_link_already_exists')) return '';
    return '';
  }
}

async function uploadDropboxFile(token,path,buffer){
  const response = await fetch(`${DROPBOX_CONTENT_API}/files/upload`,{
    method:'POST',
    headers:{
      Authorization:`Bearer ${token}`,
      'Content-Type':'application/octet-stream',
      'Dropbox-API-Arg':JSON.stringify({
        path,
        mode:'overwrite',
        autorename:false,
        mute:true,
        strict_conflict:false
      })
    },
    body:buffer
  });
  const data = await response.json().catch(()=>({}));
  if(!response.ok){
    const error = new Error(data?.error_summary || `Dropbox upload respondeu ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function solutionRows(segment){
  const seg = text(segment).toLowerCase();
  if(seg.includes('avia')){
    return [
      ['Atendimento 24/7', 'SAC 24/7 ANAC', 'Cobertura contínua para passageiros, contingências e tratativas críticas.', 'Mapear volume por canal e SLA atual.'],
      ['Experiência do passageiro', 'Atendimento bilíngue e multicanal', 'Reduz atrito em jornadas de informação, cancelamento e bagagem.', 'Priorizar canais com maior demanda.'],
      ['Gestão operacional', 'Relatórios de SLA e motivos de contato', 'Ajuda a enxergar picos, reincidências e oportunidades de automação.', 'Definir indicadores de operação e qualidade.'],
      ['Qualidade', 'QA e monitoria de atendimento', 'Eleva padrão de resposta e reduz risco regulatório.', 'Criar amostra de monitoria semanal.']
    ];
  }
  if(seg.includes('turismo')){
    return [
      ['Atendimento ao viajante', 'SAC multicanal', 'Centraliza dúvidas, alterações e suporte em canais digitais e voz.', 'Levantar sazonalidade e canais críticos.'],
      ['Relacionamento', 'WhatsApp corporativo e e-mail estruturado', 'Aumenta velocidade de resposta e registro do histórico.', 'Definir templates de atendimento.'],
      ['Gestão', 'Relatórios gerenciais', 'Mostra principais demandas, tempos e oportunidades comerciais.', 'Definir visão semanal e mensal.']
    ];
  }
  if(seg.includes('varejo') || seg.includes('franqu')){
    return [
      ['Atendimento por unidade', 'SAC+ por loja/unidade', 'Organiza demandas por origem e melhora a leitura de performance.', 'Mapear unidades e responsáveis.'],
      ['Reputação', 'Reclame Aqui, PROCON e redes sociais', 'Reduz risco de imagem e melhora gestão de casos sensíveis.', 'Definir régua de prioridade.'],
      ['Padronização', 'Base de conhecimento e scripts', 'Garante consistência no atendimento em escala.', 'Criar base inicial de respostas.']
    ];
  }
  if(seg.includes('finance')){
    return [
      ['Atendimento sensível', 'SAC especializado', 'Melhora registro, rastreabilidade e segurança na tratativa.', 'Mapear fluxos críticos e LGPD.'],
      ['Compliance', 'QA e trilha de auditoria', 'Aumenta controle sobre qualidade e aderência operacional.', 'Definir critérios de monitoria.'],
      ['Gestão', 'Dashboards e relatórios executivos', 'Apoia leitura mensal de demanda, SLA e performance.', 'Definir indicadores prioritários.']
    ];
  }
  if(seg.includes('tecnologia')){
    return [
      ['Suporte ao cliente', 'Service desk e SAC multicanal', 'Organiza demandas técnicas e comerciais em uma operação única.', 'Separar tipos de demanda e níveis de atendimento.'],
      ['Escala', 'Automação e base de conhecimento', 'Reduz repetição e acelera respostas de primeiro nível.', 'Listar perguntas frequentes.'],
      ['Gestão', 'Relatórios de SLA e backlog', 'Mostra gargalos e oportunidades de melhoria operacional.', 'Definir SLA por tipo de chamado.']
    ];
  }
  return [
    ['Atendimento', 'SAC multicanal', 'Centraliza demandas e melhora a experiência do cliente.', 'Mapear canais atuais e volume estimado.'],
    ['Gestão', 'Relatórios gerenciais', 'Dá visão mensal de demanda, SLA, qualidade e oportunidades.', 'Definir indicadores executivos.'],
    ['Qualidade', 'QA e monitoria', 'Aumenta consistência e reduz falhas de atendimento.', 'Criar rotina de avaliação.'],
    ['Relacionamento', 'NPS/CSAT', 'Mede satisfação e identifica oportunidades de evolução.', 'Definir momento de disparo da pesquisa.']
  ];
}

function briefLines(company){
  const name = text(company.companyName);
  const segment = text(company.segment) || 'Não informado';
  const site = text(company.site) || 'Não informado';
  const rows = solutionRows(segment);
  return [
    `Cliente: ${name}`,
    `Segmento: ${segment}`,
    `Site cadastrado: ${site}`,
    '',
    'Objetivo do briefing',
    `Preparar uma primeira leitura comercial sobre ${name}, conectando o perfil cadastrado no CRM às soluções da Daleth AC.`,
    '',
    'Hipóteses comerciais iniciais',
    `- A empresa pode se beneficiar de uma operação de atendimento mais estruturada, com controle de SLA, histórico e indicadores.`,
    `- O segmento "${segment}" sugere oportunidades ligadas a experiência do cliente, produtividade operacional e qualidade de atendimento.`,
    '- A próxima abordagem deve validar volume de demanda, canais utilizados, dores atuais e impacto financeiro de falhas no atendimento.',
    '',
    'Soluções sugeridas',
    ...rows.map(row=>`- ${row[1]}: ${row[2]}`),
    '',
    'Perguntas para a primeira conversa',
    '- Quais canais concentram hoje o maior volume de atendimento?',
    '- Existe operação 24/7 ou necessidade de cobertura fora do horário comercial?',
    '- Como são acompanhados SLA, satisfação, reincidência e qualidade?',
    '- Quais demandas mais consomem tempo da equipe interna?',
    '',
    'Próximo passo recomendado',
    'Agendar conversa diagnóstica para validar dores, volume, canais e oportunidade de ganho operacional.'
  ];
}

function wrapText(line,font,size,maxWidth){
  const words = text(line).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(word=>{
    const next = current ? `${current} ${word}` : word;
    if(font.widthOfTextAtSize(next,size) <= maxWidth){
      current = next;
    } else {
      if(current) lines.push(current);
      current = word;
    }
  });
  if(current) lines.push(current);
  return lines.length ? lines : [''];
}

async function generateBriefingPdf(company){
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  const width = 595.28;
  const height = 841.89;
  let page = pdf.addPage([width,height]);
  let y = height - margin;

  const drawLine = (line,{font=regular,size=11,color=rgb(0.06,0.14,0.22),gap=16}={})=>{
    if(y < margin + 36){
      page = pdf.addPage([width,height]);
      y = height - margin;
    }
    page.drawText(line,{x:margin,y,size,font,color});
    y -= gap;
  };

  drawLine('Briefing Comercial',{font:bold,size:22,color:rgb(0.02,0.11,0.21),gap:26});
  drawLine(`Daleth AC | ${new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}`,{size:10,color:rgb(0.42,0.48,0.55),gap:26});
  briefLines(company).forEach(line=>{
    if(!line){
      y -= 8;
      return;
    }
    const isTitle = !line.startsWith('-') && ['Objetivo do briefing','Hipóteses comerciais iniciais','Soluções sugeridas','Perguntas para a primeira conversa','Próximo passo recomendado'].includes(line);
    const font = isTitle ? bold : regular;
    const size = isTitle ? 13 : 11;
    const gap = isTitle ? 20 : 15;
    wrapText(line,font,size,width - margin * 2).forEach((wrapped,index)=>drawLine(wrapped,{font,size,gap:index === 0 ? gap : 14}));
  });
  return Buffer.from(await pdf.save());
}

async function generateSolutionMatrix(company){
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Daleth Sales Hub';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Matriz de Soluções');
  worksheet.columns = [
    {header:'Empresa',key:'company',width:28},
    {header:'Segmento',key:'segment',width:20},
    {header:'Dor / Oportunidade',key:'pain',width:26},
    {header:'Solução Daleth',key:'solution',width:30},
    {header:'Valor para o cliente',key:'value',width:48},
    {header:'Próximo passo',key:'nextStep',width:34}
  ];
  worksheet.getRow(1).font = {bold:true,color:{argb:'FFFFFFFF'}};
  worksheet.getRow(1).fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF061B35'}};
  worksheet.getRow(1).alignment = {vertical:'middle',wrapText:true};
  solutionRows(company.segment).forEach(row=>{
    worksheet.addRow({
      company:text(company.companyName),
      segment:text(company.segment) || 'Não informado',
      pain:row[0],
      solution:row[1],
      value:row[2],
      nextStep:row[3]
    });
  });
  worksheet.eachRow(row=>{
    row.alignment = {vertical:'top',wrapText:true};
    row.eachCell(cell=>{
      cell.border = {
        top:{style:'thin',color:{argb:'FFDCE7F1'}},
        left:{style:'thin',color:{argb:'FFDCE7F1'}},
        bottom:{style:'thin',color:{argb:'FFDCE7F1'}},
        right:{style:'thin',color:{argb:'FFDCE7F1'}}
      };
    });
  });
  worksheet.views = [{state:'frozen',ySplit:1}];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function createOnboardingFiles(token,folderPath,company){
  const fileName = fileNameForCompany(company.companyName);
  const briefingPath = `${folderPath}/Briefing - ${fileName}.pdf`;
  const matrixPath = `${folderPath}/Matriz de Soluções - ${fileName}.xlsx`;
  const briefing = await generateBriefingPdf(company);
  const matrix = await generateSolutionMatrix(company);
  const uploadedBriefing = await uploadDropboxFile(token,briefingPath,briefing);
  const uploadedMatrix = await uploadDropboxFile(token,matrixPath,matrix);
  return [
    {type:'briefing',name:`Briefing - ${fileName}.pdf`,path:uploadedBriefing?.path_display || briefingPath},
    {type:'matrix',name:`Matriz de Soluções - ${fileName}.xlsx`,path:uploadedMatrix?.path_display || matrixPath}
  ];
}

export default async function handler(request,response){
  if(request.method !== 'POST'){
    response.setHeader('Allow','POST');
    json(response,405,{ok:false,error:'Método não permitido.'});
    return;
  }

  const token = process.env.DROPBOX_ACCESS_TOKEN;
  if(!token){
    json(response,500,{ok:false,error:'DROPBOX_ACCESS_TOKEN não configurado no Vercel.'});
    return;
  }

  const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
  const companyName = text(body.companyName);
  if(!companyName){
    json(response,400,{ok:false,error:'Informe o nome da empresa.'});
    return;
  }
  const company = {
    companyName,
    site:text(body.site),
    segment:text(body.segment),
    cnpj:text(body.cnpj),
    phone:text(body.phone),
    email:text(body.email),
    notes:text(body.notes)
  };

  const folderName = folderNameForCompany(companyName);
  const rootPath = process.env.DROPBOX_CLIENT_ROOT_PATH || DEFAULT_ROOT_PATH;
  const path = dropboxPath(rootPath,folderName);

  try {
    const folder = await createFolder(token,path);
    const folderPath = folder?.metadata?.path_display || path;
    const artifacts = await createOnboardingFiles(token,folderPath,company);
    const sharedUrl = await createSharedLink(token,path);
    json(response,200,{
      ok:true,
      folderName,
      path:folderPath,
      sharedUrl,
      artifacts,
      alreadyExists:folder?.alreadyExists === true
    });
  } catch (error) {
    console.error('Falha ao criar pasta no Dropbox:', error);
    json(response,error.status || 500,{
      ok:false,
      error:error.message || 'Falha ao criar pasta no Dropbox.'
    });
  }
}
