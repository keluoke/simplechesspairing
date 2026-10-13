/**
 * 棋弈排阵 - 主交互与控制器 (App Controller)
 */

(function () {
  'use strict';

  const ADMIN_PASSWORD = 'pflschessteam';

  // 全局应用状态
  const state = {
    isAdmin: false, // 默认访客模式 (只读)
    groupId: 'default',
    title: '俱乐部积分赛',
    status: 'setup', // 'setup' | 'in_progress' | 'finished'
    players: [],
    rounds: [],
    currentRoundIndex: 0,
    activeTab: 'tabPairing',
    theme: 'light',
    historyViewingRound: 1
  };

  // DOM 元素缓存
  const els = {};

  /**
   * 初始化应用
   */
  async function init() {
    cacheDom();
    bindEvents();
    loadStoredTheme();

    // 检查本地裁判登录状态
    state.isAdmin = (localStorage.getItem('chesspairing_admin_auth') === 'true');
    updateAuthUI();

    renderGroupSwitcher();

    // 优先检查 URL 快照与路由参数 (单次确定性初始化，防止深链接被覆盖)
    await handleUrlSnapshotAndParams();
  }

  /**
   * 缓存 DOM 节点
   */
  function cacheDom() {
    els.appHeaderTitle = document.getElementById('appHeaderTitle');
    els.tournamentSubtitle = document.getElementById('tournamentSubtitle');
    els.badgeRoundStatus = document.getElementById('badgeRoundStatus');
    els.badgePlayerCount = document.getElementById('badgePlayerCount');
    els.badgeLeaveCount = document.getElementById('badgeLeaveCount');

    els.btnToggleTheme = document.getElementById('btnToggleTheme');
    els.themeIcon = document.getElementById('themeIcon');
    els.btnShareModal = document.getElementById('btnShareModal');
    els.btnPrint = document.getElementById('btnPrint');
    els.btnDataModal = document.getElementById('btnDataModal');
    els.btnResetTournament = document.getElementById('btnResetTournament');

    els.mainNavTabs = document.getElementById('mainNavTabs');
    els.tabButtons = document.querySelectorAll('.tab-btn');
    els.tabPanels = document.querySelectorAll('.tab-panel');

    // Setup View
    els.viewSetup = document.getElementById('viewSetup');
    els.setupPlayerInput = document.getElementById('setupPlayerInput');
    els.setupTournamentTitle = document.getElementById('setupTournamentTitle');
    els.btnStartTournament = document.getElementById('btnStartTournament');
    els.btnLoadMen20 = document.getElementById('btnLoadMen20');
    els.btnLoadWomen7 = document.getElementById('btnLoadWomen7');
    els.btnLoadDemo8 = document.getElementById('btnLoadDemo8');
    els.btnLoadDemo20 = document.getElementById('btnLoadDemo20');
    els.btnClearSetupRoster = document.getElementById('btnClearSetupRoster');

    // 组别切换器与快照提示横幅
    els.headerGroupSwitcher = document.getElementById('headerGroupSwitcher');
    els.bannerSnapshotView = document.getElementById('bannerSnapshotView');
    els.snapshotViewDesc = document.getElementById('snapshotViewDesc');
    els.btnTakeoverSnapshot = document.getElementById('btnTakeoverSnapshot');

    // Tab Pairing
    els.tabPairing = document.getElementById('tabPairing');
    els.currentRoundTitle = document.getElementById('currentRoundTitle');
    els.currentRoundBoardCount = document.getElementById('currentRoundBoardCount');
    els.btnQuickAddPlayer = document.getElementById('btnQuickAddPlayer');
    els.btnQuickManageLeave = document.getElementById('btnQuickManageLeave');
    els.btnCopyCurrentPairing = document.getElementById('btnCopyCurrentPairing');
    els.btnPrintCurrentSheet = document.getElementById('btnPrintCurrentSheet');
    els.btnExportCurrentCSV = document.getElementById('btnExportCurrentCSV');
    els.bannerLeavePlayers = document.getElementById('bannerLeavePlayers');
    els.bannerLeaveNames = document.getElementById('bannerLeaveNames');
    els.btnBannerEditLeave = document.getElementById('btnBannerEditLeave');
    els.bannerPairingNotice = document.getElementById('bannerPairingNotice');
    els.bannerPairingNoticeText = document.getElementById('bannerPairingNoticeText');
    els.pairingsContainer = document.getElementById('pairingsContainer');
    els.resultProgressText = document.getElementById('resultProgressText');
    els.btnRegenerateCurrentRound = document.getElementById('btnRegenerateCurrentRound');
    els.btnFinishRoundAndNext = document.getElementById('btnFinishRoundAndNext');
    els.bannerTournamentFinished = document.getElementById('bannerTournamentFinished');
    els.btnReopenTournament = document.getElementById('btnReopenTournament');
    els.btnFinishTournament = document.getElementById('btnFinishTournament');

    // Tab Standings
    els.tabStandings = document.getElementById('tabStandings');
    els.standingsPlayerTotal = document.getElementById('standingsPlayerTotal');
    els.standingsTableBody = document.getElementById('standingsTableBody');
    els.btnCopyStandingsText = document.getElementById('btnCopyStandingsText');
    els.btnPrintStandings = document.getElementById('btnPrintStandings');

    // Tab Players
    els.tabPlayers = document.getElementById('tabPlayers');
    els.formAddPlayer = document.getElementById('formAddPlayer');
    els.inputNewPlayerName = document.getElementById('inputNewPlayerName');
    els.managePlayerCount = document.getElementById('managePlayerCount');
    els.playersManageTableBody = document.getElementById('playersManageTableBody');
    els.btnAllActive = document.getElementById('btnAllActive');

    // Tab History
    els.tabHistory = document.getElementById('tabHistory');
    els.historyRoundSelectContainer = document.getElementById('historyRoundSelectContainer');
    els.historyRoundContent = document.getElementById('historyRoundContent');
    els.btnPrintHistorySheet = document.getElementById('btnPrintHistorySheet');
    els.btnExportHistoryCSV = document.getElementById('btnExportHistoryCSV');

    // Print Header
    els.printTitle = document.getElementById('printTitle');
    els.printSubtitle = document.getElementById('printSubtitle');

    // Modals
    els.modalAddPlayer = document.getElementById('modalAddPlayer');
    els.modalPlayerNameInput = document.getElementById('modalPlayerNameInput');
    els.btnModalConfirmAddPlayer = document.getElementById('btnModalConfirmAddPlayer');

    // 签单打印模态框
    els.modalPrintSheet = document.getElementById('modalPrintSheet');
    els.btnOpenPrintSheet = document.getElementById('btnOpenPrintSheet');
    els.selectPrintSheetRound = document.getElementById('selectPrintSheetRound');
    els.radioSheetBlank = document.getElementById('radioSheetBlank');
    els.radioSheetFilled = document.getElementById('radioSheetFilled');
    els.btnDownloadSheetCSV = document.getElementById('btnDownloadSheetCSV');
    els.btnTriggerPrintSheet = document.getElementById('btnTriggerPrintSheet');
    els.btnOpenStandalonePrintWindow = document.getElementById('btnOpenStandalonePrintWindow');
    els.printableSheetArea = document.getElementById('printableSheetArea');

    // 权限与登录
    els.authBox = document.getElementById('authBox');
    els.btnAdminLogin = document.getElementById('btnAdminLogin');
    els.adminLoggedInBadge = document.getElementById('adminLoggedInBadge');
    els.btnAdminLogout = document.getElementById('btnAdminLogout');
    els.modalAdminLogin = document.getElementById('modalAdminLogin');
    els.formAdminLogin = document.getElementById('formAdminLogin');
    els.inputAdminPassword = document.getElementById('inputAdminPassword');
    els.loginErrorMsg = document.getElementById('loginErrorMsg');

    els.modalManageLeave = document.getElementById('modalManageLeave');
    els.modalLeavePlayerList = document.getElementById('modalLeavePlayerList');
    els.btnModalSaveLeave = document.getElementById('btnModalSaveLeave');

    els.modalShareText = document.getElementById('modalShareText');
    els.shareTextContent = document.getElementById('shareTextContent');
    els.btnShareTabSnapshot = document.getElementById('btnShareTabSnapshot');
    els.btnShareTabWebUrl = document.getElementById('btnShareTabWebUrl');
    els.btnShareTabPairing = document.getElementById('btnShareTabPairing');
    els.btnShareTabStandings = document.getElementById('btnShareTabStandings');
    els.shareSectionSnapshot = document.getElementById('shareSectionSnapshot');
    els.shareSectionWebUrl = document.getElementById('shareSectionWebUrl');
    els.shareSectionText = document.getElementById('shareSectionText');
    els.inputSnapshotShareUrl = document.getElementById('inputSnapshotShareUrl');
    els.btnCopySnapshotUrl = document.getElementById('btnCopySnapshotUrl');
    els.inputWebShareUrl = document.getElementById('inputWebShareUrl');
    els.btnCopyWebUrl = document.getElementById('btnCopyWebUrl');
    els.btnDoCopyShareText = document.getElementById('btnDoCopyShareText');

    els.modalDataManage = document.getElementById('modalDataManage');
    els.btnExportJSON = document.getElementById('btnExportJSON');
    els.btnTriggerFileImport = document.getElementById('btnTriggerFileImport');
    els.inputFileImport = document.getElementById('inputFileImport');
    els.btnConfirmResetAll = document.getElementById('btnConfirmResetAll');
    els.boxDeleteCustomGroup = document.getElementById('boxDeleteCustomGroup');
    els.btnDeleteCustomGroup = document.getElementById('btnDeleteCustomGroup');

    els.toastContainer = document.getElementById('toastContainer');
  }

  /**
   * 绑定事件监听
   */
  function bindEvents() {
    // 标签页切换
    els.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        switchTab(tabId);
      });
    });

    // 主题切换
    els.btnToggleTheme.addEventListener('click', toggleTheme);

    // 权限登录事件
    if (els.btnAdminLogin) els.btnAdminLogin.addEventListener('click', openLoginModal);
    if (els.btnAdminLogout) els.btnAdminLogout.addEventListener('click', handleLogoutAdmin);
    if (els.formAdminLogin) els.formAdminLogin.addEventListener('submit', handleLoginSubmit);

    // 初始准备页事件
    els.btnStartTournament.addEventListener('click', handleStartTournament);
    if (els.btnLoadMen20) els.btnLoadMen20.addEventListener('click', () => loadRosterPreset('men'));
    if (els.btnLoadWomen7) els.btnLoadWomen7.addEventListener('click', () => loadRosterPreset('women'));
    els.btnLoadDemo8.addEventListener('click', () => loadDemoPreset(8));
    if (els.btnLoadDemo20) els.btnLoadDemo20.addEventListener('click', () => loadDemoPreset(20));
    if (els.btnClearSetupRoster) {
      els.btnClearSetupRoster.addEventListener('click', () => {
        els.setupPlayerInput.value = '';
        showToast('已清空名单输入框', 'info');
      });
    }

    // 快照接管
    if (els.btnTakeoverSnapshot) {
      els.btnTakeoverSnapshot.addEventListener('click', handleTakeoverSnapshot);
    }

    // 打印签单与导出
    if (els.btnOpenPrintSheet) els.btnOpenPrintSheet.addEventListener('click', () => openPrintSheetModal());
    if (els.btnPrintCurrentSheet) els.btnPrintCurrentSheet.addEventListener('click', () => openPrintSheetModal(state.currentRoundIndex + 1));
    if (els.btnExportCurrentCSV) els.btnExportCurrentCSV.addEventListener('click', handleExportCurrentRoundCSV);
    if (els.btnPrintHistorySheet) els.btnPrintHistorySheet.addEventListener('click', () => openPrintSheetModal(state.historyViewingRound));
    if (els.btnExportHistoryCSV) els.btnExportHistoryCSV.addEventListener('click', handleExportHistoryRoundCSV);

    if (els.selectPrintSheetRound) els.selectPrintSheetRound.addEventListener('change', renderPrintableSheet);
    if (els.radioSheetBlank) els.radioSheetBlank.addEventListener('change', renderPrintableSheet);
    if (els.radioSheetFilled) els.radioSheetFilled.addEventListener('change', renderPrintableSheet);
    if (els.btnDownloadSheetCSV) els.btnDownloadSheetCSV.addEventListener('click', handleDownloadSheetCSV);
    if (els.btnTriggerPrintSheet) els.btnTriggerPrintSheet.addEventListener('click', handleTriggerPrintSheet);
    if (els.btnOpenStandalonePrintWindow) els.btnOpenStandalonePrintWindow.addEventListener('click', handleOpenStandalonePrintWindow);

    // 打印与分享
    els.btnPrint.addEventListener('click', () => window.print());
    els.btnPrintStandings.addEventListener('click', () => {
      switchTab('tabStandings');
      setTimeout(() => window.print(), 100);
    });
    els.btnShareModal.addEventListener('click', () => openShareModal());
    els.btnCopyCurrentPairing.addEventListener('click', () => openShareModal('pairingText'));
    els.btnCopyStandingsText.addEventListener('click', () => openShareModal('standingsText'));

    // 分享模态框内部切换与复制
    if (els.btnShareTabSnapshot) els.btnShareTabSnapshot.addEventListener('click', () => switchShareModalTab('snapshot'));
    if (els.btnShareTabWebUrl) els.btnShareTabWebUrl.addEventListener('click', () => switchShareModalTab('webUrl'));
    if (els.btnShareTabPairing) els.btnShareTabPairing.addEventListener('click', () => switchShareModalTab('pairing'));
    if (els.btnShareTabStandings) els.btnShareTabStandings.addEventListener('click', () => switchShareModalTab('standings'));
    if (els.btnCopySnapshotUrl) els.btnCopySnapshotUrl.addEventListener('click', copySnapshotUrlToClipboard);
    if (els.btnCopyWebUrl) els.btnCopyWebUrl.addEventListener('click', copyWebUrlToClipboard);
    if (els.btnDoCopyShareText) els.btnDoCopyShareText.addEventListener('click', copyShareTextToClipboard);

    if (els.btnDeleteCustomGroup) els.btnDeleteCustomGroup.addEventListener('click', handleDeleteCustomGroup);

    // 对阵与推进操作
    els.btnFinishRoundAndNext.addEventListener('click', handleFinishRoundAndNext);
    els.btnRegenerateCurrentRound.addEventListener('click', handleRegenerateCurrentRound);
    if (els.btnFinishTournament) els.btnFinishTournament.addEventListener('click', handleFinishTournament);
    if (els.btnReopenTournament) els.btnReopenTournament.addEventListener('click', handleReopenTournament);

    // 快捷增补选手
    els.btnQuickAddPlayer.addEventListener('click', () => openModal(els.modalAddPlayer));
    els.btnModalConfirmAddPlayer.addEventListener('click', handleModalAddPlayer);
    els.formAddPlayer.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormAddPlayer();
    });

    // 请假管理
    els.btnQuickManageLeave.addEventListener('click', openLeaveModal);
    els.btnBannerEditLeave.addEventListener('click', openLeaveModal);
    els.btnModalSaveLeave.addEventListener('click', handleSaveLeaveModal);
    els.btnAllActive.addEventListener('click', handleSetAllActive);

    // 数据管理模态框
    els.btnDataModal.addEventListener('click', () => openModal(els.modalDataManage));
    els.btnExportJSON.addEventListener('click', handleExportJSON);
    els.btnTriggerFileImport.addEventListener('click', () => els.inputFileImport.click());
    els.inputFileImport.addEventListener('change', handleImportFile);
    els.btnConfirmResetAll.addEventListener('click', handleResetTournament);
    els.btnResetTournament.addEventListener('click', handleResetTournament);

    // 模态框通用关闭按钮
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.closeModal;
        const modal = document.getElementById(modalId);
        if (modal) closeModal(modal);
      });
    });

    // 点击模态框背景关闭
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });
  }

  /**
   * 裁判权限登录与认证
   */
  function openLoginModal() {
    if (els.inputAdminPassword) els.inputAdminPassword.value = '';
    if (els.loginErrorMsg) els.loginErrorMsg.style.display = 'none';
    openModal(els.modalAdminLogin);
    setTimeout(() => {
      if (els.inputAdminPassword) els.inputAdminPassword.focus();
    }, 100);
  }

  function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    const pwd = els.inputAdminPassword.value.trim();
    if (pwd === ADMIN_PASSWORD) {
      state.isAdmin = true;
      localStorage.setItem('chesspairing_admin_auth', 'true');
      closeModal(els.modalAdminLogin);
      updateAuthUI();
      renderApp();
      showToast('🎉 裁判员登录成功！已解锁赛果填写与编排管理权限。', 'success');
    } else {
      els.loginErrorMsg.style.display = 'block';
      els.inputAdminPassword.select();
    }
  }

  function handleLogoutAdmin() {
    state.isAdmin = false;
    localStorage.removeItem('chesspairing_admin_auth');
    updateAuthUI();
    renderApp();
    showToast('已退出裁判模式，当前为访客只读模式。', 'info');
  }

  function updateAuthUI() {
    if (!els.btnAdminLogin || !els.adminLoggedInBadge) return;
    if (state.isAdmin) {
      els.btnAdminLogin.style.display = 'none';
      els.adminLoggedInBadge.style.display = 'inline-flex';
    } else {
      els.btnAdminLogin.style.display = 'inline-flex';
      els.adminLoggedInBadge.style.display = 'none';
    }
  }

  function requireAdmin(actionName) {
    if (state.isAdmin) return true;
    showToast(`【${actionName || '该操作'}】需要裁判员权限，请先登录！`, 'warning');
    openLoginModal();
    return false;
  }

  /**
   * 切换界面标签页
   */
  function switchTab(tabId) {
    state.activeTab = tabId;

    els.tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    els.tabPanels.forEach(panel => {
      if (panel.id === tabId) {
        panel.style.display = 'block';
        panel.classList.add('active');
      } else {
        panel.style.display = 'none';
        panel.classList.remove('active');
      }
    });

    if (tabId === 'tabStandings') {
      renderStandings();
    } else if (tabId === 'tabPlayers') {
      renderPlayersManage();
    } else if (tabId === 'tabHistory') {
      renderHistory();
    } else if (tabId === 'tabPairing') {
      renderPairings();
    }
    syncUrlState();
  }

  /**
   * 解析输入的选手名单文本 (宽容过滤：序号、空行、重复项、等级分)
   */
  function parsePlayerNames(text) {
    if (!text || typeof text !== 'string') return [];
    // 按换行、分号、逗号、顿号、制表符分隔
    const rawLines = text.split(/[\n\r,，;；、\t]+/);
    const cleaned = [];
    const seen = new Set();
    let duplicates = 0;

    rawLines.forEach(line => {
      let trimmedLine = line.trim();
      if (!trimmedLine) return;

      // 如果当前行包含空格 (例如 "张伟 李明 周强" 或 "1. 张伟 2. 李明")
      // 进一步按空格分词检测
      const tokens = trimmedLine.split(/\s+/);
      if (tokens.length > 1) {
        // 检查是不是单纯一个名字带等级分，如 "张伟 1800"
        if (tokens.length === 2 && /^\d{3,4}$/.test(tokens[1])) {
          let name = tokens[0].replace(/^(\d+[\.\、\s\-]+|\[\d+\]|\(\d+\)|\d+\s+|\-\s+)/, '').trim();
          if (name) {
            if (!seen.has(name)) {
              seen.add(name);
              cleaned.push(name);
            } else {
              duplicates++;
            }
          }
          return;
        }

        // 包含多个空格分隔的选手名单
        tokens.forEach(tok => {
          let piece = tok.trim();
          if (!piece) return;
          // 跳过独立序号如 "1.", "2、", "1", "(1)", "[1]"
          if (/^(\d+[\.\、\)\-\]]*|\[\d+\]|\(\d+\))$/.test(piece)) return;
          // 去除开头的编号
          piece = piece.replace(/^(\d+[\.\、\s\-]+|\[\d+\]|\(\d+\)|\d+|\-\s*)/, '').trim();
          // 跳过纯等级分数字
          if (/^\d{3,4}$/.test(piece)) return;
          // 去除括号等级分
          piece = piece.replace(/\s*[\(\（]\d+[\)\）]$/, '').trim();

          if (piece) {
            if (!seen.has(piece)) {
              seen.add(piece);
              cleaned.push(piece);
            } else {
              duplicates++;
            }
          }
        });
        return;
      }

      // 单个名字
      let name = trimmedLine;
      name = name.replace(/^(\d+[\.\、\s\-]+|\[\d+\]|\(\d+\)|\d+\s+|\-\s+)/, '').trim();
      name = name.replace(/\s+\d{3,4}$/, '').replace(/\s*[\(\（]\d+[\)\）]$/, '').trim();
      if (name) {
        if (!seen.has(name)) {
          seen.add(name);
          cleaned.push(name);
        } else {
          duplicates++;
        }
      }
    });

    if (duplicates > 0) {
      showToast(`已自动去除 ${duplicates} 个同名重复选手`, 'info');
    }

    return cleaned;
  }

  /**
   * 处理开始比赛并生成第一轮配对
   */
  function handleStartTournament() {
    const rawNames = els.setupPlayerInput.value;
    const names = parsePlayerNames(rawNames);

    if (names.length < 2) {
      showToast('请至少输入 2 名选手的姓名！', 'warning');
      return;
    }

    // 保护现有赛事：若当前组已有历史比赛或已在进行中，必须经用户明确确认才允许重新开赛
    const existing = TournamentStorage.loadTournament(state.groupId);
    if ((state.rounds && state.rounds.length > 0) || (existing && existing.rounds && existing.rounds.length > 0)) {
      if (!confirm(`【${TournamentStorage.getGroupName(state.groupId)}】已有进行中的赛事及对阵记录。\n\n重新开始将覆盖并清空本组的所有历史对阵与比分，确定要继续吗？`)) {
        return;
      }
    }

    const title = els.setupTournamentTitle.value.trim() || `${TournamentStorage.getGroupName(state.groupId)} 积分赛`;
    state.title = title;

    // 构建选手列表
    state.players = names.map((name, idx) => ({
      id: idx + 1,
      name: name,
      initialSeed: idx + 1,
      status: 'active'
    }));

    // 生成第 1 轮编排
    try {
      const r1 = SwissEngine.generateSwissPairing(state.players, [], 1);
      state.rounds = [r1];
      state.currentRoundIndex = 0;
      state.status = 'in_progress';
      state.historyViewingRound = 1;

      saveState();
      renderApp();
      switchTab('tabPairing');
      const byeInfo = (names.length % 2 !== 0) ? '，含 1 人轮空获胜' : '';
      showToast(`比赛正式开始！已成功生成第 1 轮对阵 (${r1.pairings.length} 台${byeInfo})`, 'success');
      syncUrlState();
    } catch (err) {
      showToast('编排失败: ' + err.message, 'danger');
    }
  }

  /**
   * 切换赛事组别 (支持男子组、女子组与所有自定义组别)
   */
  function switchGroup(groupId, shouldSaveCurrent = true) {
    if (shouldSaveCurrent && !state.isSnapshot) {
      saveState();
    }

    // 退出快照查阅模式并清除相关 URL Hash
    if (state.isSnapshot) {
      state.isSnapshot = false;
      if (els.bannerSnapshotView) els.bannerSnapshotView.style.display = 'none';
      try {
        if (window.location.hash && (window.location.hash.includes('d=') || window.location.hash.includes('data='))) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.hash = '';
          window.history.replaceState(null, '', cleanUrl.toString());
        }
      } catch (e) {}
    }

    state.groupId = groupId;
    TournamentStorage.saveActiveGroup(groupId);

    // 重新渲染顶栏按钮高亮
    renderGroupSwitcher();

    const saved = TournamentStorage.loadTournament(groupId);
    if (saved && saved.players && saved.players.length > 0) {
      Object.assign(state, saved);
      state.groupId = groupId;
      state.isSnapshot = false;
      state.historyViewingRound = state.rounds.length || 1;
      renderApp();
      showToast(`已切换至【${TournamentStorage.getGroupName(groupId)}】比赛`, 'info');
    } else {
      // 当前组别尚未开始比赛
      state.title = `${TournamentStorage.getGroupName(groupId)} 积分赛`;
      state.status = 'setup';
      state.players = [];
      state.rounds = [];
      state.currentRoundIndex = 0;
      state.historyViewingRound = 1;
      state.isSnapshot = false;
      if (els.setupTournamentTitle) {
        els.setupTournamentTitle.value = state.title;
      }
      if (els.setupPlayerInput) {
        // 默认名单留空！由用户自行粘贴或录入
        els.setupPlayerInput.value = '';
      }
      renderApp();
      showToast(`已切换至【${TournamentStorage.getGroupName(groupId)}】，名单已留空，请输入或粘贴棋手名单`, 'info');
    }
    syncUrlState();
  }

  /**
   * 同步 URL 地址栏状态 (不刷新页面)
   */
  function syncUrlState() {
    if (state.isSnapshot) return; // 处于快照查阅模式时不覆盖 URL
    try {
      const url = new URL(window.location.href);
      if (state.groupId) {
        url.searchParams.set('group', state.groupId);
      }
      if (state.activeTab) {
        const tabShort = state.activeTab.replace(/^tab/, '').toLowerCase();
        url.searchParams.set('tab', tabShort);
      }
      if (state.rounds && state.rounds.length > 0) {
        const rNum = state.activeTab === 'tabHistory' ? (state.historyViewingRound || state.rounds.length) : state.rounds.length;
        url.searchParams.set('round', String(rNum));
      } else {
        url.searchParams.delete('round');
      }
      // 清空单次触发的临时参数
      url.searchParams.delete('sheet');
      url.searchParams.delete('title');
      url.searchParams.delete('players');
      window.history.replaceState(null, '', url.toString());
    } catch (e) {
      // ignore
    }
  }

  /**
   * 处理 URL 快照还原与深度链接参数
   */
  async function handleUrlSnapshotAndParams() {
    // 1. 检查 Hash 是否携带数据快照 (#d=... 或 #data=...)
    const hash = window.location.hash || '';
    if (hash.includes('d=') || hash.includes('data=')) {
      const match = hash.match(/[#&]?(d|data)=([^&]+)/);
      if (match && match[2]) {
        try {
          const rawHashStr = decodeURIComponent(match[2]);
          const decompressed = await TournamentStorage.decompressTournamentState(rawHashStr);
          const validation = TournamentStorage.validateTournamentData(decompressed);
          if (validation.valid && validation.sanitizedData && validation.sanitizedData.players && validation.sanitizedData.players.length > 0) {
            const sanitized = validation.sanitizedData;
            state.isSnapshot = true;
            state.isAdmin = false; // 快照链接默认以只读访客模式打开
            updateAuthUI();
            state.groupId = sanitized.groupId;
            state.title = sanitized.title;
            state.status = sanitized.status;
            state.players = sanitized.players;
            state.rounds = sanitized.rounds;
            state.currentRoundIndex = sanitized.currentRoundIndex;
            state.historyViewingRound = state.rounds.length || 1;

            const urlParams = new URLSearchParams(window.location.search);
            const reqRound = urlParams.get('round');
            if (reqRound) {
              const r = parseInt(reqRound, 10);
              if (!isNaN(r) && r >= 1) {
                state.historyViewingRound = r;
              }
            }
            const reqTab = urlParams.get('tab');
            if (reqTab) {
              const targetTab = reqTab.startsWith('tab') ? reqTab : ('tab' + reqTab.charAt(0).toUpperCase() + reqTab.slice(1));
              state.activeTab = targetTab;
            }

            renderGroupSwitcher();
            renderApp();
            switchTab(state.activeTab || 'tabPairing');

            if (els.bannerSnapshotView) {
              els.bannerSnapshotView.style.display = 'flex';
              if (els.snapshotViewDesc) {
                els.snapshotViewDesc.textContent = `【${state.title}】共 ${state.players.length} 人，已完成 ${state.rounds.length} 轮比赛`;
              }
            }

            if (urlParams.get('sheet') === '1') {
              openPrintSheetModal(state.historyViewingRound);
            }

            showToast('已成功通过分享快照载入比赛！当前为访客查阅模式。', 'success');
            return true;
          }
        } catch (e) {
          console.error('加载分享快照异常:', e);
        }
      }
    }

    // 2. 无快照时，检查 URL 搜索参数
    const urlParams = new URLSearchParams(window.location.search);
    const paramGroup = urlParams.get('group');
    const paramTitle = urlParams.get('title');
    const paramPlayers = urlParams.get('players');
    const paramRound = urlParams.get('round');
    const paramTab = urlParams.get('tab');
    const paramSheet = urlParams.get('sheet');

    const targetGroup = paramGroup || TournamentStorage.getActiveGroup() || 'default';
    switchGroup(targetGroup, false);

    // 如果是通过链接携带了自定义名单与标题 (Magic Link 快速开赛)
    if (paramTitle && state.status === 'setup' && els.setupTournamentTitle) {
      els.setupTournamentTitle.value = paramTitle;
      state.title = paramTitle;
    }
    if (paramPlayers && state.status === 'setup' && els.setupPlayerInput) {
      const pList = paramPlayers.split(/[,，|;]/).map(s => s.trim()).filter(Boolean);
      els.setupPlayerInput.value = pList.join('\n');
      showToast(`已通过链接快捷载入 ${pList.length} 名参赛选手！`, 'info');
    }

    if (paramRound) {
      const r = parseInt(paramRound, 10);
      if (!isNaN(r) && r >= 1) {
        state.historyViewingRound = Math.min(r, Math.max(1, state.rounds.length));
      }
    }

    if (paramTab) {
      const tabKey = paramTab.toLowerCase();
      let targetTab = 'tabPairing';
      if (tabKey === 'standings' || tabKey === 'tabstandings') targetTab = 'tabStandings';
      else if (tabKey === 'history' || tabKey === 'tabhistory') targetTab = 'tabHistory';
      else if (tabKey === 'players' || tabKey === 'tabplayers') targetTab = 'tabPlayers';
      else if (tabKey === 'pairing' || tabKey === 'tabpairing') targetTab = 'tabPairing';
      switchTab(targetTab);
    }

    if (paramSheet === '1') {
      openPrintSheetModal(state.historyViewingRound);
    }

    return true;
  }

  /**
   * 将当前查阅的快照保存并接管到本地浏览器
   */
  function handleTakeoverSnapshot() {
    if (confirm(`是否将当前查阅的【${state.title}】保存至您的浏览器本地？\n\n保存后您可以在当前设备继续录入后续比分并进行编排。`)) {
      // 1. 彻底退出快照状态 (在持久化前更新)
      state.isSnapshot = false;

      // 2. 如果是自定义组别，确保将其注册到本地组别列表
      const groups = TournamentStorage.getGroups();
      if (!groups.some(g => g.id === state.groupId)) {
        groups.push({
          id: state.groupId,
          name: state.title ? state.title.slice(0, 15) : '已接管赛事'
        });
        TournamentStorage.saveGroups(groups);
      }

      // 3. 持久化纯净领域数据 (绝不持久化 isSnapshot 标记)
      const domainData = {
        groupId: state.groupId,
        title: state.title,
        status: state.status,
        players: state.players,
        rounds: state.rounds,
        currentRoundIndex: state.currentRoundIndex
      };
      const saved = TournamentStorage.saveTournament(domainData, state.groupId);

      // 4. 清除 URL Hash 中的 #d= 或 #data=，防止刷新后重载旧快照
      try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.hash = '';
        cleanUrl.searchParams.set('group', state.groupId);
        window.history.replaceState(null, '', cleanUrl.toString());
      } catch (e) {}

      // 5. 更新 UI 界面
      if (els.bannerSnapshotView) els.bannerSnapshotView.style.display = 'none';
      renderGroupSwitcher();
      updateAuthUI();

      if (saved) {
        showToast('🎉 已成功接管并保存至本地浏览器！若需录入比分或进行编排，请点击右上角登录裁判员。', 'success');
      } else {
        showToast('⚠️ 本地存储容量已满，保存可能未生效！请导出 JSON 文件备份。', 'danger');
      }
    }
  }

  /**
   * 动态渲染顶栏赛事组别 Pill 切换器 (支持男子组、女子组与用户自定义新建组)
   */
  function renderGroupSwitcher() {
    if (!els.headerGroupSwitcher) return;
    const groups = TournamentStorage.getGroups();
    els.headerGroupSwitcher.innerHTML = '';

    groups.forEach(g => {
      const btn = document.createElement('button');
      btn.className = 'group-pill' + (g.id === state.groupId ? ' active' : '');
      btn.textContent = g.name;
      btn.dataset.groupId = g.id;
      btn.title = `切换至 ${g.name} (各组独立存储、编排与计分)`;
      btn.addEventListener('click', () => {
        if (state.groupId !== g.id) {
          switchGroup(g.id);
        }
      });
      els.headerGroupSwitcher.appendChild(btn);
    });

    // ➕ 新建组别/赛事按钮
    const btnAdd = document.createElement('button');
    btnAdd.className = 'group-pill-add';
    btnAdd.title = '新建组别或自定义赛事 (如：少儿组、U10组、公开组)';
    btnAdd.innerHTML = '<span>➕</span> <span>新建组</span>';
    btnAdd.addEventListener('click', handleCreateNewGroup);
    els.headerGroupSwitcher.appendChild(btnAdd);

    // 控制模态框中的删除组别按钮展示 (当总组别数大于1时允许删除当前组)
    if (els.boxDeleteCustomGroup) {
      const allGroups = TournamentStorage.getGroups();
      if (allGroups.length > 1) {
        els.boxDeleteCustomGroup.style.display = 'block';
      } else {
        els.boxDeleteCustomGroup.style.display = 'none';
      }
    }
  }

  function handleCreateNewGroup() {
    const name = prompt('请输入新比赛或组别名称 (例如：少儿组、U10精英组、公开组)：');
    if (!name || !name.trim()) return;
    const cleanName = name.trim();
    const newGroup = TournamentStorage.addGroup(cleanName);
    if (newGroup) {
      renderGroupSwitcher();
      switchGroup(newGroup.id);
      showToast(`已成功创建【${cleanName}】，请录入选手名单开启编排！`, 'success');
    }
  }

  function handleDeleteCustomGroup() {
    if (!requireAdmin('删除当前组别')) return;
    const allGroups = TournamentStorage.getGroups();
    if (allGroups.length <= 1) {
      showToast('至少保留一个赛事组别，无法删除！', 'warning');
      return;
    }
    const targetGroupId = state.groupId;
    const gName = TournamentStorage.getGroupName(targetGroupId);
    if (confirm(`确定要彻底删除【${gName}】及其所有历史轮次数据吗？此操作无法撤销！`)) {
      const remaining = TournamentStorage.deleteGroup(targetGroupId);
      closeModal(els.modalDataManage);
      const nextGroupId = (remaining[0] && remaining[0].id) || 'default';
      // 切组时传入 false，避免在切换前又将已删除的组数据重新保存回 localStorage
      switchGroup(nextGroupId, false);
      renderGroupSwitcher();
      showToast(`已删除组别【${gName}】`, 'info');
    }
  }

  /**
   * 载入名单预设 (仅填充名单输入框，严禁修改当前组别 state.groupId，防止跨组覆盖)
   */
  function loadRosterPreset(type) {
    if (type === 'men') {
      if (els.setupPlayerInput) {
        els.setupPlayerInput.value = SampleTournamentData.menPlayerNames.join('\n');
      }
      showToast('已填入男子组参考名单 (共 20 人)！', 'info');
    } else if (type === 'women') {
      if (els.setupPlayerInput) {
        els.setupPlayerInput.value = SampleTournamentData.womenPlayerNames.join('\n');
      }
      showToast('已填入女子组参考名单 (共 7 人)！', 'info');
    }
  }

  /**
   * 载入预置演示选手名单
   */
  function loadDemoPreset(count) {
    const names8 = [
      '张伟', '王芳', '李明', '刘洋',
      '陈晨', '赵磊', '孙悦', '周强'
    ];
    const names12 = [
      '张伟', '王芳', '李明', '刘洋',
      '陈晨', '赵磊', '孙悦', '周强',
      '吴浩', '郭敏', '黄宇', '徐静'
    ];
    const names20 = [
      '胡安蓬', '朱乐逸', '张承楷', '邱子涵', '彭奕超',
      '王般若', '韩翼阳', '颜旋', '李奥', '马睿含',
      '梅宇涵', '王子骞', '曾元昊', '陈宇拓', '陈豫谦',
      '赵胤训', '梅书涵', '程佑滔', '徐伯逸', '张隽恺'
    ];

    let list = names8;
    if (count === 20) list = names20;
    else if (count === 12) list = names12;

    if (els.setupPlayerInput) {
      els.setupPlayerInput.value = list.join('\n');
    }
    showToast(`已填入 ${count} 人选手名单，点击下方按钮即可一键开始！`, 'info');
  }

  /**
   * 中途增加选手 (支持0分入场，自动侦测空格、换行、逗号等批量增加)
   */
  function handleAddPlayer(rawInput) {
    if (!requireAdmin('中途增加选手')) return false;

    const names = parsePlayerNames(rawInput);
    if (!names || names.length === 0) {
      showToast('请输入有效的选手姓名！', 'warning');
      return false;
    }

    const added = [];
    const skipped = [];

    let maxId = state.players.reduce((max, p) => Math.max(max, p.id || 0), 0);

    names.forEach(cleanName => {
      // 检查当前比赛是否已有名为 cleanName 的选手
      const exists = state.players.some(p => p.name === cleanName);
      if (exists) {
        skipped.push(cleanName);
        return;
      }

      maxId++;
      const newPlayer = {
        id: maxId,
        name: cleanName,
        initialSeed: maxId,
        status: 'active'
      };

      state.players.push(newPlayer);
      added.push(cleanName);
    });

    if (added.length === 0) {
      if (skipped.length > 0) {
        showToast(`选手 ${skipped.map(n => `【${n}】`).join('、')} 已在参赛列表中，请勿重复添加！`, 'warning');
      }
      return false;
    }

    saveState();
    updateHeaderStats();

    if (state.activeTab === 'tabPlayers') {
      renderPlayersManage();
    } else if (state.activeTab === 'tabStandings') {
      renderStandings();
    }

    if (added.length === 1) {
      showToast(`🎉 选手【${added[0]}】已成功入场 (初始0分)！将在下一轮自动配对。`, 'success');
    } else {
      const skipNote = skipped.length > 0 ? ` (已跳过 ${skipped.length} 名重复)` : '';
      showToast(`🎉 成功批量增补 ${added.length} 名选手入场 (均初始0分)${skipNote}！将在下一轮自动配对。`, 'success');
    }

    return true;
  }

  function handleModalAddPlayer() {
    const raw = els.modalPlayerNameInput ? els.modalPlayerNameInput.value : '';
    if (handleAddPlayer(raw)) {
      if (els.modalPlayerNameInput) els.modalPlayerNameInput.value = '';
      closeModal(els.modalAddPlayer);
    }
  }

  function handleFormAddPlayer(e) {
    if (e && e.preventDefault) e.preventDefault();
    const raw = els.inputNewPlayerName ? els.inputNewPlayerName.value : '';
    if (handleAddPlayer(raw)) {
      if (els.inputNewPlayerName) els.inputNewPlayerName.value = '';
    }
  }

  /**
   * 打开请假管理模态框
   */
  function openLeaveModal() {
    if (!requireAdmin('调整请假名单')) return;

    const currentRoundNum = state.rounds.length;
    let html = '';

    state.players.forEach(p => {
      const isLeave = (p.status === 'leave');
      html += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-surface);">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-weight: 600;">${escapeHtml(p.name)}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">(当前分: ${getPlayerScore(p.id)}分)</span>
          </div>
          <div>
            <button class="btn btn-sm ${isLeave ? 'btn-warning' : 'btn-outline'}" data-toggle-leave-id="${p.id}">
              ${isLeave ? '⏸️ 请假休战中' : '🟢 正常参赛'}
            </button>
          </div>
        </div>
      `;
    });

    els.modalLeavePlayerList.innerHTML = html;

    // 绑定模态框内点击切换
    els.modalLeavePlayerList.querySelectorAll('[data-toggle-leave-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = parseInt(btn.dataset.toggleLeaveId, 10);
        const player = state.players.find(p => p.id === pid);
        if (player) {
          player.status = (player.status === 'leave') ? 'active' : 'leave';
          openLeaveModal(); // 刷新列表渲染
        }
      });
    });

    openModal(els.modalManageLeave);
  }

  function handleSaveLeaveModal() {
    saveState();
    closeModal(els.modalManageLeave);
    renderApp();
    showToast('已更新选手请假状态！', 'info');
  }

  function handleSetAllActive() {
    if (!requireAdmin('恢复全部选手参赛')) return;

    state.players.forEach(p => { p.status = 'active'; });
    saveState();
    renderApp();
    showToast('所有选手已恢复为正常参赛状态！', 'success');
  }

  /**
   * 切换单个选手请假状态
   */
  function togglePlayerLeave(playerId) {
    if (!requireAdmin('切换选手请假状态')) return;

    const p = state.players.find(item => item.id === playerId);
    if (!p) return;
    p.status = (p.status === 'leave') ? 'active' : 'leave';
    saveState();
    renderApp();
    const statusText = p.status === 'leave' ? '本轮请假 (不参加配对)' : '恢复正常参赛';
    showToast(`选手【${p.name}】已设置为: ${statusText}`, 'info');
  }

  /**
   * 获取某位选手的当前即时积分
   */
  function getPlayerScore(playerId) {
    const standings = SwissEngine.calculateStandings(state.players, state.rounds);
    const found = standings.find(s => s.id === playerId);
    return found ? found.score : 0;
  }

  /**
   * 渲染当前轮次对阵卡片与比分操作
   */
  function renderPairings() {
    if (!state.rounds || state.rounds.length === 0) {
      els.pairingsContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">暂无对阵数据</div>';
      return;
    }

    const currentRound = state.rounds[state.currentRoundIndex];
    if (!currentRound) return;

    const roundNum = currentRound.roundNumber;
    els.currentRoundTitle.textContent = `第 ${roundNum} 轮 对阵编排与成绩录入`;
    els.currentRoundBoardCount.textContent = `共 ${currentRound.pairings.length} 台`;

    // 检查请假选手
    const leavePlayers = state.players.filter(p => p.status === 'leave');
    if (leavePlayers.length > 0) {
      els.bannerLeavePlayers.style.display = 'flex';
      els.bannerLeaveNames.textContent = leavePlayers.map(p => p.name).join('、');
    } else {
      els.bannerLeavePlayers.style.display = 'none';
    }

    // 检查是否有配对警告
    if (currentRound.warning) {
      els.bannerPairingNotice.style.display = 'flex';
      els.bannerPairingNoticeText.textContent = currentRound.warning;
    } else {
      els.bannerPairingNotice.style.display = 'none';
    }

    // 渲染各台次卡片
    let html = '';
    let completedBoards = 0;

    // 访客模式提示条
    if (!state.isAdmin) {
      html += `
        <div class="visitor-banner">
          <div>
            <span>👀 <strong>访客只读模式：</strong>您可查阅对阵与打印签单，无权填写赛果。</span>
          </div>
          <button class="btn btn-primary btn-sm" id="btnBannerLogin">🔐 裁判登录</button>
        </div>
      `;
    }

    currentRound.pairings.forEach((match, idx) => {
      if (match.result) {
        completedBoards++;
      }

      // 轮空台次卡片
      if (match.isBye) {
        html += `
          <div class="board-card bye-card">
            <div class="board-label">
              <span class="board-number">第 ${match.board} 台</span>
              <span class="board-sub">轮空台</span>
            </div>
            <div class="player-side white">
              <span class="piece-dot" title="轮空执白">⚪</span>
              <div class="player-details">
                <span class="player-name">${escapeHtml(match.playerName)}</span>
                <span class="player-meta">
                  <span>当前分:</span>
                  <span class="meta-score">${match.playerScore}分</span>
                </span>
              </div>
            </div>
            <div>
              <span class="bye-tag">🎉 轮空自动获胜 (+1.0分)</span>
            </div>
          </div>
        `;
        return;
      }

      // 正常对战台次
      const isWWin = (match.result === '1-0');
      const isDraw = (match.result === '0.5-0.5' || match.result === '1/2-1/2');
      const isBWin = (match.result === '0-1');
      const hasResult = !!match.result;

      // 获取双方历史颜色提示
      const whiteStats = SwissEngine.getPlayerColorStats(match.whiteId, state.rounds.slice(0, state.currentRoundIndex));
      const blackStats = SwissEngine.getPlayerColorStats(match.blackId, state.rounds.slice(0, state.currentRoundIndex));

      const whiteStreakText = whiteStats.consecutiveColor ? `(前${whiteStats.consecutiveCount}轮${whiteStats.consecutiveColor === 'W' ? '白' : '黑'})` : '';
      const blackStreakText = blackStats.consecutiveColor ? `(前${blackStats.consecutiveCount}轮${blackStats.consecutiveColor === 'W' ? '白' : '黑'})` : '';

      // 比分控制区：管理员可录入，访客只读
      let controlsHtml = '';
      if (state.isAdmin) {
        controlsHtml = `
          <div class="match-result-controls">
            <button class="result-btn ${isWWin ? 'active-white-win' : ''}" 
                    data-board="${match.board}" data-set-result="1-0" title="白胜 (1 - 0)">
              1 - 0
            </button>
            <button class="result-btn ${isDraw ? 'active-draw' : ''}" 
                    data-board="${match.board}" data-set-result="0.5-0.5" title="和棋 (½ - ½)">
              ½ - ½
            </button>
            <button class="result-btn ${isBWin ? 'active-black-win' : ''}" 
                    data-board="${match.board}" data-set-result="0-1" title="黑胜 (0 - 1)">
              0 - 1
            </button>
            ${hasResult ? `
              <button class="btn-clear-result" data-board="${match.board}" data-clear-result="true" title="撤销/清除该台结果">
                ✕
              </button>
            ` : ''}
          </div>
        `;
      } else {
        controlsHtml = `
          <div class="match-result-controls">
            ${hasResult ? `
              <span class="badge" style="background:var(--primary-light); color:var(--primary); font-weight:800; font-size:1.05rem; padding:0.35rem 0.75rem;" title="已录入赛果">
                ${match.result}
              </span>
            ` : `
              <span class="badge" style="background:var(--bg-surface-subtle); color:var(--text-muted); font-size:0.8rem; padding:0.35rem 0.6rem;">
                对局进行中
              </span>
            `}
          </div>
        `;
      }

      html += `
        <div class="board-card ${hasResult ? 'has-result' : ''}" data-board="${match.board}">
          <div class="board-label">
            <span class="board-number">第 ${match.board} 台</span>
            <span class="board-sub">${hasResult ? '已出结果' : '进行中'}</span>
          </div>

          <!-- 白方 -->
          <div class="player-side white">
            <span class="piece-dot" title="白方执先">⚪</span>
            <div class="player-details">
              <div class="player-name" title="${escapeHtml(match.whiteName)}">${escapeHtml(match.whiteName)}</div>
              <div class="player-meta">
                <span class="meta-score">${match.whiteScore}分</span>
                <span class="meta-streak">${whiteStreakText}</span>
              </div>
            </div>
          </div>

          <!-- 比分录入操作群 / 状态展示 -->
          ${controlsHtml}

          <!-- 黑方 -->
          <div class="player-side black">
            <span class="piece-dot" title="黑方后手">⚫</span>
            <div class="player-details">
              <div class="player-name" title="${escapeHtml(match.blackName)}">${escapeHtml(match.blackName)}</div>
              <div class="player-meta">
                <span class="meta-score">${match.blackScore}分</span>
                <span class="meta-streak">${blackStreakText}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    els.pairingsContainer.innerHTML = html;

    const btnBannerLogin = document.getElementById('btnBannerLogin');
    if (btnBannerLogin) {
      btnBannerLogin.addEventListener('click', openLoginModal);
    }

    // 更新完赛横幅与推进按钮状态
    const totalBoards = currentRound.pairings.length;
    els.resultProgressText.textContent = `${completedBoards} / ${totalBoards} 台已完成`;
    const isAllDone = (completedBoards === totalBoards && totalBoards > 0);

    if (state.status === 'finished') {
      if (els.bannerTournamentFinished) els.bannerTournamentFinished.style.display = 'flex';
      if (els.btnReopenTournament) els.btnReopenTournament.style.display = state.isAdmin ? 'inline-block' : 'none';
      if (els.btnFinishRoundAndNext) els.btnFinishRoundAndNext.style.display = 'none';
      if (els.btnRegenerateCurrentRound) els.btnRegenerateCurrentRound.style.display = 'none';
      if (els.btnFinishTournament) els.btnFinishTournament.style.display = 'none';
    } else {
      if (els.bannerTournamentFinished) els.bannerTournamentFinished.style.display = 'none';
      if (els.btnFinishRoundAndNext) els.btnFinishRoundAndNext.style.display = 'inline-flex';
      if (els.btnRegenerateCurrentRound) els.btnRegenerateCurrentRound.style.display = 'inline-flex';

      if (isAllDone) {
        els.btnFinishRoundAndNext.classList.remove('btn-outline');
        els.btnFinishRoundAndNext.classList.add('btn-success');
        if (els.btnFinishTournament) els.btnFinishTournament.style.display = 'inline-flex';
      } else {
        els.btnFinishRoundAndNext.classList.add('btn-outline');
        els.btnFinishRoundAndNext.classList.remove('btn-success');
        if (els.btnFinishTournament) els.btnFinishTournament.style.display = 'none';
      }
    }

    // 绑定比分按钮点击事件
    els.pairingsContainer.querySelectorAll('[data-set-result]').forEach(btn => {
      btn.addEventListener('click', () => {
        const boardNum = parseInt(btn.dataset.board, 10);
        const resultVal = btn.dataset.setResult;
        setMatchResult(state.currentRoundIndex, boardNum, resultVal);
      });
    });

    els.pairingsContainer.querySelectorAll('[data-clear-result]').forEach(btn => {
      btn.addEventListener('click', () => {
        const boardNum = parseInt(btn.dataset.board, 10);
        setMatchResult(state.currentRoundIndex, boardNum, null);
      });
    });
  }

  /**
   * 设置某一轮某一台次的对局结果
   */
  function setMatchResult(roundIdx, boardNumber, result) {
    if (!requireAdmin('录入比赛赛果')) return;

    const round = state.rounds[roundIdx];
    if (!round) return;

    const match = round.pairings.find(m => m.board === boardNumber);
    if (!match) return;

    match.result = result;
    saveState();
    renderPairings();

    // 如果处于榜单页或管理页，同步刷新数据
    if (state.activeTab === 'tabStandings') {
      renderStandings();
    }
  }

  /**
   * 重新编排当前轮次 (在尚未开始或需要调整人员时)
   */
  function handleRegenerateCurrentRound() {
    if (!requireAdmin('重新编排本轮')) return;

    const currentRound = state.rounds[state.currentRoundIndex];
    if (!currentRound) return;

    // 检查是否有已录入的比分
    const hasAnyResult = currentRound.pairings.some(m => !m.isBye && m.result !== null);
    if (hasAnyResult) {
      if (!confirm('当前轮次已有部分台次录入了比赛结果。重新编排将清空本轮全部台次结果并重新匹配，确定重新编排吗？')) {
        return;
      }
    }

    const roundNum = currentRound.roundNumber;
    const historyRounds = state.rounds.slice(0, state.currentRoundIndex);

    try {
      const newPairing = SwissEngine.generateSwissPairing(state.players, historyRounds, roundNum);
      state.rounds[state.currentRoundIndex] = newPairing;
      saveState();
      renderApp();
      showToast(`第 ${roundNum} 轮已重新编排完成！`, 'success');
    } catch (err) {
      showToast('重新编排失败: ' + err.message, 'danger');
    }
  }

  /**
   * 结束本轮并生成下一轮编排
   */
  function handleFinishRoundAndNext() {
    if (!requireAdmin('结束本轮并生成下一轮编排')) return;

    const currentRound = state.rounds[state.currentRoundIndex];
    if (!currentRound) return;

    // 检查是否有未录入比分的台次
    const uncompleted = currentRound.pairings.filter(m => !m.result);
    if (uncompleted.length > 0) {
      const msg = `当前第 ${currentRound.roundNumber} 轮还有 ${uncompleted.length} 台尚未录入结果 (第 ${uncompleted.map(m => m.board).join('、')} 台)。\n\n是否仍然强制结束本轮并生成下一轮？\n(未出结果的台次双方将正式记为双方弃权 0-0)`;
      if (!confirm(msg)) {
        return;
      }
      // 明确记录为双方弃权 0-0，拒绝 null 遗留
      uncompleted.forEach(m => {
        m.result = '0-0';
      });
    }

    const nextRoundNum = state.rounds.length + 1;

    try {
      const nextPairing = SwissEngine.generateSwissPairing(state.players, state.rounds, nextRoundNum);
      state.rounds.push(nextPairing);
      state.currentRoundIndex = state.rounds.length - 1;
      state.historyViewingRound = state.rounds.length;

      saveState();
      renderApp();
      switchTab('tabPairing');
      showToast(`🎉 成功完成第 ${currentRound.roundNumber} 轮！已生成第 ${nextRoundNum} 轮瑞士制编排。`, 'success');
    } catch (err) {
      showToast('生成下一轮失败: ' + err.message, 'danger');
    }
  }

  /**
   * 正常结束比赛 (完赛)
   */
  function handleFinishTournament() {
    if (!requireAdmin('结束比赛公布最终名次')) return;

    if (state.status === 'setup' || !state.rounds || state.rounds.length === 0) {
      showToast('赛事尚未开始，无法完赛！', 'warning');
      return;
    }

    const currentRound = state.rounds[state.currentRoundIndex];
    if (currentRound) {
      const uncompleted = currentRound.pairings.filter(m => !m.result);
      if (uncompleted.length > 0) {
        if (!confirm(`第 ${currentRound.roundNumber} 轮还有 ${uncompleted.length} 台未录入赛果。\n\n完赛后未录入的台次将按双方弃权 (0-0) 记录，确定现在结束比赛吗？`)) {
          return;
        }
        uncompleted.forEach(m => {
          m.result = '0-0';
        });
      }
    }

    if (confirm(`确定要正式结束【${state.title}】并公布最终名次吗？\n\n完赛后将锁定全部轮次比分，并自动生成最终名次榜单。`)) {
      state.status = 'finished';
      saveState();
      renderApp();
      switchTab('tabStandings');
      showToast('🎉 恭喜！赛事已圆满完赛，最终名次已正式发布！', 'success');
    }
  }

  /**
   * 恢复比赛进行中 (撤销完赛状态)
   */
  function handleReopenTournament() {
    if (!requireAdmin('恢复比赛进行中')) return;
    if (state.status !== 'finished') return;

    if (confirm('是否将当前赛事从【已完赛】恢复为【进行中】状态？\n恢复后裁判员可继续修改比分或生成后续轮次。')) {
      state.status = 'in_progress';
      saveState();
      renderApp();
      showToast('比赛状态已恢复为进行中！', 'info');
    }
  }

  /**
   * 渲染排行榜
   */
  function renderStandings() {
    const standings = SwissEngine.calculateStandings(state.players, state.rounds);
    els.standingsPlayerTotal.textContent = `共 ${standings.length} 人`;

    let html = '';
    standings.forEach(s => {
      let rankBadgeClass = 'rank-badge';
      let rankText = s.rank;
      if (s.rank === 1) {
        rankBadgeClass += ' rank-1';
        rankText = '🥇';
      } else if (s.rank === 2) {
        rankBadgeClass += ' rank-2';
        rankText = '🥈';
      } else if (s.rank === 3) {
        rankBadgeClass += ' rank-3';
        rankText = '🥉';
      }

      const statusTag = s.status === 'leave' 
        ? '<span class="badge badge-leave">请假休战</span>' 
        : '<span class="badge" style="background-color: var(--success-light); color: var(--success);">正常参赛</span>';

      // 历史战绩徽章
      let historyChipsHtml = '';
      s.matchResults.forEach(m => {
        let chipClass = 'history-chip';
        let chipText = `R${m.round}: `;
        if (m.result === '胜' || m.result === '轮空胜') {
          chipClass += ' chip-win';
          chipText += `胜(${m.color})`;
        } else if (m.result === '和') {
          chipClass += ' chip-draw';
          chipText += `和(${m.color})`;
        } else if (m.result === '负') {
          chipClass += ' chip-loss';
          chipText += `负(${m.color})`;
        } else {
          chipClass += ' chip-leave';
          chipText += `休`;
        }
        historyChipsHtml += `<span class="${chipClass}" title="第${m.round}轮 对手:${escapeHtml(m.opponentName || '无')}">${chipText}</span>`;
      });

      const colorText = `${s.colorStats.whites}白 / ${s.colorStats.blacks}黑`;

      html += `
        <tr>
          <td><span class="${rankBadgeClass}">${rankText}</span></td>
          <td style="font-weight: 600;">${escapeHtml(s.name)}</td>
          <td>${statusTag}</td>
          <td><span class="score-highlight">${s.score}</span></td>
          <td><strong>${s.buchholz}</strong></td>
          <td>${s.sonnebornBerger}</td>
          <td>${s.wins}</td>
          <td style="font-size: 0.8rem; color: var(--text-secondary);">${colorText}</td>
          <td>
            <div class="match-history-chips">
              ${historyChipsHtml || '<span style="color: var(--text-muted); font-size: 0.75rem;">-</span>'}
            </div>
          </td>
        </tr>
      `;
    });

    els.standingsTableBody.innerHTML = html;
  }

  /**
   * 渲染选手管理与请假页面
   */
  function renderPlayersManage() {
    els.managePlayerCount.textContent = `${state.players.length}人`;
    const standings = SwissEngine.calculateStandings(state.players, state.rounds);
    const scoreMap = {};
    standings.forEach(s => { scoreMap[s.id] = s.score; });

    let html = '';
    state.players.forEach((p, idx) => {
      const isLeave = (p.status === 'leave');
      const score = scoreMap[p.id] !== undefined ? scoreMap[p.id] : 0;
      const colorStats = SwissEngine.getPlayerColorStats(p.id, state.rounds);
      const colorText = `${colorStats.whites}白 / ${colorStats.blacks}黑`;

      html += `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-weight: 600;">${escapeHtml(p.name)}</td>
          <td><span class="score-highlight">${score}分</span></td>
          <td>
            ${isLeave 
              ? '<span class="badge badge-leave">⏸️ 本轮请假 (不配对)</span>' 
              : '<span class="badge" style="background-color: var(--success-light); color: var(--success);">🟢 正常参赛</span>'
            }
          </td>
          <td>
            <button class="btn btn-sm ${isLeave ? 'btn-success' : 'btn-warning'}" data-action-toggle-leave="${p.id}">
              ${isLeave ? '恢复参赛' : '设为请假'}
            </button>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-secondary);">${colorText}</td>
          <td>
            <button class="btn btn-outline btn-sm" style="color: var(--danger);" data-action-remove-player="${p.id}" title="只有尚未参与对局的新选手或准备阶段可删除">
              移除
            </button>
          </td>
        </tr>
      `;
    });

    els.playersManageTableBody.innerHTML = html;

    // 绑定行操作
    els.playersManageTableBody.querySelectorAll('[data-action-toggle-leave]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = parseInt(btn.dataset.actionToggleLeave, 10);
        togglePlayerLeave(pid);
        renderPlayersManage();
      });
    });

    els.playersManageTableBody.querySelectorAll('[data-action-remove-player]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = parseInt(btn.dataset.actionRemovePlayer, 10);
        handleRemovePlayer(pid);
      });
    });
  }

  /**
   * 移除选手 (仅允许在准备阶段或选手未下过棋时)
   */
  function handleRemovePlayer(playerId) {
    if (!requireAdmin('移除选手')) return;

    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    // 检查是否有对局记录
    let playedAny = false;
    for (const r of state.rounds) {
      for (const m of r.pairings) {
        if (m.whiteId === playerId || m.blackId === playerId || (m.isBye && m.playerId === playerId)) {
          playedAny = true;
          break;
        }
      }
      if (playedAny) break;
    }

    if (playedAny) {
      alert(`选手【${player.name}】已在历史轮次中有对局记录，不能直接删除！\n\n如果该选手后续不再参赛，请将其设为【请假休战】，系统将不再对其进行配对。`);
      return;
    }

    if (confirm(`确定要从名单中移除选手【${player.name}】吗？`)) {
      state.players = state.players.filter(p => p.id !== playerId);
      saveState();
      renderApp();
      showToast(`选手【${player.name}】已移除`, 'info');
    }
  }

  /**
   * 渲染轮次历史
   */
  function renderHistory() {
    if (!state.rounds || state.rounds.length === 0) {
      els.historyRoundContent.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">暂无历史对阵数据</div>';
      els.historyRoundSelectContainer.innerHTML = '';
      return;
    }

    // 渲染轮次选择按钮
    let btnHtml = '';
    state.rounds.forEach((r, idx) => {
      const rNum = idx + 1;
      const isActive = (rNum === state.historyViewingRound);
      btnHtml += `
        <button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}" data-history-round="${rNum}">
          第 ${rNum} 轮
        </button>
      `;
    });
    els.historyRoundSelectContainer.innerHTML = btnHtml;

    els.historyRoundSelectContainer.querySelectorAll('[data-history-round]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.historyViewingRound = parseInt(btn.dataset.historyRound, 10);
        renderHistory();
        syncUrlState();
      });
    });

    // 渲染所选轮次详情
    const viewRound = state.rounds[state.historyViewingRound - 1];
    if (!viewRound) return;

    let tableHtml = `
      <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 1.05rem;">第 ${viewRound.roundNumber} 轮对阵与最终成绩</h3>
        <span class="badge badge-round">共 ${viewRound.pairings.length} 台</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 70px;">台次</th>
              <th>白方棋手</th>
              <th style="width: 130px; text-align: center;">比赛比分</th>
              <th>黑方棋手</th>
              <th style="width: 150px; text-align: center;">${state.isAdmin ? '裁判纠错修改' : '状态'}</th>
            </tr>
          </thead>
          <tbody>
    `;

    viewRound.pairings.forEach(m => {
      if (m.isBye) {
        tableHtml += `
          <tr>
            <td><strong>第 ${m.board} 台</strong></td>
            <td colspan="3" style="color: var(--warning); font-weight: 600;">
              🎉 <strong>${escapeHtml(m.playerName)}</strong> (轮空胜 +1.0分)
            </td>
            <td style="text-align: center;">-</td>
          </tr>
        `;
        return;
      }

      const resText = m.result ? m.result : '进行中/未录入';
      tableHtml += `
        <tr>
          <td><strong>第 ${m.board} 台</strong></td>
          <td>⚪(白) <strong>${escapeHtml(m.whiteName)}</strong></td>
          <td style="text-align: center; font-weight: 700; font-size: 1rem; color: var(--primary);">
            ${resText}
          </td>
          <td>⚫(黑) <strong>${escapeHtml(m.blackName)}</strong></td>
          <td style="text-align: center;">
            ${state.isAdmin ? `
            <div style="display: flex; gap: 0.25rem; justify-content: center;">
              <button class="btn btn-sm btn-outline" data-history-set-result="1-0" data-round="${viewRound.roundNumber}" data-board="${m.board}">白胜</button>
              <button class="btn btn-sm btn-outline" data-history-set-result="0.5-0.5" data-round="${viewRound.roundNumber}" data-board="${m.board}">和棋</button>
              <button class="btn btn-sm btn-outline" data-history-set-result="0-1" data-round="${viewRound.roundNumber}" data-board="${m.board}">黑胜</button>
            </div>
            ` : `
              <span style="font-size: 0.8rem; color: var(--text-muted);">只读</span>
            `}
          </td>
        </tr>
      `;
    });

    tableHtml += `
          </tbody>
        </table>
      </div>
    `;

    els.historyRoundContent.innerHTML = tableHtml;

    // 历史改分事件
    els.historyRoundContent.querySelectorAll('[data-history-set-result]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!requireAdmin('修改往轮比赛赛果')) return;
        const rNum = parseInt(btn.dataset.round, 10);
        const bNum = parseInt(btn.dataset.board, 10);
        const resVal = btn.dataset.historySetResult;
        setMatchResult(rNum - 1, bNum, resVal);
        renderHistory();
        const hasSubsequent = (rNum < state.rounds.length);
        if (hasSubsequent) {
          showToast(`已更正第 ${rNum} 轮 第 ${bNum} 台赛果为 ${resVal}！\n⚠️ 提醒：后续轮次保留既有排阵，总分与破同分已联动更新。`, 'warning');
        } else {
          showToast(`已更新第 ${rNum} 轮 第 ${bNum} 台比分为 ${resVal}`, 'success');
        }
      });
    });
  }

  /**
   * 整体应用渲染更新
   */
  function renderApp() {
    updateHeaderStats();

    if (state.status === 'setup') {
      els.viewSetup.style.display = 'block';
      els.mainNavTabs.style.display = 'none';
      els.tabPanels.forEach(p => {
        if (p.id !== 'viewSetup') p.style.display = 'none';
      });
    } else {
      els.viewSetup.style.display = 'none';
      els.mainNavTabs.style.display = 'block';
      switchTab(state.activeTab || 'tabPairing');
    }
  }

  /**
   * 更新顶栏比赛状态与人数徽章
   */
  function updateHeaderStats() {
    els.appHeaderTitle.querySelector('span').textContent = state.title;
    els.printTitle.textContent = state.title;

    if (state.status === 'setup') {
      els.badgeRoundStatus.textContent = '准备中';
      els.badgeRoundStatus.className = 'badge badge-round';
      els.badgePlayerCount.textContent = `选手: ${state.players.length}人`;
      els.badgeLeaveCount.style.display = 'none';
    } else if (state.status === 'finished') {
      els.badgeRoundStatus.textContent = `🏆 已完赛 (共 ${state.rounds.length} 轮)`;
      els.badgeRoundStatus.className = 'badge badge-round badge-finished';
      els.printSubtitle.textContent = `最终成绩总榜单 (共 ${state.rounds.length} 轮)`;
      const activeCount = state.players.filter(p => p.status !== 'leave').length;
      els.badgePlayerCount.textContent = `参赛: ${activeCount}人`;
      els.badgeLeaveCount.style.display = 'none';
    } else {
      const currentR = state.rounds[state.currentRoundIndex];
      const rNum = currentR ? currentR.roundNumber : state.rounds.length;
      els.badgeRoundStatus.textContent = `第 ${rNum} 轮 进行中`;
      els.badgeRoundStatus.className = 'badge badge-round';
      els.printSubtitle.textContent = `第 ${rNum} 轮对阵单 / 实时成绩单`;

      const activeCount = state.players.filter(p => p.status !== 'leave').length;
      const leaveCount = state.players.filter(p => p.status === 'leave').length;

      els.badgePlayerCount.textContent = `参赛: ${activeCount}人`;
      if (leaveCount > 0) {
        els.badgeLeaveCount.style.display = 'inline-flex';
        els.badgeLeaveCount.textContent = `请假: ${leaveCount}人`;
      } else {
        els.badgeLeaveCount.style.display = 'none';
      }
    }
  }

  /**
   * 保存当前状态到 LocalStorage (带容量与失败检查)
   */
  function saveState() {
    if (state.isSnapshot) return true;
    const saved = TournamentStorage.saveTournament({
      groupId: state.groupId,
      title: state.title,
      status: state.status,
      players: state.players,
      rounds: state.rounds,
      currentRoundIndex: state.currentRoundIndex,
      activeTab: state.activeTab,
      theme: state.theme
    }, state.groupId);
    if (!saved) {
      showToast('⚠️ 本地存储容量已满，自动保存失败！请及时导出备份 JSON 文件。', 'danger');
      return false;
    }
    return true;
  }

  /**
   * 赛事分享与链接导出模态框
   */
  async function openShareModal(type) {
    if (state.status === 'setup') {
      showToast('比赛尚未开始，开始第 1 轮后即可生成对阵与分享！', 'warning');
      return;
    }

    // 默认展示快照标签页或指定标签页
    if (type === 'pairingText') {
      switchShareModalTab('pairing');
    } else if (type === 'standingsText') {
      switchShareModalTab('standings');
    } else if (type === 'webUrl') {
      switchShareModalTab('webUrl');
    } else {
      switchShareModalTab('snapshot');
    }

    openModal(els.modalShareText);

    // 异步生成压缩数据快照链接
    if (els.inputSnapshotShareUrl) {
      els.inputSnapshotShareUrl.value = '正在生成压缩数据快照...';
      const snapUrl = await TournamentStorage.buildShareUrl({
        groupId: state.groupId,
        round: state.rounds.length,
        tab: state.activeTab,
        withSnapshot: true,
        state: state
      });
      els.inputSnapshotShareUrl.value = snapUrl || window.location.href;
    }

    // 生成当前页面纯参数网址
    if (els.inputWebShareUrl) {
      const webUrl = await TournamentStorage.buildShareUrl({
        groupId: state.groupId,
        round: state.rounds.length,
        tab: state.activeTab
      });
      els.inputWebShareUrl.value = webUrl;
    }
  }

  function switchShareModalTab(tabKey) {
    // 隐藏所有 section
    if (els.shareSectionSnapshot) els.shareSectionSnapshot.style.display = 'none';
    if (els.shareSectionWebUrl) els.shareSectionWebUrl.style.display = 'none';
    if (els.shareSectionText) els.shareSectionText.style.display = 'none';

    // 移除所有 active 样式
    const allTabBtns = [els.btnShareTabSnapshot, els.btnShareTabWebUrl, els.btnShareTabPairing, els.btnShareTabStandings];
    allTabBtns.forEach(btn => {
      if (btn) {
        btn.classList.remove('active', 'btn-primary');
        btn.classList.add('btn-outline');
      }
    });

    if (tabKey === 'snapshot') {
      if (els.shareSectionSnapshot) els.shareSectionSnapshot.style.display = 'block';
      if (els.btnShareTabSnapshot) {
        els.btnShareTabSnapshot.classList.add('active', 'btn-primary');
        els.btnShareTabSnapshot.classList.remove('btn-outline');
      }
    } else if (tabKey === 'webUrl') {
      if (els.shareSectionWebUrl) els.shareSectionWebUrl.style.display = 'block';
      if (els.btnShareTabWebUrl) {
        els.btnShareTabWebUrl.classList.add('active', 'btn-primary');
        els.btnShareTabWebUrl.classList.remove('btn-outline');
      }
    } else if (tabKey === 'standings') {
      if (els.shareSectionText) els.shareSectionText.style.display = 'block';
      if (els.btnShareTabStandings) {
        els.btnShareTabStandings.classList.add('active', 'btn-primary');
        els.btnShareTabStandings.classList.remove('btn-outline');
      }
      const standings = SwissEngine.calculateStandings(state.players, state.rounds);
      const rNum = state.rounds.length;
      els.shareTextContent.value = TournamentStorage.formatStandingsShareText(state.title, rNum, standings);
    } else {
      // pairing
      if (els.shareSectionText) els.shareSectionText.style.display = 'block';
      if (els.btnShareTabPairing) {
        els.btnShareTabPairing.classList.add('active', 'btn-primary');
        els.btnShareTabPairing.classList.remove('btn-outline');
      }
      const currentR = state.rounds[state.currentRoundIndex];
      if (currentR) {
        const leavePlayers = state.players.filter(p => p.status === 'leave');
        els.shareTextContent.value = TournamentStorage.formatPairingShareText(state.title, currentR.roundNumber, currentR.pairings, leavePlayers);
      } else {
        els.shareTextContent.value = '暂无对阵信息';
      }
    }
  }

  function copySnapshotUrlToClipboard() {
    const text = els.inputSnapshotShareUrl ? els.inputSnapshotShareUrl.value : '';
    if (!text) return;
    copyStringToClipboard(text, '✅ 已复制跨设备快照链接！发到微信群后任何手机点开均可直接查看排阵！');
  }

  function copyWebUrlToClipboard() {
    const text = els.inputWebShareUrl ? els.inputWebShareUrl.value : '';
    if (!text) return;
    copyStringToClipboard(text, '✅ 已复制当前页面网址！');
  }

  function copyShareTextToClipboard() {
    const text = els.shareTextContent ? els.shareTextContent.value : '';
    if (!text) return;
    copyStringToClipboard(text, '✅ 已成功复制文本到剪贴板，可直接粘贴发至微信群！');
  }

  function copyStringToClipboard(str, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).then(() => {
        showToast(successMsg || '✅ 已复制到剪贴板！', 'success');
      }).catch(() => {
        fallbackCopyString(str, successMsg);
      });
    } else {
      fallbackCopyString(str, successMsg);
    }
  }

  function fallbackCopyString(str, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(successMsg || '✅ 已复制到剪贴板！', 'success');
    } catch (e) {
      showToast('自动复制失败，请手动长按复制！', 'warning');
    }
    document.body.removeChild(ta);
  }

  /**
   * 导出与导入数据
   */
  function handleExportJSON() {
    const exportData = {
      title: state.title,
      groupId: state.groupId,
      status: state.status,
      currentRoundIndex: state.currentRoundIndex,
      players: state.players,
      rounds: state.rounds
    };
    const filename = `${state.title.replace(/[\s\/\\:*?"<>|]/g, '_')}_轮次${state.rounds.length}.json`;
    TournamentStorage.exportToFile(exportData, filename);
    showToast('已开始下载比赛数据备份文件！', 'success');
  }

  function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let parsed;
        try {
          parsed = JSON.parse(event.target.result);
        } catch (jsonErr) {
          throw new Error('文件不是合法的 JSON 格式');
        }

        const validation = TournamentStorage.validateTournamentData(parsed);
        if (!validation.valid) {
          throw new Error(validation.error || '赛事数据结构校验失败');
        }

        const sanitized = validation.sanitizedData;

        // 提示用户导入将覆盖当前组数据
        const groupName = TournamentStorage.getGroupName(state.groupId);
        if (!confirm(`确定要将导入的数据恢复至当前【${groupName}】吗？\n当前组别现有的数据将被替换。`)) {
          return;
        }

        // 应用经过严格校验与清洗的领域数据，绝不导入 isAdmin, isSnapshot 等特权或临时状态
        state.title = sanitized.title;
        state.status = sanitized.status;
        state.players = sanitized.players;
        state.rounds = sanitized.rounds;
        state.currentRoundIndex = sanitized.currentRoundIndex;
        state.historyViewingRound = sanitized.rounds.length || 1;
        state.isSnapshot = false;

        const saved = saveState();
        closeModal(els.modalDataManage);
        renderApp();
        if (saved !== false) {
          showToast('🎉 数据导入成功！比赛已恢复。', 'success');
        }
      } catch (err) {
        alert('文件导入失败: ' + err.message);
      } finally {
        if (els.inputFileImport) {
          els.inputFileImport.value = '';
        }
      }
    };
    reader.readAsText(file);
  }

  /**
   * 重置当前比赛
   */
  function handleResetTournament() {
    const groupName = TournamentStorage.getGroupName(state.groupId);
    if (confirm(`⚠️ 确定要清空当前【${groupName}】的所有比赛数据并开始全新的比赛吗？此操作不可逆！`)) {
      TournamentStorage.clearTournament(state.groupId);
      state.status = 'setup';
      state.players = [];
      state.rounds = [];
      state.currentRoundIndex = 0;
      state.title = groupName;
      renderApp();
      closeModal(els.modalDataManage);
      showToast(`${groupName}比赛已重置，请输入新棋手名单开启新比赛。`, 'info');
    }
  }

  /**
   * 打开对阵与成绩签单模态框 (支持任意轮次打印与导出)
   */
  function openPrintSheetModal(targetRoundNum) {
    if (!state.rounds || state.rounds.length === 0) {
      showToast('当前尚未开始比赛，暂无轮次对阵签单可打印！', 'warning');
      return;
    }

    const roundCount = state.rounds.length;
    let optHtml = '';
    for (let r = 1; r <= roundCount; r++) {
      optHtml += `<option value="${r}">第 ${r} 轮 对阵与成绩签单</option>`;
    }
    els.selectPrintSheetRound.innerHTML = optHtml;

    const selRound = targetRoundNum || (state.currentRoundIndex + 1);
    els.selectPrintSheetRound.value = (selRound >= 1 && selRound <= roundCount) ? selRound : roundCount;

    renderPrintableSheet();
    openModal(els.modalPrintSheet);
  }

  /**
   * 渲染A4对阵与成绩签单内容 (含赛果与双方签字栏)
   */
  function renderPrintableSheet() {
    const roundNum = parseInt(els.selectPrintSheetRound.value, 10);
    const round = state.rounds[roundNum - 1];
    if (!round) return;

    const isBlank = els.radioSheetBlank.checked;
    const groupName = TournamentStorage.getGroupName(state.groupId);
    const groupLabel = (state.groupId !== 'default' && !state.title.includes(groupName)) ? groupName : '';
    const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

    let html = `
      <div style="text-align: center; margin-bottom: 1rem;">
        <h2 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.25rem; color: #000;">
          ${escapeHtml(state.title)} ${groupLabel ? `(${groupLabel})` : ''}
        </h2>
        <div style="font-size: 1.05rem; font-weight: 600; color: #1e293b; margin-bottom: 0.5rem;">
          第 ${roundNum} 轮 对阵与成绩确认签单
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #334155; padding: 0 0.5rem; border-bottom: 2px solid #000; padding-bottom: 0.4rem;">
          <span><strong>轮次:</strong> 第 ${roundNum} 轮 / 共 ${state.rounds.length} 轮</span>
          <span><strong>对局日期:</strong> ${currentDate}</span>
          <span><strong>编排方式:</strong> 瑞士制</span>
          <span><strong>裁判长确认签字:</strong> __________________</span>
        </div>
      </div>

      <table class="sign-sheet-table">
        <thead>
          <tr>
            <th style="width: 45px;">台次</th>
            <th style="width: 140px;">⚪ 白方棋手</th>
            <th style="width: 50px;">当前分</th>
            <th style="width: 170px;">赛果比分<br><span style="font-size: 0.725rem; font-weight: normal; color: #475569;">(1-0 / ½-½ / 0-1)</span></th>
            <th style="width: 50px;">当前分</th>
            <th style="width: 140px;">⚫ 黑方棋手</th>
            <th style="width: 110px;">白方签字</th>
            <th style="width: 110px;">黑方签字</th>
            <th style="width: 80px;">复核签字</th>
          </tr>
        </thead>
        <tbody>
    `;

    round.pairings.forEach(p => {
      if (p.isBye) {
        html += `
          <tr>
            <td><strong>第 ${p.board} 台</strong></td>
            <td colspan="5" style="text-align: left; padding-left: 1.25rem; font-weight: bold; color: #b45309;">
              🎉 <strong>${escapeHtml(p.playerName)}</strong> (当前分: ${p.playerScore}分) —— <strong>轮空获胜 (+1.0分)</strong>
            </td>
            <td colspan="3" style="font-size: 0.825rem; color: #475569;">
              免赛确认签字：<span class="signature-blank" style="min-width: 110px;"></span>
            </td>
          </tr>
        `;
      } else {
        let resultCell = '';
        if (isBlank) {
          resultCell = `
            <div class="score-box-handwritten">
              <span class="score-cell-box"></span>
              <span>:</span>
              <span class="score-cell-box"></span>
            </div>
          `;
        } else {
          if (p.result) {
            resultCell = `<span style="font-size: 1.15rem; font-weight: 800; color: #1e3a8a;">[ ${p.result} ]</span>`;
          } else {
            resultCell = `
              <div class="score-box-handwritten">
                <span class="score-cell-box"></span>
                <span>:</span>
                <span class="score-cell-box"></span>
              </div>
            `;
          }
        }

        html += `
          <tr>
            <td><strong>第 ${p.board} 台</strong></td>
            <td style="font-weight: 600; text-align: left; padding-left: 0.75rem;">
              ⚪ ${escapeHtml(p.whiteName)}
            </td>
            <td><span class="score-highlight" style="font-size: 0.85rem;">${p.whiteScore}</span></td>
            <td>${resultCell}</td>
            <td><span class="score-highlight" style="font-size: 0.85rem;">${p.blackScore}</span></td>
            <td style="font-weight: 600; text-align: left; padding-left: 0.75rem;">
              ⚫ ${escapeHtml(p.blackName)}
            </td>
            <td><span class="signature-blank"></span></td>
            <td><span class="signature-blank"></span></td>
            <td><span class="signature-blank" style="min-width: 60px;"></span></td>
          </tr>
        `;
      }
    });

    html += `
        </tbody>
      </table>

      <div style="margin-top: 0.85rem; display: flex; justify-content: space-between; font-size: 0.8rem; color: #64748b; padding: 0 0.5rem;">
        <span>📌 须知：每台对局结束双方核对成绩无误后签字，胜方持签单至裁判长席提交；和棋由白方提交。</span>
        <span>生成时间：${new Date().toLocaleTimeString()}</span>
      </div>
    `;

    els.printableSheetArea.innerHTML = html;
  }

  function handleTriggerPrintSheet() {
    document.body.classList.add('printing-sheet-mode');
    if (els.modalPrintSheet) {
      els.modalPrintSheet.classList.add('printing-active');
    }

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      document.body.classList.remove('printing-sheet-mode');
      if (els.modalPrintSheet) {
        els.modalPrintSheet.classList.remove('printing-active');
      }
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    // 宽松的保护超时 (30秒)，避免打印预览还在加载或用户正在调参数时被过早撤销样式
    setTimeout(cleanup, 30000);

    window.print();
  }

  function handleOpenStandalonePrintWindow() {
    const roundNum = parseInt(els.selectPrintSheetRound.value, 10);
    const round = state.rounds[roundNum - 1];
    if (!round) {
      showToast('暂无该轮次签单可打印！', 'warning');
      return;
    }
    const sheetHtml = els.printableSheetArea ? els.printableSheetArea.innerHTML : '';
    const win = window.open('', '_blank');
    if (!win) {
      showToast('浏览器阻止了弹出窗口，请在地址栏允许弹出窗口后重试！', 'warning');
      return;
    }
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(state.title)} - 第 ${roundNum} 轮对阵签单</title>
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: #ffffff;
      color: #000000;
      padding: 16px;
    }
    .no-print-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f7f7f7;
      padding: 10px 16px;
      margin-bottom: 16px;
      border-radius: 8px;
      border: 1px solid #e5e5e5;
    }
    .no-print-bar button {
      padding: 7px 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 6px;
      border: none;
    }
    .btn-print { background: #07c160; color: #fff; }
    .btn-close { background: #e5e5e5; color: #191919; margin-left: 8px; }
    @media print {
      .no-print-bar { display: none !important; }
      body { padding: 0 !important; }
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #000; padding: 6px 8px; text-align: center; }
    th { background: #f7f7f7; }
    .signature-blank { display: inline-block; width: 60px; height: 18px; border-bottom: 1px solid #000; }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div><strong>📑 独立签单预览与打印</strong>（可在浏览器打印面板中选择“目标打印机”为【另存为 PDF】）</div>
    <div>
      <button class="btn-print" onclick="window.print()">🖨️ 打印 / 另存为 PDF</button>
      <button class="btn-close" onclick="window.close()">✕ 关闭</button>
    </div>
  </div>
  ${sheetHtml}
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => { window.print(); }, 250);
    });
  <\/script>
</body>
</html>`);
    win.document.close();
  }

  function handleDownloadSheetCSV() {
    const roundNum = parseInt(els.selectPrintSheetRound.value, 10);
    const round = state.rounds[roundNum - 1];
    if (!round) return;

    const isBlank = els.radioSheetBlank.checked;
    TournamentStorage.exportPairingsToCSV(state.title, roundNum, round.pairings, isBlank);
    showToast(`第 ${roundNum} 轮签单已成功导出为 CSV (Excel) 表格！`, 'success');
  }

  function handleExportCurrentRoundCSV() {
    if (!state.rounds || state.rounds.length === 0) {
      showToast('当前暂无轮次可导出！', 'warning');
      return;
    }
    const currentR = state.rounds[state.currentRoundIndex];
    if (!currentR) return;
    TournamentStorage.exportPairingsToCSV(state.title, currentR.roundNumber, currentR.pairings, false);
    showToast(`第 ${currentR.roundNumber} 轮对阵签单已导出为 CSV (Excel)！`, 'success');
  }

  function handleExportHistoryRoundCSV() {
    if (!state.rounds || state.rounds.length === 0) {
      showToast('当前暂无历史轮次可导出！', 'warning');
      return;
    }
    const rNum = state.historyViewingRound;
    const r = state.rounds[rNum - 1];
    if (!r) return;
    TournamentStorage.exportPairingsToCSV(state.title, rNum, r.pairings, false);
    showToast(`第 ${rNum} 轮对阵签单已导出为 CSV (Excel)！`, 'success');
  }

  /**
   * 主题管理
   */
  function loadStoredTheme() {
    const saved = localStorage.getItem('chesspairing_theme') || 'light';
    setTheme(saved);
  }

  function toggleTheme() {
    const next = (state.theme === 'dark') ? 'light' : 'dark';
    setTheme(next);
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chesspairing_theme', theme);
    if (els.themeIcon) {
      els.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  /**
   * 模态框打开与关闭辅助函数
   */
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('show');
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('show');
  }

  /**
   * 全局 Toast 提示
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'danger') icon = '❌';

    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /**
   * HTML 安全转义
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 页面加载完成后自启动
  document.addEventListener('DOMContentLoaded', init);
})();
