# Auditoria do CRM

## Ativacao

1. Entre no projeto Supabase do Daleth Sales Hub como administrador.
2. No SQL Editor, abra uma consulta e execute todo o arquivo `supabase/audit.sql`.
3. Publique o frontend atualizado e entre novamente no CRM com a conta do Sergio.
4. O menu **Auditoria** aparecera somente para essa conta.

Nao e necessario reexecutar `schema.sql` em producao. A migracao e transacional,
reexecutavel e adiciona tabelas, funcoes e triggers sem alterar os dados comerciais
ou as politicas de acesso das tabelas existentes.

Na primeira execucao, a migracao encontra em `auth.users` a conta
`sergio.paulo@daleth.com.br` e guarda seu UUID em `dsh_audit.settings`.
Se nao houver exatamente uma conta correspondente, a migracao falha sem aplicar
alteracoes parciais. Nao substitua isso por verificacao de nome, cargo ou metadados.
Reexecutar o script nao redefine o UUID nem a data inicial. Uma eventual troca de
proprietario exige intervencao consciente de um administrador do banco.

## Como usar

Em Auditoria, selecione o usuario que realizou a acao (por exemplo, Paulo), o modulo,
a acao e/ou as datas, e clique em **Aplicar filtros**. Sem filtros, sao exibidas
as ultimas acoes de todos os usuarios, inclusive Sergio. A lista possui 50 itens
por pagina, sempre do mais recente para o mais antigo. **Atualizar** consulta
novamente o servidor. Nao existe polling continuo desse historico.

**Ver alteracoes** mostra cada campo alterado, valor anterior e novo valor, o ID
do usuario autenticado, o ID do registro e a transacao do banco. Em exclusoes, os
valores anteriores permanecem disponiveis mesmo que o registro ja nao exista.
Datas e horas sao exibidas em America/Sao_Paulo (GMT-3), independentemente do fuso
do dispositivo. Os limites de datas incluem todo o ultimo dia selecionado.

## Cobertura e limites

- Triggers das tabelas companies, contacts, opportunities, activities, notes,
  contracts, products e profiles: inclusao, alteracao e exclusao confirmadas.
- Colecoes de crm_state: interacoes, documentos/links, demandas e comentarios do
  Workspace, segmentos, etapas/ordem/historico, motivos de perda e metadados de
  importacao/restauracao. Itens com ID sao comparados individualmente.
- Reordenar listas de registros ou apenas atualizar timestamps nao gera eventos.
- As copias compartilhadas de companies, contacts, deals, activities, notes e
  contracts em crm_state sao caches, nao a fonte relacional oficial, e sao
  ignoradas para evitar duplicidade e falsa autoria durante sincronizacoes.
  Alteracoes que o CRM salva apenas no cache/fallback, sem confirmar na tabela
  oficial, nao estao nessa trilha. Isso inclui os fluxos legados que avisam
  "salvo localmente". A auditoria nao corrige esses fluxos de persistencia.
- Acoes anteriores a ativacao, logins, visualizacoes, tentativas fracassadas,
  arquivos alterados diretamente no Dropbox e o texto digitado sem salvar nao
  sao registrados. Nenhum historico retroativo e inferido de created_at/updated_at.
- O ator e auth.uid(), nao o responsavel/autor digitado no registro. Operacoes
  automaticas executadas na sessao de um usuario tambem levam esse ID; ele nao
  comprova um clique manual. SQL Editor/servicos sem sessao de usuario aparecem
  como "Sistema / administrador do banco", nunca como um usuario presumido.
- Exclusoes em cascata geram uma linha por registro afetado, com a mesma transacao.
  Uma acao de interface pode envolver varias gravacoes. Contagens representam
  alteracoes de registros, nao numero de cliques ou produtividade.

## Seguranca e verificacao

O menu e o componente verificam `crm_audit_access`. A protecao real e feita no
banco: RLS de leitura vinculada ao UUID fixo e revogacao de INSERT, UPDATE, DELETE
e TRUNCATE para todos os usuarios da aplicacao, inclusive o proprietario.
As funcoes internas nao sao executaveis pela API. O schema privado nao deve ser
adicionado aos schemas expostos pelo PostgREST. Nenhum log vai para localStorage
ou para crm_state. Nenhuma chave service_role e usada no frontend.

Como em qualquer banco, administradores SQL e credenciais administrativas de
infraestrutura continuam tendo poderes sobre os dados. A restricao exclusiva
vale para contas do CRM, nao e protecao contra o proprio administrador do Supabase.

Teste local: `npm ci` e `npm test`. Os testes usam PostgreSQL via PGlite em memoria,
sem ler ou gravar dados reais. `npm run build` valida o frontend. A fixture
`tests/ui/audit.html` permite verificar a tela localmente com dados ficticios.

Apos ativar, faca um teste controlado com um registro de teste: incluir, alterar
e excluir, conferindo as tres acoes com a conta do Sergio. Uma outra conta deve
continuar conseguindo trabalhar normalmente, sem enxergar o menu ou ler logs.
Nao executar os scripts de testes automatizados contra o banco de producao.

Nao ha limpeza automatica do historico nesta fase. Acompanhe o crescimento da
tabela no Supabase e defina posteriormente uma politica de retencao e backup.

## Desativar a coleta sem apagar o historico

Somente em caso de necessidade e por um administrador, remover os triggers
`dsh_audit_capture` das oito tabelas acima e de `public.crm_state` interrompe a
coleta sem excluir registros comerciais ou logs. Nao apagar crm_audit_log para
desabilitar o menu: restrinja/remova a configuracao de acesso no schema privado.
