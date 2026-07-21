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
    return error.message || 'Dropbox recusou a operação porque o token expirou ou foi revogado.';
  }
  if(error?.status === 403){
    return 'Dropbox recusou a operação por falta de permissão. Revise as permissões do app Dropbox.';
  }
  return error?.message || 'Falha ao criar pasta no Dropbox.';
}

function dropboxRefreshConfig(){
  const refreshToken = text(process.env.DROPBOX_REFRESH_TOKEN);
  const appKey = text(process.env.DROPBOX_APP_KEY);
  const appSecret = text(process.env.DROPBOX_APP_SECRET);
  const missing = [
    refreshToken ? '' : 'DROPBOX_REFRESH_TOKEN',
    appKey ? '' : 'DROPBOX_APP_KEY',
    appSecret ? '' : 'DROPBOX_APP_SECRET'
  ].filter(Boolean);
  return {refreshToken,appKey,appSecret,missing,hasAny:!!(refreshToken || appKey || appSecret),hasAll:missing.length === 0};
}

async function refreshDropboxAccessToken(){
  const {refreshToken,appKey,appSecret,missing,hasAny,hasAll} = dropboxRefreshConfig();
  if(!hasAny) return '';
  if(!hasAll){
    const error = new Error(`Refresh token do Dropbox incompleto no Vercel. Faltando: ${missing.join(', ')}.`);
    error.status = 500;
    throw error;
  }

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
    const error = new Error(`Dropbox não aceitou a renovação do token (${response.status}). Revise DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY e DROPBOX_APP_SECRET no Vercel. Detalhe: ${data?.error_description || data?.error || 'sem detalhe'}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return text(data?.access_token);
}

async function dropboxAccessToken(){
  const refreshed = await refreshDropboxAccessToken();
  if(refreshed) return {token:refreshed,source:'refresh'};
  const accessToken = text(process.env.DROPBOX_ACCESS_TOKEN);
  return {token:accessToken,source:accessToken ? 'access' : ''};
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
      ['Consumidores sem canal centralizado para dúvidas de campanhas e marcas atendidas', 'SAC Omnichannel', 'Operar telefone, WhatsApp, chat, e-mail e redes sociais com scripts por campanha, registro dos motivos e escalação para a agência quando necessário.', 'Ampliar a entrega da agência aos clientes e transformar mídia em relacionamento mensurável.', 'Volume por canal, TMA, SLA de primeira resposta, taxa de resolução, CSAT.'],
      ['Picos de demanda em campanhas promocionais com prazo curto', 'Central de Atendimento Temporária', 'Montar operação sob demanda para regulamento, participação, dúvidas, problemas de cadastro e acompanhamento de solicitações.', 'Escalar campanhas sem aumentar estrutura fixa e reduzir risco operacional no período promocional.', 'Volume diário, SLA, backlog, custo por contato, taxa de resolução.'],
      ['Lançamentos de produtos exigindo discurso padronizado e resposta rápida', 'Operação Dedicada por Campanha', 'Treinar equipe com FAQ do produto, tom da marca, objeções esperadas e fluxos de escalonamento para casos críticos.', 'Melhorar a experiência do consumidor no momento mais sensível do lançamento.', 'Tempo de resposta, motivos de contato, reincidência, satisfação, ocorrências críticas.'],
      ['Reclamações públicas ameaçando reputação das marcas clientes', 'Central de Reputação Digital', 'Tratar Reclame Aqui, PROCON e redes sociais com triagem, resposta, acompanhamento, classificação de causa raiz e relatório de casos sensíveis.', 'Proteger imagem das marcas e reduzir impacto reputacional.', 'Tempo de resposta pública, taxa de solução, nota Reclame Aqui, casos escalados, reincidência.'],
      ['Participantes de sampling e eventos com dúvidas sobre retirada, brindes e regras', 'Central de Informações', 'Operar canais digitais e voz para orientar consumidores, promotores e parceiros durante ativações presenciais ou híbridas.', 'Aumentar engajamento e reduzir ruído operacional durante a campanha.', 'Contatos por evento, SLA, dúvidas recorrentes, taxa de abandono, satisfação.'],
      ['Comentários e dúvidas em redes sociais sem tratamento estruturado', 'Social Care', 'Monitorar menções, classificar interações, responder dúvidas simples, escalar reclamações e consolidar aprendizados por marca/campanha.', 'Fortalecer a marca e reduzir exposição negativa em canais sociais.', 'Tempo de resposta social, sentimento, volume por motivo, interações resolvidas, escalonamentos.'],
      ['Influenciadores, promotores e parceiros precisando de acompanhamento operacional', 'Back Office de Campanhas', 'Controlar cadastros, pendências, envio de materiais, orientações, status de ação e comunicação com envolvidos.', 'Melhorar coordenação entre agência, campo, influenciadores e cliente final.', 'Pendências abertas, tempo de regularização, cumprimento de prazos, retrabalho, produtividade.'],
      ['Campanhas encerradas sem medição estruturada da experiência do consumidor', 'NPS / CSAT', 'Aplicar pesquisas pós-interação ou pós-campanha, segmentar respostas por canal e consolidar aprendizados executivos.', 'Comprovar resultado além da mídia e orientar evolução das próximas campanhas.', 'NPS, CSAT, taxa de resposta, temas positivos/negativos, variação por campanha.'],
      ['Feedback dos consumidores disperso e pouco aproveitado pela criação', 'Voice of Consumer (VOC)', 'Classificar dúvidas, reclamações, elogios, sugestões, objeções e intenção de compra geradas nos contatos da campanha.', 'Transformar atendimento em inteligência para campanhas futuras e novos produtos.', 'Top motivos, intenção de compra, objeções, elogios, oportunidades identificadas.'],
      ['Distribuidores, PDVs e parceiros sem canal B2B organizado durante ações', 'Central B2B', 'Atender parceiros comerciais, pontos de venda e distribuidores com fluxo específico para dúvidas, materiais, prazos e status.', 'Reduzir perda de informação e melhorar relacionamento operacional com a cadeia.', 'SLA B2B, chamados por parceiro, pendências, tempo de resolução, recorrência.'],
      ['Leads gerados em campanhas sem qualificação comercial imediata', 'Inside Sales / Lead Qualification', 'Qualificar leads capturados em landing pages, eventos e ativações, priorizando intenção, perfil, urgência e próximo passo.', 'Aumentar conversão comercial dos investimentos de campanha.', 'Taxa de contato, taxa de qualificação, conversão para reunião, tempo até primeiro contato, receita potencial.'],
      ['Consumidores de e-commerce abandonando compra por dúvidas ou insegurança', 'SAC Digital', 'Responder dúvidas sobre produto, entrega, pagamento, troca e pós-venda em canais digitais integrados à jornada de compra.', 'Reduzir abandono e proteger a experiência digital das marcas.', 'Abandono recuperado, conversão assistida, tempo de resposta, motivos de dúvida, CSAT.'],
      ['Clientes da agência pedindo comprovação objetiva de resultado operacional', 'Dashboards e Analytics', 'Entregar painéis por campanha, canal, motivo, SLA, satisfação, volume, riscos e recomendações executivas.', 'Demonstrar valor concreto e apoiar renovação/expansão de contratos da agência.', 'SLA, volume, CSAT, NPS, custo por contato, insights acionáveis.'],
      ['Crises de comunicação exigindo resposta rápida e padronizada', 'Central de Contingência', 'Ativar operação emergencial com FAQ aprovado, roteiros de resposta, fila prioritária, monitoramento e relatório de crise.', 'Reduzir impacto reputacional e dar controle à marca em momentos críticos.', 'Tempo de ativação, volume crítico, SLA, casos resolvidos, sentimento.'],
      ['Datas sazonais com demanda acima da capacidade normal', 'Equipes sob demanda', 'Dimensionar agentes temporários para Páscoa, Natal, Black Friday, férias e datas promocionais, com supervisão e relatório por período.', 'Ganhar flexibilidade operacional sem custo permanente.', 'Acurácia de dimensionamento, ocupação, SLA, custo por contato, backlog.']
    ];
  }
  if(seg.includes('avia')){
    return [
      ['Passageiros sem resposta contínua em ocorrências fora do horário comercial', 'SAC 24/7 ANAC', 'Operar atendimento contínuo por voz, WhatsApp, e-mail e formulários para informação, cancelamento, alteração e contingência.', 'Reduzir atrito, proteger SLA e organizar demandas regulatórias.', 'SLA, tempo de primeira resposta, abandono, resolução no primeiro contato, reclamações ANAC.'],
      ['Demandas de bagagem extraviada exigindo acompanhamento até solução', 'Back Office Operacional', 'Registrar ocorrência, acompanhar status, atualizar passageiro e escalar pendências para áreas responsáveis.', 'Reduzir reincidência de contato e aumentar previsibilidade para o passageiro.', 'Tempo de atualização, contatos por caso, prazo de solução, satisfação.'],
      ['Reacomodações e cancelamentos gerando alto volume em contingências', 'Central de Contingência', 'Ativar equipe dedicada com roteiro aprovado, priorização por criticidade e comunicação padronizada.', 'Diminuir caos operacional e proteger percepção da companhia.', 'Tempo de ativação, volume tratado, SLA crítico, casos escalados.'],
      ['Passageiros internacionais precisando de suporte em outro idioma', 'Atendimento bilíngue', 'Disponibilizar agentes treinados para demandas em inglês/espanhol nos canais definidos.', 'Melhorar experiência e reduzir barreiras em rotas internacionais.', 'Volume bilíngue, SLA, resolução, CSAT por idioma.'],
      ['Motivos de contato pouco claros para decisão operacional', 'Dashboards de SLA e Motivos', 'Classificar contatos por motivo, canal, rota, horário e criticidade com leitura executiva semanal/mensal.', 'Identificar gargalos e oportunidades de automação ou melhoria operacional.', 'Top motivos, variação semanal, SLA por canal, reincidência.'],
      ['Risco de respostas inconsistentes em temas regulatórios', 'QA e Monitoria ANAC', 'Monitorar amostras, avaliar aderência a scripts e gerar plano de melhoria com supervisão.', 'Elevar padrão de resposta e reduzir risco regulatório.', 'Nota de qualidade, aderência, falhas críticas, evolução por agente.'],
      ['Consultas repetitivas sobre documentos, horários e regras', 'Base de Conhecimento e Scripts', 'Criar FAQ operacional e roteiros por tipo de demanda para uso da equipe.', 'Acelerar respostas e reduzir retrabalho.', 'Tempo médio, reincidência, uso de artigos, taxa de resolução.'],
      ['Picos em feriados e alta temporada acima da capacidade interna', 'Equipes sob demanda', 'Dimensionar reforço temporário por previsão de volume e horários críticos.', 'Manter SLA em períodos de alta sem estrutura fixa permanente.', 'Ocupação, SLA, backlog, custo por contato.'],
      ['Casos sensíveis sem registro executivo consolidado', 'Relatório Executivo de Ocorrências', 'Consolidar casos críticos, status, causa, impacto e recomendação de ação.', 'Dar controle à gestão e reduzir exposição reputacional.', 'Casos críticos, tempo de fechamento, causas raiz, reincidência.'],
      ['Passageiros sem medição estruturada de satisfação pós-atendimento', 'NPS / CSAT', 'Coletar satisfação após atendimento e cruzar por canal, motivo e rota.', 'Identificar pontos de melhoria na jornada e priorizar correções.', 'NPS, CSAT, taxa de resposta, detratores por motivo.']
    ];
  }
  if(seg.includes('turismo')){
    return [
      ['Viajantes com dúvidas antes da compra e baixa velocidade de resposta', 'SAC multicanal', 'Operar voz, WhatsApp e e-mail para dúvidas de pacote, reserva, documentação e condições comerciais.', 'Aumentar confiança e reduzir perda de venda por demora.', 'Tempo de resposta, conversão assistida, abandono, CSAT.'],
      ['Cotações sem acompanhamento até decisão do cliente', 'Inside Sales / Follow-up Comercial', 'Realizar follow-up estruturado, registrar objeções e acionar vendedor com leads quentes.', 'Aumentar conversão de cotações em vendas.', 'Taxa de contato, conversão, tempo até follow-up, motivos de perda.'],
      ['Alterações de viagem gerando retrabalho e contatos dispersos', 'Back Office de Reservas', 'Acompanhar solicitações de alteração, documentos, pagamento, voucher e pendências operacionais.', 'Reduzir retrabalho e dar rastreabilidade ao atendimento.', 'Pendências abertas, prazo de solução, contatos por reserva.'],
      ['Clientes sem suporte claro durante a viagem', 'Central de Suporte ao Viajante', 'Disponibilizar canal para emergências, dúvidas, remarcações e orientação em destino.', 'Melhorar experiência e reduzir risco de insatisfação.', 'SLA emergencial, casos resolvidos, NPS viagem, reincidência.'],
      ['Reclamações pós-viagem sem tratamento padronizado', 'Central de Reputação Digital', 'Tratar reclamações, classificar causa raiz e acompanhar retorno até encerramento.', 'Proteger marca e recuperar clientes insatisfeitos.', 'Tempo de resposta, taxa de solução, reclamações recorrentes, recuperação.'],
      ['Base de clientes sem ações estruturadas de recompra', 'Retenção e Reativação', 'Acionar clientes por perfil, destino, histórico e sazonalidade com abordagem consultiva.', 'Aumentar recompra e receita da base.', 'Taxa de reativação, receita recuperada, conversão por campanha.'],
      ['Demandas sazonais acima da capacidade comercial', 'Equipes sob demanda', 'Reforçar atendimento e back office em férias, feriados e campanhas promocionais.', 'Manter SLA sem elevar estrutura fixa.', 'SLA, ocupação, backlog, custo por contato.'],
      ['Baixa visibilidade sobre motivos de contato e perda comercial', 'Dashboards de Jornada do Viajante', 'Consolidar motivos, canais, objeções, prazos, conversão e satisfação por período.', 'Orientar decisões comerciais e operacionais.', 'Top motivos, conversão, SLA, NPS, motivos de perda.'],
      ['Atendimento inconsistente em destinos e regras complexas', 'Base de Conhecimento e Scripts', 'Criar roteiros por destino, documentação, política de alteração e perguntas frequentes.', 'Padronizar resposta e reduzir erros.', 'Aderência, TMA, retrabalho, erros críticos.'],
      ['Experiência do viajante sem medição após retorno', 'NPS / CSAT', 'Aplicar pesquisa pós-viagem e consolidar aprendizados por destino, fornecedor e canal.', 'Melhorar produto e priorizar fornecedores/procedimentos.', 'NPS, CSAT, taxa de resposta, detratores por destino.']
    ];
  }
  if(seg.includes('varejo') || seg.includes('franqu')){
    return [
      ['Clientes sem canal único para dúvidas de compra, troca e entrega', 'SAC Omnichannel', 'Operar telefone, WhatsApp, e-mail, chat e redes sociais com registro por loja, pedido e motivo.', 'Reduzir perda de informação e aumentar resolução no primeiro contato.', 'FCR, SLA, abandono, CSAT, contatos por pedido.'],
      ['Reclamações por unidade sem leitura comparativa', 'SAC+ por loja/unidade', 'Classificar demandas por loja, região, franquia e motivo, com relatório de reincidência.', 'Identificar problemas locais e reduzir recorrência.', 'Top lojas, reincidência, SLA por unidade, casos críticos.'],
      ['Reclame Aqui e PROCON impactando reputação da marca', 'Central de Reputação Digital', 'Responder, acompanhar e encerrar casos públicos com trilha de causa raiz.', 'Proteger imagem e recuperar clientes insatisfeitos.', 'Nota Reclame Aqui, tempo de resposta, taxa de solução, reabertura.'],
      ['Picos sazonais em datas comerciais acima da capacidade interna', 'Equipes sob demanda', 'Dimensionar reforço para Black Friday, Natal, Dia das Mães e campanhas.', 'Manter SLA e conversão sem estrutura fixa permanente.', 'SLA, backlog, custo por contato, ocupação.'],
      ['Dúvidas de produto impedindo decisão de compra', 'SAC Digital Pré-venda', 'Atender dúvidas sobre produto, estoque, prazo, pagamento e política comercial.', 'Aumentar conversão assistida e reduzir abandono.', 'Conversão assistida, tempo de resposta, motivos de dúvida, receita recuperada.'],
      ['Trocas e devoluções gerando retrabalho operacional', 'Back Office de Pós-venda', 'Acompanhar solicitações, documentos, status logístico e comunicação com o cliente.', 'Reduzir contatos repetidos e custo operacional.', 'Prazo de solução, contatos por caso, retrabalho, CSAT.'],
      ['Campanhas promocionais sem suporte operacional dedicado', 'Central de Campanhas', 'Operar dúvidas de regulamento, cupom, participação e status de benefício.', 'Reduzir fricção e proteger resultado da campanha.', 'Volume campanha, SLA, taxa de resolução, reclamações.'],
      ['Clientes inativos sem abordagem estruturada de retorno', 'Retenção e Reativação', 'Acionar clientes por histórico, perfil e oferta, registrando objeções e próximos passos.', 'Recuperar receita da base e aumentar recompra.', 'Taxa de reativação, conversão, receita recuperada, opt-out.'],
      ['Atendimento inconsistente entre canais e lojas', 'Base de Conhecimento e Scripts', 'Criar scripts por política, produto, loja e exceções com atualização controlada.', 'Padronizar experiência e reduzir erro operacional.', 'Aderência, erros críticos, TMA, retrabalho.'],
      ['Gestão sem visão diária de motivos e gargalos', 'Dashboards e Analytics', 'Entregar painéis de demanda, SLA, motivos, loja, canal, satisfação e risco.', 'Apoiar decisão comercial e operacional com dados.', 'SLA, volume, CSAT, top motivos, lojas críticas.']
    ];
  }
  if(seg.includes('finance')){
    return [
      ['Clientes com dúvidas sensíveis exigindo rastreabilidade e segurança', 'SAC Especializado', 'Operar atendimento com registro completo, autenticação operacional, scripts aprovados e escalonamento por criticidade.', 'Reduzir risco operacional e aumentar confiança do cliente.', 'SLA, aderência, casos críticos, FCR, CSAT.'],
      ['Solicitações documentais sem acompanhamento padronizado', 'Back Office Financeiro', 'Controlar pendências, documentos, status, retorno ao cliente e passagem para áreas internas.', 'Reduzir atrasos, retrabalho e perda de informação.', 'Pendências abertas, prazo médio, retrabalho, backlog.'],
      ['Risco de respostas fora de política ou compliance', 'QA e Auditoria de Atendimento', 'Monitorar amostras, registrar falhas críticas e orientar correções por equipe/processo.', 'Aumentar aderência operacional e reduzir exposição.', 'Nota QA, falhas críticas, aderência, evolução mensal.'],
      ['Reclamações regulatórias e públicas exigindo controle executivo', 'Central de Reputação e Ouvidoria', 'Triar, tratar e acompanhar Reclame Aqui, PROCON e casos sensíveis com relatório executivo.', 'Reduzir risco reputacional e acelerar solução.', 'Tempo de resposta, taxa de solução, reabertura, causas raiz.'],
      ['Leads financeiros sem qualificação antes da equipe comercial', 'Lead Qualification', 'Qualificar interesse, perfil, urgência, documentação inicial e próximo passo.', 'Aumentar produtividade comercial e conversão.', 'Taxa de qualificação, conversão, tempo de contato, motivos de descarte.'],
      ['Base de clientes sem régua ativa de retenção', 'Retenção e Reativação', 'Acionar clientes por risco, vencimento, oportunidade e perfil com registro de objeções.', 'Reduzir churn e recuperar receita.', 'Churn evitado, receita recuperada, taxa de contato, conversão.'],
      ['Dúvidas repetitivas consumindo equipe especializada', 'Base de Conhecimento e Scripts', 'Criar roteiros aprovados para dúvidas frequentes, documentos, prazos e políticas.', 'Reduzir TMA e liberar especialistas para casos complexos.', 'TMA, uso da base, FCR, reincidência.'],
      ['Gestão sem leitura mensal de demanda e risco', 'Dashboards Executivos', 'Consolidar volume, SLA, motivos, qualidade, casos críticos e oportunidades comerciais.', 'Apoiar decisão com controle e previsibilidade.', 'SLA, volume, risco, QA, receita recuperada.'],
      ['Clientes sem medição de satisfação após tratativas sensíveis', 'NPS / CSAT', 'Aplicar pesquisas pós-atendimento por canal e tipo de solicitação.', 'Identificar pontos de atrito e priorizar melhorias.', 'NPS, CSAT, taxa de resposta, detratores por motivo.'],
      ['Picos de demanda em campanhas, vencimentos ou mudanças regulatórias', 'Equipes sob demanda', 'Dimensionar agentes treinados para absorver volumes temporários com supervisão.', 'Manter SLA sem aumentar estrutura permanente.', 'Ocupação, SLA, backlog, custo por contato.']
    ];
  }
  if(seg.includes('tecnologia')){
    return [
      ['Usuários abrindo demandas técnicas e comerciais em canais dispersos', 'Service Desk e SAC Multicanal', 'Centralizar chamados por voz, WhatsApp, e-mail e formulário, categorizando tipo, urgência e responsável.', 'Reduzir dispersão e melhorar tempo de resposta.', 'SLA, backlog, FCR, tempo de triagem, CSAT.'],
      ['Perguntas frequentes consumindo time técnico', 'Base de Conhecimento e Scripts', 'Criar respostas e fluxos para dúvidas recorrentes, implantação, acesso, cobrança e uso.', 'Reduzir repetição e liberar especialistas.', 'Deflexão, TMA, uso da base, reincidência.'],
      ['Leads inbound sem qualificação antes de vendas', 'SDR / Lead Qualification', 'Qualificar perfil, necessidade, urgência, stack, budget e próximo passo.', 'Aumentar produtividade comercial e conversão.', 'MQL, SQL, conversão, tempo até contato, motivos de descarte.'],
      ['Clientes novos sem acompanhamento na adoção inicial', 'Onboarding Assistido', 'Acompanhar primeiros acessos, dúvidas, pendências e checklist de implantação.', 'Acelerar ativação e reduzir churn inicial.', 'Tempo de ativação, tickets iniciais, adoção, CSAT onboarding.'],
      ['Renovações em risco sem sinalização operacional', 'Customer Care / Retenção', 'Monitorar sinais de risco, abrir contato ativo e registrar objeções, pendências e próximos passos.', 'Reduzir churn e proteger receita recorrente.', 'Churn evitado, renovações, health score, receita retida.'],
      ['Backlog sem leitura executiva para priorização', 'Dashboards de SLA e Backlog', 'Consolidar chamados por tipo, cliente, criticidade, SLA, idade e recorrência.', 'Dar visibilidade para priorizar produto, suporte e sucesso do cliente.', 'Backlog, aging, SLA, recorrência, top clientes.'],
      ['Clientes sem suporte em picos de implantação ou incidentes', 'Central de Contingência', 'Ativar fila dedicada para incidentes, comunicação padronizada e atualização por status.', 'Reduzir impacto percebido e controlar crise.', 'Tempo de ativação, volume crítico, SLA, status updates.'],
      ['Atendimento inconsistente entre agentes e canais', 'QA e Monitoria', 'Avaliar amostras, aderência técnica, clareza e resolução, com plano de melhoria.', 'Elevar consistência e reduzir retrabalho.', 'Nota QA, falhas críticas, retrabalho, FCR.'],
      ['Clientes usando pouco a solução por dúvidas operacionais', 'Campanhas de Adoção', 'Contato ativo com base segmentada para orientar uso, recursos e boas práticas.', 'Aumentar engajamento e expansão da base.', 'Adoção, contatos efetivos, expansão, uso de funcionalidades.'],
      ['Gestão sem feedback consolidado para roadmap', 'Voice of Customer (VOC)', 'Classificar sugestões, reclamações, dúvidas e objeções dos clientes em relatório para produto.', 'Transformar suporte em inteligência de evolução.', 'Top sugestões, bugs recorrentes, objeções, impacto por cliente.']
    ];
  }
  return [
    ['Leads entrando por canais dispersos sem triagem estruturada', 'Lead Qualification', 'Receber, classificar, priorizar e direcionar leads por perfil, necessidade e urgência.', 'Aumentar conversão e produtividade comercial.', 'Taxa de contato, MQL, SQL, tempo até contato, conversão.'],
    ['Clientes com dúvidas antes da compra sem resposta rápida', 'SAC Pré-venda Multicanal', 'Atender dúvidas por WhatsApp, e-mail, telefone e chat com scripts comerciais e registro dos motivos.', 'Reduzir perda de oportunidades e acelerar decisão.', 'SLA, conversão assistida, abandono, motivos de dúvida.'],
    ['Propostas enviadas sem acompanhamento sistemático', 'Follow-up Comercial', 'Executar cadência de contato, registrar objeções e acionar vendedor em oportunidades quentes.', 'Aumentar taxa de fechamento e reduzir oportunidades paradas.', 'Taxa de follow-up, conversão, aging de proposta, motivos de perda.'],
    ['Pedidos ou solicitações sem acompanhamento operacional claro', 'Back Office Operacional', 'Controlar pendências, documentos, status, retorno ao cliente e passagem entre áreas.', 'Reduzir retrabalho e aumentar previsibilidade.', 'Pendências, prazo médio, retrabalho, backlog.'],
    ['Ocorrências de clientes sem tratativa padronizada', 'SAC Omnichannel', 'Registrar, classificar, responder e escalar demandas por canal, motivo e criticidade.', 'Melhorar satisfação e reduzir reincidência.', 'FCR, SLA, reincidência, CSAT, reclamações.'],
    ['Clientes inativos sem ação de recuperação', 'Retenção e Reativação', 'Acionar base por histórico, perfil e oportunidade com abordagem consultiva.', 'Recuperar receita e ampliar recompra.', 'Taxa de reativação, receita recuperada, conversão, opt-out.'],
    ['Base sem medição de satisfação após interações importantes', 'NPS / CSAT', 'Aplicar pesquisas pós-atendimento, pós-venda ou pós-entrega e consolidar aprendizados.', 'Identificar atritos e priorizar melhorias.', 'NPS, CSAT, taxa de resposta, detratores por motivo.'],
    ['Demandas repetitivas consumindo equipe interna', 'Base de Conhecimento e Scripts', 'Criar roteiros, respostas e fluxos para dúvidas e processos recorrentes.', 'Reduzir tempo de atendimento e retrabalho.', 'TMA, FCR, reincidência, uso da base.'],
    ['Gestão sem visão mensal de volume, SLA e gargalos', 'Dashboards e Analytics', 'Entregar painéis de volume, canal, motivo, SLA, satisfação, risco e oportunidade.', 'Dar controle operacional e apoiar decisão executiva.', 'SLA, volume, top motivos, CSAT, backlog.'],
    ['Atendimentos sem avaliação de aderência e padrão', 'QA e Monitoria', 'Avaliar amostras, registrar falhas críticas, orientar equipe e acompanhar evolução.', 'Aumentar consistência e reduzir falhas operacionais.', 'Nota QA, falhas críticas, aderência, evolução por período.']
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
    ...rows.map(row=>`- ${row[2]} Resultado esperado: ${row[4]}`),
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
    {header:'Necessidade específica do cliente',key:'pain',width:42},
    {header:'Solução Daleth AC',key:'solution',width:30},
    {header:'Aplicação operacional proposta',key:'delivery',width:58},
    {header:'Resultado esperado',key:'value',width:42},
    {header:'Indicadores recomendados',key:'indicators',width:42}
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
      value:row[3],
      indicators:row[4]
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

  let token = '';
  let tokenSource = '';
  try {
    const tokenInfo = await dropboxAccessToken();
    token = tokenInfo.token;
    tokenSource = tokenInfo.source;
  } catch (error) {
    console.error('Falha ao obter token do Dropbox:', error);
    json(response,error.status || 500,{
      ok:false,
      error:friendlyDropboxError(error)
    });
    return;
  }
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
    if(error.status === 401 && tokenSource === 'access'){
      error.message = 'Dropbox recusou o DROPBOX_ACCESS_TOKEN atual. Isso confirma que o CRM está usando o token temporário, não o refresh token. No Vercel, confira se DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY e DROPBOX_APP_SECRET existem em Production e se houve Redeploy depois.';
    }
    if(error.status === 401 && tokenSource === 'refresh'){
      error.message = 'Dropbox recusou o token renovado via refresh. Revise as permissões do app Dropbox e gere novamente o DROPBOX_REFRESH_TOKEN.';
    }
    json(response,error.status || 500,{
      ok:false,
      error:friendlyDropboxError(error)
    });
  }
}
