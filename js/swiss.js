/**
 * 瑞士制国际象棋个人赛编排引擎 (Swiss-System Chess Tournament Engine)
 * 适用于俱乐部积分赛、快棋赛、周赛场景
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SwissEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * 结果常量
   * '1-0': 白胜 (白方得1分，黑方得0分)
   * '0.5-0.5' 或 '1/2-1/2': 和棋 (双方各0.5分)
   * '0-1': 黑胜 (白方得0分，黑方得1分)
   * '1-0-bye': 轮空胜 (得1分)
   */

  /**
   * 计算指定选手的颜色历史与连续颜色情况
   * @param {string|number} playerId
   * @param {Array} rounds
   * @returns {Object} { history: ['W', 'B', ...], whites: number, blacks: number, diff: number, consecutive: { color: 'W'|'B'|null, count: number } }
   */
  function getPlayerColorStats(playerId, rounds) {
    const history = [];
    let whites = 0;
    let blacks = 0;

    for (const round of rounds) {
      if (!round.pairings) continue;
      for (const match of round.pairings) {
        if (match.isBye) continue; // 轮空不计入黑白颜色
        if (match.whiteId === playerId) {
          history.push('W');
          whites++;
          break;
        } else if (match.blackId === playerId) {
          history.push('B');
          blacks++;
          break;
        }
      }
    }

    // 计算最近连续相同颜色
    let lastColor = null;
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (lastColor === null) {
        lastColor = history[i];
        streak = 1;
      } else if (history[i] === lastColor) {
        streak++;
      } else {
        break;
      }
    }

    return {
      history,
      whites,
      blacks,
      diff: whites - blacks, // > 0 执白较多，< 0 执黑较多
      consecutiveColor: streak > 0 ? lastColor : null,
      consecutiveCount: streak
    };
  }

  /**
   * 判断两名选手是否已经在历史轮次中交手过
   */
  function haveMet(idA, idB, rounds) {
    for (const round of rounds) {
      if (!round.pairings) continue;
      for (const m of round.pairings) {
        if (m.isBye) continue;
        if (
          (m.whiteId === idA && m.blackId === idB) ||
          (m.whiteId === idB && m.blackId === idA)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 判断某选手是否曾经获得过轮空 (Bye)
   */
  function hasHadBye(playerId, rounds) {
    for (const round of rounds) {
      if (!round.pairings) continue;
      for (const m of round.pairings) {
        if (m.isBye && (m.whiteId === playerId || m.playerId === playerId)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 计算积分榜 (Standings) 与破同分 (Tiebreaks)
   * 包含：
   * 1. 积分 (Score): 胜=1, 和=0.5, 负=0, 轮空=1
   * 2. 对手分 (Buchholz): 所对阵过的所有对手总积分之和
   * 3. 胜负分 (Sonneborn-Berger): 击败对手积分 + 战平对手积分 * 0.5
   * 4. 胜局数 (Wins): 纯胜场数 (含轮空)
   * 5. 颜色平衡 (Color balance): W / B
   * 
   * @param {Array} players - 选手数组
   * @param {Array} rounds - 轮次数据
   * @returns {Array} 排序后的选手积分统计数组
   */
  function calculateStandings(players, rounds) {
    // 1. 初始化每位选手的统计基础
    const playerMap = {};
    players.forEach(p => {
      const stats = getPlayerColorStats(p.id, rounds);
      playerMap[p.id] = {
        id: p.id,
        name: p.name,
        status: p.status || 'active', // 'active' 或 'leave' (请假)
        initialSeed: p.initialSeed || p.id,
        score: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        byes: 0,
        unplayedRounds: 0,
        opponents: [],      // 对手 ID 列表
        matchResults: [],   // 胜负记录：[ { round: 1, opponentId, color, result, points } ]
        buchholz: 0,
        sonnebornBerger: 0,
        colorStats: stats
      };
    });

    // 2. 遍历各轮次有效结果累加分数
    rounds.forEach((round, roundIdx) => {
      const roundNum = roundIdx + 1;
      if (!round.pairings) return;

      const pairedIdsInRound = new Set();

      round.pairings.forEach(match => {
        if (match.isBye) {
          const pid = match.whiteId || match.playerId;
          pairedIdsInRound.add(pid);
          if (playerMap[pid]) {
            // 轮空得 1 分
            playerMap[pid].score += 1;
            playerMap[pid].wins += 1;
            playerMap[pid].byes += 1;
            playerMap[pid].matchResults.push({
              round: roundNum,
              opponentId: null,
              opponentName: '轮空 (Bye)',
              color: '-',
              result: '轮空胜',
              points: 1
            });
          }
          return;
        }

        const white = playerMap[match.whiteId];
        const black = playerMap[match.blackId];
        pairedIdsInRound.add(match.whiteId);
        pairedIdsInRound.add(match.blackId);

        // 如果该台对局尚无结果，跳过计分
        if (!match.result) {
          if (white) {
            white.matchResults.push({
              round: roundNum,
              opponentId: match.blackId,
              opponentName: black ? black.name : '未知',
              color: 'W',
              result: '对局中',
              points: 0
            });
          }
          if (black) {
            black.matchResults.push({
              round: roundNum,
              opponentId: match.whiteId,
              opponentName: white ? white.name : '未知',
              color: 'B',
              result: '对局中',
              points: 0
            });
          }
          return;
        }

        let wPts = 0;
        let bPts = 0;
        let wRes = '负';
        let bRes = '负';

        if (match.result === '1-0') {
          wPts = 1;
          bPts = 0;
          wRes = '胜';
          bRes = '负';
          if (white) white.wins += 1;
          if (black) black.losses += 1;
        } else if (match.result === '0-1') {
          wPts = 0;
          bPts = 1;
          wRes = '负';
          bRes = '胜';
          if (white) white.losses += 1;
          if (black) black.wins += 1;
        } else if (match.result === '0.5-0.5' || match.result === '1/2-1/2') {
          wPts = 0.5;
          bPts = 0.5;
          wRes = '和';
          bRes = '和';
          if (white) white.draws += 1;
          if (black) black.draws += 1;
        } else if (match.result === '0-0') {
          wPts = 0;
          bPts = 0;
          wRes = '双弃权';
          bRes = '双弃权';
          if (white) white.losses += 1;
          if (black) black.losses += 1;
        }

        if (white) {
          white.score += wPts;
          if (match.blackId) white.opponents.push(match.blackId);
          white.matchResults.push({
            round: roundNum,
            opponentId: match.blackId,
            opponentName: black ? black.name : '未知',
            color: 'W',
            result: wRes,
            points: wPts
          });
        }

        if (black) {
          black.score += bPts;
          if (match.whiteId) black.opponents.push(match.whiteId);
          black.matchResults.push({
            round: roundNum,
            opponentId: match.whiteId,
            opponentName: white ? white.name : '未知',
            color: 'B',
            result: bRes,
            points: bPts
          });
        }
      });

      // 检查本轮未参赛/请假的选手
      players.forEach(p => {
        if (!pairedIdsInRound.has(p.id) && playerMap[p.id]) {
          playerMap[p.id].unplayedRounds += 1;
          playerMap[p.id].matchResults.push({
            round: roundNum,
            opponentId: null,
            opponentName: '请假 / 未参赛',
            color: '-',
            result: '休赛 (0分)',
            points: 0
          });
        }
      });
    });

    // 3. 计算破同分指标：对手分 (Buchholz) & 胜负分 (Sonneborn-Berger)
    Object.values(playerMap).forEach(player => {
      let buchholz = 0;
      let sonnebornBerger = 0;

      player.matchResults.forEach(m => {
        if (m.opponentId && playerMap[m.opponentId]) {
          const oppScore = playerMap[m.opponentId].score;
          buchholz += oppScore;
          if (m.points === 1) {
            sonnebornBerger += oppScore;
          } else if (m.points === 0.5) {
            sonnebornBerger += oppScore * 0.5;
          }
        }
      });

      player.buchholz = Math.round(buchholz * 100) / 100;
      player.sonnebornBerger = Math.round(sonnebornBerger * 100) / 100;
      player.score = Math.round(player.score * 10) / 10;
    });

    // 4. 排名排序 (Sort by Score -> Buchholz -> SonnebornBerger -> Wins -> InitialSeed)
    const list = Object.values(playerMap);
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.initialSeed - b.initialSeed;
    });

    // 赋予排名位次
    list.forEach((p, idx) => {
      p.rank = idx + 1;
    });

    return list;
  }

  /**
   * 判断某选手在指定新颜色下是否满足严格颜色规则约束：
   * 1. 绝不允许连续 3 盘执相同颜色 (consecutiveCount < 2)
   * 2. 执白或执黑盘数净差绝对值不能超过 2 (|diff| <= 2)
   */
  function isColorLegal(stats, newColor) {
    if (!stats) return true;
    if (newColor === 'W') {
      if (stats.consecutiveColor === 'W' && stats.consecutiveCount >= 2) return false;
      if (Math.abs(stats.diff + 1) > 2) return false;
    } else if (newColor === 'B') {
      if (stats.consecutiveColor === 'B' && stats.consecutiveCount >= 2) return false;
      if (Math.abs(stats.diff - 1) > 2) return false;
    }
    return true;
  }

  /**
   * 评估两个选手分配特定颜色时的适宜度成本 (Cost, 越低越好)
   * 考虑：
   * - 是否违反“不能连续3次同色”
   * - 是否违反总颜色平衡 (|W - B| <= 2)
   * - 是否符合上一轮交替颜色偏好 (上一轮执黑者倾向本轮执白)
   */
  function evaluateColorAssignmentCost(whitePlayer, blackPlayer) {
    let cost = 0;
    const wStats = whitePlayer.colorStats;
    const bStats = blackPlayer.colorStats;

    // 1. 绝对惩罚：连续3次执白 / 连续3次执黑
    if (wStats.consecutiveColor === 'W' && wStats.consecutiveCount >= 2) {
      cost += 50000;
    }
    if (bStats.consecutiveColor === 'B' && bStats.consecutiveCount >= 2) {
      cost += 50000;
    }

    // 2. 颜色差失衡惩罚：累计执白或执黑超过2盘差异
    const newWDiff = wStats.diff + 1; // 执白后净差增大
    const newBDiff = bStats.diff - 1; // 执黑后净差减小
    if (Math.abs(newWDiff) > 2) cost += 10000;
    if (Math.abs(newBDiff) > 2) cost += 10000;

    // 3. 次级交替偏好：如果上一轮执白，本轮偏好执黑
    if (wStats.consecutiveColor === 'W') cost += 200;
    if (bStats.consecutiveColor === 'B') cost += 200;

    // 4. 均衡总颜色数
    if (wStats.whites > wStats.blacks) cost += 100;
    if (bStats.blacks > bStats.whites) cost += 100;

    return cost;
  }

  /**
   * 决定两位选手谁执白谁执黑
   * @param {Object} pA
   * @param {Object} pB
   * @param {boolean} allowColorRelaxation
   * @returns {Object} { white: player, black: player }
   */
  function decideColors(pA, pB, allowColorRelaxation = false) {
    const wStatsA = pA.colorStats;
    const bStatsA = pB.colorStats;

    const aWhiteLegal = isColorLegal(wStatsA, 'W') && isColorLegal(bStatsA, 'B');
    const bWhiteLegal = isColorLegal(bStatsA, 'W') && isColorLegal(wStatsA, 'B');

    if (!allowColorRelaxation) {
      if (aWhiteLegal && !bWhiteLegal) {
        return { white: pA, black: pB };
      }
      if (!aWhiteLegal && bWhiteLegal) {
        return { white: pB, black: pA };
      }
    }

    const costAWhite = evaluateColorAssignmentCost(pA, pB);
    const costBWhite = evaluateColorAssignmentCost(pB, pA);

    if (costAWhite <= costBWhite) {
      return { white: pA, black: pB };
    } else {
      return { white: pB, black: pA };
    }
  }

  /**
   * 独立瑞士制编排校验器 (Pairing Validator)
   * 严格核验：
   * 1. 活跃选手覆盖：每位活跃选手有且仅有一次出场 (或一次轮空)
   * 2. 避免自对局 (whiteId !== blackId)
   * 3. 避免非法重复交手
   * 4. 颜色合法性校验 (严禁连续3次同色，严禁黑白盘数净差绝对值 > 2)
   * 5. 轮空资格校验 (不可重复轮空)
   */
  function validatePairing(pairings, players, rounds) {
    const errors = [];
    const warnings = [];

    if (!Array.isArray(pairings)) {
      return { valid: false, errors: ['对阵列表必须为数组'], warnings };
    }

    const activePlayers = players.filter(p => p.status !== 'leave' && p.active !== false);
    const activeIds = new Set(activePlayers.map(p => p.id));
    const pairedInRound = new Set();
    let hasBye = false;

    for (let idx = 0; idx < pairings.length; idx++) {
      const m = pairings[idx];
      const b = m.board || (idx + 1);

      if (m.isBye) {
        if (hasBye) {
          errors.push(`第 ${b} 台出现重复轮空台次`);
        }
        hasBye = true;
        const pid = m.whiteId || m.playerId;
        if (!activeIds.has(pid)) {
          errors.push(`第 ${b} 台轮空选手 (ID: ${pid}) 不是活跃参赛选手`);
        }
        if (pairedInRound.has(pid)) {
          errors.push(`第 ${b} 台轮空选手 (ID: ${pid}) 在本轮被重复安排`);
        }
        pairedInRound.add(pid);

        if (rounds && hasHadBye(pid, rounds)) {
          warnings.push(`选手 (ID: ${pid}) 此前已获得过轮空，本轮再次轮空`);
        }
      } else {
        const wId = m.whiteId;
        const bId = m.blackId;

        if (!activeIds.has(wId)) {
          errors.push(`第 ${b} 台白方选手 (ID: ${wId}) 不是活跃参赛选手`);
        }
        if (!activeIds.has(bId)) {
          errors.push(`第 ${b} 台黑方选手 (ID: ${bId}) 不是活跃参赛选手`);
        }
        if (wId === bId) {
          errors.push(`第 ${b} 台出现自己对战自己的非法对阵 (ID: ${wId})`);
        }
        if (pairedInRound.has(wId)) {
          errors.push(`第 ${b} 台白方选手 (ID: ${wId}) 在本轮被重复编排`);
        }
        if (pairedInRound.has(bId)) {
          errors.push(`第 ${b} 台黑方选手 (ID: ${bId}) 在本轮被重复编排`);
        }
        pairedInRound.add(wId);
        pairedInRound.add(bId);

        if (rounds && haveMet(wId, bId, rounds)) {
          warnings.push(`第 ${b} 台选手 ID ${wId} 与 ID ${bId} 此前已交手过 (重复对决)`);
        }

        if (rounds) {
          const wStats = getPlayerColorStats(wId, rounds);
          const bStats = getPlayerColorStats(bId, rounds);
          if (wStats.consecutiveColor === 'W' && wStats.consecutiveCount >= 2) {
            warnings.push(`第 ${b} 台白方选手 (ID: ${wId}) 连续第 ${wStats.consecutiveCount + 1} 盘执白 (超2盘同色)`);
          }
          if (bStats.consecutiveColor === 'B' && bStats.consecutiveCount >= 2) {
            warnings.push(`第 ${b} 台黑方选手 (ID: ${bId}) 连续第 ${bStats.consecutiveCount + 1} 盘执黑 (超2盘同色)`);
          }
          if (Math.abs(wStats.diff + 1) > 2) {
            warnings.push(`第 ${b} 台白方选手 (ID: ${wId}) 执白净差达到 ${wStats.diff + 1} (超出绝对平衡范围)`);
          }
          if (Math.abs(bStats.diff - 1) > 2) {
            warnings.push(`第 ${b} 台黑方选手 (ID: ${bId}) 执黑净差达到 ${Math.abs(bStats.diff - 1)} (超出绝对平衡范围)`);
          }
        }
      }
    }

    // 检查是否有活跃选手漏排
    for (const pid of activeIds) {
      if (!pairedInRound.has(pid)) {
        errors.push(`活跃选手 (ID: ${pid}) 未在本轮编排中出现`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 严格模式回溯匹配：
   * 1. 绝对禁止重复交手
   * 2. 绝对保证颜色合法性 (严禁连续3次同色，严禁|diff| > 2)
   */
  function solvePairingStrict(players, rounds) {
    if (players.length === 0) return [];
    if (players.length % 2 !== 0) return null;

    const p1 = players[0];
    const rest = players.slice(1);
    const p1Stats = p1.colorStats;

    const candidates = [];
    for (const p2 of rest) {
      if (haveMet(p1.id, p2.id, rounds)) continue;
      const p2Stats = p2.colorStats;
      const canP1W = isColorLegal(p1Stats, 'W') && isColorLegal(p2Stats, 'B');
      const canP2W = isColorLegal(p2Stats, 'W') && isColorLegal(p1Stats, 'B');
      if (canP1W || canP2W) {
        candidates.push({ p2, canP1W, canP2W });
      }
    }

    // 启发式排序：同分群积分差优先，黑白棋偏好成本次之
    candidates.sort((a, b) => {
      const diffA = Math.abs(p1.score - a.p2.score);
      const diffB = Math.abs(p1.score - b.p2.score);
      if (diffA !== diffB) return diffA - diffB;
      const costA = Math.min(
        evaluateColorAssignmentCost(p1, a.p2),
        evaluateColorAssignmentCost(a.p2, p1)
      );
      const costB = Math.min(
        evaluateColorAssignmentCost(p1, b.p2),
        evaluateColorAssignmentCost(b.p2, p1)
      );
      return costA - costB;
    });

    for (const { p2, canP1W, canP2W } of candidates) {
      const remaining = rest.filter(p => p.id !== p2.id);
      const subSolution = solvePairingStrict(remaining, rounds);
      if (subSolution !== null) {
        let white, black;
        if (canP1W && !canP2W) {
          white = p1; black = p2;
        } else if (!canP1W && canP2W) {
          white = p2; black = p1;
        } else {
          const cost1 = evaluateColorAssignmentCost(p1, p2);
          const cost2 = evaluateColorAssignmentCost(p2, p1);
          if (cost1 <= cost2) {
            white = p1; black = p2;
          } else {
            white = p2; black = p1;
          }
        }
        return [{ white, black }, ...subSolution];
      }
    }

    return null;
  }

  /**
   * 放宽颜色约束匹配 (保证无重复对阵，允许放宽颜色限制)
   */
  function solvePairingRelaxedColors(players, rounds) {
    if (players.length === 0) return [];
    if (players.length % 2 !== 0) return null;

    const p1 = players[0];
    const rest = players.slice(1);

    const candidates = rest.filter(p2 => !haveMet(p1.id, p2.id, rounds));
    candidates.sort((cA, cB) => {
      const diffA = Math.abs(p1.score - cA.score);
      const diffB = Math.abs(p1.score - cB.score);
      if (diffA !== diffB) return diffA - diffB;
      return Math.min(evaluateColorAssignmentCost(p1, cA), evaluateColorAssignmentCost(cA, p1)) -
             Math.min(evaluateColorAssignmentCost(p1, cB), evaluateColorAssignmentCost(cB, p1));
    });

    for (const c of candidates) {
      const remaining = rest.filter(p => p.id !== c.id);
      const subSolution = solvePairingRelaxedColors(remaining, rounds);
      if (subSolution !== null) {
        const colors = decideColors(p1, c, true);
        return [{ white: colors.white, black: colors.black }, ...subSolution];
      }
    }

    return null;
  }

  /**
   * 放宽重复交手匹配 (极端小人数全循环打满时兜底)
   */
  function solvePairingRelaxedRematches(players, rounds) {
    if (players.length === 0) return [];
    if (players.length % 2 !== 0) return null;

    const p1 = players[0];
    const rest = players.slice(1);

    const candidates = [...rest];
    candidates.sort((cA, cB) => {
      const metA = haveMet(p1.id, cA.id, rounds) ? 1 : 0;
      const metB = haveMet(p1.id, cB.id, rounds) ? 1 : 0;
      if (metA !== metB) return metA - metB;
      const diffA = Math.abs(p1.score - cA.score);
      const diffB = Math.abs(p1.score - cB.score);
      return diffA - diffB;
    });

    for (const c of candidates) {
      const remaining = rest.filter(p => p.id !== c.id);
      const subSolution = solvePairingRelaxedRematches(remaining, rounds);
      if (subSolution !== null) {
        const colors = decideColors(p1, c, true);
        return [{ white: colors.white, black: colors.black }, ...subSolution];
      }
    }

    return null;
  }

  /**
   * 生成下一轮瑞士制配对
   * 采用分层约束回溯求解引擎，具备严格规则保证与独立校验
   * 
   * @param {Array} players - 选手列表 (含 status: 'active' 或 'leave')
   * @param {Array} rounds - 历史轮次
   * @param {number} roundNumber - 当前要生成的轮次 (从1开始)
   * @returns {Object} { pairings: [...], byePlayer: null|object, warning: string|null }
   */
  function generateSwissPairing(players, rounds, roundNumber) {
    // 1. 过滤本轮参与配对的活跃选手 (排除请假、弃权选手)
    const activePlayers = players.filter(p => p.status !== 'leave' && p.active !== false);

    if (activePlayers.length < 2) {
      throw new Error('参赛选手数不足2人，无法进行配对！请至少保留2名正常参赛选手。');
    }

    // 2. 获取当前排行榜与历史统计
    const standings = calculateStandings(players, rounds);
    const standingMap = {};
    standings.forEach(s => { standingMap[s.id] = s; });

    // 参与本轮的选手排序（按当前总分降序，相同看对手分）
    const candidatePool = activePlayers.map(p => standingMap[p.id] || {
      id: p.id,
      name: p.name,
      score: 0,
      buchholz: 0,
      colorStats: getPlayerColorStats(p.id, rounds)
    }).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      return a.id - b.id;
    });

    let byePlayer = null;
    let poolForPairing = [...candidatePool];
    let precomputedMatches = null;

    // 3. 处理奇数选手轮空 (Bye)
    // 规则：选出得分最低且此前未获得过轮空的选手作为轮空者
    // 并验证所选轮空选手能否使剩余选手找到完全合法的严格配对
    if (poolForPairing.length % 2 !== 0) {
      const unbyedCandidates = poolForPairing
        .slice()
        .reverse()
        .filter(p => !hasHadBye(p.id, rounds));

      const candidatesToTry = unbyedCandidates.length > 0
        ? unbyedCandidates
        : poolForPairing.slice().reverse();

      let selectedBye = null;

      if (roundNumber > 1 && rounds.length > 0) {
        for (const cand of candidatesToTry) {
          const testPool = poolForPairing.filter(p => p.id !== cand.id);
          const testSol = solvePairingStrict(testPool, rounds);
          if (testSol !== null) {
            selectedBye = cand;
            precomputedMatches = testSol;
            break;
          }
        }
      }

      if (!selectedBye) {
        selectedBye = candidatesToTry[0];
      }

      byePlayer = selectedBye;
      poolForPairing = poolForPairing.filter(p => p.id !== selectedBye.id);
    }

    // 4. 第一轮特殊快速配对 (S1 对 S2，即上半区对下半区)
    if (roundNumber === 1 || rounds.length === 0) {
      const half = poolForPairing.length / 2;
      const topHalf = poolForPairing.slice(0, half);
      const bottomHalf = poolForPairing.slice(half);

      const pairings = [];
      for (let i = 0; i < half; i++) {
        const p1 = topHalf[i];
        const p2 = bottomHalf[i];
        const isOddBoard = (i % 2 === 0);
        pairings.push({
          board: i + 1,
          whiteId: isOddBoard ? p1.id : p2.id,
          whiteName: isOddBoard ? p1.name : p2.name,
          whiteScore: isOddBoard ? p1.score : p2.score,
          blackId: isOddBoard ? p2.id : p1.id,
          blackName: isOddBoard ? p2.name : p1.name,
          blackScore: isOddBoard ? p2.score : p1.score,
          result: null
        });
      }

      if (byePlayer) {
        pairings.push({
          board: pairings.length + 1,
          isBye: true,
          playerId: byePlayer.id,
          playerName: byePlayer.name,
          playerScore: byePlayer.score,
          result: '1-0',
          statusText: '轮空胜 (+1.0分)'
        });
      }

      return {
        roundNumber,
        pairings,
        byePlayer,
        warning: null
      };
    }

    // 5. 第2轮及以后的瑞士制匹配 (分层约束求解)
    let matchResult = precomputedMatches;
    let warning = null;

    if (!matchResult) {
      matchResult = solvePairingStrict(poolForPairing, rounds);
    }

    if (!matchResult) {
      warning = '提示：受历史黑白棋限制，本轮存在极少数棋手调整执黑白要求，以保证完全零重复对阵。';
      matchResult = solvePairingRelaxedColors(poolForPairing, rounds);
    }

    if (!matchResult) {
      warning = '提示：由于参赛人数较少且多位选手已相互交手，本轮存在极少数重复对决以保证比赛顺利进行。';
      matchResult = solvePairingRelaxedRematches(poolForPairing, rounds);
    }

    if (!matchResult) {
      throw new Error('配对计算遇到冲突，无法完成当前轮次编排，请检查选手参赛状态！');
    }

    // 整理台次与黑白棋分配
    const pairings = matchResult.map((pair, idx) => {
      return {
        board: idx + 1,
        whiteId: pair.white.id,
        whiteName: pair.white.name,
        whiteScore: pair.white.score,
        blackId: pair.black.id,
        blackName: pair.black.name,
        blackScore: pair.black.score,
        result: null
      };
    });

    if (byePlayer) {
      pairings.push({
        board: pairings.length + 1,
        isBye: true,
        playerId: byePlayer.id,
        playerName: byePlayer.name,
        playerScore: byePlayer.score,
        result: '1-0',
        statusText: '轮空胜 (+1.0分)'
      });
    }

    // 独立校验器验证
    const validation = validatePairing(pairings, activePlayers, rounds);
    if (!validation.valid) {
      throw new Error('编排校验未通过: ' + validation.errors.join('; '));
    }

    return {
      roundNumber,
      pairings,
      byePlayer,
      warning
    };
  }

  return {
    calculateStandings,
    generateSwissPairing,
    validatePairing,
    getPlayerColorStats,
    haveMet,
    hasHadBye
  };
});
