import nodemailer from 'nodemailer';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_SUPABASE_URL = 'https://jcrberqxejgnpjmhufgw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcmJlcnF4ZWpnbnBqbWh1Zmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTU4NTksImV4cCI6MjA5NjY5MTg1OX0.Gskof5uTHTZK3waJ2f6klicRuDAJ_qZ6qylMK3KPX_w';

function parseAddresses(value){
  return String(value || '').split(/[;,]/).map(item=>item.trim()).filter(Boolean);
}

function escapeHtml(value){
  return String(value || '').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;',
  }[char]));
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

    const {to,cc,subject,body} = request.body || {};
    const recipients = parseAddresses(to);
    const copies = parseAddresses(cc);
    const allAddresses = [...recipients,...copies];
    if(!recipients.length || allAddresses.length > 10 || allAddresses.some(address=>!EMAIL_PATTERN.test(address))) return response.status(400).json({error:'Confira os endereços dos destinatários.'});
    if(!String(subject || '').trim() || String(subject).length > 200) return response.status(400).json({error:'Informe um assunto válido.'});
    if(!String(body || '').trim() || String(body).length > 20000) return response.status(400).json({error:'Informe uma mensagem válida.'});

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
    const result = await transporter.sendMail({
      from:{name:fromName,address:smtpUser},
      replyTo:user.email,
      to:recipients,
      cc:copies.length ? copies : undefined,
      subject:String(subject).trim(),
      text:cleanBody,
      html:`<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#132238">${escapeHtml(cleanBody).replace(/\n/g,'<br>')}</div>`,
    });
    return response.status(200).json({messageId:result.messageId,sender:smtpUser});
  } catch (error) {
    console.error('Falha no envio SMTP:',error);
    return response.status(500).json({error:'O servidor de e-mail não aceitou o envio agora.'});
  }
}
