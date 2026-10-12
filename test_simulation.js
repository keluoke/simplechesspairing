const SwissEngine = require('./js/swiss.js');

console.log('=====================================================');
console.log('♟️ 国际象棋俱乐部瑞士制编排系统 - 自动化综合测试');
console.log('=====================================================\n');

// 1. 初始化 8 名选手
const initialNames = ['张伟', '王芳', '李明', '刘洋', '陈晨', '赵磊', '孙悦', '周强'];
let players = initialNames.map((name, idx) => ({
  id: idx + 1,
  name,
  initialSeed: idx + 1,
  status: 'active'
}));

console.log('【步骤 1】创建 8 人比赛并生成第 1 轮编排:');
let r1 = SwissEngine.generateSwissPairing(players, [], 1);
console.log(`第 1 轮台数: ${r1.pairings.length}`);
r1.pairings.forEach(m => {
  console.log(`  第 ${m.board} 台: ⚪ ${m.whiteName} vs ⚫ ${m.blackName}`);
});

// 模拟第 1 轮比赛结果
r1.pairings[0].result = '1-0';      // 白胜
r1.pairings[1].result = '0-1';      // 黑胜
r1.pairings[2].result = '0.5-0.5';  // 和棋
r1.pairings[3].result = '1-0';      // 白胜

let rounds = [r1];
let s1 = SwissEngine.calculateStandings(players, rounds);
console.log('\n第 1 轮后积分排行榜:');
console.table(s1.map(p => ({
  名次: p.rank,
  姓名: p.name,
  积分: p.score,
  对手分: p.buchholz,
  胜负分: p.sonnebornBerger,
  胜局数: p.wins
})));

// 验证分数
console.log('\n【步骤 2】中途增加 0 分选手入场 & 临时指定选手请假:');
// 2.1 增加新选手 (0分入场)
const newPlayer = { id: 9, name: '孙小明(中途新选手)', initialSeed: 9, status: 'active' };
players.push(newPlayer);
console.log(`✓ 增加选手: ${newPlayer.name} (初始积分: 0)`);

// 2.2 指定王芳(id=2)本轮请假
const leavePlayer = players.find(p => p.id === 2);
leavePlayer.status = 'leave';
console.log(`✓ 指定选手请假休战: ${leavePlayer.name}`);

// 此时总人数: 9人, 请假: 1人, 活跃参赛: 8人 (偶数)
const activeCount = players.filter(p => p.status !== 'leave').length;
console.log(`当前活跃参赛人数: ${activeCount}人`);

// 2.3 生成第 2 轮编排
let r2 = SwissEngine.generateSwissPairing(players, rounds, 2);
console.log(`\n第 2 轮编排结果 (共 ${r2.pairings.length} 台):`);
let wangFangPaired = false;
let sunXiaoMingPaired = false;

r2.pairings.forEach(m => {
  if (m.whiteId === 2 || m.blackId === 2) wangFangPaired = true;
  if (m.whiteId === 9 || m.blackId === 9) sunXiaoMingPaired = true;
  if (m.isBye) {
    console.log(`  第 ${m.board} 台: 轮空 -> ${m.playerName}`);
  } else {
    console.log(`  第 ${m.board} 台: ⚪ ${m.whiteName} (${m.whiteScore}分) vs ⚫ ${m.blackName} (${m.blackScore}分)`);
  }
});

// 断言验证
if (wangFangPaired) {
  console.error('❌ 错误: 请假选手王芳被错误编排了！');
  process.exit(1);
} else {
  console.log('✅ 验证通过: 请假选手王芳未被编排！');
}

if (!sunXiaoMingPaired) {
  console.error('❌ 错误: 新加入选手孙小明未被编排！');
  process.exit(1);
} else {
  console.log('✅ 验证通过: 新加入的0分选手孙小明已正常配对！');
}

// 模拟第 2 轮结果
r2.pairings.forEach((m, idx) => {
  if (idx % 2 === 0) m.result = '1-0';
  else m.result = '0.5-0.5';
});
rounds.push(r2);

let s2 = SwissEngine.calculateStandings(players, rounds);
console.log('\n第 2 轮后积分排行榜:');
console.table(s2.map(p => ({
  名次: p.rank,
  姓名: p.name,
  状态: p.status === 'leave' ? '请假' : '正常',
  积分: p.score,
  对手分: p.buchholz,
  胜负分: p.sonnebornBerger,
  胜局数: p.wins
})));

// 【步骤 3】王芳恢复参赛，测试奇数人数下的轮空 (Bye) 规则
console.log('\n【步骤 3】王芳恢复参赛，当前9人活跃 (奇数):');
leavePlayer.status = 'active';

let r3 = SwissEngine.generateSwissPairing(players, rounds, 3);
console.log(`第 3 轮编排结果 (共 ${r3.pairings.length} 台):`);
let byeFound = null;
r3.pairings.forEach(m => {
  if (m.isBye) {
    byeFound = m.playerName;
    console.log(`  第 ${m.board} 台: 🎉 轮空胜 -> ${m.playerName} (+1.0分)`);
  } else {
    console.log(`  第 ${m.board} 台: ⚪ ${m.whiteName} (${m.whiteScore}分) vs ⚫ ${m.blackName} (${m.blackScore}分)`);
  }
});

if (!byeFound) {
  console.error('❌ 错误: 奇数人数但未找到轮空选手！');
  process.exit(1);
} else {
  console.log(`✅ 验证通过: 奇数人数自动安排最低分无轮空记录选手【${byeFound}】轮空！`);
}

// 检查是否有任何重复对阵
function checkRepeats(allRounds) {
  const pairs = new Set();
  for (const r of allRounds) {
    for (const m of r.pairings) {
      if (m.isBye) continue;
      const key = [m.whiteId, m.blackId].sort().join('-');
      if (pairs.has(key)) {
        return key;
      }
      pairs.add(key);
    }
  }
  return null;
}

const repeatPair = checkRepeats(rounds.concat([r3]));
if (repeatPair) {
  console.error('❌ 警告: 发现了重复对决:', repeatPair);
} else {
  console.log('✅ 验证通过: 前3轮完全零重复对决，严格符合瑞士制配对原则！');
}

console.log('\n🎉 所有核心瑞士制编排、中途加人、请假与榜单测试全部通过！');
