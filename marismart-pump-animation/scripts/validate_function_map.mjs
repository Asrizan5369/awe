// Validates app-content/marismart_function_map.json:
//  1. JSON Schema (draft 2020-12)
//  2. Content rules the schema cannot express.
// Usage: node scripts/validate_function_map.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app-content');
const data = JSON.parse(fs.readFileSync(path.join(dir, 'marismart_function_map.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(dir, 'marismart_function_map.schema.json'), 'utf8'));

const errors = [];
const ajv = new Ajv2020({ allErrors: true, strict: false });
if (!ajv.validate(schema, data)) for (const e of ajv.errors) errors.push(`schema ${e.instancePath} ${e.message}`);

// Every {ms,en} object anywhere must have both languages, non-empty, and not identical.
(function walk(node, at) {
  if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${at}[${i}]`));
  if (node && typeof node === 'object') {
    const keys = Object.keys(node);
    if (keys.includes('ms') || keys.includes('en')) {
      if (!node.ms || !node.en) errors.push(`${at}: missing ms or en`);
      else if (node.ms === node.en && node.ms.length > 12) errors.push(`${at}: ms and en are identical (untranslated?)`);
    }
    for (const k of keys) walk(node[k], `${at}.${k}`);
  }
})(data, '$');

const ids = data.points.map((p) => p.id);
if (new Set(ids).size !== ids.length) errors.push('duplicate point ids');
for (const p of data.points) {
  for (const f of p.evidence) if (!data.evidenceFields[f]) errors.push(`point ${p.id}: unknown evidence field "${f}"`);
  const nCorrect = p.quickCheck.options.filter((o) => o.correct).length;
  if (nCorrect !== 1) errors.push(`point ${p.id}: quick check must have exactly one correct option (has ${nCorrect})`);
}
for (const s of data.scenarios) {
  if (!ids.includes(s.relatedPoint)) errors.push(`scenario ${s.id}: unknown relatedPoint ${s.relatedPoint}`);
  if (s.options.filter((o) => o.correct).length !== 1) errors.push(`scenario ${s.id}: needs exactly one correct option`);
}
const order = data.progression.selfCheck.questionOrder;
if ([...order].sort().join() !== [...ids].sort().join()) errors.push('selfCheck.questionOrder must list every point once');
if (data.progression.selfCheck.unlockAfterExplored > ids.length) errors.push('selfCheck unlock count exceeds number of points');

// No invented operating values: observation/do-not/mistake/feedback text must contain no digits.
const noDigits = [];
for (const p of data.points) for (const k of ['observe', 'doNot', 'commonMistakes']) for (const t of p[k]) noDigits.push([`${p.id}.${k}`, t]);
for (const p of data.points) for (const o of p.quickCheck.options) noDigits.push([`${p.id}.quickCheck`, o.text], [`${p.id}.quickCheck`, o.feedback]);
for (const [at, t] of noDigits) if (/\d/.test(t.ms + t.en)) errors.push(`${at}: contains a digit — possible invented value: "${t.en}"`);

// Video links must point at clips that exist in renders/.
const renders = path.join(dir, '..', 'renders');
for (const p of data.points) for (const v of p.links.video) if (!fs.existsSync(path.join(renders, v.file))) errors.push(`point ${p.id}: video not found ${v.file}`);

if (errors.length) {
  console.error(`FAILED (${errors.length})\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log(`OK: ${data.points.length} points, ${data.scenarios.length} scenarios, all text bilingual, schema valid.`);
