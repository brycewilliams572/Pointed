const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

function load(relative, overrides = {}) {
  const file = path.resolve(__dirname, '..', relative.endsWith('.ts') ? relative : relative + '.ts');
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('require', 'module', 'exports', compiled)(
    (name) => overrides[name] ?? (name.startsWith('.') ? load(path.resolve(path.dirname(file), name), overrides) : require(name)), module, module.exports,
  );
  return module.exports;
}

function connection(filename = ':memory:') {
  const native = new DatabaseSync(filename);
  return {
    native,
    async execAsync(sql) { native.exec(sql); },
    async runAsync(sql, ...args) { return native.prepare(sql).run(...args); },
    async getFirstAsync(sql, ...args) { return native.prepare(sql).get(...args) ?? null; },
    async getAllAsync(sql, ...args) { return native.prepare(sql).all(...args); },
    async withTransactionAsync(work) {
      native.exec('BEGIN');
      try { await work(); native.exec('COMMIT'); }
      catch (error) { native.exec('ROLLBACK'); throw error; }
    },
  };
}

module.exports = { connection, load };
