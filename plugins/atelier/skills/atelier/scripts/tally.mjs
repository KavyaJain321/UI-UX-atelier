#!/usr/bin/env node
/**
 * tally.mjs - combine blind judges' rankings into one decision, then un-blind it.
 *
 *   node tally.mjs <lab-dir> <judge.json> [<judge.json> ...]
 *
 * <lab-dir> is the --out folder of palette-lab.mjs (it reads mapping.json and scores.json).
 * Each judge file is the JSON a judge returned: { lens, ranking: ["C","A",...], scores, topWeakness,
 * steal, verdict }. Extra prose around the JSON is tolerated.
 *
 * Borda count: on N candidates, 1st place earns N-1 points and last earns 0. Ties break on fewer
 * measured contrast failures, then on fewer changed variables (closer to what the client already
 * has). Writes tally.md and tally.json beside the lab output.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [labArg, ...judgeFiles] = process.argv.slice(2);
if (!labArg || !judgeFiles.length) { console.error('usage: node tally.mjs <lab-dir> <judge.json> [...]'); process.exit(1); }
const LAB = resolve(labArg);
const mapping = JSON.parse(readFileSync(join(LAB, 'mapping.json'), 'utf8'));
const scores = JSON.parse(readFileSync(join(LAB, 'scores.json'), 'utf8')).results;
const byLetter = Object.fromEntries(scores.map((r) => [r.letter, r]));
const letters = Object.keys(mapping).sort();
const N = letters.length;

const judges = judgeFiles.map((f) => {
  const raw = readFileSync(f, 'utf8');
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON object in ' + f);
  const j = JSON.parse(m[0]);
  const ranking = (j.ranking || []).map((x) => String(x).trim().toUpperCase()).filter((x) => letters.includes(x));
  if (ranking.length !== N) console.warn(`warning: ${f} ranks ${ranking.length} of ${N} candidates`);
  return { file: f, lens: j.lens || f, ranking, raw: j };
});

const points = Object.fromEntries(letters.map((l) => [l, 0]));
const places = Object.fromEntries(letters.map((l) => [l, []]));
for (const j of judges) j.ranking.forEach((l, i) => { points[l] += N - 1 - i; places[l].push(i + 1); });

const changedVars = (l) => byLetter[l]?.applied?.changed ?? Object.keys(byLetter[l]?.vars || {}).length;
const fails = (l) => (byLetter[l]?.contrast?.fails ?? 0) + (byLetter[l]?.mobileContrast?.fails ?? 0);
const order = [...letters].sort((a, b) => points[b] - points[a] || fails(a) - fails(b) || changedVars(a) - changedVars(b));
const winner = order[0];

// candidates the judges could not separate: same vars except one or two, and adjacent scores
const near = [];
for (let i = 0; i < letters.length; i++) for (let k = i + 1; k < letters.length; k++) {
  const a = byLetter[letters[i]], b = byLetter[letters[k]];
  const keys = new Set([...Object.keys(a.vars || {}), ...Object.keys(b.vars || {})]);
  const diff = [...keys].filter((key) => (a.vars || {})[key] !== (b.vars || {})[key]);
  const baselineLike = (r) => !Object.keys(r.vars || {}).length;
  // against the baseline, what matters is how many variables actually changed on the page
  const n = baselineLike(a) || baselineLike(b) ? (a.applied?.changed ?? 0) + (b.applied?.changed ?? 0) : diff.length;
  if (n <= 1)
    near.push(`${letters[i]} (${mapping[letters[i]]}) and ${letters[k]} (${mapping[letters[k]]}) differ in ${n} variable(s); treat their ranking against each other as noise`);
}

const L = [];
L.push('# Palette tournament — result', '');
L.push(`**Winner: ${winner} · ${mapping[winner]}** with ${points[winner]} of ${(N - 1) * judges.length} possible points.`, '');
L.push(`| Letter | Candidate | ${judges.map((j) => j.lens).join(' | ')} | Points | Contrast fails (desktop+phone) | Vars changed |`);
L.push(`|---|---|${judges.map(() => '---').join('|')}|---|---|---|`);
for (const l of order) {
  L.push(`| ${l} | ${mapping[l]} | ${places[l].map((p) => `#${p}`).join(' | ')} | ${points[l]} | ${fails(l)} | ${changedVars(l)} |`);
}
L.push('');
if (near.length) { L.push('**Near-identical pairs:**', ''); near.forEach((n) => L.push(`- ${n}`)); L.push(''); }
L.push('## What each judge said', '');
for (const j of judges) {
  const r = j.raw;
  L.push(`**${j.lens}** — top pick ${j.ranking[0]} (${mapping[j.ranking[0]]}). ${r.verdict || ''}`);
  if (r.topWeakness) L.push(`- Weakness of its top pick: ${r.topWeakness}`);
  if (r.steal && r.steal.from) L.push(`- Worth stealing from ${r.steal.from} (${mapping[String(r.steal.from).toUpperCase()] || '?'}): ${r.steal.what}`);
  L.push('');
}
const tops = [...new Set(judges.map((j) => j.ranking[0]))];
if (tops.length > 1) {
  L.push('## Hybrid?', '');
  L.push(`Judges' top picks differ (${tops.map((t) => `${t} ${mapping[t]}`).join(' vs ')}). If each names something worth stealing from the other, build ONE hybrid and compare it blind against ${winner} only. One round, no more.`, '');
}
if (!Object.keys(byLetter[winner]?.vars || {}).length) {
  L.push('## The baseline won', '', 'That is a real result: the palette was not the problem. Put the effort into hierarchy, type, or the wow moment instead.', '');
}
writeFileSync(join(LAB, 'tally.md'), L.join('\n'));
writeFileSync(join(LAB, 'tally.json'), JSON.stringify({ winner, winnerName: mapping[winner], order, points, places, judges: judges.map((j) => ({ lens: j.lens, ranking: j.ranking })) }, null, 2));
console.log(L.join('\n'));
