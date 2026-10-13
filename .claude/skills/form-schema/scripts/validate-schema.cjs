#!/usr/bin/env node
// Statically validates per-form schema field definitions against the fixed
// catalog of field types typical-admin-fabric's lib/templates/Fabric.tsx
// implements (see ../SKILL.md, which this table mirrors). Uses the real
// TypeScript compiler API, not regex, so multi-line objects, nested braces and
// strings containing "type" don't produce false hits.
//
// Usage (run from your app's root, so `typescript` resolves from its
// node_modules):
//   node <path-to>/validate-schema.cjs <file.ts|file.tsx> [more files...]
//   node <path-to>/validate-schema.cjs            # scans ./src (or . if no src)
// The library folders themselves (per-form, typical-admin, typical-admin-fabric)
// and node_modules are skipped when scanning.
//
// Levels: ERROR (exit 1), WARN (likely mistake), NOTE (a known trap; check it
// applies). Only ERRORs fail the run.

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

// ─── The fixed catalog (keep in sync with Fabric.tsx's switch + SKILL.md) ──

// type -> extra property required to be present on the same object literal.
// Types not listed here have no required extra (or aren't a special case at
// all — see FREEFORM_TYPES below).
const REQUIRED_EXTRAS = {
  multicheckbox: 'fields',
  radio: 'options',
  select: 'options',
  'multi-select': 'options',
  picker: 'options',
  combobox: 'options',
  'image-upload': 'uploadFn',
  custom: 'onRender',
  list: 'itemSchema',
};

// Every type Fabric.tsx's switch explicitly special-cases (whether or not it
// has a required extra above).
const KNOWN_TYPES = new Set([
  'checkbox', 'multicheckbox', 'radio', 'select', 'multi-select',
  'gamepad-select', 'image-upload', 'picker', 'date', 'datetime',
  'combobox', 'timetoday', 'range', 'slider', 'check', 'button', 'signature',
  'custom', 'list',
]);

// Common values that are *intentionally* not special-cased: they fall through
// to the default plain TextField (only 'number'/'text' additionally pick a
// submit-time converter; the rest are labels with no behavior). Not typos.
const FREEFORM_SAFE_TYPES = new Set([
  'text', 'number', 'email', 'password', 'tel', 'url', 'textarea', 'search',
]);

// Keys that are accepted by the schema but currently do nothing at render
// time — see SKILL.md's "dead properties" section for why.
const DEAD_KEYS = ['display', 'hint'];

// Pass a comma-separated list in SCHEMA_IGNORE_MARKERS to skip object
// literals that carry any of these keys (for app objects that happen to have
// both `type` and `label` but aren't per-form fields).
const IGNORE_MARKERS = (process.env.SCHEMA_IGNORE_MARKERS || '').split(',').filter(Boolean);
const LIBRARY_DIRS = new Set(['per-form', 'typical-admin', 'typical-admin-fabric', 'node_modules']);

// ─── Small utilities ────────────────────────────────────────────────────────

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

function closestKnownType(value) {
  let best = null;
  let bestDist = Infinity;
  for (const known of KNOWN_TYPES) {
    const d = levenshtein(value, known);
    if (d < bestDist) { bestDist = d; best = known; }
  }
  return bestDist <= 2 ? best : null;
}

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip the libraries themselves: we validate schema *authors*.
      if (LIBRARY_DIRS.has(entry.name)) continue;
      walkFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// ─── AST walk ───────────────────────────────────────────────────────────────

function propNames(objLiteral) {
  const names = new Set();
  for (const prop of objLiteral.properties) {
    if ((ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) && prop.name) {
      if (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) {
        names.add(prop.name.text);
      }
    }
  }
  return names;
}

function getStringProp(objLiteral, key) {
  for (const prop of objLiteral.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ((ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) && prop.name.text === key)
    ) {
      return ts.isStringLiteral(prop.initializer) ? prop.initializer.text : undefined;
    }
  }
  return undefined;
}

function checkFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const findings = [];

  function lineOf(node) {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  }

  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const names = propNames(node);
      // Heuristic for "this is a per-form Field definition": both `type`
      // and `label` are required, non-optional keys on per-form's own
      // `Field` interface, and co-occurring as sibling string-ish
      // properties is not a pattern anything else in this codebase uses
      // coincidentally.
      const isComponentSchema = IGNORE_MARKERS.some(k => names.has(k));
      // A per-form Field is always the *value of a named property* in a
      // schema object (`{ fieldName: { type, label, ... } }`) — never an
      // element of an array. Excludes unrelated type+label shapes like
      // BaseDashTypeInfo's BASE_DASH_TYPES: BaseDashTypeInfo[].
      const isArrayElement = node.parent && ts.isArrayLiteralExpression(node.parent);
      if (names.has('type') && names.has('label') && !isComponentSchema && !isArrayElement) {
        const typeValue = getStringProp(node, 'type');
        if (typeValue === undefined) {
          // `type` isn't a plain string literal (e.g. computed) — can't
          // statically check it, skip rather than guess.
        } else {
          const requiredExtra = REQUIRED_EXTRAS[typeValue];
          if (requiredExtra && !names.has(requiredExtra)) {
            findings.push({
              level: 'ERROR',
              line: lineOf(node),
              message: `type: '${typeValue}' requires a '${requiredExtra}' property, none found on this field (fine only if you merge it in at render time)`,
            });
          }
          if (typeValue === 'gamepad-select' && !names.has('gamepadMappings')) {
            findings.push({ level: 'WARN', line: lineOf(node),
              message: `type: 'gamepad-select' without 'gamepadMappings' renders an empty "No mappings" note. It is an app-specific leftover in Fabric.tsx; prefer 'select'.` });
          }
          if (typeValue === 'password') {
            findings.push({ level: 'WARN', line: lineOf(node),
              message: `type: 'password' is NOT masked: Fabric.tsx never forwards 'type' to the TextField. Use type: 'custom' with a masked input.` });
          }
          if (typeValue === 'number' && !names.has('converter')) {
            findings.push({ level: 'NOTE', line: lineOf(node),
              message: `type: 'number' uses the built-in converter, which only parses [0-9.]: negatives are submitted as strings, decimals as floats even for Int. Add a 'converter' if either can happen.` });
          }
          if (typeValue === 'date') {
            findings.push({ level: 'NOTE', line: lineOf(node),
              message: `type: 'date' submits a JS Date at local midnight, serialized as a UTC timestamp. Add a 'converter' if the backend wants a calendar date string.` });
          }
          if (names.has('required') && (typeValue === 'number' || typeValue === 'checkbox' || typeValue === 'range' || typeValue === 'slider')) {
            findings.push({ level: 'WARN', line: lineOf(node),
              message: `'required' tests !!value, so it rejects 0${typeValue === 'checkbox' ? ' and false (an unticked box)' : ''}. Use a 'validations' entry if 0/false is a valid answer.` });
          }
          if (!names.has('defaultNull') && !names.has('defaultValue') && !names.has('converter') &&
              ['number', 'checkbox', 'date', 'datetime', 'timetoday', 'range', 'slider', 'select', 'radio', 'combobox'].includes(typeValue)) {
            findings.push({ level: 'NOTE', line: lineOf(node),
              message: `no 'defaultNull'/'defaultValue': an unset (or server-null) value is submitted as '' which GraphQL rejects for Int/Float/Boolean/ID. Usually: defaultNull: null${typeValue === 'checkbox' ? ', or defaultValue: false' : ''}.` });
          }
          if (typeValue === 'list' && names.has('required')) {
            // `!!form[key]` is true for [], so the stock required check
            // passes on an empty list and silently does nothing. useSchema
            // normalizes this to min:1, but the schema should say so.
            findings.push({
              level: 'WARN',
              line: lineOf(node),
              message: `type: 'list' with 'required' — required is a no-op on an array (!![] === true). Use 'min: 1' instead; useSchema normalizes it for you, but write it explicitly.`,
            });
          }
          if (!KNOWN_TYPES.has(typeValue) && !FREEFORM_SAFE_TYPES.has(typeValue)) {
            const suggestion = closestKnownType(typeValue);
            findings.push({
              level: 'WARN',
              line: lineOf(node),
              message: suggestion
                ? `type: '${typeValue}' is not a recognized type — did you mean '${suggestion}'? (otherwise it silently renders as a plain TextField)`
                : `type: '${typeValue}' is not one of the special-cased types — renders as a plain TextField. Fine if intentional.`,
            });
          }
        }
        for (const deadKey of DEAD_KEYS) {
          if (names.has(deadKey)) {
            findings.push({
              level: 'WARN',
              line: lineOf(node),
              message: deadKey === 'hint'
                ? `'hint' is accepted by per-form's types but Fabric.tsx discards it: nothing renders. For text-box types use 'description' (passed to Fluent's TextField, which renders it under the box); otherwise put the text in the label.`
                : `'display' has no effect: nothing reads it, the field still renders. Remove the field from the schema to hide it.`,
            });
          }
        }
      }
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
  let noteCount = 0;

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
      if (f.level === 'ERROR') errorCount++;
      else if (f.level === 'WARN') warnCount++;
      else noteCount++;
    }
  }

  console.log(`\nChecked ${files.length} file(s). ${errorCount} error(s), ${warnCount} warning(s), ${noteCount} note(s).`);
  if (errorCount > 0) process.exitCode = 1;
}

main();
