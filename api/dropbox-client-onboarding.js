const DROPBOX_API = 'https://api.dropboxapi.com/2';
const DEFAULT_ROOT_PATH = '/Daleth/1NovosClientes';

function text(value){
  return String(value ?? '').trim();
}

function json(response,status,payload){
  response.status(status).setHeader('Content-Type','application/json; charset=utf-8').send(JSON.stringify(payload));
}

function firstMeaningfulNamePart(name){
  const clean = text(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\w\s.-]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  const ignored = new Set(['a','as','o','os','de','da','das','do','dos','e','em','ltda','sa','s.a','me','epp','industria','comercio','comercial','servicos']);
  const first = clean.split(' ').find(part=>part && !ignored.has(part.toLowerCase()));
  return first || clean.split(' ')[0] || 'Cliente';
}

function folderNameForCompany(companyName){
  return firstMeaningfulNamePart(companyName).slice(0,48);
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

  const folderName = folderNameForCompany(companyName);
  const rootPath = process.env.DROPBOX_CLIENT_ROOT_PATH || DEFAULT_ROOT_PATH;
  const path = dropboxPath(rootPath,folderName);

  try {
    const folder = await createFolder(token,path);
    const sharedUrl = await createSharedLink(token,path);
    json(response,200,{
      ok:true,
      folderName,
      path:folder?.metadata?.path_display || path,
      sharedUrl,
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
