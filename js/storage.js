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

  /**
   * 获取所有组别列表 (支持用户自定义新建组别)
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
      { id: 'men', name: '👦 男子组' },
      { id: 'women', name: '👧 女子组' }
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
      groups = [{ id: 'men', name: '👦 男子组' }];
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
    return found ? found.name : (groupId === 'women' ? '👧 女子组' : '👦 男子组');
  }

  function getStorageKey(groupId) {
    if (!groupId || groupId === 'default') {
      return BASE_STORAGE_KEY;
    }
    return `${BASE_STORAGE_KEY}_${groupId}`;
  }

  /**
   * 保存当前选中的组别标识 (如 'men', 'women', 或自定义组别ID)
   */
  function saveActiveGroup(groupId) {
    try {
      localStorage.setItem(ACTIVE_GROUP_KEY, groupId || 'men');
    } catch (e) {
      console.error(e);
    }
  }

  function getActiveGroup() {
    try {
      const saved = localStorage.getItem(ACTIVE_GROUP_KEY);
      if (saved) return saved;
      const groups = getGroups();
      return (groups[0] && groups[0].id) || 'men';
    } catch (e) {
      return 'men';
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
   * 导出某轮对阵签单为 Excel / CSV 格式
   * 包含台次、白方、赛果比分留空/已录、黑方、白方签字、黑方签字、复核签字
   */
  function exportPairingsToCSV(tournamentTitle, roundNumber, pairings, isBlankForSigning = false) {
    let csv = '\uFEFF'; // Excel UTF-8 BOM 防中文乱码
    csv += `"${tournamentTitle || '国际象棋俱乐部积分赛'}"\n`;
    csv += `"第 ${roundNumber} 轮 对阵与成绩确认签单"\n`;
    csv += `"导出时间: ${new Date().toLocaleString()}","裁判长/编排: 瑞士制"\n\n`;

    // 表头：包含赛果与双方签字、复核签字
    csv += '台次,白方棋手,白方当前分,赛果比分,黑方当前分,黑方棋手,白方签字,黑方签字,复核/裁判签字\n';

    pairings.forEach(p => {
      if (p.isBye) {
        csv += `第 ${p.board} 台,${p.playerName},${p.playerScore}分,轮空获胜 (+1.0),-,(轮空),免赛确认,免赛确认,已核\n`;
      } else {
        // 如果选择手写空白签单，或者尚未录入比分，填入提示框
        const res = isBlankForSigning ? '[   ] : [   ]' : (p.result || '[   ] : [   ]');
        csv += `第 ${p.board} 台,${p.whiteName},${p.whiteScore}分,"${res}",${p.blackScore}分,${p.blackName},________,________,________\n`;
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
        groupId: data.groupId || 'men',
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
          p: (r.pairings || []).map(pair => {
            if (pair.isBye) {
              return { b: pair.board, by: 1, p: pair.playerId, res: pair.result || '1-0' };
            }
            return {
              b: pair.board,
              w: pair.whiteId,
              bl: pair.blackId,
              res: pair.result || null
            };
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

      const rounds = (p.rounds || []).map(r => ({
        roundNumber: r.rn,
        pairings: (r.p || []).map(pair => {
          if (pair.by) {
            const player = playerMap.get(pair.p) || { id: pair.p, name: '未知' };
            return {
              board: pair.b,
              isBye: true,
              playerId: player.id,
              playerName: player.name,
              playerScore: 0,
              result: pair.res || '1-0'
            };
          }
          const white = playerMap.get(pair.w) || { id: pair.w, name: '未知' };
          const black = playerMap.get(pair.bl) || { id: pair.bl, name: '未知' };
          return {
            board: pair.b,
            whiteId: white.id,
            whiteName: white.name,
            whiteScore: 0,
            blackId: black.id,
            blackName: black.name,
            blackScore: 0,
            result: pair.res
          };
        })
      }));

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
    exportToFile,
    exportPairingsToCSV,
    formatPairingShareText,
    formatStandingsShareText,
    compressTournamentState,
    decompressTournamentState,
    buildShareUrl
  };
});
