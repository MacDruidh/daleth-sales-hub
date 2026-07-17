import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const DROPBOX_API = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT_API = 'https://content.dropboxapi.com/2';
const DROPBOX_OAUTH_API = 'https://api.dropboxapi.com/oauth2/token';
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

function asciiFileName(value){
  return fileNameForCompany(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\w\s.-]/g,' ')
    .replace(/\s+/g,' ')
    .trim() || 'Cliente';
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

function friendlyDropboxUploadError(error){
  if(error?.status === 401){
    return 'Dropbox recusou a operação (401). Revise o token do Dropbox no Vercel: ele pode ter expirado. Para produção, configure refresh token.';
  }
  if(error?.status === 403){
    return 'Dropbox recusou o envio dos arquivos (403). Revise as permissões do app Dropbox, especialmente files.content.write.';
  }
  return error?.message || 'Não foi possível enviar os arquivos iniciais ao Dropbox.';
}

function friendlyDropboxError(error){
  if(error?.status === 401){
    return 'Dropbox recusou a operação porque o token expirou ou foi revogado. Atualize o DROPBOX_ACCESS_TOKEN no Vercel ou configure DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY e DROPBOX_APP_SECRET.';
  }
  if(error?.status === 403){
    return 'Dropbox recusou a operação por falta de permissão. Revise as permissões do app Dropbox.';
  }
  return error?.message || 'Falha ao criar pasta no Dropbox.';
}

async function refreshDropboxAccessToken(){
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;
  if(!refreshToken || !appKey || !appSecret) return '';

  const credentials = Buffer.from(`${appKey}:${appSecret}`).toString('base64');
  const response = await fetch(DROPBOX_OAUTH_API,{
    method:'POST',
    headers:{
      Authorization:`Basic ${credentials}`,
      'Content-Type':'application/x-www-form-urlencoded'
    },
    body:new URLSearchParams({
      grant_type:'refresh_token',
      refresh_token:refreshToken
    })
  });
  const data = await response.json().catch(()=>({}));
  if(!response.ok){
    const error = new Error(data?.error_description || data?.error || `Dropbox OAuth respondeu ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return text(data?.access_token);
}

async function dropboxAccessToken(){
  const refreshed = await refreshDropboxAccessToken();
  return refreshed || process.env.DROPBOX_ACCESS_TOKEN || '';
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

function companyContext(company){
  return [
    company?.companyName,
    company?.segment,
    company?.site,
    company?.notes
  ].map(value=>text(value).toLowerCase()).join(' ');
}

function isAgencyOrCampaignCompany(company){
  const ctx = companyContext(company);
  return ['agencia','agência','marketing','campanha','campanhas','publicidade','promocional','promocao','promoção','branding','comunicacao','comunicação','midia','mídia','consumer','influenciador','sampling'].some(term=>ctx.includes(term));
}

function solutionRows(company){
  const seg = text(company?.segment).toLowerCase();
  if(isAgencyOrCampaignCompany(company)){
    return [
      ['Atendimento ao consumidor das marcas atendidas', 'SAC Omnichannel', 'Telefone, WhatsApp, chat, e-mail e redes sociais operados como extensão da campanha.', 'Amplia a entrega da agência aos clientes e transforma comunicação em relacionamento.'],
      ['Atendimento durante campanhas promocionais', 'Central de Atendimento Temporária', 'Estrutura sob demanda para picos de volume em ações promocionais.', 'Escala sem aumentar estrutura fixa da agência.'],
      ['SAC para lançamentos de produtos', 'Operação Dedicada por Campanha', 'Equipe treinada no produto, regulamento, tom de marca e perguntas frequentes.', 'Melhora a experiência do consumidor no momento mais sensível do lançamento.'],
      ['Gestão de Reclame Aqui e PROCON', 'Central de Reputação Digital', 'Triagem, resposta, registro e acompanhamento de casos críticos.', 'Protege imagem das marcas e reduz impacto reputacional.'],
      ['Atendimento em ações de sampling e eventos', 'Central de Informações', 'Suporte para dúvidas de participantes, localização, brindes e regras da ação.', 'Aumenta engajamento e reduz ruído operacional durante a campanha.'],
      ['Monitoramento das redes sociais', 'Social Care', 'Resposta rápida a comentários, dúvidas e reclamações em canais sociais.', 'Fortalece a marca e reduz exposição negativa.'],
      ['Atendimento de influenciadores e promotores', 'Back Office de Campanhas', 'Acompanhamento de cadastros, orientações, pendências e status operacional.', 'Melhora coordenação entre agência, campo e cliente final.'],
      ['Pesquisas pós-campanha', 'NPS / CSAT', 'Coleta estruturada de percepção dos participantes e consumidores.', 'Mede experiência e comprova resultado além da mídia.'],
      ['Coleta de insights dos consumidores', 'Voice of Consumer (VOC)', 'Classificação de dúvidas, reclamações, elogios, sugestões e intenção de compra.', 'Gera inteligência para campanhas futuras e novos produtos.'],
      ['Atendimento de distribuidores e parceiros', 'Central B2B', 'Canal dedicado para parceiros comerciais, pontos de venda e distribuidores.', 'Estrutura relacionamento e reduz perda de informação.'],
      ['Gestão de leads gerados em campanhas', 'Inside Sales / Lead Qualification', 'Qualificação e priorização de leads capturados em landing pages, eventos e ativações.', 'Aumenta conversão comercial dos investimentos de campanha.'],
      ['Atendimento a e-commerce', 'SAC Digital', 'Suporte para dúvidas, entrega, pagamento, troca e pós-venda.', 'Reduz abandono, melhora recompra e protege a experiência digital.'],
      ['Relatórios executivos por campanha', 'Dashboards e Analytics', 'Painéis por campanha, canal, motivo de contato, SLA e satisfação.', 'Demonstra resultados objetivos para os clientes da agência.'],
      ['Atendimento em crises de comunicação', 'Central de Contingência', 'Operação rápida para absorver volume e padronizar respostas em momentos críticos.', 'Reduz impacto reputacional e dá controle à marca.'],
      ['Operações sazonais', 'Equipes sob demanda', 'Times temporários para Páscoa, Natal, Black Friday, férias e datas promocionais.', 'Flexibilidade operacional sem custo permanente.'],
      ['Suporte ao consumidor final', 'Customer Care', 'Atendimento humano e estruturado para dúvidas, reclamações e acompanhamento.', 'Aumenta fidelização e percepção positiva das marcas atendidas.']
    ];
  }
  if(seg.includes('avia')){
    return [
      ['Atendimento 24/7', 'SAC 24/7 ANAC', 'Cobertura contínua para passageiros, contingências e tratativas críticas.', 'Reduz atrito, protege SLA e organiza demandas regulatórias.'],
      ['Experiência do passageiro', 'Atendimento bilíngue e multicanal', 'Suporte em voz, WhatsApp, e-mail e formulários.', 'Melhora jornada em informação, cancelamento, bagagem e reacomodação.'],
      ['Gestão operacional', 'Relatórios de SLA e motivos de contato', 'Leitura por canal, motivo, pico, reincidência e tempo de resposta.', 'Ajuda a enxergar gargalos e oportunidades de automação.'],
      ['Qualidade', 'QA e monitoria de atendimento', 'Amostras semanais, critérios de qualidade e plano de melhoria.', 'Eleva padrão de resposta e reduz risco regulatório.']
    ];
  }
  if(seg.includes('turismo')){
    return [
      ['Atendimento ao viajante', 'SAC multicanal', 'Centraliza dúvidas, alterações e suporte em canais digitais e voz.', 'Reduz atrito em jornadas de compra e pós-venda.'],
      ['Relacionamento', 'WhatsApp corporativo e e-mail estruturado', 'Aumenta velocidade de resposta e registro do histórico.', 'Garante rastreabilidade e melhora experiência.'],
      ['Gestão', 'Relatórios gerenciais', 'Mostra principais demandas, tempos e oportunidades comerciais.', 'Apoia leitura semanal e mensal da operação.']
    ];
  }
  if(seg.includes('varejo') || seg.includes('franqu')){
    return [
      ['Atendimento por unidade', 'SAC+ por loja/unidade', 'Organiza demandas por origem e melhora a leitura de performance.', 'Mostra problemas recorrentes por loja, região ou franquia.'],
      ['Reputação', 'Reclame Aqui, PROCON e redes sociais', 'Tratativa estruturada de casos sensíveis.', 'Reduz risco de imagem e melhora gestão de reclamações.'],
      ['Padronização', 'Base de conhecimento e scripts', 'Garante consistência no atendimento em escala.', 'Aumenta controle sem perder capilaridade.']
    ];
  }
  if(seg.includes('finance')){
    return [
      ['Atendimento sensível', 'SAC especializado', 'Registro, rastreabilidade e segurança na tratativa.', 'Reduz risco operacional e melhora confiança do cliente.'],
      ['Compliance', 'QA e trilha de auditoria', 'Critérios de qualidade, amostras e histórico auditável.', 'Aumenta controle sobre aderência operacional.'],
      ['Gestão', 'Dashboards e relatórios executivos', 'Visão mensal de demanda, SLA e performance.', 'Apoia decisão com dados.']
    ];
  }
  if(seg.includes('tecnologia')){
    return [
      ['Suporte ao cliente', 'Service desk e SAC multicanal', 'Organiza demandas técnicas e comerciais em uma operação única.', 'Reduz dispersão e melhora tempo de resposta.'],
      ['Escala', 'Automação e base de conhecimento', 'Respostas padronizadas para dúvidas frequentes.', 'Reduz repetição e libera especialistas.'],
      ['Gestão', 'Relatórios de SLA e backlog', 'Mostra gargalos e oportunidades de melhoria operacional.', 'Dá visibilidade para priorização.']
    ];
  }
  return [
    ['Atendimento', 'SAC multicanal', 'Centraliza demandas e melhora a experiência do cliente.', 'Reduz perda de informação e melhora velocidade de resposta.'],
    ['Gestão', 'Relatórios gerenciais', 'Visão mensal de demanda, SLA, qualidade e oportunidades.', 'Ajuda a gestão a decidir com dados.'],
    ['Qualidade', 'QA e monitoria', 'Avaliação de atendimentos e plano de melhoria.', 'Aumenta consistência e reduz falhas.'],
    ['Relacionamento', 'NPS/CSAT', 'Mede satisfação e identifica oportunidades de evolução.', 'Transforma atendimento em inteligência comercial.']
  ];
}

function strategicIdeas(company){
  if(isAgencyOrCampaignCompany(company)){
    return [
      ['Campaign Experience Center (CEC)', 'A Fri.to vende criatividade; a Daleth entrega a experiência completa da campanha.', 'Operar SAC da campanha, WhatsApp oficial, dúvidas sobre promoções, cadastro de participantes, suporte a consumidores, acompanhamento de brindes e pesquisa de satisfação.'],
      ['Consumer Intelligence Lab', 'Cada atendimento vira inteligência para próximas campanhas.', 'Entregar relatório executivo com dúvidas, reclamações, elogios, sugestões, objeções, intenção de compra, percepção da campanha e oportunidades para novos produtos.'],
      ['Proposta de valor', 'Transformar campanhas publicitárias em experiências completas de relacionamento.', 'Posicionar a Daleth como parceira que gera dados estratégicos para a agência e seus clientes tomarem decisões mais inteligentes.']
    ];
  }
  return [
    ['Diagnóstico de experiência', 'Transformar atendimento em leitura executiva do cliente.', 'Mapear canais, motivos de contato, SLA, recorrências e oportunidades de ganho operacional.'],
    ['Central inteligente', 'Unir operação, qualidade e dados em um único modelo.', 'Gerar atendimento melhor e relatórios que ajudem a empresa a decidir.']
  ];
}

function briefLines(company){
  const name = text(company.companyName);
  const segment = text(company.segment) || 'Não informado';
  const site = text(company.site) || 'Não informado';
  const rows = solutionRows(company);
  const ideas = strategicIdeas(company);
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
    'Ideias estratégicas',
    ...ideas.map(row=>`- ${row[0]}: ${row[1]} ${row[2]}`),
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
    const isTitle = !line.startsWith('-') && ['Objetivo do briefing','Hipóteses comerciais iniciais','Soluções sugeridas','Ideias estratégicas','Perguntas para a primeira conversa','Próximo passo recomendado'].includes(line);
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
    {header:'Necessidade do cliente',key:'pain',width:34},
    {header:'Solução Daleth',key:'solution',width:30},
    {header:'Como a Daleth entrega',key:'delivery',width:54},
    {header:'Benefício estratégico',key:'value',width:48}
  ];
  worksheet.getRow(1).font = {bold:true,color:{argb:'FFFFFFFF'}};
  worksheet.getRow(1).fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF061B35'}};
  worksheet.getRow(1).alignment = {vertical:'middle',wrapText:true};
  solutionRows(company).forEach(row=>{
    worksheet.addRow({
      company:text(company.companyName),
      segment:text(company.segment) || 'Não informado',
      pain:row[0],
      solution:row[1],
      delivery:row[2],
      value:row[3]
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

  const ideas = workbook.addWorksheet('Ideias Estratégicas');
  ideas.columns = [
    {header:'Ideia',key:'idea',width:34},
    {header:'Conceito',key:'concept',width:52},
    {header:'Aplicação Comercial',key:'application',width:70}
  ];
  ideas.getRow(1).font = {bold:true,color:{argb:'FFFFFFFF'}};
  ideas.getRow(1).fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF00A0D1'}};
  strategicIdeas(company).forEach(row=>ideas.addRow({idea:row[0],concept:row[1],application:row[2]}));
  ideas.eachRow(row=>{
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
  ideas.views = [{state:'frozen',ySplit:1}];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function createOnboardingFiles(token,folderPath,company){
  const fileName = asciiFileName(company.companyName);
  const artifacts = [];
  const warnings = [];
  const files = [
    {
      type:'briefing',
      name:`Briefing - ${fileName}.pdf`,
      path:`${folderPath}/Briefing - ${fileName}.pdf`,
      create:()=>generateBriefingPdf(company)
    },
    {
      type:'matrix',
      name:`Matriz de Solucoes - ${fileName}.xlsx`,
      path:`${folderPath}/Matriz de Solucoes - ${fileName}.xlsx`,
      create:()=>generateSolutionMatrix(company)
    }
  ];

  for(const file of files){
    try {
      const buffer = await file.create();
      const uploaded = await uploadDropboxFile(token,file.path,buffer);
      artifacts.push({type:file.type,name:file.name,path:uploaded?.path_display || file.path});
    } catch (error) {
      console.error(`Falha ao enviar ${file.name} ao Dropbox:`, error);
      warnings.push(`${file.name}: ${friendlyDropboxUploadError(error)}`);
    }
  }

  return {artifacts,warnings};
}

export default async function handler(request,response){
  if(request.method !== 'POST'){
    response.setHeader('Allow','POST');
    json(response,405,{ok:false,error:'Método não permitido.'});
    return;
  }

  const token = await dropboxAccessToken();
  if(!token){
    json(response,500,{ok:false,error:'Configure DROPBOX_ACCESS_TOKEN no Vercel ou, para produção, DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY e DROPBOX_APP_SECRET.'});
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
    const {artifacts,warnings} = await createOnboardingFiles(token,folderPath,company);
    const sharedUrl = await createSharedLink(token,path);
    json(response,200,{
      ok:true,
      folderName,
      path:folderPath,
      sharedUrl,
      artifacts,
      artifactWarning:warnings.join(' | '),
      alreadyExists:folder?.alreadyExists === true
    });
  } catch (error) {
    console.error('Falha ao criar pasta no Dropbox:', error);
    json(response,error.status || 500,{
      ok:false,
      error:friendlyDropboxError(error)
    });
  }
}
