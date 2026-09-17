import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContractRows, mergeLegacyContracts} from '../src/lib/crmContracts.js';

function client(tables, failures = {}) {
  const calls = [];
  return {
    calls,
    from: table => ({
      select: fields => {
        calls.push({table, fields});
        assert.equal(fields.includes('!'), false, 'must not depend on foreign key embedding');
        const result = () => ({data:tables[table], error:failures[table]});
        return {
          order: (field, options) => {
            assert.equal(field, 'created_at');
            assert.equal(options.ascending, false);
            return result();
          },
          in: (field, ids) => {
            assert.equal(field, 'id');
            calls.at(-1).ids = ids;
            return result();
          }
        };
      }
    })
  };
}

test('JSON-only contracts remain visible without reviving deleted relational snapshots', () => {
  const current = [{id:'old-id',supabaseId:10,mrr:1000}];
  const stored = [
    {id:'old-id',mrr:900},
    {id:10,mrr:900},
    {id:'deleted',supabaseId:11,mrr:500},
    {id:'json-only',mrr:3000,documentUrl:'https://example.com/legacy'}
  ];
  assert.deepEqual(mergeLegacyContracts(current, stored), [current[0],stored[3]]);
  assert.deepEqual(mergeLegacyContracts([], [stored[3]]), [stored[3]]);
  assert.deepEqual(mergeLegacyContracts(current, null), current);
});

test('contracts load without foreign keys and preserve legacy company and opportunity identities', async () => {
  const c = client({
    contracts:[{id:1,company_id:20,opportunity_id:30,mrr:6000,document_url:'https://example.com/contract'},
      {id:2,company_id:20,opportunity_id:null}],
    companies:[{id:20,legacy_id:'company-old'}],
    opportunities:[{id:30,legacy_id:'deal-old'}]
  });
  const rows = await loadContractRows(c);
  assert.equal(rows[0].companies.legacy_id, 'company-old');
  assert.equal(rows[0].opportunities.legacy_id, 'deal-old');
  assert.equal(rows[0].mrr, 6000);
  assert.equal(rows[0].document_url, 'https://example.com/contract');
  assert.equal(rows[1].opportunities, null);
  assert.deepEqual(c.calls[1].ids, [20]);
  assert.deepEqual(c.calls[2].ids, [30]);
});

test('empty contracts and unlinked contracts need no lookup queries', async () => {
  const c = client({contracts:[]});
  assert.deepEqual(await loadContractRows(c), []);
  assert.equal(c.calls.length, 1);
  const unlinked = client({contracts:[{id:1}]});
  assert.equal((await loadContractRows(unlinked))[0].companies, null);
  assert.equal(unlinked.calls.length, 1);
});

test('failed contract or reference reads remain visible errors rather than empty successful data', async () => {
  const error = new Error('unavailable');
  await assert.rejects(loadContractRows(client({}, {contracts:error})), /unavailable/);
  await assert.rejects(loadContractRows(client({contracts:[{company_id:1}]}, {companies:error})), /unavailable/);
});
