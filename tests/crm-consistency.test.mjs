import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {transformSync} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as historyHelpers from '../src/lib/crmHistory.js';
import {formatDate, formatDateTime, dateOnlyFromCrmValue, dealHistory, cleanLegacyNote} from '../src/lib/crmHistory.js';
import {createSyncGuard} from '../src/lib/crmSync.js';

test('UTC instants use the same Sao Paulo date in every presentation', () => {
  for (const value of ['2026-09-17T00:00:00Z', '2026-09-17T00:00:00+00:00', '2026-09-17 00:00:00+00']) {
    assert.equal(formatDate(value), '16/09/2026');
    assert.equal(formatDateTime(value), '16/09/2026 21:00');
    assert.equal(dateOnlyFromCrmValue(value), '2026-09-16');
  }
});

test('calendar dates and local datetime inputs do not shift to the previous day', () => {
  assert.equal(formatDateTime('2026-09-17'), '17/09/2026');
  assert.equal(formatDateTime('2026-09-17T00:00'), '17/09/2026 00:00');
  assert.equal(formatDateTime('2026-09-17 00:00:00'), '17/09/2026 00:00');
  assert.equal(formatDate(''), '-');
  assert.equal(formatDateTime('invalid'), 'invalid');
});

test('history includes legacy notes, interactions and completed activities only', () => {
  const history = dealHistory({id: 1}, [
    {id: 1, dealId: '1', dateTime: '2026-01-01T12:00', description: 'Interaction'},
    {id: 2, dealId: 2, dateTime: '2026-09-01T12:00'}
  ], [
    {id: 1, dealId: 1, dueDate: '2026-02-12', status: 'Concluída'},
    {id: 2, dealId: 1, dueDate: '2026-06-01', status: 'Pendente'}
  ], [{id: 1, legacyId: '5001', dealId: 1, date: '2026-05-11', text: 'Legacy...'}]);
  assert.equal(history.length, 3);
  assert.equal(history[0].source, 'note');
  assert.equal(history[0].date, '2026-05-11');
  assert.equal(history[0].possiblyIncomplete, true);
  assert.deepEqual(dealHistory({id: 1}, null, null, null), []);
});

test('Interamerican legacy history is not counted as zero', () => {
  const imported = JSON.parse(fs.readFileSync(new URL('../public/pipedrive-import-daleth.json', import.meta.url)));
  const deal = imported.deals.find(item => item.title.includes('Interamerican'));
  const history = dealHistory(deal, [], imported.activities, imported.notes);
  assert.equal(history.length, 3);
  assert.equal(history[0].date, '2026-06-02');
});

test('history ordering compares instants rather than timestamp strings', () => {
  const history = dealHistory({id: 1}, [
    {id: 1, dealId: 1, dateTime: '2026-09-17T00:00:00Z'},
    {id: 2, dealId: 1, dateTime: '2026-09-16T22:00'}
  ]);
  assert.equal(history[0].rawId, 2);
  const activity = dealHistory({id: 1}, [], [{id: 1, dealId: 1, status: 'Concluída', dueDate: '2026-09-17T00:00:00Z', dueTime: '14:30:00'}])[0];
  assert.equal(formatDateTime(activity.date), '17/09/2026 14:30');
});

test('legacy markup is cleaned for display without inventing missing content', () => {
  assert.equal(cleanLegacyNote('<p>Olá&nbsp;cliente<br>Próximo passo &amp; retorno</p>'), 'Olá cliente\nPróximo passo & retorno');
  assert.equal(cleanLegacyNote('Texto disponível...'), 'Texto disponível...');
  assert.equal(cleanLegacyNote('<a href="/users/details/123" class="cui...'), '');
  assert.equal(cleanLegacyNote('&#x41;&#66;'), 'AB');
  const native = dealHistory({id: 1}, [], [], [{id: 1, supabaseId: 1, dealId: 1, date: '2026-09-17', text: 'Wait...'}])[0];
  assert.equal(native.possiblyIncomplete, false);
});

test('sync guard rejects stale reads during and after edits', () => {
  const guard = createSyncGuard();
  const original = guard.snapshot();
  guard.beginWrite();
  assert.equal(guard.isCurrent(original), false);
  assert.equal(guard.isWriting(), true);
  const pending = guard.snapshot();
  guard.endWrite();
  assert.equal(guard.isCurrent(pending), false);
  assert.equal(guard.isWriting(), false);
  assert.equal(guard.isCurrent(guard.snapshot()), true);
});

// Exercise the actual hooks without a browser or production credentials.
function hookHarness(name = 'useStore') {
  const source = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf('\nfunction ', start + 1);
  const states = [], refs = [], effects = [], calls = [], timers = [], statuses = [];
  let stateIndex = 0, refIndex = 0, effectsIndex = 0;
  let response = Promise.resolve({data: {data: ['remote']}, error: null});
  const cache = new Map([['test', JSON.stringify(['cached'])]]);
  const sync = {userId: null, retry: 0, report: (key, status) => statuses.push({key, status})};
  const window = {
    setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout: () => {},
    setInterval: () => 1, clearInterval: () => {}, addEventListener: () => {}, removeEventListener: () => {}
  };
  const context = vm.createContext({
    createSyncGuard, console: {warn: () => {}}, window, CRM_AUTO_REFRESH_MS: 30000,
    localStorage: {getItem: key => cache.get(key), setItem: (key, value) => cache.set(key, value)},
    readStoredCrmValue: key => JSON.parse(cache.get(key) || 'null'), isDemoCrmSeed: () => false,
    useCrmSync: () => sync,
    useState: initial => {const index = stateIndex++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], next => {states[index] = next;}];},
    useRef: initial => {const index = refIndex++; return refs[index] ||= {current: initial};},
    useEffect: (callback, dependencies) => {
      const index = effectsIndex++, previous = effects[index];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        previous?.cleanup?.(); effects[index] = {dependencies, callback, pending: true};
      }
    },
    safeArray: value => Array.isArray(value) ? value : [],
    supabase: {
      from: table => ({
        select: () => ({eq: () => ({maybeSingle: () => {calls.push(`read:${table}`); return response;}})}),
        upsert: () => {calls.push(`write:${table}`); return Promise.resolve({error: null});}
      }),
      channel: () => { const channel = {on: () => channel, subscribe: () => {}}; return channel; },
      removeChannel: () => {}
    }
  });
  vm.runInContext(source.slice(start, end), context);
  return {
    sync, calls, states, timers, statuses, cache,
    respond: next => {response = next;},
    render: (...args) => {
      stateIndex = 0; refIndex = 0; effectsIndex = 0;
      const value = context[name](...args);
      for (const effect of effects) if (effect.pending) {effect.pending = false; effect.cleanup = effect.callback();}
      return value;
    },
    unmount: () => effects.forEach(effect => effect.cleanup?.())
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

function renderedComponents() {
  const require = createRequire(import.meta.url);
  let source = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  source = source.slice(0, source.lastIndexOf("createRoot(document.getElementById('root'))"));
  source += '\nmodule.exports = {DealDetailPage, Dashboard, InsightsDaleth, PendingPanel};';
  const compiled = transformSync(source, {loader:'jsx', format:'cjs'}).code;
  const context = vm.createContext({
    module: {exports:{}}, console, Date, Intl,
    require: name => {
      if (name.endsWith('.css')) return {};
      if (name === './lib/crmHistory') return historyHelpers;
      if (name === './lib/crmSync') return {createSyncGuard};
      if (name === './lib/supabase') return {supabase:{}};
      if (name.startsWith('./components/')) return {};
      return require(name);
    }
  });
  vm.runInContext(compiled, context);
  return context.module.exports;
}

test('opportunity UI uses the same count and last record as its timeline', () => {
  const {DealDetailPage} = renderedComponents();
  const html = renderToStaticMarkup(React.createElement(DealDetailPage, {
    deal:{id:1, title:'Example', stage:'Negociação', owner:'Paulo'}, onBack:()=>{},
    interactions:[{id:1, dealId:1, dateTime:'2026-01-01T12:00', description:'Native'}],
    activities:[{id:1, dealId:1, dueDate:'2026-02-12', status:'Concluída', title:'Call'}],
    notes:[{id:1, dealId:1, legacyId:'5001', date:'2026-05-11', text:'<p>Legacy&nbsp;text...</p>'}]
  }));
  assert.match(html, /Histórico \(3\)/);
  assert.match(html, /Registros no histórico/);
  assert.match(html, /Última anotação/);
  assert.match(html, /11\/05\/2026/);
  assert.match(html, /<details>/);
  assert.match(html, /Legacy text\.\.\./);
  assert.doesNotMatch(html, /&lt;p&gt;/);
});

test('dashboard does not substitute a forecast date for missing relationship history', () => {
  const {Dashboard} = renderedComponents();
  const html = renderToStaticMarkup(React.createElement(Dashboard, {
    deals:[{id:1, title:'No records', stage:'Negociação', closeDate:'2026-01-01'}],
    companies:[], contacts:[], activities:[], contracts:[], interactions:[], notes:[]
  }));
  assert.match(html, /Sem histórico/);
  assert.doesNotMatch(html, /999 dias/);
});

test('state is fetched after login, not before session readiness', async () => {
  const harness = hookHarness();
  harness.render('test', []);
  assert.equal(harness.calls.length, 0);
  harness.sync.userId = 'user';
  harness.render('test', []);
  await flush();
  assert.deepEqual(harness.states[0], ['remote']);
  assert.deepEqual(harness.calls, ['read:crm_state']);
});

test('relational collections do not also load an obsolete crm_state snapshot', async () => {
  const harness = hookHarness(); harness.sync.userId = 'user';
  harness.render('test', [], {remote: false});
  await flush();
  assert.equal(harness.calls.length, 0);
});

test('an absent remote row is not automatically filled from stale local cache', async () => {
  const harness = hookHarness(); harness.sync.userId = 'user';
  harness.respond(Promise.resolve({data: null, error: null}));
  harness.render('test', []); await flush();
  assert.equal(harness.states[0].length, 0);
  assert.deepEqual(harness.calls, ['read:crm_state']);
});

test('failed first load exposes an error and retries automatically', async () => {
  const harness = hookHarness(); harness.sync.userId = 'user';
  harness.respond(Promise.resolve({data: null, error: new Error('offline')}));
  harness.render('test', []); await flush();
  assert.equal(harness.statuses.at(-1).status, 'error');
  harness.respond(Promise.resolve({data: {data: ['recovered']}, error: null}));
  harness.timers[0](); await flush();
  assert.deepEqual(harness.states[0], ['recovered']);
  assert.equal(harness.statuses.at(-1).status, 'ready');
});

test('a slow initial load cannot overwrite a newly saved record', async () => {
  const harness = hookHarness(); harness.sync.userId = 'user';
  let resolve; harness.respond(new Promise(done => {resolve = done;}));
  const [, save] = harness.render('test', []);
  save(['new']); await flush();
  resolve({data: {data: ['old']}, error: null}); await flush();
  assert.deepEqual(harness.states[0], ['new']);
});

test('a request from a previous session cannot update the current state', async () => {
  const harness = hookHarness(); harness.sync.userId = 'user';
  let resolve; harness.respond(new Promise(done => {resolve = done;}));
  harness.render('test', []);
  harness.sync.userId = null; harness.render('test', []);
  resolve({data: {data: ['obsolete']}, error: null}); await flush();
  assert.deepEqual(harness.states[0], ['cached']);
});

test('relational loader also waits for login and rejects outdated responses', async () => {
  const harness = hookHarness('useSupabaseCollectionSync');
  const guard = createSyncGuard(); let loadCalls = 0, received = null, resolve;
  const update = (next, revision) => {if (guard.isCurrent(revision)) received = next;};
  update.snapshot = guard.snapshot; update.isWriting = guard.isWriting;
  const options = {name:'contracts', tables:['contracts'], updateLocalCache:update, load:() => {loadCalls++; return new Promise(done => {resolve = done;});}};
  harness.render(options); assert.equal(loadCalls, 0);
  harness.sync.userId = 'user'; harness.render(options); assert.equal(loadCalls, 1);
  guard.markChanged(); resolve(['old']); await flush(); assert.equal(received, null);
  harness.unmount();
});

test('initial loading gate and sync statuses are isolated by authenticated user', async () => {
  const source = fs.readFileSync(new URL('../src/components/CrmSyncContext.jsx', import.meta.url), 'utf8') + '\nexport {REQUIRED_DATA};';
  const states = [], refs = [], effects = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0, authChanged;
  const react = {
    ...React,
    useState: initial => {const index = stateIndex++; if (!(index in states)) states[index] = initial; return [states[index], next => {states[index] = typeof next === 'function' ? next(states[index]) : next;}];},
    useRef: initial => {const index = refIndex++; return refs[index] ||= {current:initial};},
    useMemo: callback => callback(),
    useEffect: (callback, dependencies) => {
      const index = effectIndex++, previous = effects[index];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        previous?.cleanup?.(); effects[index] = {dependencies, callback, pending:true};
      }
    }
  };
  const context = vm.createContext({module:{exports:{}}, console,
    require: name => name === 'react' ? react : {supabase:{auth:{
      getSession: async () => ({data:{session:{user:{id:'user-a'}}}}),
      onAuthStateChange: callback => {authChanged = callback; return {data:{subscription:{unsubscribe:()=>{}}}};}
    }}}
  });
  vm.runInContext(transformSync(source, {loader:'jsx', format:'cjs'}).code, context);
  const {CrmSyncProvider, REQUIRED_DATA} = context.module.exports;
  const render = () => {
    stateIndex = 0; refIndex = 0; effectIndex = 0;
    const value = CrmSyncProvider({children:null}).props.value;
    for (const effect of effects) if (effect.pending) {effect.pending = false; effect.cleanup = effect.callback();}
    return value;
  };
  assert.equal(render().hydrated, false);
  await flush();
  const first = render();
  for (const key of REQUIRED_DATA) first.report(key, 'ready');
  render();
  assert.equal(render().hydrated, true);
  authChanged('SIGNED_IN', {user:{id:'user-b'}});
  const second = render();
  assert.equal(second.dataReady, false);
  assert.equal(second.hydrated, false);
  first.report('companies', 'ready');
  assert.equal(Object.keys(render().statuses).length, 0);
  for (const key of REQUIRED_DATA) second.report(key, 'ready');
  render();
  assert.equal(render().hydrated, true);
  authChanged('SIGNED_OUT', null);
  assert.equal(render().hydrated, false);
});
