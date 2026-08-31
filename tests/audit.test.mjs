import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { auditDateBounds, auditDateTime, auditValue, auditListQuery, auditError } from '../src/lib/audit.js';

const owner = '00000000-0000-4000-8000-000000000001';
const paulo = '00000000-0000-4000-8000-000000000002';
const anotherCEO = '00000000-0000-4000-8000-000000000003';
const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/audit.sql', import.meta.url), 'utf8');

test('Auditoria no PostgreSQL: integridade, cobertura e isolamento por identidade', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key, email text unique, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated, anon;
  `);
  await db.exec(schema);
  await db.exec(`
    insert into auth.users(id,email,raw_user_meta_data) values
    ('${owner}','sergio.paulo@daleth.com.br','{"full_name":"Sergio Paulo","role":"CEO"}'),
    ('${paulo}','paulo@example.test','{"full_name":"Paulo","role":"Comercial"}'),
    ('${anotherCEO}','outro@example.test','{"full_name":"Outro CEO","role":"CEO"}');
    grant all on all tables in schema public to authenticated;
    grant all on all sequences in schema public to authenticated;
    insert into companies(id,name) values (100,'Empresa anterior a auditoria');
  `);
  await db.exec(migration);
  const logs = async () => (await db.query('select * from public.crm_audit_log order by id')).rows;
  const last = async () => (await logs()).at(-1);
  const asUser = (id, sql, params = []) => db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [id || '']);
    await tx.exec('set local role authenticated');
    return tx.query(sql, params);
  });

  await t.test('nao inventa passado e reaplicacao preserva o proprietario e a data', async () => {
    const before = await db.query('select * from dsh_audit.settings');
    await db.exec(migration);
    assert.deepEqual((await db.query('select * from dsh_audit.settings')).rows, before.rows);
    assert.equal((await logs()).length, 0);
  });

  await t.test('inclusao, alteracao e exclusao registram ator real e antes/depois', async () => {
    await asUser(paulo, "insert into opportunities(id,title,owner) values (200,'Proposta de teste','Sergio Paulo')");
    let log = await last();
    assert.equal(log.action, 'INSERT'); assert.equal(log.actor_id, paulo); assert.equal(log.actor_name, 'Paulo');
    assert.deepEqual(log.changes.title, { before: null, after: 'Proposta de teste' });
    await asUser(owner, "update opportunities set title = 'Proposta revisada',value = 6200 where id=200");
    log = await last();
    assert.equal(log.actor_id, owner); assert.equal(log.action, 'UPDATE');
    assert.deepEqual(log.changes.title, { before: 'Proposta de teste', after: 'Proposta revisada' });
    assert.equal(log.changes.value.after, 6200);
    await asUser(paulo, 'delete from opportunities where id=200');
    log = await last();
    assert.equal(log.entity_label, 'Proposta revisada'); assert.equal(log.action, 'DELETE');
    assert.equal(log.changes.value.before, 6200); assert.equal(log.changes.value.after, null);
  });

  await t.test('gravar valores iguais e timestamps nao gera atividade falsa', async () => {
    await asUser(paulo, "insert into companies(id,name) values(201,'Acme')");
    const n = (await logs()).length;
    await asUser(paulo, "update companies set name='Acme',updated_at=now() where id=201");
    assert.equal((await logs()).length, n);
  });

  await t.test('anonimo, Comercial e outro CEO nao leem auditoria nem lista de atores', async () => {
    for (const id of [paulo, anotherCEO]) {
      assert.equal((await asUser(id,'select public.crm_can_read_audit() as allowed')).rows[0].allowed, false);
      assert.equal((await asUser(id,'select * from crm_audit_log')).rows.length, 0);
      await assert.rejects(asUser(id,'select * from public.crm_audit_actors()'), /nao autorizada/);
      assert.deepEqual((await asUser(id,'select public.crm_audit_access() as access')).rows[0].access, { allowed:false, enabled_at:null });
    }
    await assert.rejects(db.transaction(async tx => {
      await tx.exec('set local role anon'); await tx.query('select * from public.crm_audit_log');
    }), /permission denied/);
    assert.equal((await asUser(owner,'select public.crm_can_read_audit() as allowed')).rows[0].allowed, true);
    assert.ok((await asUser(owner,'select * from public.crm_audit_actors()')).rows.some(actor => actor.id === paulo));
    assert.ok((await asUser(owner,'select * from crm_audit_log')).rows.length > 0);
  });

  await t.test('nenhum usuario do CRM, nem o proprietario, pode adulterar a trilha', async () => {
    for (const id of [owner, paulo, anotherCEO]) {
      for (const sql of [
        "insert into public.crm_audit_log(actor_name,entity_type,entity_id,entity_label,action,changes,source) values('Falso','companies','1','Falso','INSERT','{}','table')",
        "update public.crm_audit_log set actor_name='Falso'", 'delete from public.crm_audit_log',
        'truncate public.crm_audit_log', 'select * from dsh_audit.settings',
        `update dsh_audit.settings set owner_id='${paulo}'`,
        "select dsh_audit.write_change('companies','1',null,'{}','table')",
      ]) await assert.rejects(asUser(id, sql), /permission denied/);
    }
  });

  await t.test('promover outro usuario a CEO nao concede acesso a auditoria', async () => {
    await asUser(owner, `update profiles set role='CEO',full_name='Sergio Paulo' where id='${paulo}'`);
    assert.equal((await asUser(paulo,'select public.crm_can_read_audit() as allowed')).rows[0].allowed, false);
    await asUser(owner, `update profiles set role='Comercial',full_name='Paulo' where id='${paulo}'`);
  });

  await t.test('captura todas as tabelas relacionais e alteracoes de permissoes', async () => {
    for (const [table, sql] of [
      ['contacts',"insert into contacts(id,name,company_id) values(301,'Contato',201)"],
      ['opportunities',"insert into opportunities(id,title,company_id) values(302,'Negocio',201)"],
      ['activities',"insert into activities(id,title,opportunity_id) values(303,'Reuniao',302)"],
      ['notes',"insert into notes(id,user_name,content,opportunity_id) values(304,'Outra pessoa','Nota',302)"],
      ['contracts',"insert into contracts(id,company_id,opportunity_id,product) values(305,201,302,'SAC+')"],
      ['products',"insert into products(name) values('Produto teste')"],
      ['profiles',`update profiles set can_view_dashboard=true where id='${paulo}'`],
    ]) {
      await asUser(owner, sql);
      assert.equal((await last()).entity_type, table);
    }
  });

  await t.test('exclusoes em cascata preservam conteudo, ator e identificador da transacao', async () => {
    const n = (await logs()).length;
    await asUser(paulo, 'delete from opportunities where id=302');
    const deleted = (await logs()).slice(n);
    for (const table of ['opportunities','activities','notes','contracts']) {
      const log = deleted.find(row => row.entity_type === table);
      assert.ok(log, table); assert.equal(log.actor_id, paulo);
      assert.equal(log.transaction_id, deleted[0].transaction_id);
    }
    assert.equal(deleted.find(row => row.entity_type === 'notes').changes.content.before, 'Nota');
  });

  const saveState = (id, key, data) => asUser(id, `insert into crm_state(key,data) values($1,$2::jsonb)
    on conflict(key) do update set data=excluded.data,updated_at=now()`, [key, JSON.stringify(data)]);

  await t.test('colecoes JSON registram cada inclusao/alteracao/exclusao, inclusive array vazio', async () => {
    for (const [key, type] of [
      ['dsh-v1-workspace-items','workspace_items'], ['dsh-v1-workspace-comments','workspace_comments'],
      ['dsh-v1-opportunity-files','documents'], ['dsh-v1-interactions','interactions'], ['dsh-v1-stage-history','stage_history'],
    ]) {
      await saveState(paulo, key, [{id:'a',title:'Original',user:'Sergio'}]);
      assert.equal((await last()).entity_type, type); assert.equal((await last()).actor_id, paulo);
      await saveState(owner, key, [{id:'a',title:'Revisado',user:'Sergio'}]);
      assert.deepEqual((await last()).changes.title, {before:'Original',after:'Revisado'});
      await saveState(paulo, key, []);
      assert.equal((await last()).action, 'DELETE'); assert.equal((await last()).entity_label, 'Revisado');
    }
  });

  await t.test('reordenacao e refresh de colecoes JSON nao geram eventos falsos', async () => {
    const key = 'dsh-v1-workspace-items';
    await saveState(paulo, key, [{id:'a',title:'A'},{id:'b',title:'B'}]);
    const n = (await logs()).length;
    await saveState(owner, key, [{id:'b',title:'B',updatedAt:'2026-08-31'},{id:'a',title:'A'}]);
    assert.equal((await logs()).length, n);
    await asUser(paulo, "delete from crm_state where key='dsh-v1-workspace-items'");
    assert.equal((await logs()).length, n + 2);
  });

  await t.test('motivos, segmentos e etapas; troca de chave e dados legados sem ID', async () => {
    await saveState(paulo, 'dsh-v1-loss-reasons', {302:'Preco'});
    assert.equal((await last()).entity_id, '302');
    await saveState(owner, 'dsh-v1-loss-reasons', {302:'Concorrencia'});
    assert.deepEqual((await last()).changes.reason, {before:'Preco',after:'Concorrencia'});
    await saveState(owner, 'dsh-v1-loss-reasons', {});
    assert.equal((await last()).action, 'DELETE');
    for (const key of ['dsh-v1-company-segments','dsh-v1-loss-reason-options']) {
      await saveState(paulo, key, ['A','B']);
      const n = (await logs()).length;
      await saveState(owner, key, ['B','A']); assert.equal((await logs()).length,n);
      await saveState(owner, key, ['A']); assert.equal((await last()).action,'DELETE');
    }
    await saveState(paulo, 'dsh-v1-stages', ['A','B']);
    await saveState(owner, 'dsh-v1-stages', ['B','A']);
    assert.equal((await last()).entity_id, '_order'); assert.equal((await last()).action, 'UPDATE');
    await saveState(owner, 'dsh-v1-pipedrive-import-meta', {total:10});
    assert.equal((await last()).entity_type, 'imports');
    await saveState(owner, 'dsh-v1-interactions', [{description:'Sem ID'}]);
    assert.equal((await last()).entity_id, '_collection');
    await asUser(owner,"update crm_state set key='chave-nao-auditada' where key='dsh-v1-interactions'");
    assert.equal((await last()).action, 'DELETE');
  });

  await t.test('espelhos das tabelas relacionais nao duplicam as acoes', async () => {
    const n = (await logs()).length;
    for (const key of ['companies','contacts','deals','activities','notes','contracts']) {
      await saveState(paulo, `dsh-v1-${key}`, [{id:1,title:'Cache'}]);
    }
    assert.equal((await logs()).length,n);
  });

  await t.test('transacoes revertidas nao deixam atividade bem sucedida falsa', async () => {
    const n = (await logs()).length;
    await assert.rejects(db.transaction(async tx => {
      await tx.query("insert into companies(name) values('Cancelada')");
      throw new Error('rollback de teste');
    }), /rollback de teste/);
    assert.equal((await logs()).length,n);
  });

  await t.test('acoes do SQL Editor nao sao atribuídas falsamente a um usuario', async () => {
    await db.query("insert into companies(name) values('Sistema')");
    assert.equal((await last()).actor_id,null);
    assert.equal((await last()).actor_name,'Sistema / administrador do banco');
  });

  await t.test('troca de email do proprietario e exclusao de usuario preservam identidade e historico', async () => {
    await db.query("update auth.users set email='novo@example.test' where id=$1",[owner]);
    await db.exec(migration);
    assert.equal((await asUser(owner,'select public.crm_can_read_audit() as allowed')).rows[0].allowed,true);
    await db.query('delete from auth.users where id=$1',[paulo]);
    assert.ok((await asUser(owner,'select * from public.crm_audit_actors()')).rows.some(actor => actor.id === paulo));
    assert.ok((await logs()).some(log => log.actor_id === paulo));
  });
});

test('Datas, valores e consultas da auditoria', () => {
  assert.deepEqual(auditDateBounds('2026-08-31','2026-08-31'), {start:'2026-08-31T00:00:00-03:00',end:'2026-09-01T00:00:00-03:00'});
  assert.equal(auditDateBounds('','2026-12-31').end,'2027-01-01T00:00:00-03:00');
  assert.throws(() => auditDateBounds('2026-09-01','2026-08-31'));
  assert.throws(() => auditDateBounds('2026-02-30',''));
  assert.match(auditDateTime('2026-09-01T02:59:00Z'), /31\/08\/2026.*23:59:00/);
  assert.match(auditValue('value',6200), /6\.200,00/);
  assert.equal(auditValue('name',null),'(vazio)'); assert.equal(auditValue('active',false),'Não');
  assert.match(auditError({code:'42P01'}),/ativada/);
  assert.match(auditError({code:'42501'}),/autorização/);
  const calls = [];
  const client = new Proxy({}, { get: (_target, name) => (...args) => { calls.push([name,...args]); return client; } });
  auditListQuery(client,{actor:paulo,module:'companies',action:'DELETE',from:'2026-08-31',to:'2026-08-31',search:'50%_test'},1);
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'actor_id' && call[2] === paulo));
  assert.deepEqual(calls.at(-1), ['range',50,99]);
  assert.ok(!calls.find(call => call[0] === 'select')[1].includes('changes'));
  assert.deepEqual(calls.filter(call => call[0] === 'order').map(call => call[1]), ['occurred_at','id']);
  assert.ok(calls.some(call => call[0] === 'ilike' && call[2] === '%50\\%\\_test%'));
  calls.length = 0;
  auditListQuery(client,{actor:'system'});
  assert.deepEqual(calls.find(call => call[0] === 'is'), ['is','actor_id',null]);
});

test('Ativacao sem o usuario correto falha e nao libera acesso a outro CEO', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text);
      insert into auth.users values('${anotherCEO}','outro@example.test');`);
    await assert.rejects(db.exec(migration), /query returned no rows/);
    await db.exec('rollback');
    assert.equal((await db.query("select to_regclass('public.crm_audit_log') as relation")).rows[0].relation, null);
  } finally { await db.close(); }
});
