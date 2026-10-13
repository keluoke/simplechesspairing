// Phase 2 Verification Test: Pairing Rules (R01), Tournament Lifecycle (R09), Tiebreaks (R10)
// Run: node test_phase2.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = __dirname;
const Engine = require(path.join(root, 'js/swiss.js'));
const Storage = require(path.join(root, 'js/storage.js'));

function createPlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    initialSeed: i + 1,
    status: 'active'
  }));
}

function createFixture(seed = 10) {
  const ps = createPlayers(8);
  const rounds = [];
  let x = seed;
  for (let i = 1; i <= 4; i++) {
    const r = Engine.generateSwissPairing(ps, rounds, i);
    r.pairings.forEach(m => {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      m.result = ['1-0', '0-1', '0.5-0.5'][Math.floor((x / 4294967296) * 3)];
    });
    rounds.push(r);
  }
  return {
    groupId: 'men',
    title: 'Review fixture',
    status: 'in_progress',
    players: ps,
    rounds,
    currentRoundIndex: 3,
    activeTab: 'tabPairing'
  };
}

function legalColors(w, b, rounds) {
  const a = Engine.getPlayerColorStats(w, rounds);
  const c = Engine.getPlayerColorStats(b, rounds);
  return !(a.consecutiveColor === 'W' && a.consecutiveCount >= 2)
    && !(c.consecutiveColor === 'B' && c.consecutiveCount >= 2)
    && Math.abs(a.diff + 1) <= 2 && Math.abs(c.diff - 1) <= 2;
}

function createSandbox(href = 'http://localhost/index.html', confirmResult = true) {
  const data = new Map();
  const dom = new Map();

  function createElement() {
    return {
      value: '',
      style: {},
      dataset: {},
      innerHTML: '',
      textContent: '',
      classList: {
        add() {},
        remove() {},
        contains() { return false; }
      },
      addEventListener() {},
      querySelector() { return createElement(); },
      querySelectorAll() { return []; },
      appendChild() {},
      remove() {},
      focus() {},
      select() {}
    };
  }

  const ctx = {
    console,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Response,
    CompressionStream,
    DecompressionStream,
    atob,
    btoa,
    unescape,
    escape,
    setTimeout() {},
    confirm: () => confirmResult,
    alerts: [],
    toasts: [],
    localStorage: {
      getItem: k => data.get(k) ?? null,
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: k => data.delete(k),
      _raw: data
    },
    document: {
      getElementById(id) {
        if (!dom.has(id)) dom.set(id, createElement());
        return dom.get(id);
      },
      querySelectorAll() { return []; },
      createElement,
      addEventListener() {},
      documentElement: { setAttribute() {} },
      body: { classList: { add() {}, remove() {} }, appendChild() {}, removeChild() {} }
    },
    window: {
      location: new URL(href),
      history: {
        replaceState(a, b, url) {
          ctx.window.location = new URL(url, ctx.window.location.href);
        }
      }
    },
    FileReader: class {
      readAsText(file) {
        this.onload({ target: { result: file.content } });
      }
    }
  };

  ctx.alert = s => ctx.alerts.push(s);
  vm.createContext(ctx);

  for (const f of ['swiss.js', 'storage.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx);
  }

  const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').replace(
    "document.addEventListener('DOMContentLoaded', init);",
    'globalThis.ReviewApp = { state, els, cacheDom, handleUrlSnapshotAndParams, switchGroup, handleTakeoverSnapshot, handleImportFile, handleExportJSON, handleDeleteCustomGroup, loadRosterPreset, handleStartTournament, handleFinishRoundAndNext, handleFinishTournament, handleReopenTournament, setMatchResult, openLeaveModal, renderStandings, renderPrintableSheet, saveState };'
  );
  vm.runInContext(appSource, ctx);
  ctx.ReviewApp.cacheDom();
  return ctx;
}

async function runTests() {
  console.log('--- ♟️ Starting Phase 2 Verification Tests (R01, R09, R10) ---');

  // Test 1: R01 Color rule satisfaction on Seed 10 fixture
  console.log('Test 1: R01 Strict color constraints on Seed 10 (P6 diff <= 2)');
  {
    const f10 = createFixture(10);
    const next10 = Engine.generateSwissPairing(f10.players, f10.rounds, 5);
    const bad = next10.pairings.filter(m => !legalColors(m.whiteId, m.blackId, f10.rounds));
    assert.equal(bad.length, 0, 'Seed 10 round 5 must have 0 color rule violations');

    const p6Stats = Engine.getPlayerColorStats(6, [...f10.rounds, next10]);
    assert.ok(Math.abs(p6Stats.diff) <= 2, `P6 diff must be <= 2, got ${p6Stats.diff}`);
    assert.ok(p6Stats.consecutiveCount < 3, `P6 consecutive same color must be < 3, got ${p6Stats.consecutiveCount}`);
    console.log('  ✅ Passed Seed 10 color checks');
  }

  // Test 2: R01 Color rule satisfaction on Seed 11 fixture
  console.log('Test 2: R01 Strict color constraints on Seed 11 (P6 consecutive < 3)');
  {
    const f11 = createFixture(11);
    const next11 = Engine.generateSwissPairing(f11.players, f11.rounds, 5);
    const bad11 = next11.pairings.filter(m => !legalColors(m.whiteId, m.blackId, f11.rounds));
    assert.equal(bad11.length, 0, 'Seed 11 round 5 must have 0 color rule violations');

    const p6Stats11 = Engine.getPlayerColorStats(6, [...f11.rounds, next11]);
    assert.ok(p6Stats11.consecutiveCount < 3, `P6 consecutive same color must be < 3, got ${p6Stats11.consecutiveCount}`);
    console.log('  ✅ Passed Seed 11 consecutive color checks');
  }

  // Test 3: R01 Small field unavoidable rematch produces warning and valid pairing
  console.log('Test 3: R01 Small field handles unavoidable rematches with explicit warning');
  {
    const small = createPlayers(2);
    const first = Engine.generateSwissPairing(small, [], 1);
    first.pairings[0].result = '1-0';
    const repeat = Engine.generateSwissPairing(small, [first], 2);
    assert.ok(repeat.warning !== null, 'Must produce a warning when rematch is unavoidable');
    assert.equal(repeat.pairings.length, 1, 'Must pair the 2 players');
    console.log('  ✅ Passed small field rematch warning checks');
  }

  // Test 4: R01 SwissEngine.validatePairing independent validator
  console.log('Test 4: R01 Independent SwissEngine.validatePairing function');
  {
    const ps = createPlayers(4);
    // Valid pairing
    const valid = [
      { board: 1, whiteId: 1, blackId: 2, result: null },
      { board: 2, whiteId: 3, blackId: 4, result: null }
    ];
    const valResult = Engine.validatePairing(valid, ps, []);
    assert.equal(valResult.valid, true, 'Valid pairings must pass');

    // Self pairing
    const selfPair = [
      { board: 1, whiteId: 1, blackId: 1, result: null },
      { board: 2, whiteId: 2, blackId: 3, result: null }
    ];
    const selfResult = Engine.validatePairing(selfPair, ps, []);
    assert.equal(selfResult.valid, false, 'Self pairing must fail validation');

    // Duplicate pairing in round
    const dupRound = [
      { board: 1, whiteId: 1, blackId: 2, result: null },
      { board: 2, whiteId: 1, blackId: 3, result: null }
    ];
    const dupResult = Engine.validatePairing(dupRound, ps, []);
    assert.equal(dupResult.valid, false, 'Duplicate player in round must fail validation');

    console.log('  ✅ Passed independent pairing validator checks');
  }

  // Test 5: R09 Forced round completion assigns '0-0' to uncompleted boards
  console.log('Test 5: R09 handleFinishRoundAndNext assigns 0-0 without leaving null');
  {
    const f = createFixture();
    const c = createSandbox('http://localhost/index.html', true);
    Object.assign(c.ReviewApp.state, f, { isAdmin: true });
    // In current round (round 4), clear result of board 1
    c.ReviewApp.state.rounds[3].pairings[0].result = null;

    // Advance round
    c.ReviewApp.handleFinishRoundAndNext();

    // Round 4 board 1 must have 0-0, NOT null
    const r4b1 = c.ReviewApp.state.rounds[3].pairings[0];
    assert.equal(r4b1.result, '0-0', 'Uncompleted board must be recorded as 0-0 (double forfeit)');
    assert.equal(c.ReviewApp.state.rounds.length, 5, 'Next round must be generated');
    console.log('  ✅ Passed forced round 0-0 completion checks');
  }

  // Test 6: R09 Finish tournament lifecycle & reopening
  console.log('Test 6: R09 Tournament completion and reopening lifecycle');
  {
    const f = createFixture();
    const c = createSandbox('http://localhost/index.html', true);
    Object.assign(c.ReviewApp.state, f, { isAdmin: true });

    // Finish tournament
    c.ReviewApp.handleFinishTournament();
    assert.equal(c.ReviewApp.state.status, 'finished', 'Status must transition to finished');

    const stored = c.TournamentStorage.loadTournament('men');
    assert.equal(stored.status, 'finished', 'Stored tournament must have status finished');

    // Reopen tournament
    c.ReviewApp.handleReopenTournament();
    assert.equal(c.ReviewApp.state.status, 'in_progress', 'Status must transition back to in_progress');
    console.log('  ✅ Passed tournament completion & reopening lifecycle checks');
  }

  // Test 7: R10 Standings tiebreak calculations & 0-0 handling
  console.log('Test 7: R10 calculateStandings handles 0-0 and tiebreak order');
  {
    const ps = createPlayers(4);
    const round1 = {
      roundNumber: 1,
      pairings: [
        { board: 1, whiteId: 1, blackId: 2, result: '1-0' },
        { board: 2, whiteId: 3, blackId: 4, result: '0-0' }
      ]
    };
    const standings = Engine.calculateStandings(ps, [round1]);

    const p1 = standings.find(p => p.id === 1);
    const p2 = standings.find(p => p.id === 2);
    const p3 = standings.find(p => p.id === 3);
    const p4 = standings.find(p => p.id === 4);

    assert.equal(p1.score, 1, 'P1 must have 1 point');
    assert.equal(p1.wins, 1, 'P1 must have 1 win');
    assert.equal(p2.score, 0, 'P2 must have 0 points');
    assert.equal(p3.score, 0, 'P3 (0-0 double forfeit) must have 0 points');
    assert.equal(p3.wins, 0, 'P3 must have 0 wins');
    assert.equal(p4.score, 0, 'P4 (0-0 double forfeit) must have 0 points');
    assert.equal(p4.wins, 0, 'P4 must have 0 wins');

    assert.equal(standings[0].id, 1, 'P1 must be ranked #1');
    console.log('  ✅ Passed 0-0 tiebreaks and standings checks');
  }

  // Test 8: R09 Historical score modification preserves pairings & recalculates standings
  console.log('Test 8: R09 Historical score update updates totals and preserves pairing identities');
  {
    const f = createFixture();
    const c = createSandbox('http://localhost/index.html', true);
    Object.assign(c.ReviewApp.state, f, { isAdmin: true });

    // Modify round 1 board 1 result to 1-0
    const board1 = c.ReviewApp.state.rounds[0].pairings[0];
    const prevWhiteId = board1.whiteId;
    const prevBlackId = board1.blackId;

    c.ReviewApp.setMatchResult(0, board1.board, '1-0');

    assert.equal(board1.result, '1-0', 'Result must be updated');
    assert.equal(board1.whiteId, prevWhiteId, 'White player identity must not change');
    assert.equal(board1.blackId, prevBlackId, 'Black player identity must not change');

    // Standings should reflect the update
    const standings = Engine.calculateStandings(c.ReviewApp.state.players, c.ReviewApp.state.rounds);
    const winner = standings.find(p => p.id === prevWhiteId);
    assert.ok(winner.score >= 1, 'Winner score must reflect round 1 win');
    console.log('  ✅ Passed historical score update checks');
  }

  console.log('\n🎉 ALL Phase 2 verification tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
