# Supabase Fase 2 - Planejamento

## Contexto migrado

O CRM Daleth Sales Hub ja esta funcional em React/Vite e conectado ao Supabase de forma parcial.

Hoje o app:

- Carrega empresas, contatos, oportunidades, atividades, notas, contratos e produtos de tabelas relacionais quando existem dados.
- Mantem fallback em `localStorage` e em `crm_state`.
- Ja possui uma tela provisoria de escolha de perfil: Sergio, Katia, Paulo, Oyas e Reserva.
- Ja tem importacao do arquivo Pipedrive em `public/pipedrive-import-daleth.json`.
- Ainda nao usa login real do Supabase Auth.
- Ainda nao grava todos os cadastros diretamente nas tabelas relacionais; varias telas alteram arrays locais e depois salvam no estado geral.

## Estado tecnico atual

Arquivos principais:

- `src/main.jsx`: aplicacao inteira, telas, hooks de dados e regras do CRM.
- `src/lib/supabase.js`: cliente Supabase usando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- `supabase/schema.sql`: schema inicial, desatualizado em relacao ao codigo atual.
- `.env.local`: credenciais locais do projeto Supabase.

Tabelas que o codigo atual espera encontrar:

- `crm_state`
- `products`
- `companies`
- `contacts`
- `opportunities`
- `activities`
- `notes`
- `contracts`

Campos importantes usados pelo codigo:

- `legacy_id` para preservar o ID antigo/local/Pipedrive.
- Relacoes por `company_id`, `contact_id` e `opportunity_id`.
- `companies.website` e `companies.site`, com fallback no frontend.
- `contacts.contact_type` e `contacts.type`, com fallback no frontend.
- `opportunities.setup_value`, `contract_months`, `expected_close_date`, `next_step`.
- `activities.activity_type`.
- `notes.user_name`, `note_date`, `content`.

## Objetivo da Fase 2

Transformar o CRM em uma aplicacao com persistencia real no Supabase, sem perder a usabilidade atual.

A meta pratica:

1. Login real por usuario.
2. Regras de acesso por perfil.
3. Leitura e gravacao direta nas tabelas relacionais.
4. `crm_state` apenas como fallback ou removido no final.
5. RLS ativado com politicas coerentes.
6. Importacao Pipedrive salvando no banco, nao apenas no estado local.

## Ordem recomendada

### 1. Congelar schema real

Atualizar `supabase/schema.sql` para refletir o que o frontend ja usa hoje:

- Criar `crm_state`.
- Trocar/alinhar `deals` versus `opportunities`.
- Trocar/alinhar `deal_notes` versus `notes`.
- Incluir `products`.
- Incluir `contracts`.
- Incluir colunas `legacy_id`.
- Garantir indices para `legacy_id`, `company_id`, `contact_id` e `opportunity_id`.

### 2. Criar camada de dados

Extrair acesso Supabase para helpers, por exemplo:

- `src/lib/crmRepository.js`
- `listCompanies`, `createCompany`, `updateCompany`, `deleteCompany`
- `listContacts`, `createContact`, `updateContact`, `deleteContact`
- `listOpportunities`, `createOpportunity`, `updateOpportunity`, `deleteOpportunity`
- `listActivities`, `listNotes`, `listContracts`, `listProducts`

Isso reduz risco porque hoje a persistencia esta espalhada no `main.jsx`.

### 3. Gravar CRUD nas tabelas

Migrar uma entidade por vez:

1. Produtos
2. Empresas
3. Contatos
4. Oportunidades
5. Atividades
6. Notas
7. Contratos

Para cada entidade:

- Carregar do Supabase.
- Criar no Supabase.
- Editar no Supabase.
- Excluir no Supabase.
- Atualizar a tela imediatamente apos sucesso.
- Manter fallback local apenas se Supabase falhar.

### 4. Autenticacao

Substituir a tela provisoria de perfil por Supabase Auth.

Usuarios planejados:

- Sergio: CEO, dashboard completo.
- Katia: Comercial.
- Paulo: Comercial.
- Oyas: Comercial.
- Reserva: leitura.

Regras iniciais:

- CEO ve tudo.
- Comercial ve pipeline, oportunidades, empresas, contatos, atividades, contratos e matriz.
- Reserva ve dados, mas nao cria/edita/exclui.
- Dashboard executivo fica restrito ao CEO.

### 5. RLS

Ativar RLS somente depois que Auth e CRUD estiverem funcionando.

Politicas iniciais sugeridas:

- Usuarios autenticados podem ler dados do CRM.
- `role = CEO` pode inserir, editar e excluir tudo.
- `role = Comercial` pode inserir e editar dados comerciais.
- `role = Reserva` apenas leitura.

### 6. Importacao Pipedrive no banco

Hoje a importacao alimenta os arrays do app. A Fase 2 deve:

- Validar o JSON.
- Fazer upsert em `companies`, `contacts`, `opportunities`, `activities` e `notes`.
- Usar `legacy_id` ou `pipedriveId` para evitar duplicidade.
- Mostrar resumo da importacao.

## Proximo passo imediato

O schema real esperado pelo app atual foi atualizado em `supabase/schema.sql`.

O CRUD de `companies` foi iniciado como primeira entidade completa, porque empresas sao base para contatos, oportunidades e contratos.

## Andamento desta continuacao

- `supabase/schema.sql` foi alinhado aos nomes usados pelo app atual: `opportunities`, `notes`, `contracts`, `products` e `crm_state`.
- Foram adicionados campos de compatibilidade como `legacy_id`, `website`, `contact_type`, `setup_value`, `contract_months`, `expected_close_date` e `activity_type`.
- Foram adicionados indices e triggers de `updated_at`.
- A tela de Empresas agora tenta criar, editar e excluir registros diretamente em `companies`.
- A tela de Contatos agora tenta criar, editar e excluir registros diretamente em `contacts`.
- Contatos convertem o `companyId` usado na interface para o `company_id` real do Supabase antes de gravar.
- A tela de Oportunidades agora tenta criar, editar e excluir registros diretamente em `opportunities`.
- A movimentacao de etapa no Pipeline agora tenta atualizar `opportunities.stage` no Supabase.
- Oportunidades convertem `companyId` e `contactId` da interface para `company_id` e `contact_id` reais do Supabase antes de gravar.
- A tela de Atividades agora tenta editar status, editar detalhes e excluir registros diretamente em `activities`.
- A pagina de oportunidade agora tenta criar atividades e notas diretamente em `activities` e `notes`.
- Atividades e notas convertem `dealId` da interface para `opportunity_id` real do Supabase antes de gravar.
- A tela de Contratos agora tenta criar, excluir e gerar contratos de oportunidades ganhas diretamente em `contracts`.
- Contratos convertem `companyId` e `dealId` da interface para `company_id` e `opportunity_id` reais do Supabase antes de gravar.
- A importacao Pipedrive agora tenta fazer upsert em lote direto no Supabase para `companies`, `contacts`, `opportunities`, `activities` e `notes`.
- A importacao preserva os IDs do arquivo como `legacy_id`, evitando duplicidade em reimportacoes.
- A tela provisoria de escolha de perfil foi substituida por login via Supabase Auth.
- O app restaura sessao Supabase ao abrir e carrega perfil da tabela `profiles`.
- O botao Sair agora faz `supabase.auth.signOut()`.
- O schema agora inclui gatilho para criar perfil basico em `profiles` quando um usuario novo for criado em Auth.
- O schema agora inclui RLS para `profiles`, `crm_state`, `products`, `companies`, `contacts`, `opportunities`, `activities`, `notes` e `contracts`.
- As politicas de RLS permitem leitura para usuarios autenticados, escrita para `CEO` e `Comercial`, e leitura sem escrita para `Reserva`.
- O frontend agora calcula `canWrite` a partir do perfil e esconde/desabilita acoes de escrita para `Reserva`.
- Perfil `Reserva` nao ve formularios de criacao, botoes de excluir, salvar alteracoes, mover pipeline, adicionar produto, criar contrato ou registrar atividades/notas.
- O menu do CEO agora inclui `Perfis`, uma tela para ajustar `CEO`, `Comercial` e `Reserva` na tabela `profiles`.
- Usuarios continuam sendo criados no Supabase Auth; a tela `Perfis` administra as permissoes usadas pelo CRM.
- Alteracao de perfis ficou restrita ao CEO no banco; usuarios sem perfil carregado entram como `Reserva` por seguranca.
- O schema agora regulariza perfis para usuarios ja existentes no Supabase Auth, nao apenas usuarios criados depois do gatilho.
- Foi criado `supabase/COMO_APLICAR.md` com o passo a passo para aplicar o banco, promover o CEO e ajustar perfis.
- A tela `Perfis` agora orienta aplicar `supabase/schema.sql` quando a tabela ainda nao estiver pronta.
- Foi criado `.env.example` com as variaveis necessarias para Supabase local e Vercel.
- Foi criado `vercel.json` para garantir que o CRM abra corretamente ao recarregar qualquer rota no dominio.
- O README foi atualizado com passos de execucao local, Supabase e deploy no Vercel.
- A tela de login agora possui `Esqueci minha senha`, enviando e-mail de redefinicao pelo Supabase Auth.
- Se o Supabase recusar a gravacao, o app ainda mantem fallback local para nao interromper o uso.

## Proximo passo recomendado agora

Aplicar o `supabase/schema.sql` no painel SQL do Supabase, criar usuarios reais no Supabase Auth e ajustar seus perfis pela tela `Perfis`.
