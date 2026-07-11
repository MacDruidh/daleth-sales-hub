# Daleth Sales Hub Professional

CRM comercial interno da Daleth AC.

## Rodar localmente

```bash
npm install --legacy-peer-deps
npm run dev
```

Abrir o endereco mostrado pelo terminal, normalmente:

```text
http://localhost:5173
```

## Variaveis de ambiente

Crie um arquivo `.env.local` com:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

No Vercel, cadastre as mesmas variaveis em:

Project Settings > Environment Variables

## Supabase

Antes de usar em producao:

1. Aplique `supabase/schema.sql` no SQL Editor do Supabase.
2. Garanta que o usuario CEO exista no Supabase Auth.
3. Promova o CEO seguindo `supabase/COMO_APLICAR.md`.
4. Ajuste os demais usuarios na tela `Perfis`.
5. Importe os dados pela tela `Importacao`.

## Deploy

Configuração esperada no Vercel:

- Build Command: `npm run build`
- Output Directory: `dist`
- Variaveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `DROPBOX_ACCESS_TOKEN`
- Opcional: `DROPBOX_CLIENT_ROOT_PATH=/Daleth/1Novos Clientes`
- Dominio: `crm.daleth.com.br`

O arquivo `vercel.json` garante que recarregar qualquer rota do app continue abrindo o CRM.

## Backups

O banco do CRM possui uma rotina de backup diario criptografado com retencao de 30 dias. A configuracao dos segredos, a verificacao e o processo seguro de restauracao estao descritos em `BACKUP_E_RESTAURACAO.md`.

## Identidade visual

- Cor principal: `#00A0D1`
- Fundo institucional: `#061B35`
- Logo em `public/daleth-logo.svg`
