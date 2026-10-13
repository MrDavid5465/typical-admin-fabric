#!/usr/bin/env node
// Statically validates DisplaySchema<T>/DisplayField definitions (List/
// CardList column schemas) against the catalog in ../SKILL.md. Same
// approach as form-schema's validate-schema.cjs: real TypeScript compiler
// API, not regex, so multi-line objects and unrelated same-named keys
// elsewhere in a file don't produce false hits.
//
// Usage (run from your app's root, so `typescript` resolves from its
// node_modules):
//   node <path-to>/validate-list-schema.cjs <file.ts|file.tsx> [more files...]
//   node <path-to>/validate-list-schema.cjs       # scans ./src (or . if no src)
// The library folders (per-form, typical-admin, typical-admin-fabric) and
// node_modules are skipped when scanning.
//
// Exit code: 1 if any ERROR found, 0 otherwise (warnings don't fail the run).

const fs = require('fs');
const path = require('path');

function loadTypeScript() {
  const paths = [process.cwd(), __dirname, ...(process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean)];
  try {
    return require(require.resolve('typescript', { paths }));
  } catch {
    console.error('Cannot find the `typescript` package. Run this from an app root that has it installed (npm i -D typescript).');
    process.exit(2);
  }
}
const ts = loadTypeScript();
const LIBRARY_DIRS = new Set(['per-form', 'typical-admin', 'typical-admin-fabric', 'node_modules']);

// ─── The fixed catalog (keep in sync with SKILL.md) ─────────────────────────

const RECOGNIZED_FIELD_KEYS = ['label', 'onRender', 'options'];

// options.* sub-keys lib/List.tsx reads (see SKILL.md's options table).
const LIVE_OPTION_KEYS = ['minWidth', 'maxWidth', 'filterable', 'options'];

// Implemented but broken: the date-range filter inputs remount on every
// keystroke (focus is lost after each character).
const BROKEN_OPTION_KEYS = ['filterType'];

const ALL_OPTION_KEYS = [...LIVE_OPTION_KEYS, ...BROKEN_OPTION_KEYS];

// ─── Small utilities (duplicated from form-schema's script on purpose —
// each skill's scripts are meant to stand alone, not share a private lib) ──

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function closestOf(value, candidates) {
  let best = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(value, c);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return bestDist <= 2 ? best : null;
}

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (LIBRARY_DIRS.has(entry.name)) continue;
      walkFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// ─── AST helpers ────────────────────────────────────────────────────────────

function propAssignments(objLiteral) {
  return objLiteral.properties.filter(p => ts.isPropertyAssignment(p));
}

function propNames(objLiteral) {
  const names = new Set();
  for (const prop of objLiteral.properties) {
    if ((ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) && prop.name) {
      if (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) names.add(prop.name.text);
    }
  }
  return names;
}

function hasSpread(objLiteral) {
  return objLiteral.properties.some(p => ts.isSpreadAssignment(p));
}

function getProp(objLiteral, key) {
  for (const prop of objLiteral.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ((ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) && prop.name.text === key)
    ) {
      return prop.initializer;
    }
  }
  return undefined;
}

// ─── Per-file validation ────────────────────────────────────────────────────

function checkFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath, text, ts.ScriptTarget.Latest, true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const findings = [];
  function lineOf(node) {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  }

  // Pass 1: collect every `const NAME = <initializer>` in the file (any
  // scope) so `columns: someIdentifier` can be resolved without a full
  // type-checker/program — single-file, best-effort, last-write-wins.
  const localConsts = new Map();
  function collect(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      localConsts.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, collect);
  }
  collect(sourceFile);

  function resolveToObjectLiteral(expr) {
    if (!expr) return undefined;
    if (ts.isObjectLiteralExpression(expr)) return expr;
    if (ts.isIdentifier(expr) && localConsts.has(expr.text)) {
      return resolveToObjectLiteral(localConsts.get(expr.text));
    }
    return undefined; // call expressions, spreads-of-multiple-schemas, etc. — not statically resolvable, skip
  }

  function validateOptionsBag(optionsExpr) {
    if (!ts.isObjectLiteralExpression(optionsExpr)) return;
    for (const name of propNames(optionsExpr)) {
      if (LIVE_OPTION_KEYS.includes(name)) continue;
      if (BROKEN_OPTION_KEYS.includes(name)) {
        findings.push({
          level: 'WARN',
          line: lineOf(optionsExpr),
          message: `options.${name} ('dateRange') is implemented in lib/List.tsx but broken: its start/end inputs remount on every keystroke and lose focus (see list-schema SKILL.md)`,
        });
        continue;
      }
      const suggestion = closestOf(name, ALL_OPTION_KEYS);
      findings.push({
        level: 'WARN',
        line: lineOf(optionsExpr),
        message: suggestion
          ? `options.${name} is not a recognized key — did you mean '${suggestion}'?`
          : `options.${name} is not a recognized key`,
      });
    }
  }

  function validateSchemaRoot(rootObjLiteral) {
    for (const prop of propAssignments(rootObjLiteral)) {
      const fieldExpr = prop.initializer;
      if (!ts.isObjectLiteralExpression(fieldExpr)) continue; // e.g. field('baud', 'Baud', true) — opaque, can't check statically

      const names = propNames(fieldExpr);
      const spread = hasSpread(fieldExpr);

      if (!spread && !names.has('label')) {
        findings.push({
          level: 'ERROR',
          line: lineOf(fieldExpr),
          message: `DisplayField is missing required 'label'`,
        });
      }

      for (const name of names) {
        if (RECOGNIZED_FIELD_KEYS.includes(name)) continue;
        const suggestion = closestOf(name, RECOGNIZED_FIELD_KEYS);
        findings.push({
          level: 'WARN',
          line: lineOf(fieldExpr),
          message: suggestion
            ? `'${name}' is not a recognized DisplayField key (label/onRender/options) — did you mean '${suggestion}'?`
            : `'${name}' is not a recognized DisplayField key (label/onRender/options) — TypeScript won't always catch this through an untyped intermediate const (DisplayField has no index signature)`,
        });
      }

      const optionsExpr = getProp(fieldExpr, 'options');
      if (optionsExpr) validateOptionsBag(optionsExpr);
    }
  }

  function visit(node) {
    // Anchor 1: `const x: DisplaySchema<...> = {...}`
    if (
      ts.isVariableDeclaration(node) &&
      node.type &&
      ts.isTypeReferenceNode(node.type) &&
      ts.isIdentifier(node.type.typeName) &&
      node.type.typeName.text === 'DisplaySchema' &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      validateSchemaRoot(node.initializer);
    }

    // Anchor 2: `{ columns: <object literal or same-file identifier> }`
    if (
      ts.isPropertyAssignment(node) &&
      ((ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) && node.name.text === 'columns')
    ) {
      const resolved = resolveToObjectLiteral(node.initializer);
      if (resolved) validateSchemaRoot(resolved);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const root = process.cwd();
  const scanDir = fs.existsSync(path.join(root, 'src')) ? path.join(root, 'src') : root;
  const files = args.length > 0
    ? args.map(a => path.resolve(a))
    : walkFiles(scanDir);

  let errorCount = 0;
  let warnCount = 0;

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`No such file: ${file}`);
      process.exitCode = 1;
      continue;
    }
    const findings = checkFile(file);
    if (findings.length === 0) continue;
    const rel = path.relative(root, file);
    for (const f of findings) {
      console.log(`${rel}:${f.line} [${f.level}] ${f.message}`);
      if (f.level === 'ERROR') errorCount++; else warnCount++;
    }
  }

  console.log(`\nChecked ${files.length} file(s). ${errorCount} error(s), ${warnCount} warning(s).`);
  if (errorCount > 0) process.exitCode = 1;
}

main();
