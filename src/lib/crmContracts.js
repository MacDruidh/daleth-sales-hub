export function mergeLegacyContracts(current, stored) {
  const ids = new Set(current.flatMap(row => [row.id, row.supabaseId].filter(id => id != null).map(String)));
  // JSON-only contracts are still real records. Relational snapshots must not revive deleted rows.
  const legacy = (Array.isArray(stored) ? stored : []).filter(row =>
    row && !row.supabaseId && row.id != null && !ids.has(String(row.id))
  );
  return [...current, ...legacy];
}

export async function loadContractRows(client) {
  const {data, error} = await client.from('contracts').select('*').order('created_at', {ascending:false});
  if (error) throw error;
  const rows = data || [];
  if (!rows.length) return rows;

  async function references(table, field) {
    const ids = [...new Set(rows.map(row => row[field]).filter(id => id != null && id !== ''))];
    if (!ids.length) return new Map();
    // Existing databases may not have the foreign keys required by PostgREST embedding.
    const {data, error} = await client.from(table).select('id,legacy_id').in('id', ids);
    if (error) throw error;
    return new Map((data || []).map(row => [String(row.id), row]));
  }

  const companies = await references('companies', 'company_id');
  const opportunities = await references('opportunities', 'opportunity_id');
  return rows.map(row => ({
    ...row,
    companies: companies.get(String(row.company_id)) || null,
    opportunities: opportunities.get(String(row.opportunity_id)) || null
  }));
}
