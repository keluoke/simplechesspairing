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
   * @returns {Object} { white: player, black: player }
   */
  function decideColors(pA, pB) {
    const costAWhite = evaluateColorAssignmentCost(pA, pB);
    const costBWhite = evaluateColorAssignmentCost(pB, pA);

    if (costAWhite <= costBWhite) {
      return { white: pA, black: pB };
    } else {
      return { white: pB, black: pA };
    }
  }

  /**
   * 生成下一轮瑞士制配对
   * 核心算法：带剪枝的同分群优先回溯匹配算法 (Dutch-Swiss Heuristic Backtracking)
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

    // 3. 处理奇数选手轮空 (Bye)
    // 规则：选出得分最低、且之前从未获得过轮空的选手作为轮空者
    if (poolForPairing.length % 2 !== 0) {
      // 优先从最低分开始找没拿过 Bye 的选手
      const eligibleForBye = poolForPairing
        .slice()
        .reverse()
        .filter(p => !hasHadBye(p.id, rounds));

      let selectedBye = null;
      if (eligibleForBye.length > 0) {
        selectedBye = eligibleForBye[0];
      } else {
        // 如果所有人其实都拿过轮空（极少见但需兜底），选最低分者
        selectedBye = poolForPairing[poolForPairing.length - 1];
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
        // 奇偶台次黑白交替
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
          result: '1-0', // 轮空默认自动记1-0
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

    // 5. 第2轮及以后的瑞士制匹配 (回溯算法)
    // 尝试寻找无重复交手的最佳匹配
    let matchResult = solvePairing(poolForPairing, rounds, false);
    let warning = null;

    // 如果因为已交手过多无法在当前轮空选择下完全配对，尝试更换轮空选手
    if (!matchResult && byePlayer) {
      const otherByeCandidates = candidatePool
        .slice()
        .reverse()
        .filter(p => p.id !== byePlayer.id && !hasHadBye(p.id, rounds));

      for (const altBye of otherByeCandidates) {
        const altPool = candidatePool.filter(p => p.id !== altBye.id);
        const altResult = solvePairing(altPool, rounds, false);
        if (altResult) {
          byePlayer = altBye;
          matchResult = altResult;
          break;
        }
      }
    }

    // 极端兜底情况：如果选手极少（如全循环已基本打完），允许必要重复交手
    if (!matchResult) {
      warning = '提示：由于参赛人数较少且多位选手已相互交手，本轮存在极少数重复对决以保证比赛顺利进行。';
      matchResult = solvePairing(poolForPairing, rounds, true);
    }

    if (!matchResult) {
      throw new Error('配对计算遇到冲突，无法完成当前轮次编排，请检查选手参赛状态！');
    }

    // 整理台次与黑白棋分配
    const pairings = matchResult.map((pair, idx) => {
      const colors = decideColors(pair[0], pair[1]);
      return {
        board: idx + 1,
        whiteId: colors.white.id,
        whiteName: colors.white.name,
        whiteScore: colors.white.score,
        blackId: colors.black.id,
        blackName: colors.black.name,
        blackScore: colors.black.score,
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

    return {
      roundNumber,
      pairings,
      byePlayer,
      warning
    };
  }

  /**
   * 递归回溯求解配对
   * @param {Array} players - 待配对选手列表 (偶数个)
   * @param {Array} rounds - 历史轮次
   * @param {boolean} allowRematch - 是否允许重复交手兜底
   */
  function solvePairing(players, rounds, allowRematch) {
    if (players.length === 0) return [];
    if (players.length % 2 !== 0) return null;

    // 取当前最高分的第一名选手
    const p1 = players[0];
    const rest = players.slice(1);

    // 候选对手列表
    let candidates = rest.filter(p2 => allowRematch || !haveMet(p1.id, p2.id, rounds));

    if (candidates.length === 0) {
      if (allowRematch) {
        candidates = rest; // 允许重复对局
      } else {
        return null; // 回溯
      }
    }

    // 对候选对手按启发式打分排序：
    // 1. 积分差越小越好 (同分群优先)
    // 2. 颜色冲突惩罚越小越好
    candidates.sort((cA, cB) => {
      const scoreDiffA = Math.abs(p1.score - cA.score);
      const scoreDiffB = Math.abs(p1.score - cB.score);
      if (scoreDiffA !== scoreDiffB) return scoreDiffA - scoreDiffB;

      // 颜色冲突成本
      const costA = Math.min(
        evaluateColorAssignmentCost(p1, cA),
        evaluateColorAssignmentCost(cA, p1)
      );
      const costB = Math.min(
        evaluateColorAssignmentCost(p1, cB),
        evaluateColorAssignmentCost(cB, p1)
      );
      return costA - costB;
    });

    for (const c of candidates) {
      const remaining = rest.filter(p => p.id !== c.id);
      const subSolution = solvePairing(remaining, rounds, allowRematch);
      if (subSolution !== null) {
        return [[p1, c], ...subSolution];
      }
    }

    return null;
  }

  return {
    calculateStandings,
    generateSwissPairing,
    getPlayerColorStats,
    haveMet,
    hasHadBye
  };
});
