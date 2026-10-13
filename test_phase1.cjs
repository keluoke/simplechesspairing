// Phase 1 Verification Test
// Run: node test_phase1.cjs
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
    'globalThis.ReviewApp = { state, els, cacheDom, handleUrlSnapshotAndParams, switchGroup, handleTakeoverSnapshot, handleImportFile, handleExportJSON, handleDeleteCustomGroup, loadRosterPreset, handleStartTournament, openLeaveModal, renderStandings, renderPrintableSheet, saveState };'
  );
  vm.runInContext(appSource, ctx);
  ctx.ReviewApp.cacheDom();
  return ctx;
}

async function runTests() {
  console.log('--- 🧪 Starting Phase 1 Verification Tests ---');

  // Test 1: validateTournamentData unit tests
  console.log('Test 1: Storage.validateTournamentData schema & validation');
  {
    assert.equal(Storage.validateTournamentData(null).valid, false);
    assert.equal(Storage.validateTournamentData({}).valid, false);
    assert.equal(Storage.validateTournamentData({ players: 'not an array' }).valid, false);

    // Duplicate player ID
    const duplicateIds = {
      players: [
        { id: 1, name: 'P1' },
        { id: 1, name: 'P2' }
      ],
      rounds: []
    };
    assert.equal(Storage.validateTournamentData(duplicateIds).valid, false);

    // Self pairing
    const selfPair = {
      players: [{ id: 1, name: 'P1' }, { id: 2, name: 'P2' }],
      rounds: [{
        roundNumber: 1,
        pairings: [{ board: 1, whiteId: 1, blackId: 1, result: '1-0' }]
      }]
    };
    assert.equal(Storage.validateTournamentData(selfPair).valid, false);

    // Strips out non-domain properties
    const dirty = {
      isAdmin: true,
      isSnapshot: true,
      customGarbage: 'evil',
      title: 'Valid Tournament',
      players: [{ id: 1, name: 'P1' }, { id: 2, name: 'P2' }],
      rounds: [{
        roundNumber: 1,
        pairings: [{ board: 1, whiteId: 1, blackId: 2, result: '1-0' }]
      }]
    };
    const res = Storage.validateTournamentData(dirty);
    assert.equal(res.valid, true);
    assert.equal(res.sanitizedData.isAdmin, undefined);
    assert.equal(res.sanitizedData.isSnapshot, undefined);
    assert.equal(res.sanitizedData.customGarbage, undefined);
    assert.equal(res.sanitizedData.title, 'Valid Tournament');
    console.log('  ✅ Passed validateTournamentData unit checks');
  }

  // Test 2: R04 Snapshot takeover cleans snapshot flag and URL hash
  console.log('Test 2: R04 Takeover snapshot properly resets isSnapshot and hash');
  {
    const f = createFixture();
    const c = createSandbox('http://localhost/index.html#d=fixtureData');
    Object.assign(c.ReviewApp.state, f, { isSnapshot: true, isAdmin: false, groupId: 'custom_cup' });
    c.ReviewApp.handleTakeoverSnapshot();

    assert.equal(c.ReviewApp.state.isSnapshot, false, 'state.isSnapshot must be false');
    const persisted = c.TournamentStorage.loadTournament('custom_cup');
    assert.ok(persisted, 'Data must be saved in localStorage');
    assert.equal(persisted.isSnapshot, undefined, 'persisted data must not have isSnapshot=true');
    assert.equal(c.window.location.hash, '', 'URL hash #d= must be cleared');

    const groups = c.TournamentStorage.getGroups();
    assert.ok(groups.some(g => g.id === 'custom_cup'), 'Custom group must be registered in groups list');
    console.log('  ✅ Passed R04 Takeover checks');
  }

  // Test 3: R04 Group switch exits snapshot mode
  console.log('Test 3: R04 switchGroup exits snapshot mode');
  {
    const c = createSandbox('http://localhost/index.html#d=fixtureData');
    c.ReviewApp.state.isSnapshot = true;
    c.ReviewApp.switchGroup('women', false);
    assert.equal(c.ReviewApp.state.isSnapshot, false, 'switchGroup must clear snapshot flag');
    assert.equal(c.window.location.hash, '', 'switchGroup must clear snapshot hash');
    console.log('  ✅ Passed R04 switchGroup snapshot exit checks');
  }

  // Test 4: R05 Import validation prevents data corruption & privilege escalation
  console.log('Test 4: R05 File import rejects invalid JSON and preserves state');
  {
    const f = createFixture();
    const c = createSandbox();
    c.TournamentStorage.saveTournament(f, 'men');
    c.ReviewApp.state.isAdmin = false;

    // Attempt to import malicious / invalid JSON
    const maliciousPayload = {
      ...f,
      isAdmin: true,
      rounds: 'bad-rounds-data'
    };
    c.ReviewApp.handleImportFile({
      target: {
        files: [{ content: JSON.stringify(maliciousPayload) }]
      }
    });

    // Verify rejection
    assert.equal(c.ReviewApp.state.isAdmin, false, 'state.isAdmin must NOT be escalated');
    const stored = c.TournamentStorage.loadTournament('men');
    assert.notEqual(stored.rounds, 'bad-rounds-data', 'Stored data must NOT be corrupted');
    assert.equal(stored.rounds.length, 4, 'Original rounds must remain intact');
    assert.ok(c.alerts.length > 0, 'Alert must be shown to user on import error');
    console.log('  ✅ Passed R05 Import rejection checks');
  }

  // Test 5: R06 Group deletion does NOT re-save deleted group
  console.log('Test 5: R06 handleDeleteCustomGroup completely removes group data');
  {
    const f = createFixture();
    const c = createSandbox();
    Object.assign(c.ReviewApp.state, f, { isAdmin: true, groupId: 'grp_fixture' });
    c.TournamentStorage.saveGroups([{ id: 'men', name: 'Men' }, { id: 'grp_fixture', name: 'Fixture' }]);
    c.TournamentStorage.saveTournament(c.ReviewApp.state, 'grp_fixture');

    c.ReviewApp.handleDeleteCustomGroup();

    assert.equal(c.TournamentStorage.loadTournament('grp_fixture'), null, 'Deleted tournament must NOT exist in storage');
    assert.ok(!c.TournamentStorage.getGroups().some(g => g.id === 'grp_fixture'), 'Group must be removed from groups list');
    console.log('  ✅ Passed R06 Group deletion checks');
  }

  // Test 6: R06 loadRosterPreset does NOT mutate state.groupId or overwrite tournaments
  console.log('Test 6: R06 loadRosterPreset preserves current group');
  {
    const f = createFixture();
    const c = createSandbox('http://localhost/index.html', true);
    c.SampleTournamentData = {
      womenPlayerNames: ['Alice', 'Bob', 'Charlie', 'Diana'],
      menPlayerNames: ['P1', 'P2']
    };
    // Save women's tournament with 4 rounds
    c.TournamentStorage.saveTournament(f, 'women');

    // Currently on 'men' group
    c.ReviewApp.state.groupId = 'men';
    c.ReviewApp.loadRosterPreset('women');

    assert.equal(c.ReviewApp.state.groupId, 'men', 'loadRosterPreset must NOT change state.groupId');
    const womenStored = c.TournamentStorage.loadTournament('women');
    assert.equal(womenStored.rounds.length, 4, 'Women tournament must remain untouched');
    console.log('  ✅ Passed R06 loadRosterPreset isolation checks');
  }

  // Test 7: R06 Overwrite confirmation guard
  console.log('Test 7: R06 handleStartTournament confirms before overwriting running tournament');
  {
    const f = createFixture();
    // Case A: User cancels confirm
    const cCancel = createSandbox('http://localhost/index.html', false); // confirm() returns false
    cCancel.TournamentStorage.saveTournament(f, 'men');
    Object.assign(cCancel.ReviewApp.state, f);
    cCancel.ReviewApp.els.setupPlayerInput.value = 'Alice\nBob';
    cCancel.ReviewApp.handleStartTournament();

    const stillStored = cCancel.TournamentStorage.loadTournament('men');
    assert.equal(stillStored.rounds.length, 4, 'Must not overwrite when user cancels confirmation');

    console.log('  ✅ Passed R06 Overwrite confirmation checks');
  }

  // Test 8: R07 HTML escaping
  console.log('Test 8: R07 HTML escaping on untrusted names');
  {
    const f = createFixture();
    const c = createSandbox();
    Object.assign(c.ReviewApp.state, f, { isAdmin: true });
    c.ReviewApp.state.players[0].name = '<img src=x onerror=alert(1)>';
    c.ReviewApp.openLeaveModal();

    assert.ok(
      !c.ReviewApp.els.modalLeavePlayerList.innerHTML.includes('<img src=x'),
      'modalLeavePlayerList must escape HTML'
    );
    assert.ok(
      c.ReviewApp.els.modalLeavePlayerList.innerHTML.includes('&lt;img src=x'),
      'modalLeavePlayerList must contain escaped entities'
    );
    console.log('  ✅ Passed R07 HTML escaping checks');
  }

  // Test 9: R11 Storage quota failure reporting
  console.log('Test 9: R11 Quota failure handling in saveState');
  {
    const c = createSandbox();
    c.ReviewApp.state.groupId = 'men';
    c.ReviewApp.state.isSnapshot = false;
    // Mock localStorage.setItem to throw quota error
    c.localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const saveResult = c.ReviewApp.saveState();
    assert.equal(saveResult, false, 'saveState must return false on storage quota failure');
    console.log('  ✅ Passed R11 Quota failure handling checks');
  }

  console.log('\n🎉 ALL Phase 1 verification tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
