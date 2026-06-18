# Backup e restauracao do Daleth Sales Hub

## O que esta protegido

A rotina usa a ferramenta oficial do Supabase para exportar diariamente os papeis, a estrutura e os dados do schema `public`, onde ficam os dados do CRM. Os arquivos sao validados, compactados, criptografados e guardados por 30 dias nos artefatos do GitHub Actions.

O backup nao inclui arquivos do Supabase Storage nem senhas dos usuarios do Supabase Auth. Atualmente o CRM nao depende do Storage, e os usuarios de acesso devem ser administrados separadamente no Supabase Auth.

## Horario e retencao

- Execucao automatica: todos os dias, aproximadamente a 00h17 no horario de Brasilia.
- Execucao manual: disponivel na aba `Actions` do repositorio.
- Retencao: 30 dias.
- Conteudo armazenado: somente o arquivo criptografado.

## Segredos obrigatorios no GitHub

Em `Settings > Secrets and variables > Actions`, cadastre:

- `SUPABASE_DB_URL`: URL completa de conexao `Session pooler`, obtida no botao `Connect` do projeto Supabase. A senha do banco deve estar preenchida e caracteres especiais precisam estar codificados na URL.
- `BACKUP_ENCRYPTION_PASSWORD`: senha longa e exclusiva usada para criptografar os backups.

A senha de criptografia deve ser guardada tambem fora do GitHub, em um gerenciador de senhas. Se ela for perdida, os arquivos nao poderao ser recuperados.

## Como verificar um backup

1. Abra `Actions > Backup diario do Supabase`.
2. Confirme que a execucao mais recente esta verde.
3. Abra a execucao e localize o arquivo na secao `Artifacts`.
4. Baixe o arquivo criptografado apenas quando precisar testar ou restaurar.

## Como abrir o arquivo

Use a mesma senha cadastrada em `BACKUP_ENCRYPTION_PASSWORD`:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in daleth-sales-hub-DATA.tar.gz.enc \
  -out daleth-sales-hub-DATA.tar.gz

tar -xzf daleth-sales-hub-DATA.tar.gz
```

O pacote contem `roles`, `schema`, `dados` e um manifesto com os codigos de integridade dos arquivos.

## Restauracao

Uma restauracao deve ser testada primeiro em outro projeto Supabase. Nao restaure diretamente sobre a producao sem revisar o arquivo e gerar um backup atual imediatamente antes.

Exemplo simplificado para um banco de teste, respeitando esta ordem:

```bash
psql "$DESTINATION_DB_URL" -f roles-DATA.sql
psql "$DESTINATION_DB_URL" -f schema-DATA.sql
psql "$DESTINATION_DB_URL" -f dados-DATA.sql
```

Depois da restauracao, valide empresas, contatos, oportunidades, atividades, contratos, produtos, notas e perfis antes de considerar o processo concluido.
