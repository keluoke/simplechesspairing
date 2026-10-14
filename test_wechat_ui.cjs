/**
 * Verification tests for:
 * 1. Minimalist circle dots (⚪ / ⚫) without chess king icons or square boxes
 * 2. Print sheet modal scrolling and PDF/standalone print capability
 * 3. WeChat-style UI and title SimpleChessParing
 * 4. Default single group "俱乐部积分赛" (no men/women by default)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = __dirname;
const Storage = require(path.join(root, 'js/storage.js'));
const SwissEngine = require(path.join(root, 'js/swiss.js'));

global.localStorage = {
  _store: new Map(),
  getItem(k) { return this._store.get(k) || null; },
  setItem(k, v) { this._store.set(k, String(v)); },
  removeItem(k) { this._store.delete(k); },
  clear() { this._store.clear(); }
};

function createSandbox(url = 'http://localhost/index.html') {
  const dom = new Map();
  function createElement() {
    return {
      style: {},
      classList: {
        _set: new Set(),
        add(c) { this._set.add(c); },
        remove(c) { this._set.delete(c); },
        contains(c) { return this._set.has(c); }
      },
      setAttribute() {},
      getAttribute() { return null; },
      appendChild(c) { return c; },
      querySelectorAll() { return []; },
      querySelector() { return createElement(); },
      addEventListener() {},
      removeEventListener() {},
      value: '',
      innerHTML: '',
      textContent: '',
      checked: false,
      focus() {},
      remove() {}
    };
  }

  const windowUrl = new URL(url);
  const localStorageStore = new Map();

  const ctx = {
    window: {
      location: windowUrl,
      addEventListener() {},
      removeEventListener() {},
      open(url, target) {
        return {
          document: {
            open() {},
            write(content) { ctx._lastWrittenPrintHtml = content; },
            close() {}
          }
        };
      },
      print() {},
      dispatchEvent() {},
      localStorage: {
        getItem(k) { return localStorageStore.get(k) || null; },
        setItem(k, v) { localStorageStore.set(k, String(v)); },
        removeItem(k) { localStorageStore.delete(k); },
        clear() { localStorageStore.clear(); }
      }
    },
    document: {
      getElementById(id) {
        if (!dom.has(id)) dom.set(id, createElement());
        return dom.get(id);
      },
      querySelectorAll() { return []; },
      querySelector() { return createElement(); },
      createElement,
      body: createElement(),
      documentElement: { setAttribute() {} },
      addEventListener() {}
    },
    localStorage: {
      getItem(k) { return localStorageStore.get(k) || null; },
      setItem(k, v) { localStorageStore.set(k, String(v)); },
      removeItem(k) { localStorageStore.delete(k); },
      clear() { localStorageStore.clear(); }
    },
    URL,
    URLSearchParams,
    SwissEngine,
    TournamentStorage: Storage,
    console,
    setTimeout,
    clearTimeout
  };

  vm.createContext(ctx);
  const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').replace(
    "document.addEventListener('DOMContentLoaded', init);",
    'globalThis.App = { state, els, cacheDom, renderPairings, handleOpenStandalonePrintWindow, switchGroup, handleAddPlayer, parsePlayerNames, handleRegenerateCurrentRound, updateHeaderStats, handleStartTournament };'
  );
  vm.runInContext(appSource, ctx);
  ctx.App.cacheDom();
  return ctx;
}

function runTests() {
  console.log('--- 📱 Starting WeChat Minimalist UI & Feature Verification Tests ---');

  // Test 1: Default group is "俱乐部积分赛" (Not men/women)
  console.log('Test 1: Default group is "俱乐部积分赛"');
  {
    const groups = Storage.getGroups();
    assert.strictEqual(groups.length, 1, 'Default groups length must be 1');
    assert.strictEqual(groups[0].id, 'default', 'Default group ID must be default');
    assert.strictEqual(groups[0].name, '俱乐部积分赛', 'Default group name must be 俱乐部积分赛');
    assert.strictEqual(Storage.getActiveGroup(), 'default', 'Active group fallback must be default');
    assert.strictEqual(Storage.getGroupName('default'), '俱乐部积分赛', 'getGroupName default must return 俱乐部积分赛');
    console.log('  ✅ Passed Default Group checks');
  }

  // Test 2: UI Branding "SimpleChessParing"
  console.log('Test 2: Title & Branding "SimpleChessParing"');
  {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.ok(html.includes('<title>SimpleChessParing'), 'index.html title must contain SimpleChessParing');
    assert.ok(html.includes('id="appHeaderTitle">SimpleChessParing</h1>'), 'appHeaderTitle must be SimpleChessParing');
    assert.ok(!html.includes('棋弈排阵'), 'Must remove legacy name 棋弈排阵 from header');
    console.log('  ✅ Passed Branding checks');
  }

  // Test 3: Minimalist circle dots (⚪ and ⚫) without King icons (♔ / ♚) or bulky square boxes
  console.log('Test 3: Pairing table uses clean circle dots (⚪ and ⚫), no kings or bulky squares');
  {
    const c = createSandbox();
    c.App.state.players = [
      { id: 1, name: 'Alice', initialSeed: 1, status: 'active' },
      { id: 2, name: 'Bob', initialSeed: 2, status: 'active' }
    ];
    c.App.state.rounds = [
      {
        roundNumber: 1,
        pairings: [
          { board: 1, whiteId: 1, whiteName: 'Alice', whiteScore: 0, blackId: 2, blackName: 'Bob', blackScore: 0, result: null }
        ]
      }
    ];
    c.App.state.currentRoundIndex = 0;
    c.App.renderPairings();

    const rendered = c.App.els.pairingsContainer.innerHTML;
    assert.ok(rendered.includes('⚪'), 'Pairing must include white circle ⚪');
    assert.ok(rendered.includes('⚫'), 'Pairing must include black circle ⚫');
    assert.ok(!rendered.includes('♔'), 'Pairing must NOT include white king ♔');
    assert.ok(!rendered.includes('♚'), 'Pairing must NOT include black king ♚');
    assert.ok(!rendered.includes('chess-piece-badge'), 'Pairing must NOT include chess-piece-badge square box');
    assert.ok(rendered.includes('piece-dot'), 'Pairing must use piece-dot');
    console.log('  ✅ Passed Minimalist Circle Dots checks');
  }

  // Test 4: Modal scrollability & Standalone Print / PDF export
  console.log('Test 4: Modal scrollability in CSS & Standalone Print export');
  {
    const css = fs.readFileSync(path.join(root, 'css/app.css'), 'utf8');
    assert.ok(css.includes('max-height: calc(100vh - 3rem)'), 'modal-dialog must have viewport max-height constraint');
    assert.ok(css.includes('overflow-y: auto'), 'modal-backdrop and modal-body must have overflow-y auto');
    assert.ok(css.includes('--primary: #07c160'), 'WeChat green primary color must be set');

    // Test standalone print window generation
    const c = createSandbox();
    c.App.state.rounds = [
      {
        roundNumber: 1,
        pairings: [
          { board: 1, whiteId: 1, whiteName: 'Alice', whiteScore: 0, blackId: 2, blackName: 'Bob', blackScore: 0, result: null }
        ]
      }
    ];
    c.App.els.selectPrintSheetRound.value = '1';
    c.App.els.printableSheetArea.innerHTML = '<table class="sign-sheet-table"><tr><td>Test Board</td></tr></table>';

    c.App.handleOpenStandalonePrintWindow();
    assert.ok(c._lastWrittenPrintHtml, 'handleOpenStandalonePrintWindow must write HTML into popup window');
    assert.ok(c._lastWrittenPrintHtml.includes('独立签单预览与打印'), 'Popup HTML must contain standalone print header');
    assert.ok(c._lastWrittenPrintHtml.includes('window.print()'), 'Popup HTML must trigger window.print()');
    console.log('  ✅ Passed Modal Scrollability & Standalone Print checks');
  }

  // Test 5: Batch adding players with whitespace, newlines, and commas
  console.log('Test 5: Batch adding players detects whitespace, newlines, numbers, and ratings');
  {
    const c = createSandbox();
    c.App.state.isAdmin = true;
    c.App.state.players = [];

    // 1. Whitespace separated
    const resSpaces = c.App.handleAddPlayer('胡安蓬 朱乐逸 张承楷');
    assert.strictEqual(resSpaces, true, 'handleAddPlayer with spaces must succeed');
    assert.strictEqual(c.App.state.players.length, 3, 'Must have added 3 players');
    assert.deepStrictEqual(c.App.state.players.map(p => p.name), ['胡安蓬', '朱乐逸', '张承楷']);

    // 2. Newline separated
    const resNewlines = c.App.handleAddPlayer('邱子涵\n彭奕超\n王般若');
    assert.strictEqual(resNewlines, true, 'handleAddPlayer with newlines must succeed');
    assert.strictEqual(c.App.state.players.length, 6, 'Must have added 3 more players (total 6)');

    // 3. Numbered & comma/semicolon mixed
    const resMixed = c.App.handleAddPlayer('1. 韩翼阳 2. 颜旋, 3. 李奥；马睿含');
    assert.strictEqual(resMixed, true, 'handleAddPlayer with mixed delimiters must succeed');
    assert.strictEqual(c.App.state.players.length, 10, 'Must have added 4 more players (total 10)');

    // 4. Duplicate handling (trying to add 胡安蓬 again, plus a new player 梅宇涵)
    const resDup = c.App.handleAddPlayer('胡安蓬 梅宇涵');
    assert.strictEqual(resDup, true, 'handleAddPlayer with partial duplicate must succeed for new player');
    assert.strictEqual(c.App.state.players.length, 11, 'Must have added only 梅宇涵 (total 11)');
    assert.strictEqual(c.App.state.players[10].name, '梅宇涵');

    console.log('  ✅ Passed Batch Adding Players checks (Whitespace & Newline detection)');
  }

  // Test 6: Round 1 visibility, no header span crash, and mid-round regeneration
  console.log('Test 6: Round 1 pairing visibility and re-pairing with newly added players');
  {
    const c = createSandbox();
    // Simulate real DOM where #appHeaderTitle has NO span
    c.App.els.appHeaderTitle = {
      querySelector(sel) {
        if (sel === 'span') return null; // Real DOM scenario
        return null;
      }
    };

    // 1. updateHeaderStats does not throw when span is null
    assert.doesNotThrow(() => {
      c.App.updateHeaderStats();
    }, 'updateHeaderStats must never throw when appHeaderTitle has no span');

    // 2. Start a tournament with 4 players
    c.App.els.setupPlayerInput.value = '张伟\n王芳\n李明\n刘洋';
    c.App.handleStartTournament();

    assert.strictEqual(c.App.state.status, 'in_progress', 'Tournament must be in progress');
    assert.strictEqual(c.App.state.rounds.length, 1, 'Must have 1 round');
    assert.strictEqual(c.App.state.rounds[0].pairings.length, 2, 'Round 1 must have 2 boards for 4 players');
    assert.strictEqual(c.App.state.isAdmin, true, 'Tournament creator must have admin privileges');

    // 3. Add 2 new players mid-round in Round 1
    c.App.state.activeTab = 'tabPairing';
    c.App.handleAddPlayer('孙小明 赵小刚');
    assert.strictEqual(c.App.state.players.length, 6, 'Total players must now be 6');

    // 4. renderPairings detects unassigned players and updates regenerate button
    c.App.renderPairings();
    assert.ok(c.App.els.bannerPairingNoticeText.innerHTML.includes('孙小明'), 'Notice banner must mention newly added player');
    assert.ok(c.App.els.btnRegenerateCurrentRound.innerHTML.includes('含2名新选手'), 'Regenerate button must mention 2 new players');

    // 5. Re-generate Round 1 to include all 6 players
    c.App.handleRegenerateCurrentRound();
    assert.strictEqual(c.App.state.rounds[0].pairings.length, 3, 'Round 1 must now have 3 boards for 6 players');
    const allBoardNames = c.App.state.rounds[0].pairings.flatMap(p => [p.whiteName, p.blackName]);
    assert.ok(allBoardNames.includes('孙小明'), 'Sun Xiaoming must be paired in Round 1');
    assert.ok(allBoardNames.includes('赵小刚'), 'Zhao Xiaogang must be paired in Round 1');

    console.log('  ✅ Passed Round 1 Visibility & Mid-Round Re-pairing checks');
  }

  console.log('\n🎉 ALL WeChat Minimalist UI & Feature Verification Tests passed successfully!\n');
}

runTests();
