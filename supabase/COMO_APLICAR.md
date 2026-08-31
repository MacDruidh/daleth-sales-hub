# Como aplicar o Supabase no CRM Daleth

## 1. Abrir o painel SQL

No Supabase, entre no projeto do CRM e abra:

SQL Editor > New query

## 2. Rodar o schema

Copie todo o conteudo de `supabase/schema.sql`, cole no SQL Editor e clique em Run.

Esse script pode ser rodado mais de uma vez. Ele cria ou atualiza:

- tabelas do CRM;
- produtos iniciais;
- perfis de usuarios;
- regras de seguranca;
- permissoes por papel.

## 3. Confirmar o usuario CEO

Depois de rodar o schema, abra:

Authentication > Users

Confirme que o usuario do Sergio existe. Depois, no SQL Editor, rode um ajuste trocando o e-mail abaixo pelo e-mail real do Sergio:

```sql
update public.profiles
set role = 'CEO',
    can_view_dashboard = true
where id = (
  select id
  from auth.users
  where lower(email) = lower('sergio@exemplo.com')
);
```

## 4. Entrar no CRM

Abra o CRM, faca login com o usuario CEO e acesse:

Perfis

Nessa tela, ajuste os demais usuarios para:

- `Comercial`: pode criar, editar e excluir dados comerciais;
- `Reserva`: pode consultar, mas nao altera dados;
- `CEO`: ve dashboard executivo e administra perfis.

## 5. Importar dados

Com o usuario CEO ou Comercial, use a tela:

Importacao

Ela envia empresas, contatos, oportunidades, atividades e notas para o Supabase usando `legacy_id`, evitando duplicidade em novas importacoes.

## Auditoria exclusiva do Sergio

Para ativar a trilha de alteracoes, execute separadamente `supabase/audit.sql`.
Instrucoes, cobertura e limites em `supabase/AUDITORIA.md`. Nao reexecute o schema
completo apenas para ativar essa funcionalidade.
