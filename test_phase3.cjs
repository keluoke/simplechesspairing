// Phase 3 Verification Test: Lossless Snapshot (R02), URL Deep-links (R03), Print CSS/Triggers (R08), CSV Escaping (R12)
// Run: node test_phase3.cjs
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

function createSandbox(href = 'http://localhost/index.html') {
  const data = new Map();
  const dom = new Map();

  function createElement() {
    const classes = new Set();
    const listeners = new Map();
    return {
      value: '',
      style: {},
      dataset: {},
      innerHTML: '',
      textContent: '',
      classList: {
        add(c) { classes.add(c); },
        remove(c) { classes.delete(c); },
        contains(c) { return classes.has(c); }
      },
      addEventListener(type, cb) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(cb);
      },
      dispatchEvent(event) {
        const cbs = listeners.get(event.type) || [];
        cbs.forEach(cb => cb(event));
      },
      querySelector() { return createElement(); },
      querySelectorAll() { return []; },
      appendChild() {},
      removeChild() {},
      remove() {},
      focus() {},
      select() {},
      click() {}
    };
  }

  const windowListeners = new Map();
  const bodyElement = createElement();

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
    setTimeout(fn, ms) { return setTimeout(fn, ms); },
    confirm: () => true,
    alerts: [],
    toasts: [],
    localStorage: {
      getItem: k => data.get(k) ?? null,
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: k => data.delete(k)
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
      body: bodyElement
    },
    window: {
      location: new URL(href),
      history: {
        replaceState(a, b, url) {
          ctx.window.location = new URL(url, ctx.window.location.href);
        }
      },
      print() {},
      addEventListener(type, cb) {
        if (!windowListeners.has(type)) windowListeners.set(type, []);
        windowListeners.get(type).push(cb);
      },
      removeEventListener(type, cb) {
        const list = windowListeners.get(type) || [];
        const idx = list.indexOf(cb);
        if (idx !== -1) list.splice(idx, 1);
      },
      dispatchEvent(type) {
        const list = windowListeners.get(type) || [];
        list.forEach(cb => cb({ type }));
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
    'globalThis.ReviewApp = { state, els, cacheDom, handleUrlSnapshotAndParams, switchGroup, switchTab, handleTriggerPrintSheet, handleTakeoverSnapshot, handleImportFile, handleExportJSON, handleDeleteCustomGroup, loadRosterPreset, handleStartTournament, handleFinishRoundAndNext, handleFinishTournament, handleReopenTournament, setMatchResult, openLeaveModal, renderStandings, renderPrintableSheet, saveState };'
  );
  vm.runInContext(appSource, ctx);
  ctx.ReviewApp.cacheDom();
  return ctx;
}

async function runTests() {
  console.log('--- 🚀 Starting Phase 3 Verification Tests (R02, R03, R08, R12) ---');

  // Test 1: R02 Lossless Snapshot Compression & Decompression
  console.log('Test 1: R02 Snapshot preserves pre-round scores (whiteScore, blackScore) and warnings');
  {
    const f = createFixture(10);
    f.rounds[3].warning = 'Test pairing warning';
    const originalPair = f.rounds[3].pairings.find(m => m.whiteScore > 0 || m.blackScore > 0);
    assert.ok(originalPair, 'Fixture must have non-zero pre-round scores in round 4');

    const packed = await Storage.compressTournamentState(f);
    assert.ok(packed, 'compressTournamentState must succeed');

    const restored = await Storage.decompressTournamentState(packed);
    assert.ok(restored, 'decompressTournamentState must succeed');

    const restoredPair = restored.rounds[3].pairings.find(m => m.board === originalPair.board);
    assert.equal(restoredPair.whiteScore, originalPair.whiteScore, `whiteScore must match: expected ${originalPair.whiteScore}, got ${restoredPair.whiteScore}`);
    assert.equal(restoredPair.blackScore, originalPair.blackScore, `blackScore must match: expected ${originalPair.blackScore}, got ${restoredPair.blackScore}`);
    assert.equal(restored.rounds[3].warning, 'Test pairing warning', 'Warning must be preserved');

    // Standings before and after must match identically
    const beforeStandings = Engine.calculateStandings(f.players, f.rounds).map(p => [p.id, p.score, p.buchholz]);
    const afterStandings = Engine.calculateStandings(restored.players, restored.rounds).map(p => [p.id, p.score, p.buchholz]);
    assert.deepEqual(beforeStandings, afterStandings, 'Standings scores and Buchholz must match identically');
    console.log('  ✅ Passed R02 Lossless Snapshot checks');
  }

  // Test 2: R03 URL deep links are preserved without being overwritten
  console.log('Test 2: R03 URL deep-linking (?group=men&round=1&tab=history) preserves view');
  {
    const f = createFixture();
    const c = createSandbox('http://localhost/index.html?group=men&round=1&tab=history');
    c.TournamentStorage.saveTournament(f, 'men');

    const handled = await c.ReviewApp.handleUrlSnapshotAndParams();
    assert.equal(handled, true, 'handleUrlSnapshotAndParams must return true');
    assert.equal(c.ReviewApp.state.activeTab, 'tabHistory', `activeTab must be tabHistory, got ${c.ReviewApp.state.activeTab}`);
    assert.equal(c.ReviewApp.state.historyViewingRound, 1, `historyViewingRound must be 1, got ${c.ReviewApp.state.historyViewingRound}`);
    assert.equal(c.ReviewApp.state.groupId, 'men', 'groupId must be men');
    console.log('  ✅ Passed R03 URL deep-link checks');
  }

  // Test 3: R08 Print sheet triggers printing-active modal and afterprint cleanup
  console.log('Test 3: R08 Print sheet activates modal backdrop and cleans up');
  {
    const f = createFixture();
    const c = createSandbox();
    Object.assign(c.ReviewApp.state, f);

    // Call print trigger
    c.ReviewApp.handleTriggerPrintSheet();

    assert.ok(c.document.body.classList.contains('printing-sheet-mode'), 'body must have printing-sheet-mode');
    assert.ok(c.ReviewApp.els.modalPrintSheet.classList.contains('printing-active'), 'modalPrintSheet must have printing-active');

    // Dispatch afterprint event
    c.window.dispatchEvent('afterprint');

    assert.ok(!c.document.body.classList.contains('printing-sheet-mode'), 'body printing-sheet-mode must be removed after print');
    assert.ok(!c.ReviewApp.els.modalPrintSheet.classList.contains('printing-active'), 'modalPrintSheet printing-active must be removed after print');
    console.log('  ✅ Passed R08 Print sheet trigger & cleanup checks');
  }

  // Test 4: R12 CSV field escaping & formula injection protection
  console.log('Test 4: R12 CSV field escaping and formula injection protection');
  {
    const dangerousPairings = [
      {
        board: 1,
        whiteName: '=cmd|"/C calc"!A0',
        whiteScore: 1,
        blackName: 'Alice, "The Champion"',
        blackScore: 0.5,
        result: '1-0'
      },
      {
        board: 2,
        isBye: true,
        playerId: 3,
        playerName: '+1234567890\nMalicious',
        playerScore: 2,
        result: '1-0'
      }
    ];

    let downloadedContent = '';
    const c = createSandbox();
    // Stub URL and Blob to capture output
    c.Blob = class {
      constructor(parts) {
        downloadedContent = parts.join('');
      }
    };
    c.URL.createObjectURL = () => 'blob:test';
    c.URL.revokeObjectURL = () => {};

    c.TournamentStorage.exportPairingsToCSV('Test Tournament, "Spring"', 1, dangerousPairings, false);

    assert.ok(downloadedContent.includes('\uFEFF'), 'CSV must have UTF-8 BOM');
    // Formula protection: = and + should be prefixed with single quote '
    assert.ok(downloadedContent.includes("\"'=cmd"), 'Formula starting with = must be protected');
    assert.ok(downloadedContent.includes("\"'+1234567890"), 'Formula starting with + must be protected');
    // Quotes escaping: "The Champion" -> ""The Champion""
    assert.ok(downloadedContent.includes('Alice, ""The Champion""'), 'Inner double quotes must be doubled');

    console.log('  ✅ Passed R12 CSV escaping & formula protection checks');
  }

  console.log('\n🎉 ALL Phase 3 verification tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
