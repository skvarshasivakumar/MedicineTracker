/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Web-only in-memory SQLite shim.
 *
 * expo-sqlite's WASM build is not bundled in this Expo SDK out of the box,
 * so we provide a minimal store that satisfies the subset of API surface we
 * actually use (execSync / getFirstSync / getAllSync / runSync). All tables
 * are kept as JS arrays and persisted to localStorage so a browser refresh
 * keeps your data.
 *
 * This is intentionally simple — it parses only the SQL patterns issued by
 * src/db/repo.ts and src/db/database.ts. Do not use as a general-purpose
 * SQL engine.
 */

const STORAGE_KEY = 'medtracker-web-db';

interface Row { [k: string]: any }
interface Table { rows: Row[]; nextId: number }
interface Store { tables: Record<string, Table> }

function load(): Store {
  try {
    const raw = (globalThis as any).localStorage?.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { tables: {} };
}

function save(s: Store): void {
  try { (globalThis as any).localStorage?.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const store: Store = load();
function ensureTable(name: string): Table {
  if (!store.tables[name]) store.tables[name] = { rows: [], nextId: 1 };
  return store.tables[name];
}

function tableFromSql(sql: string, keyword: string): string {
  const re = new RegExp(`${keyword}\\s+(?:INTO\\s+|FROM\\s+|TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?)?([a-zA-Z_]\\w*)`, 'i');
  const m = re.exec(sql);
  return (m?.[1] ?? '').trim();
}

/** Substitute ? placeholders with values for evaluation. */
function bind(sql: string, params: any[]): string {
  let i = 0;
  return sql.replace(/\?/g, () => {
    const v = params[i++];
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? '1' : '0';
    return `'${String(v).replace(/'/g, "''")}'`;
  });
}

/** Parse a tiny subset of WHERE clauses (a=? AND b=? BETWEEN ? AND ? / >= ?). */
type Pred = (row: Row) => boolean;

function parseWhere(whereSql: string, params: any[]): { pred: Pred; consumed: number } {
  if (!whereSql.trim()) return { pred: () => true, consumed: 0 };
  let pi = 0;
  const take = () => params[pi++];
  const tokens = whereSql.split(/\s+AND\s+/i);
  const preds: Pred[] = [];
  for (const tok of tokens) {
    const t = tok.trim();
    // col BETWEEN ? AND ?
    let m = /^(\w+)\s+BETWEEN\s+\?\s+AND\s+\?$/i.exec(t);
    if (m) {
      const col = m[1]; const a = take(); const b = take();
      preds.push((r) => r[col] >= a && r[col] <= b);
      continue;
    }
    m = /^(\w+)\s*(=|>=|<=|>|<|!=)\s*\?$/.exec(t);
    if (m) {
      const col = m[1]; const op = m[2]; const v = take();
      preds.push((r) => cmp(r[col], op, v));
      continue;
    }
    m = /^(\w+)\s*=\s*"(\w+)"$/.exec(t) || /^(\w+)\s*=\s*'(\w+)'$/.exec(t);
    if (m) {
      const col = m[1]; const v = m[2];
      preds.push((r) => String(r[col]) === v);
      continue;
    }
    // col = <numeric or boolean literal>  e.g.  enabled=1   status=0
    m = /^(\w+)\s*(=|!=|>=|<=|>|<)\s*(-?\d+(?:\.\d+)?|true|false)$/i.exec(t);
    if (m) {
      const col = m[1]; const op = m[2];
      const raw = m[3].toLowerCase();
      const v = raw === 'true' ? 1 : raw === 'false' ? 0 : Number(m[3]);
      preds.push((r) => {
        // Treat booleans stored as true/false the same as 1/0
        const rv = typeof r[col] === 'boolean' ? (r[col] ? 1 : 0) : r[col];
        return cmp(rv, op, v);
      });
      continue;
    }
    // ignore unknown clauses (defensive)
    preds.push(() => true);
  }
  return { pred: (r) => preds.every((p) => p(r)), consumed: pi };
}

function cmp(a: any, op: string, b: any): boolean {
  switch (op) {
    case '=': return String(a) === String(b);
    case '!=': return String(a) !== String(b);
    case '>': return a > b;
    case '<': return a < b;
    case '>=': return a >= b;
    case '<=': return a <= b;
  }
  return false;
}

function isSelect(sql: string): boolean { return /^\s*SELECT/i.test(sql); }

function runSelect(sql: string, params: any[]): Row[] {
  // strip leading SELECT cols FROM
  const m = /SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+(\w+))?(.*)$/is.exec(sql);
  if (!m) return [];
  const cols = m[1].trim();
  const tbl = m[2];
  const SQL_KEYWORDS = new Set(['where', 'order', 'group', 'limit', 'join', 'inner', 'left', 'right', 'on', 'having']);
  let alias: string | undefined = m[3]?.toLowerCase();
  let rest: string;
  if (alias && SQL_KEYWORDS.has(alias)) {
    // m[3] is actually a SQL keyword, not a table alias — restore it to rest.
    alias = undefined;
    rest = `${m[3]} ${(m[4] ?? '').trim()}`.trim();
  } else {
    rest = (m[4] ?? '').trim();
  }

  // crude JOIN handling: only JOIN <t> <alias> ON <a>.<c>=<b>.<c>
  const joins: { tbl: string; alias: string; left: { a: string; c: string }; right: { a: string; c: string } }[] = [];
  while (/^JOIN\s/i.test(rest)) {
    const jm = /^JOIN\s+(\w+)\s+(\w+)\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)\s*(.*)$/is.exec(rest);
    if (!jm) break;
    joins.push({ tbl: jm[1], alias: jm[2].toLowerCase(), left: { a: jm[3].toLowerCase(), c: jm[4] }, right: { a: jm[5].toLowerCase(), c: jm[6] } });
    rest = jm[7].trim();
  }

  // WHERE / ORDER BY
  let whereSql = '';
  const wm = /^WHERE\s+(.*?)(?:\s+ORDER\s+BY\s+(.*))?$/is.exec(rest);
  let orderBy = '';
  if (wm) { whereSql = wm[1]; orderBy = wm[2] ?? ''; }
  else {
    const om = /^ORDER\s+BY\s+(.*)$/i.exec(rest);
    if (om) orderBy = om[1];
  }

  const mainTbl = ensureTable(tbl);
  let combined: Row[] = mainTbl.rows.map((r) => {
    const out: Row = {};
    for (const k of Object.keys(r)) out[`${(alias ?? tbl).toLowerCase()}__${k}`] = r[k];
    return out;
  });

  for (const j of joins) {
    const t = ensureTable(j.tbl);
    const next: Row[] = [];
    for (const left of combined) {
      const leftKey = `${j.left.a}__${j.left.c}`;
      const lv = left[leftKey];
      for (const r of t.rows) {
        if (String(r[j.right.c]) === String(lv)) {
          const merged: Row = { ...left };
          for (const k of Object.keys(r)) merged[`${j.alias}__${k}`] = r[k];
          next.push(merged);
        }
      }
    }
    combined = next;
  }

  // WHERE
  // Substitute alias.col tokens to internal alias__col before evaluation
  const whereInternal = whereSql
    .replace(/\b([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)\b/g, (_, a: string, c: string) => `${a.toLowerCase()}__${c}`)
    .replace(/\b(?!(?:AND|OR|BETWEEN|NOT|NULL|IS)\b)([a-zA-Z_]\w*)\b(?=\s*(?:=|>=|<=|>|<|!=|BETWEEN))/gi, (m0, col: string) => {
      // bare column → assume main table
      if (combined[0] && (`${(alias ?? tbl).toLowerCase()}__${col}` in combined[0])) {
        return `${(alias ?? tbl).toLowerCase()}__${col}`;
      }
      return m0;
    });

  const { pred } = parseWhere(whereInternal, params);
  let rows = combined.filter(pred);

  // ORDER BY (single column with ASC/DESC)
  if (orderBy.trim()) {
    const om = /^([a-zA-Z_][\w.]*)\s*(ASC|DESC)?/i.exec(orderBy.trim());
    if (om) {
      let key = om[1];
      if (key.includes('.')) {
        const [a, c] = key.split('.');
        key = `${a.toLowerCase()}__${c}`;
      } else {
        key = `${(alias ?? tbl).toLowerCase()}__${key}`;
      }
      const dir = (om[2] ?? 'ASC').toUpperCase() === 'DESC' ? -1 : 1;
      rows.sort((a, b) => (a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0));
    }
  }

  // Projection
  return rows.map((r) => {
    const out: Row = {};
    if (cols === '*') {
      for (const k of Object.keys(r)) {
        const [a, c] = k.split('__');
        if (a === (alias ?? tbl).toLowerCase()) out[c] = r[k];
      }
      return out;
    }
    // handle: COUNT(*) AS c
    const cm = /^COUNT\s*\(\s*\*\s*\)\s+AS\s+(\w+)$/i.exec(cols.trim());
    if (cm) { out[cm[1]] = rows.length; return out; }
    // comma-separated list of: col | alias.col | alias.* | col AS x | alias.col AS x
    for (const raw of cols.split(',')) {
      const parts = raw.trim();
      // alias.* — expand all columns of that alias
      const starM = /^(\w+)\.\*$/.exec(parts);
      if (starM) {
        const a = starM[1].toLowerCase();
        for (const k of Object.keys(r)) {
          const [ka, kc] = k.split('__');
          if (ka === a) out[kc] = r[k];
        }
        continue;
      }
      const am = /^(.+?)\s+AS\s+(\w+)$/i.exec(parts);
      const expr = am ? am[1].trim() : parts;
      const outName = am ? am[2] : (expr.includes('.') ? expr.split('.')[1] : expr);
      if (expr.includes('.')) {
        const [a, c] = expr.split('.');
        out[outName] = r[`${a.toLowerCase()}__${c}`];
      } else {
        out[outName] = r[`${(alias ?? tbl).toLowerCase()}__${expr}`];
      }
    }
    return out;
  });
}

function runInsert(sql: string, params: any[]): number {
  const m = /INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i.exec(sql);
  if (!m) return 0;
  const tbl = m[1];
  const cols = m[2].split(',').map((s) => s.trim());
  const valPlaceholders = m[3].split(',').map((s) => s.trim());
  const t = ensureTable(tbl);
  const orReplace = /INSERT\s+OR\s+REPLACE/i.test(sql);

  const row: Row = {};
  let pi = 0;
  for (let i = 0; i < cols.length; i++) {
    const v = valPlaceholders[i];
    if (v === '?') row[cols[i]] = params[pi++];
    else if (/^'(.*)'$/.test(v)) row[cols[i]] = v.slice(1, -1);
    else if (v.toLowerCase().includes('datetime')) row[cols[i]] = new Date().toISOString();
    else row[cols[i]] = isNaN(Number(v)) ? v : Number(v);
  }

  if (orReplace && row.key !== undefined) {
    const idx = t.rows.findIndex((r) => r.key === row.key);
    if (idx >= 0) { t.rows[idx] = { ...t.rows[idx], ...row }; save(store); return idx + 1; }
  }

  if (!('id' in row) && tbl !== 'setting') {
    row.id = t.nextId++;
  }
  t.rows.push(row);
  save(store);
  return row.id ?? t.rows.length;
}

function runUpdate(sql: string, params: any[]): void {
  console.log('[webShim UPDATE] sql:', sql);
  console.log('[webShim UPDATE] params:', params);
  const m = /UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/is.exec(sql);
  if (!m) return;
  const tbl = m[1];
  const setClause = m[2];
  const whereSql = m[3] ?? '';
  console.log('[webShim UPDATE] table:', tbl, 'setClause:', setClause, 'whereSql:', whereSql);
  const t = ensureTable(tbl);
  console.log('[webShim UPDATE] table has', t.rows.length, 'rows');

  // Split SET into "col=?" parts
  const setParts = setClause.split(',').map((s) => s.trim());
  let pi = 0;
  const setOps: { col: string; expr: string; valFn?: (r: Row) => any }[] = [];
  for (const p of setParts) {
    const mm = /^(\w+)\s*=\s*(.+)$/i.exec(p);
    if (!mm) continue;
    const col = mm[1];
    const rhs = mm[2].trim();
    setOps.push({ col, expr: rhs });
  }
  console.log('[webShim UPDATE] setOps:', setOps);

  // count how many '?' the set clause consumes (including inside expressions like MAX(...?...))
  const setQs = setOps.reduce((sum, op) => {
    return sum + (op.expr.match(/\?/g) || []).length;
  }, 0);
  const setParams = params.slice(0, setQs);
  const whereParams = params.slice(setQs);
  console.log('[webShim UPDATE] setQs:', setQs, 'setParams:', setParams, 'whereParams:', whereParams);

  const { pred } = parseWhere(whereSql, whereParams);

  let updated = 0;
  t.rows.forEach((r) => {
    const matches = pred(r);
    console.log('[webShim UPDATE] row id:', r.id, 'matches WHERE:', matches, 'current stock_count:', r.stock_count);
    if (!matches) return;
    let pj = 0;
    for (const op of setOps) {
      const oldVal = r[op.col];
      if (op.expr === '?') {
        r[op.col] = setParams[pj++];
      } else if (op.expr.toLowerCase().includes('datetime')) {
        r[op.col] = new Date().toISOString();
      } else {
        // e.g. "stock_count - ?" or "stock_count + ?"
        const mathPlaceholder = /^(\w+)\s*([-+])\s*\?$/i.exec(op.expr);
        if (mathPlaceholder) {
          const colName = mathPlaceholder[1];
          const operator = mathPlaceholder[2];
          const currentVal = r[colName] ?? 0;
          const delta = setParams[pj++];
          const newVal = operator === '-' ? currentVal - delta : currentVal + delta;
          console.log('[webShim UPDATE] math expr - col:', op.col, 'currentVal:', currentVal, operator, 'delta:', delta, '= newVal:', newVal);
          r[op.col] = newVal;
          continue;
        }
        // "MAX(0, stock_count - ?)"
        const mathMatch = /^MAX\s*\(\s*0\s*,\s*(\w+)\s*-\s*\?\s*\)$/i.exec(op.expr);
        if (mathMatch) {
          const colName = mathMatch[1];
          const currentVal = r[colName] ?? 0;
          const decrementBy = setParams[pj++];
          const newVal = Math.max(0, currentVal - decrementBy);
          console.log('[webShim UPDATE] MAX expr - col:', op.col, 'currentVal:', currentVal, 'decrementBy:', decrementBy, 'newVal:', newVal);
          r[op.col] = newVal;
          continue;
        }
        // "snooze_count + 1" (literal number, not placeholder)
        const incMatch = /^(\w+)\s*\+\s*(\d+)$/i.exec(op.expr);
        if (incMatch) { r[op.col] = (r[incMatch[1]] ?? 0) + Number(incMatch[2]); continue; }
        // Strip surrounding quotes for literal string assignments like status="snoozed"
        const strLit = /^["'](.*)["']$/.exec(op.expr);
        if (strLit) { r[op.col] = strLit[1]; continue; }
        // Numeric literal
        if (/^-?\d+(\.\d+)?$/.test(op.expr)) { r[op.col] = Number(op.expr); continue; }
        r[op.col] = op.expr;
      }
      console.log('[webShim UPDATE] set', op.col, ':', oldVal, '->', r[op.col]);
    }
    updated++;
  });
  console.log('[webShim UPDATE] updated', updated, 'rows');

  save(store);
}

function runDelete(sql: string, params: any[]): void {
  const m = /DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/is.exec(sql);
  if (!m) return;
  const tbl = m[1];
  const whereSql = m[2] ?? '';
  const t = ensureTable(tbl);
  const { pred } = parseWhere(whereSql, params);
  t.rows = t.rows.filter((r) => !pred(r));
  save(store);
}

function processStatement(sql: string, params: any[]): Row[] {
  const trimmed = sql.trim().replace(/;\s*$/, '');
  if (!trimmed) return [];
  if (/^CREATE\s+(TABLE|INDEX|UNIQUE)/i.test(trimmed)) {
    const tbl = tableFromSql(trimmed, 'TABLE') || tableFromSql(trimmed, 'INDEX');
    if (tbl) ensureTable(tbl);
    return [];
  }
  if (/^PRAGMA/i.test(trimmed)) return [];
  if (isSelect(trimmed)) return runSelect(trimmed, params);
  if (/^INSERT/i.test(trimmed)) { runInsert(trimmed, params); return []; }
  if (/^UPDATE/i.test(trimmed)) { runUpdate(trimmed, params); return []; }
  if (/^DELETE/i.test(trimmed)) { runDelete(trimmed, params); return []; }
  return [];
}

/** Public expo-sqlite-compatible facade. */
export function openWebDatabaseShim(): any {
  return {
    execSync(sql: string): void {
      // Statements separated by ';'
      for (const stmt of sql.split(';')) {
        const s = stmt.trim();
        if (s) processStatement(s, []);
      }
    },
    runSync(sql: string, ...params: any[]): { lastInsertRowId: number; changes: number } {
      const lastId = /^INSERT/i.test(sql)
        ? runInsert(sql, params)
        : (processStatement(sql, params), 0);
      return { lastInsertRowId: lastId, changes: 1 };
    },
    getFirstSync<T = any>(sql: string, ...params: any[]): T | null {
      const rows = processStatement(sql, params);
      return (rows[0] as T) ?? null;
    },
    getAllSync<T = any>(sql: string, ...params: any[]): T[] {
      return processStatement(sql, params) as T[];
    },
  };
}
