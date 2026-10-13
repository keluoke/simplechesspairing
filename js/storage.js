/**
 * 本地存储、数据导入导出、CSV签单导出与文本分享模块 (Storage & Export Manager)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TournamentStorage = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BASE_STORAGE_KEY = 'chesspairing_tournament_data_v1';
  const ACTIVE_GROUP_KEY = 'chesspairing_active_group_v1';
  const GROUPS_STORAGE_KEY = 'chesspairing_groups_v1';

  const DEFAULT_GROUP_ID = 'default';
  const DEFAULT_GROUP_NAME = '俱乐部积分赛';

  /**
   * 获取所有组别列表 (默认单个“俱乐部积分赛”，支持用户自由添加自定义组)
   */
  function getGroups() {
    try {
      const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (e) {
      console.error(e);
    }
    return [
      { id: DEFAULT_GROUP_ID, name: DEFAULT_GROUP_NAME }
    ];
  }

  /**
   * 保存组别列表
   */
  function saveGroups(groups) {
    try {
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * 添加新组别
   */
  function addGroup(name) {
    const cleanName = (name || '').trim();
    if (!cleanName) return null;
    const groups = getGroups();
    const newId = 'grp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const newGroup = { id: newId, name: cleanName };
    groups.push(newGroup);
    saveGroups(groups);
    return newGroup;
  }

  /**
   * 删除组别
   */
  function deleteGroup(groupId) {
    let groups = getGroups();
    groups = groups.filter(g => g.id !== groupId);
    if (groups.length === 0) {
      groups = [{ id: DEFAULT_GROUP_ID, name: DEFAULT_GROUP_NAME }];
    }
    saveGroups(groups);
    clearTournament(groupId);
    return groups;
  }

  /**
   * 获取指定组别的显示名称
   */
  function getGroupName(groupId) {
    const groups = getGroups();
    const found = groups.find(g => g.id === groupId);
    if (found) return found.name;
    if (groupId === 'default') return DEFAULT_GROUP_NAME;
    if (groupId === 'men') return '👦 男子组';
    if (groupId === 'women') return '👧 女子组';
    return DEFAULT_GROUP_NAME;
  }

  function getStorageKey(groupId) {
    if (!groupId || groupId === DEFAULT_GROUP_ID) {
      return BASE_STORAGE_KEY;
    }
    return `${BASE_STORAGE_KEY}_${groupId}`;
  }

  /**
   * 保存当前选中的组别标识
   */
  function saveActiveGroup(groupId) {
    try {
      localStorage.setItem(ACTIVE_GROUP_KEY, groupId || DEFAULT_GROUP_ID);
    } catch (e) {
      console.error(e);
    }
  }

  function getActiveGroup() {
    try {
      const saved = localStorage.getItem(ACTIVE_GROUP_KEY);
      if (saved) return saved;
      const groups = getGroups();
      return (groups[0] && groups[0].id) || DEFAULT_GROUP_ID;
    } catch (e) {
      return DEFAULT_GROUP_ID;
    }
  }

  /**
   * 保存指定组别的赛事数据到 LocalStorage
   */
  function saveTournament(data, groupId) {
    try {
      const key = getStorageKey(groupId);
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('保存数据失败:', e);
      return false;
    }
  }

  /**
   * 从 LocalStorage 加载指定组别的赛事数据
   */
  function loadTournament(groupId) {
    try {
      const key = getStorageKey(groupId);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('读取数据失败:', e);
      return null;
    }
  }

  /**
   * 清空指定组别的本地存储
   */
  function clearTournament(groupId) {
    const key = getStorageKey(groupId);
    localStorage.removeItem(key);
  }

  /**
   * 导出比赛数据为 JSON 文件下载
   */
  function exportToFile(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `chess_tournament_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 转义与防范 CSV 注入 (RFC 4180 + Excel 公式保护)
   */
  function escapeCSVField(str) {
    if (str === null || str === undefined) return '""';
    let s = String(str);
    if (/^[=\+\-@]/.test(s)) {
      s = "'" + s;
    }
    return `"${s.replace(/"/g, '""')}"`;
  }

  /**
   * 导出某轮对阵签单为 Excel / CSV 格式
   * 包含台次、白方、赛果比分留空/已录、黑方、白方签字、黑方签字、复核签字
   */
  function exportPairingsToCSV(tournamentTitle, roundNumber, pairings, isBlankForSigning = false) {
    let csv = '\uFEFF'; // Excel UTF-8 BOM 防中文乱码
    csv += `${escapeCSVField(tournamentTitle || '国际象棋俱乐部积分赛')}\n`;
    csv += `${escapeCSVField(`第 ${roundNumber} 轮 对阵与成绩确认签单`)}\n`;
    csv += `${escapeCSVField(`导出时间: ${new Date().toLocaleString()}`)},${escapeCSVField('裁判长/编排: 瑞士制')}\n\n`;

    // 表头：包含赛果与双方签字、复核签字
    const headers = ['台次', '白方棋手', '白方当前分', '赛果比分', '黑方当前分', '黑方棋手', '白方签字', '黑方签字', '复核/裁判签字'];
    csv += headers.map(escapeCSVField).join(',') + '\n';

    pairings.forEach(p => {
      if (p.isBye) {
        const row = [
          `第 ${p.board} 台`,
          p.playerName,
          `${p.playerScore}分`,
          '轮空获胜 (+1.0)',
          '-',
          '(轮空)',
          '免赛确认',
          '免赛确认',
          '已核'
        ];
        csv += row.map(escapeCSVField).join(',') + '\n';
      } else {
        const res = isBlankForSigning ? '[   ] : [   ]' : (p.result || '[   ] : [   ]');
        const row = [
          `第 ${p.board} 台`,
          p.whiteName,
          `${p.whiteScore}分`,
          res,
          `${p.blackScore}分`,
          p.blackName,
          '________',
          '________',
          '________'
        ];
        csv += row.map(escapeCSVField).join(',') + '\n';
      }
    });

    const safeTitle = (tournamentTitle || '对阵单').replace(/[\s\/\\:*?"<>|]/g, '_');
    const filename = `${safeTitle}_第${roundNumber}轮对阵与成绩签单.csv`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 将对阵表生成适合微信群发通告的精简排版文本
   */
  function formatPairingShareText(tournamentTitle, roundNumber, pairings, leavePlayers = []) {
    let text = `🏆【${tournamentTitle || '俱乐部积分赛'}】第 ${roundNumber} 轮对阵表\n`;
    text += `──────────────\n`;

    pairings.forEach(p => {
      if (p.isBye) {
        text += `【第 ${p.board} 台】${p.playerName} (轮空胜 +1.0分)\n`;
      } else {
        const res = p.result ? ` [${p.result}]` : ' vs ';
        text += `【第 ${p.board} 台】⚪(白) ${p.whiteName} (${p.whiteScore}分)${res}⚫(黑) ${p.blackName} (${p.blackScore}分)\n`;
      }
    });

    if (leavePlayers && leavePlayers.length > 0) {
      text += `──────────────\n`;
      text += `⏸️ 本轮请假不配对: ${leavePlayers.map(p => p.name).join('、')}\n`;
    }

    text += `──────────────\n`;
    text += `⏰ 祝各位棋手弈出精彩对局！\n`;
    return text;
  }

  /**
   * 将积分排行榜生成适合微信群分享的文本
   */
  function formatStandingsShareText(tournamentTitle, roundNumber, standings) {
    let text = `📊【${tournamentTitle || '俱乐部积分赛'}】第 ${roundNumber} 轮后积分榜\n`;
    text += `──────────────\n`;
    text += `名次 姓名    积分  对手分 胜负分 状态\n`;

    standings.forEach(s => {
      const rank = String(s.rank).padStart(2, ' ');
      const status = s.status === 'leave' ? '(休)' : '';
      text += `${rank}  ${s.name} | ${s.score}分 (对手分:${s.buchholz} 胜负分:${s.sonnebornBerger}) ${status}\n`;
    });

    text += `──────────────\n`;
    text += `计分说明：胜=1分，和=0.5分，负=0分，轮空=1分\n`;
    return text;
  }

  /**
   * 将赛事关键数据压缩为 URL-safe 字符串 (用于跨浏览器/零后端分享)
   */
  async function compressTournamentState(data) {
    try {
      if (!data) return null;
      // 提取核心数据，精简键名与体积
      const payload = {
        v: 1,
        title: data.title || '',
        groupId: data.groupId || DEFAULT_GROUP_ID,
        status: data.status || 'in_progress',
        currentRoundIndex: data.currentRoundIndex || 0,
        players: (data.players || []).map(p => ({
          i: p.id,
          n: p.name,
          s: p.initialSeed || p.id,
          st: p.status === 'leave' ? 'l' : 'a'
        })),
        rounds: (data.rounds || []).map(r => ({
          rn: r.roundNumber,
          warn: r.warning || undefined,
          p: (r.pairings || []).map(pair => {
            if (pair.isBye) {
              const item = { b: pair.board, by: 1, p: pair.playerId, res: pair.result || '1-0' };
              if (typeof pair.playerScore === 'number') item.ps = pair.playerScore;
              return item;
            }
            const item = {
              b: pair.board,
              w: pair.whiteId,
              bl: pair.blackId,
              res: pair.result || null
            };
            if (typeof pair.whiteScore === 'number') item.ws = pair.whiteScore;
            if (typeof pair.blackScore === 'number') item.bs = pair.blackScore;
            return item;
          })
        }))
      };

      const jsonStr = JSON.stringify(payload);

      if (typeof CompressionStream !== 'undefined') {
        const cs = new CompressionStream('deflate-raw');
        const writer = cs.writable.getWriter();
        writer.write(new TextEncoder().encode(jsonStr));
        writer.close();
        const buffer = await new Response(cs.readable).arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return 'c_' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      } else {
        // Fallback: utf-8 base64url
        return 'r_' + btoa(unescape(encodeURIComponent(jsonStr))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
    } catch (e) {
      console.error('压缩数据失败:', e);
      return null;
    }
  }

  /**
   * 从 URL-safe 字符串解压并还原赛事数据
   */
  async function decompressTournamentState(str) {
    try {
      if (!str) return null;
      let jsonStr = '';
      if (str.startsWith('c_')) {
        const b64 = str.slice(2).replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        if (typeof DecompressionStream !== 'undefined') {
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(bytes);
          writer.close();
          jsonStr = await new Response(ds.readable).text();
        } else {
          return null;
        }
      } else {
        const clean = str.startsWith('r_') ? str.slice(2) : str;
        const b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
        jsonStr = decodeURIComponent(escape(atob(b64)));
      }

      const p = JSON.parse(jsonStr);
      if (!p || !p.players) return null;

      // 还原为完整结构
      const playerMap = new Map();
      const players = p.players.map(item => {
        const obj = {
          id: item.i,
          name: item.n,
          initialSeed: item.s,
          status: item.st === 'l' ? 'leave' : 'active'
        };
        playerMap.set(obj.id, obj);
        return obj;
      });

      // 跟踪累计轮前积分，确保解压后即使是精简历史也有准确的轮前积分
      const runningScores = new Map();
      playerMap.forEach((_, id) => runningScores.set(id, 0));

      const rounds = (p.rounds || []).map(r => {
        const roundNumber = r.rn;
        const pairings = (r.p || []).map(pair => {
          if (pair.by) {
            const player = playerMap.get(pair.p) || { id: pair.p, name: '未知' };
            const pScore = pair.ps !== undefined ? pair.ps : (runningScores.get(player.id) || 0);
            return {
              board: pair.b,
              isBye: true,
              playerId: player.id,
              playerName: player.name,
              playerScore: pScore,
              result: pair.res || '1-0'
            };
          }
          const white = playerMap.get(pair.w) || { id: pair.w, name: '未知' };
          const black = playerMap.get(pair.bl) || { id: pair.bl, name: '未知' };
          const wScore = pair.ws !== undefined ? pair.ws : (runningScores.get(white.id) || 0);
          const bScore = pair.bs !== undefined ? pair.bs : (runningScores.get(black.id) || 0);
          return {
            board: pair.b,
            whiteId: white.id,
            whiteName: white.name,
            whiteScore: wScore,
            blackId: black.id,
            blackName: black.name,
            blackScore: bScore,
            result: pair.res === undefined ? null : pair.res
          };
        });

        // 根据本轮已出的实际结果更新 runningScores，供后续轮次的轮前分使用
        pairings.forEach(pair => {
          if (pair.isBye) {
            runningScores.set(pair.playerId, (runningScores.get(pair.playerId) || 0) + 1);
          } else if (pair.result === '1-0') {
            runningScores.set(pair.whiteId, (runningScores.get(pair.whiteId) || 0) + 1);
          } else if (pair.result === '0-1') {
            runningScores.set(pair.blackId, (runningScores.get(pair.blackId) || 0) + 1);
          } else if (pair.result === '0.5-0.5' || pair.result === '1/2-1/2') {
            runningScores.set(pair.whiteId, (runningScores.get(pair.whiteId) || 0) + 0.5);
            runningScores.set(pair.blackId, (runningScores.get(pair.blackId) || 0) + 0.5);
          }
        });

        return {
          roundNumber: roundNumber,
          pairings: pairings,
          warning: r.warn || null
        };
      });

      return {
        title: p.title,
        groupId: p.groupId,
        status: p.status,
        currentRoundIndex: p.currentRoundIndex,
        players: players,
        rounds: rounds
      };
    } catch (e) {
      console.error('解压数据失败:', e);
      return null;
    }
  }

  /**
   * 构建多端/多页面分享链接
   */
  async function buildShareUrl(options = {}) {
    const { groupId, round, tab, isSheet, withSnapshot, state } = options;
    const url = new URL(window.location.href.split('#')[0]);
    if (groupId) url.searchParams.set('group', groupId);
    if (round) url.searchParams.set('round', String(round));
    if (tab) url.searchParams.set('tab', tab);
    if (isSheet) url.searchParams.set('sheet', '1');

    if (withSnapshot && state) {
      const hashStr = await compressTournamentState(state);
      if (hashStr) {
        url.hash = `d=${hashStr}`;
      }
    }
    return url.toString();
  }

  /**
   * 严格验证赛事数据结构，并提取纯净领域对象 (用于导入与快照加载)
   * 过滤非领域字段 (如 isAdmin, isSnapshot, activeTab 等)，防止越权与数据破坏
   * @param {Object} raw
   * @returns {{ valid: boolean, error?: string, sanitizedData?: Object }}
   */
  function validateTournamentData(raw) {
    if (!raw || typeof raw !== 'object') {
      return { valid: false, error: '数据必须为 JSON 对象' };
    }

    // 1. 标题
    const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 100) : '国际象棋俱乐部积分赛';

    // 2. 状态
    const allowedStatus = ['setup', 'in_progress', 'finished'];
    const status = allowedStatus.includes(raw.status) ? raw.status : 'setup';

    // 3. 组别 ID
    const groupId = typeof raw.groupId === 'string' && raw.groupId.trim() ? raw.groupId.trim() : DEFAULT_GROUP_ID;

    // 4. 选手列表验证
    if (!Array.isArray(raw.players)) {
      return { valid: false, error: '缺少选手列表或 players 字段不是数组' };
    }

    const sanitizedPlayers = [];
    const seenIds = new Set();
    for (let i = 0; i < raw.players.length; i++) {
      const p = raw.players[i];
      if (!p || typeof p !== 'object') {
        return { valid: false, error: `第 ${i + 1} 位选手格式无效` };
      }
      const id = parseInt(p.id, 10);
      if (isNaN(id) || id <= 0) {
        return { valid: false, error: `第 ${i + 1} 位选手 ID 必须为正整数` };
      }
      if (seenIds.has(id)) {
        return { valid: false, error: `存在重复的选手 ID: ${id}` };
      }
      seenIds.add(id);

      const name = typeof p.name === 'string' ? p.name.trim().slice(0, 50) : '';
      if (!name) {
        return { valid: false, error: `选手 ID ${id} 缺少有效姓名` };
      }

      sanitizedPlayers.push({
        id: id,
        name: name,
        initialSeed: parseInt(p.initialSeed, 10) || id,
        status: p.status === 'leave' ? 'leave' : 'active'
      });
    }

    // 5. 轮次列表验证
    if (!Array.isArray(raw.rounds)) {
      return { valid: false, error: '缺少轮次列表或 rounds 字段不是数组' };
    }

    const sanitizedRounds = [];
    for (let rIdx = 0; rIdx < raw.rounds.length; rIdx++) {
      const r = raw.rounds[rIdx];
      if (!r || typeof r !== 'object') {
        return { valid: false, error: `第 ${rIdx + 1} 轮轮次数据无效` };
      }
      const roundNumber = parseInt(r.roundNumber, 10);
      if (isNaN(roundNumber) || roundNumber !== rIdx + 1) {
        return { valid: false, error: `轮次编号不连续或无效: 期望第 ${rIdx + 1} 轮，得到 ${r.roundNumber}` };
      }
      if (!Array.isArray(r.pairings)) {
        return { valid: false, error: `第 ${roundNumber} 轮对阵列表 (pairings) 必须为数组` };
      }

      const sanitizedPairings = [];
      const pairedInRound = new Set();

      for (let pIdx = 0; pIdx < r.pairings.length; pIdx++) {
        const pair = r.pairings[pIdx];
        if (!pair || typeof pair !== 'object') {
          return { valid: false, error: `第 ${roundNumber} 轮第 ${pIdx + 1} 台对阵数据无效` };
        }
        const board = parseInt(pair.board, 10) || (pIdx + 1);

        if (pair.isBye) {
          const playerId = parseInt(pair.playerId, 10);
          if (!seenIds.has(playerId)) {
            return { valid: false, error: `第 ${roundNumber} 轮轮空选手 ID ${playerId} 不在选手列表中` };
          }
          if (pairedInRound.has(playerId)) {
            return { valid: false, error: `第 ${roundNumber} 轮选手 ID ${playerId} 被重复编排` };
          }
          pairedInRound.add(playerId);

          const player = sanitizedPlayers.find(p => p.id === playerId);
          sanitizedPairings.push({
            board: board,
            isBye: true,
            playerId: playerId,
            playerName: player ? player.name : String(pair.playerName || '未知'),
            playerScore: typeof pair.playerScore === 'number' ? pair.playerScore : 0,
            result: pair.result || '1-0'
          });
        } else {
          const whiteId = parseInt(pair.whiteId, 10);
          const blackId = parseInt(pair.blackId, 10);
          if (!seenIds.has(whiteId)) {
            return { valid: false, error: `第 ${roundNumber} 轮白方选手 ID ${whiteId} 不在选手列表中` };
          }
          if (!seenIds.has(blackId)) {
            return { valid: false, error: `第 ${roundNumber} 轮黑方选手 ID ${blackId} 不在选手列表中` };
          }
          if (whiteId === blackId) {
            return { valid: false, error: `第 ${roundNumber} 轮第 ${board} 台出现自己对战自己的非法对阵 (ID: ${whiteId})` };
          }
          if (pairedInRound.has(whiteId)) {
            return { valid: false, error: `第 ${roundNumber} 轮选手 ID ${whiteId} 被重复编排` };
          }
          if (pairedInRound.has(blackId)) {
            return { valid: false, error: `第 ${roundNumber} 轮选手 ID ${blackId} 被重复编排` };
          }
          pairedInRound.add(whiteId);
          pairedInRound.add(blackId);

          const res = pair.result === undefined ? null : pair.result;
          const normalizedRes = (res === '1/2-1/2') ? '0.5-0.5' : res;
          if (normalizedRes !== null && !['1-0', '0-1', '0.5-0.5', '1-0-bye', '0-0'].includes(normalizedRes)) {
            return { valid: false, error: `第 ${roundNumber} 轮第 ${board} 台赛果值 "${res}" 非法` };
          }

          const white = sanitizedPlayers.find(p => p.id === whiteId);
          const black = sanitizedPlayers.find(p => p.id === blackId);

          sanitizedPairings.push({
            board: board,
            whiteId: whiteId,
            whiteName: white ? white.name : String(pair.whiteName || '未知'),
            whiteScore: typeof pair.whiteScore === 'number' ? pair.whiteScore : 0,
            blackId: blackId,
            blackName: black ? black.name : String(pair.blackName || '未知'),
            blackScore: typeof pair.blackScore === 'number' ? pair.blackScore : 0,
            result: normalizedRes
          });
        }
      }

      sanitizedRounds.push({
        roundNumber: roundNumber,
        pairings: sanitizedPairings
      });
    }

    const currentRoundIndex = Math.min(
      Math.max(0, parseInt(raw.currentRoundIndex, 10) || 0),
      Math.max(0, sanitizedRounds.length - 1)
    );

    return {
      valid: true,
      sanitizedData: {
        title: title,
        groupId: groupId,
        status: status,
        currentRoundIndex: currentRoundIndex,
        players: sanitizedPlayers,
        rounds: sanitizedRounds
      }
    };
  }

  return {
    getGroups,
    saveGroups,
    addGroup,
    deleteGroup,
    getGroupName,
    saveActiveGroup,
    getActiveGroup,
    saveTournament,
    loadTournament,
    clearTournament,
    validateTournamentData,
    exportToFile,
    exportPairingsToCSV,
    formatPairingShareText,
    formatStandingsShareText,
    compressTournamentState,
    decompressTournamentState,
    buildShareUrl
  };
});
