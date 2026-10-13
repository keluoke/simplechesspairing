// Phase 4: Scale and Stress Testing Suite
// Run: node test_scale.cjs
const path = require('node:path');
const assert = require('node:assert/strict');

const root = __dirname;
const Engine = require(path.join(root, 'js/swiss.js'));
const Storage = require(path.join(root, 'js/storage.js'));

function createPlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `选手_${i + 1}`,
    initialSeed: i + 1,
    status: 'active'
  }));
}

function legalColors(w, b, rounds) {
  const a = Engine.getPlayerColorStats(w, rounds);
  const c = Engine.getPlayerColorStats(b, rounds);
  return !(a.consecutiveColor === 'W' && a.consecutiveCount >= 2)
    && !(c.consecutiveColor === 'B' && c.consecutiveCount >= 2)
    && Math.abs(a.diff + 1) <= 2 && Math.abs(c.diff - 1) <= 2;
}

async function simulateTournament(playerCount, totalRounds, resultMode = 'random') {
  const ps = createPlayers(playerCount);
  const rounds = [];
  let seed = 42;

  for (let r = 1; r <= totalRounds; r++) {
    const pairingResult = Engine.generateSwissPairing(ps, rounds, r);

    // Assert that pairing validation passes
    const validation = Engine.validatePairing(pairingResult.pairings, ps, rounds);
    assert.ok(validation.valid, `Round ${r} pairing must pass validation: ${validation.errors.join('; ')}`);

    // Assign results
    pairingResult.pairings.forEach(m => {
      if (m.isBye) {
        m.result = '1-0';
      } else if (resultMode === 'draws') {
        m.result = '0.5-0.5';
      } else if (resultMode === 'white_wins') {
        m.result = '1-0';
      } else {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        m.result = ['1-0', '0-1', '0.5-0.5'][Math.floor((seed / 4294967296) * 3)];
      }
    });

    rounds.push(pairingResult);
  }

  const standings = Engine.calculateStandings(ps, rounds);
  return { players: ps, rounds, standings };
}

async function runScaleTests() {
  console.log('--- ⚡ Starting Phase 4 Scale & Stress Tests ---');

  // Test 1: 20 players over 5 rounds (Typical Club Tournament)
  console.log('Test 1: 20 players over 5 rounds');
  {
    const t0 = Date.now();
    const sim20 = await simulateTournament(20, 5);
    const duration = Date.now() - t0;
    assert.equal(sim20.rounds.length, 5);
    assert.equal(sim20.standings.length, 20);
    console.log(`  ✅ 20 players 5 rounds completed in ${duration} ms`);

    // Snapshot URL length check
    const packed = await Storage.compressTournamentState({
      title: '20人周赛',
      groupId: 'men',
      status: 'finished',
      players: sim20.players,
      rounds: sim20.rounds
    });
    console.log(`  📦 20 players compressed payload length: ${packed.length} chars (URL-safe)`);
    assert.ok(packed.length < 2000, `Payload length should be well within URL limits (< 2000), got ${packed.length}`);
  }

  // Test 2: 50 players over 7 rounds (Large Swiss Open)
  console.log('Test 2: 50 players over 7 rounds');
  {
    const t0 = Date.now();
    const sim50 = await simulateTournament(50, 7);
    const duration = Date.now() - t0;
    assert.equal(sim50.rounds.length, 7);
    assert.equal(sim50.standings.length, 50);
    console.log(`  ✅ 50 players 7 rounds completed in ${duration} ms`);

    const packed = await Storage.compressTournamentState({
      title: '50人大型瑞士制积分赛',
      groupId: 'men',
      status: 'finished',
      players: sim50.players,
      rounds: sim50.rounds
    });
    console.log(`  📦 50 players compressed payload length: ${packed.length} chars`);
    assert.ok(packed.length < 4000, `Payload length should be reasonable, got ${packed.length}`);
  }

  // Test 3: 100 players over 7 rounds (Extreme Scale Benchmark)
  console.log('Test 3: 100 players over 7 rounds');
  {
    const t0 = Date.now();
    const sim100 = await simulateTournament(100, 7);
    const duration = Date.now() - t0;
    assert.equal(sim100.rounds.length, 7);
    assert.equal(sim100.standings.length, 100);
    console.log(`  ✅ 100 players 7 rounds completed in ${duration} ms (no thread freeze)`);
    assert.ok(duration < 1000, `Duration should be under 1 second, took ${duration} ms`);
  }

  // Test 4: Odd player count (21 players, 5 rounds) - No duplicate byes
  console.log('Test 4: Odd player count (21 players, 5 rounds) bye integrity');
  {
    const simOdd = await simulateTournament(21, 5);
    const byePlayers = [];
    simOdd.rounds.forEach(r => {
      const byeMatch = r.pairings.find(m => m.isBye);
      assert.ok(byeMatch, `Round ${r.roundNumber} must have a bye match`);
      byePlayers.push(byeMatch.playerId);
    });

    const uniqueByes = new Set(byePlayers);
    assert.equal(uniqueByes.size, 5, 'Every bye must go to a different player in 5 rounds');
    console.log('  ✅ 5 byes distributed to 5 distinct players with 0 duplicate byes');
  }

  // Test 5: All-Draws scenario (Extreme score group tie)
  console.log('Test 5: All-draws scenario (Everyone has identical score)');
  {
    const simDraws = await simulateTournament(16, 4, 'draws');
    assert.equal(simDraws.rounds.length, 4);
    // Everyone should have 2.0 points
    assert.ok(simDraws.standings.every(p => p.score === 2.0));
    // Buchholz and initial seed break ties
    assert.equal(simDraws.standings[0].rank, 1);
    assert.equal(simDraws.standings[15].rank, 16);
    console.log('  ✅ All-draws scenario resolved smoothly with valid tiebreaks');
  }

  console.log('\n🎉 ALL Phase 4 Scale & Stress Tests passed successfully!');
}

runScaleTests().catch(err => {
  console.error('❌ Scale test failed:', err);
  process.exit(1);
});
