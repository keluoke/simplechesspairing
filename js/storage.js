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

  function getStorageKey(groupId) {
    if (!groupId || groupId === 'default') {
      return BASE_STORAGE_KEY;
    }
    return `${BASE_STORAGE_KEY}_${groupId}`;
  }

  /**
   * 保存当前选中的组别标识 (如 'men', 'women', 'default')
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
      return localStorage.getItem(ACTIVE_GROUP_KEY) || 'men';
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

  return {
    saveActiveGroup,
    getActiveGroup,
    saveTournament,
    loadTournament,
    clearTournament,
    exportToFile,
    exportPairingsToCSV,
    formatPairingShareText,
    formatStandingsShareText
  };
});
