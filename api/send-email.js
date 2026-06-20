import nodemailer from 'nodemailer';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_SUPABASE_URL = 'https://jcrberqxejgnpjmhufgw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcmJlcnF4ZWpnbnBqbWh1Zmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTU4NTksImV4cCI6MjA5NjY5MTg1OX0.Gskof5uTHTZK3waJ2f6klicRuDAJ_qZ6qylMK3KPX_w';
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export const config = { maxDuration: 30 };

function parseAddresses(value){
  return String(value || '').split(/[;,]/).map(item=>item.trim()).filter(Boolean);
}

function escapeHtml(value){
  return String(value || '').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;',
  }[char]));
}

function downloadUrl(value){
  const url = new URL(String(value || ''));
  const hostname = url.hostname.toLowerCase();
  const allowed = hostname === 'dropbox.com' || hostname.endsWith('.dropbox.com') || hostname === 'db.tt' || hostname.endsWith('.dropboxusercontent.com');
  if(!allowed) throw new Error('INVALID_ATTACHMENT_URL');
  if(hostname === 'dropbox.com' || hostname.endsWith('.dropbox.com')) url.searchParams.set('dl','1');
  return url.toString();
}

function safeFilename(value,index){
  const clean = String(value || `anexo-${index + 1}`).replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').trim();
  return clean.slice(0,180) || `anexo-${index + 1}`;
}

async function downloadAttachments(items){
  const attachments = [];
  let totalBytes = 0;
  for(const [index,item] of items.entries()){
    if(Number(item?.bytes || 0) > MAX_ATTACHMENT_BYTES) throw new Error('ATTACHMENT_TOO_LARGE');
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),15000);
    let fileResponse;
    try {
      fileResponse = await fetch(downloadUrl(item?.url),{signal:controller.signal});
    } finally {
      clearTimeout(timeout);
    }
    if(!fileResponse.ok) throw new Error('ATTACHMENT_DOWNLOAD_FAILED');
    const declaredSize = Number(fileResponse.headers.get('content-length') || 0);
    if(declaredSize > MAX_ATTACHMENT_BYTES) throw new Error('ATTACHMENT_TOO_LARGE');
    const content = Buffer.from(await fileResponse.arrayBuffer());
    totalBytes += content.length;
    if(content.length > MAX_ATTACHMENT_BYTES || totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) throw new Error('ATTACHMENT_TOO_LARGE');
    attachments.push({filename:safeFilename(item?.name,index),content,contentType:fileResponse.headers.get('content-type') || undefined});
  }
  return attachments;
}

async function authenticatedUser(request){
  const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i,'').trim();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  if(!token || !supabaseUrl || !anonKey) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`,{
    headers:{Authorization:`Bearer ${token}`,apikey:anonKey},
  });
  if(!response.ok) return null;
  return response.json();
}

export default async function handler(request,response){
  if(request.method !== 'POST') return response.status(405).json({error:'Método não permitido.'});
  try {
    const user = await authenticatedUser(request);
    if(!user?.email || !user.email.toLowerCase().endsWith('@daleth.com.br')) return response.status(401).json({error:'Sessão inválida ou sem permissão para enviar e-mails.'});

    const {to,cc,subject,body,signature,attachments:attachmentItems=[]} = request.body || {};
    const recipients = parseAddresses(to);
    const copies = parseAddresses(cc);
    const allAddresses = [...recipients,...copies];
    if(!recipients.length || allAddresses.length > 10 || allAddresses.some(address=>!EMAIL_PATTERN.test(address))) return response.status(400).json({error:'Confira os endereços dos destinatários.'});
    if(!String(subject || '').trim() || String(subject).length > 200) return response.status(400).json({error:'Informe um assunto válido.'});
    if(!String(body || '').trim() || String(body).length > 20000) return response.status(400).json({error:'Informe uma mensagem válida.'});
    if(!Array.isArray(attachmentItems) || attachmentItems.length > 5) return response.status(400).json({error:'Selecione no máximo 5 anexos.'});
    const signatureMatch = String(signature || '').match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
    if(signature && !signatureMatch) return response.status(400).json({error:'A assinatura PNG não é válida.'});
    const signatureBuffer = signatureMatch ? Buffer.from(signatureMatch[1],'base64') : null;
    if(signatureBuffer?.length > 600 * 1024) return response.status(400).json({error:'A assinatura PNG deve ter no máximo 600 KB.'});

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if(!host || !smtpUser || !smtpPass) return response.status(503).json({error:'O servidor de e-mail ainda não foi configurado.'});

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure:String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false',
      auth:{user:smtpUser,pass:smtpPass},
      connectionTimeout:12000,
      greetingTimeout:12000,
      socketTimeout:20000,
    });
    const fromName = process.env.SMTP_FROM_NAME || 'Daleth Sales Hub';
    const cleanBody = String(body).trim();
    let downloadedAttachments;
    try {
      downloadedAttachments = await downloadAttachments(attachmentItems);
    } catch (error) {
      if(error?.message === 'INVALID_ATTACHMENT_URL') return response.status(400).json({error:'Somente arquivos do Dropbox podem ser anexados.'});
      if(error?.message === 'ATTACHMENT_TOO_LARGE') return response.status(400).json({error:'Cada anexo pode ter até 10 MB e o total até 20 MB.'});
      return response.status(400).json({error:'Não foi possível baixar um dos anexos no Dropbox. Confira o compartilhamento do arquivo.'});
    }
    const signatureCid = 'daleth-signature@crm';
    const mailAttachments = [...downloadedAttachments];
    if(signatureBuffer) mailAttachments.push({filename:'assinatura.png',content:signatureBuffer,contentType:'image/png',cid:signatureCid});
    const result = await transporter.sendMail({
      from:{name:fromName,address:smtpUser},
      replyTo:user.email,
      to:recipients,
      cc:copies.length ? copies : undefined,
      subject:String(subject).trim(),
      text:cleanBody,
      html:`<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#132238">${escapeHtml(cleanBody).replace(/\n/g,'<br>')}${signatureBuffer ? `<br><br><img src="cid:${signatureCid}" alt="Assinatura" style="display:block;max-width:520px;max-height:180px;width:auto;height:auto">` : ''}</div>`,
      attachments:mailAttachments.length ? mailAttachments : undefined,
    });
    const acceptedCount = Array.isArray(result.accepted) ? result.accepted.length : 0;
    if(!acceptedCount) return response.status(502).json({error:'O servidor de e-mail não aceitou nenhum destinatário.'});
    return response.status(200).json({messageId:result.messageId,sender:smtpUser,attachments:downloadedAttachments.map(item=>item.filename),acceptedCount,status:'Aceito pelo servidor'});
  } catch (error) {
    console.error('Falha no envio SMTP:',error);
    return response.status(500).json({error:'O servidor de e-mail não aceitou o envio agora.'});
  }
}
