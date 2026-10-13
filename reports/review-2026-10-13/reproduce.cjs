// Read-only review probes. App functions are exposed in a VM copy, never in source.
// Run: node reports/review-2026-10-13/reproduce.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const Engine = require(path.join(root, 'js/swiss.js'));
const Storage = require(path.join(root, 'js/storage.js'));
const findings = [];
function record(id, evidence) { findings.push({ id, evidence }); }
function players(n) {
  return Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `P${i + 1}`, initialSeed: i + 1, status: 'active' }));
}
function fixture(seed = 10) {
  const ps = players(8);
  const rounds = [];
  let x = seed;
  for (let i = 1; i <= 4; i++) {
    const r = Engine.generateSwissPairing(ps, rounds, i);
    r.pairings.forEach(m => {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      m.result = ['1-0', '0-1', '0.5-0.5'][Math.floor(x / 4294967296 * 3)];
    });
    rounds.push(r);
  }
  return { groupId: 'men', title: 'Review fixture', status: 'in_progress', players: ps, rounds, currentRoundIndex: 3, activeTab: 'tabPairing' };
}
function legalColors(w, b, rounds) {
  const a = Engine.getPlayerColorStats(w, rounds), c = Engine.getPlayerColorStats(b, rounds);
  return !(a.consecutiveColor === 'W' && a.consecutiveCount >= 2)
    && !(c.consecutiveColor === 'B' && c.consecutiveCount >= 2)
    && Math.abs(a.diff + 1) <= 2 && Math.abs(c.diff - 1) <= 2;
}
function sandbox(href = 'http://localhost/index.html') {
  const data = new Map();
  const dom = new Map();
  function element() {
    return { value: '', style: {}, dataset: {}, innerHTML: '', textContent: '',
      classList: { add() {}, remove() {} }, addEventListener() {},
      querySelector() { return element(); }, querySelectorAll() { return []; },
      appendChild() {}, remove() {}, focus() {}, select() {} };
  }
  const ctx = { console, URL, URLSearchParams, TextEncoder, TextDecoder, Response, CompressionStream, DecompressionStream,
    atob, btoa, unescape, escape, setTimeout() {}, confirm: () => true, alerts: [],
    localStorage: { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: k => data.delete(k) },
    document: { getElementById(id) { if (!dom.has(id)) dom.set(id, element()); return dom.get(id); },
      querySelectorAll() { return []; }, createElement: element, addEventListener() {}, documentElement: { setAttribute() {} } },
    window: { location: new URL(href), history: { replaceState(a, b, url) { ctx.window.location = new URL(url); } } },
    FileReader: class { readAsText(file) { this.onload({ target: { result: file.content } }); } }
  };
  ctx.alert = s => ctx.alerts.push(s);
  vm.createContext(ctx);
  for (const f of ['swiss.js', 'storage.js']) vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx);
  const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').replace(
    "document.addEventListener('DOMContentLoaded', init);",
    'globalThis.ReviewApp = { state, els, cacheDom, handleUrlSnapshotAndParams, switchGroup, handleTakeoverSnapshot, handleImportFile, handleDeleteCustomGroup, loadRosterPreset, handleStartTournament, openLeaveModal, renderStandings };');
  vm.runInContext(appSource, ctx);
  ctx.ReviewApp.cacheDom();
  return ctx;
}
async function main() {
  const f = fixture();
  const next = Engine.generateSwissPairing(f.players, f.rounds, 5);
  const bad = next.pairings.filter(m => !legalColors(m.whiteId, m.blackId, f.rounds));
  const alternative = [[2, 1], [3, 8], [4, 6], [7, 5]];
  assert(alternative.every(([w, b]) => legalColors(w, b, f.rounds) && !Engine.haveMet(w, b, f.rounds)));
  assert(bad.some(m => m.whiteId === 6 && m.blackId === 5));
  record('R01-colors', { seed: 10, round: 5, bad: bad.map(m => [m.whiteId, m.blackId]), p6Colors: Engine.getPlayerColorStats(6, [...f.rounds, next]), warning: next.warning, legalAlternative: alternative });

  const f11 = fixture(11);
  const next11 = Engine.generateSwissPairing(f11.players, f11.rounds, 5);
  const alternative11 = [[2, 1], [6, 3], [4, 7], [8, 5]];
  assert(alternative11.every(([w, b]) => legalColors(w, b, f11.rounds) && !Engine.haveMet(w, b, f11.rounds)));
  const stats11 = Engine.getPlayerColorStats(6, [...f11.rounds, next11]);
  assert.equal(stats11.consecutiveCount, 3);
  record('R01-three-colors', { seed: 11, round: 5, p6Colors: stats11, warning: next11.warning, legalAlternative: alternative11 });

  const small = players(2), first = Engine.generateSwissPairing(small, [], 1);
  first.pairings[0].result = '1-0';
  const repeat = Engine.generateSwissPairing(small, [first], 2);
  assert(Engine.haveMet(repeat.pairings[0].whiteId, repeat.pairings[0].blackId, [first]));
  record('R01-rematch', { repeat: true, warning: repeat.warning });

  const packed = await Storage.compressTournamentState(f);
  const restored = await Storage.decompressTournamentState(packed);
  const original = f.rounds[3].pairings.find(m => m.whiteScore > 0 || m.blackScore > 0);
  const after = restored.rounds[3].pairings.find(m => m.board === original.board);
  assert.equal(after.whiteScore, 0);
  assert.equal(after.blackScore, 0);
  assert.deepEqual(Engine.calculateStandings(f.players, f.rounds).map(p => [p.id, p.score]), Engine.calculateStandings(restored.players, restored.rounds).map(p => [p.id, p.score]));
  record('R02-snapshot-loss', { before: [original.whiteScore, original.blackScore], after: [after.whiteScore, after.blackScore], standingsScoresPreserved: true });

  let c = sandbox('http://localhost/index.html?group=men&round=1&tab=history');
  c.TournamentStorage.saveTournament(f, 'men');
  const handled = await c.ReviewApp.handleUrlSnapshotAndParams();
  if (!handled) c.ReviewApp.switchGroup(c.TournamentStorage.getActiveGroup(), false);
  assert.equal(c.ReviewApp.state.activeTab, 'tabPairing');
  assert.equal(c.ReviewApp.state.historyViewingRound, 4);
  record('R03-routing', { requested: 'round=1&tab=history', actual: c.window.location.search });

  c = sandbox('http://localhost/index.html#d=fixture');
  Object.assign(c.ReviewApp.state, f, { isSnapshot: true, isAdmin: false });
  c.ReviewApp.handleTakeoverSnapshot();
  const persisted = c.TournamentStorage.loadTournament('men');
  assert.equal(persisted.isSnapshot, true);
  assert.equal(c.window.location.hash, '#d=fixture');
  record('R04-takeover', { persistedSnapshotFlag: persisted.isSnapshot, hashRetained: true, adminAfterTakeover: c.ReviewApp.state.isAdmin });
  c.ReviewApp.state.isSnapshot = true;
  c.ReviewApp.switchGroup('women', false);
  assert.equal(c.ReviewApp.state.isSnapshot, true);
  record('R04-group-switch', { group: c.ReviewApp.state.groupId, snapshotFlag: c.ReviewApp.state.isSnapshot });

  c = sandbox();
  c.TournamentStorage.saveTournament(f, 'men');
  c.ReviewApp.handleImportFile({ target: { files: [{ content: JSON.stringify({ ...f, isAdmin: true, rounds: 'bad-data' }) }] } });
  assert.equal(c.ReviewApp.state.isAdmin, true);
  assert.equal(c.TournamentStorage.loadTournament('men').rounds, 'bad-data');
  assert(c.alerts.length > 0);
  record('R05-import', { importedAdmin: true, invalidRoundsSaved: true, alert: c.alerts[0] });

  c = sandbox();
  Object.assign(c.ReviewApp.state, f, { isAdmin: true, groupId: 'grp_fixture' });
  c.TournamentStorage.saveGroups([{ id: 'men', name: 'Men' }, { id: 'grp_fixture', name: 'Fixture' }]);
  c.TournamentStorage.saveTournament(c.ReviewApp.state, 'grp_fixture');
  c.ReviewApp.handleDeleteCustomGroup();
  assert(c.TournamentStorage.loadTournament('grp_fixture'));
  record('R06-delete-group', { removedFromList: !c.TournamentStorage.getGroups().some(g => g.id === 'grp_fixture'), deletedDataResaved: true });

  c = sandbox();
  c.SampleTournamentData = { womenPlayerNames: ['Test A', 'Test B'], menPlayerNames: [] };
  c.TournamentStorage.saveTournament(f, 'women');
  c.ReviewApp.loadRosterPreset('women');
  c.ReviewApp.handleStartTournament();
  assert.equal(c.TournamentStorage.loadTournament('women').rounds.length, 1);
  record('R06-roster-overwrite', { beforeRounds: 4, afterRounds: 1, noOverwriteConfirmation: true });

  c = sandbox();
  Object.assign(c.ReviewApp.state, f, { isAdmin: true });
  c.ReviewApp.state.players[0].name = '<b>review-marker</b>';
  c.ReviewApp.openLeaveModal();
  assert(c.ReviewApp.els.modalLeavePlayerList.innerHTML.includes('<b>review-marker</b>'));
  record('R07-html', { leaveModalIncludesRawNameMarkup: true, browserScriptExecutionTested: false });

  process.stdout.write(JSON.stringify({ baseline: 'e54fa7c', environment: process.version, probeType: 'Node modules + VM DOM stubs; browser evidence is separate', findings }, null, 2) + '\n');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
