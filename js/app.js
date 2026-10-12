/**
 * 棋弈排阵 - 主交互与控制器 (App Controller)
 */

(function () {
  'use strict';

  const ADMIN_PASSWORD = 'pflschessteam';

  // 全局应用状态
  const state = {
    isAdmin: false, // 默认访客模式 (只读)
    groupId: 'men', // 'men' | 'women'
    title: '弈星国际象棋俱乐部周积分赛 (男子组)',
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
  function init() {
    cacheDom();
    bindEvents();
    loadStoredTheme();

    // 检查本地裁判登录状态
    state.isAdmin = (localStorage.getItem('chesspairing_admin_auth') === 'true');
    updateAuthUI();

    const activeGroup = TournamentStorage.getActiveGroup() || 'men';
    switchGroup(activeGroup, false);
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

    // 组别切换器
    els.headerGroupSwitcher = document.getElementById('headerGroupSwitcher');
    els.btnGroupMen = document.getElementById('btnGroupMen');
    els.btnGroupWomen = document.getElementById('btnGroupWomen');

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
    els.btnShareTabPairing = document.getElementById('btnShareTabPairing');
    els.btnShareTabStandings = document.getElementById('btnShareTabStandings');
    els.btnDoCopyShareText = document.getElementById('btnDoCopyShareText');

    els.modalDataManage = document.getElementById('modalDataManage');
    els.btnExportJSON = document.getElementById('btnExportJSON');
    els.btnTriggerFileImport = document.getElementById('btnTriggerFileImport');
    els.inputFileImport = document.getElementById('inputFileImport');
    els.btnConfirmResetAll = document.getElementById('btnConfirmResetAll');

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

    // 组别切换
    if (els.btnGroupMen) els.btnGroupMen.addEventListener('click', () => switchGroup('men'));
    if (els.btnGroupWomen) els.btnGroupWomen.addEventListener('click', () => switchGroup('women'));

    // 初始准备页事件
    els.btnStartTournament.addEventListener('click', handleStartTournament);
    if (els.btnLoadMen20) els.btnLoadMen20.addEventListener('click', () => loadRosterPreset('men'));
    if (els.btnLoadWomen7) els.btnLoadWomen7.addEventListener('click', () => loadRosterPreset('women'));
    els.btnLoadDemo8.addEventListener('click', () => loadDemoPreset(8));

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

    // 默认打印与分享
    els.btnPrint.addEventListener('click', () => window.print());
    els.btnPrintStandings.addEventListener('click', () => {
      switchTab('tabStandings');
      setTimeout(() => window.print(), 100);
    });
    els.btnShareModal.addEventListener('click', () => openShareModal('pairing'));
    els.btnCopyCurrentPairing.addEventListener('click', () => openShareModal('pairing'));
    els.btnCopyStandingsText.addEventListener('click', () => openShareModal('standings'));
    els.btnShareTabPairing.addEventListener('click', () => updateShareModalText('pairing'));
    els.btnShareTabStandings.addEventListener('click', () => updateShareModalText('standings'));
    els.btnDoCopyShareText.addEventListener('click', copyShareTextToClipboard);

    // 对阵与推进操作
    els.btnFinishRoundAndNext.addEventListener('click', handleFinishRoundAndNext);
    els.btnRegenerateCurrentRound.addEventListener('click', handleRegenerateCurrentRound);

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
  }

  /**
   * 解析输入的选手名单文本
   */
  function parsePlayerNames(text) {
    if (!text) return [];
    // 按换行、逗号、分号、顿号分隔
    const rawItems = text.split(/[\n\r,，;；、]+/);
    const cleaned = [];
    const seen = new Set();

    rawItems.forEach(item => {
      // 去除每行开头的编号 (如 "1. 张伟" -> "张伟")
      let name = item.replace(/^\s*\d+[\.\、\s\-]+/, '').trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        cleaned.push(name);
      }
    });

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

    const title = els.setupTournamentTitle.value.trim() || '国际象棋俱乐部积分赛';
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
      showToast(`比赛正式开始！已成功生成第 1 轮对阵 (${r1.pairings.length} 台)`, 'success');
    } catch (err) {
      showToast('编排失败: ' + err.message, 'danger');
    }
  }

  /**
   * 切换赛事组别 (男子组 / 女子组)
   */
  function switchGroup(groupId, shouldSaveCurrent = true) {
    if (shouldSaveCurrent) {
      saveState();
    }
    state.groupId = groupId;
    TournamentStorage.saveActiveGroup(groupId);

    // 更新顶栏按钮高亮
    if (els.btnGroupMen && els.btnGroupWomen) {
      if (groupId === 'men') {
        els.btnGroupMen.classList.add('active');
        els.btnGroupWomen.classList.remove('active');
      } else {
        els.btnGroupWomen.classList.add('active');
        els.btnGroupMen.classList.remove('active');
      }
    }

    const saved = TournamentStorage.loadTournament(groupId);
    if (saved && saved.players && saved.players.length > 0) {
      Object.assign(state, saved);
      state.groupId = groupId;
      state.historyViewingRound = state.rounds.length || 1;
      renderApp();
      showToast(`已切换至【${groupId === 'men' ? '男子组' : '女子组'}】比赛`, 'info');
    } else {
      // 当前组别尚未开始比赛
      state.title = groupId === 'men' ? '弈星国际象棋俱乐部周积分赛 (男子组)' : '弈星国际象棋俱乐部周积分赛 (女子组)';
      state.status = 'setup';
      state.players = [];
      state.rounds = [];
      state.currentRoundIndex = 0;
      state.historyViewingRound = 1;
      if (els.setupTournamentTitle) {
        els.setupTournamentTitle.value = state.title;
      }
      if (els.setupPlayerInput) {
        if (groupId === 'men' && SampleTournamentData.menPlayerNames) {
          els.setupPlayerInput.value = SampleTournamentData.menPlayerNames.join('\n');
        } else if (groupId === 'women' && SampleTournamentData.womenPlayerNames) {
          els.setupPlayerInput.value = SampleTournamentData.womenPlayerNames.join('\n');
        } else {
          els.setupPlayerInput.value = '';
        }
      }
      renderApp();
      showToast(`已切换至【${groupId === 'men' ? '男子组' : '女子组'}】，已自动载入选手名单`, 'info');
    }
  }

  /**
   * 载入名单预设
   */
  function loadRosterPreset(type) {
    if (type === 'men') {
      state.groupId = 'men';
      state.title = '弈星国际象棋俱乐部周积分赛 (男子组)';
      els.setupTournamentTitle.value = state.title;
      els.setupPlayerInput.value = SampleTournamentData.menPlayerNames.join('\n');
      if (els.btnGroupMen && els.btnGroupWomen) {
        els.btnGroupMen.classList.add('active');
        els.btnGroupWomen.classList.remove('active');
      }
      showToast('已填入男子组名单 (共 20 人)！', 'info');
    } else if (type === 'women') {
      state.groupId = 'women';
      state.title = '弈星国际象棋俱乐部周积分赛 (女子组)';
      els.setupTournamentTitle.value = state.title;
      els.setupPlayerInput.value = SampleTournamentData.womenPlayerNames.join('\n');
      if (els.btnGroupMen && els.btnGroupWomen) {
        els.btnGroupWomen.classList.add('active');
        els.btnGroupMen.classList.remove('active');
      }
      showToast('已填入女子组名单 (共 7 人)！', 'info');
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

    const list = count === 12 ? names12 : names8;
    els.setupPlayerInput.value = list.join('\n');
    showToast(`已填入 ${count} 人选手名单，点击下方按钮即可一键开始！`, 'info');
  }

  /**
   * 中途增加选手 (支持0分入场)
   */
  function handleAddPlayer(name) {
    if (!requireAdmin('中途增加选手')) return false;

    const cleanName = name ? name.trim() : '';
    if (!cleanName) {
      showToast('请输入有效的选手姓名！', 'warning');
      return false;
    }

    // 检查重名
    const exists = state.players.some(p => p.name === cleanName);
    if (exists) {
      showToast(`已有名为 "${cleanName}" 的选手，请添加后缀区分！`, 'warning');
      return false;
    }

    // 生成新 ID
    const maxId = state.players.reduce((max, p) => Math.max(max, p.id || 0), 0);
    const newPlayer = {
      id: maxId + 1,
      name: cleanName,
      initialSeed: maxId + 1,
      status: 'active'
    };

    state.players.push(newPlayer);
    saveState();
    updateHeaderStats();

    if (state.activeTab === 'tabPlayers') {
      renderPlayersManage();
    } else if (state.activeTab === 'tabStandings') {
      renderStandings();
    }

    showToast(`🎉 选手【${cleanName}】已成功入场 (初始0分)！将在下一轮自动配对。`, 'success');
    return true;
  }

  function handleModalAddPlayer() {
    const name = els.modalPlayerNameInput.value;
    if (handleAddPlayer(name)) {
      els.modalPlayerNameInput.value = '';
      closeModal(els.modalAddPlayer);
    }
  }

  function handleFormAddPlayer() {
    const name = els.inputNewPlayerName.value;
    if (handleAddPlayer(name)) {
      els.inputNewPlayerName.value = '';
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
            <span style="font-weight: 600;">${p.name}</span>
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
              <div class="chess-piece-badge piece-white">♔</div>
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
            <div class="chess-piece-badge piece-white" title="白方执先">⚪ ♔</div>
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
            <div class="chess-piece-badge piece-black" title="黑方后手">⚫ ♚</div>
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

    // 更新录入进度条
    const totalBoards = currentRound.pairings.length;
    els.resultProgressText.textContent = `${completedBoards} / ${totalBoards} 台已完成`;
    if (completedBoards === totalBoards && totalBoards > 0) {
      els.btnFinishRoundAndNext.classList.remove('btn-outline');
      els.btnFinishRoundAndNext.classList.add('btn-success');
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
      const msg = `当前第 ${currentRound.roundNumber} 轮还有 ${uncompleted.length} 台尚未录入结果 (第 ${uncompleted.map(m => m.board).join('、')} 台)。\n\n是否仍然强制结束本轮并生成下一轮？\n(未出结果的台次双方将均计为0分)`;
      if (!confirm(msg)) {
        return;
      }
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
        historyChipsHtml += `<span class="${chipClass}" title="第${m.round}轮 对手:${m.opponentName || '无'}">${chipText}</span>`;
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
        showToast(`已更新第 ${rNum} 轮 第 ${bNum} 台比分为 ${resVal}`, 'success');
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
   * 保存当前状态到 LocalStorage
   */
  function saveState() {
    TournamentStorage.saveTournament({
      groupId: state.groupId,
      title: state.title,
      status: state.status,
      players: state.players,
      rounds: state.rounds,
      currentRoundIndex: state.currentRoundIndex,
      activeTab: state.activeTab,
      theme: state.theme
    }, state.groupId);
  }

  /**
   * 微信分享模态框
   */
  function openShareModal(type) {
    updateShareModalText(type);
    openModal(els.modalShareText);
  }

  function updateShareModalText(type) {
    if (type === 'standings') {
      els.btnShareTabStandings.classList.add('active');
      els.btnShareTabPairing.classList.remove('active');
      const standings = SwissEngine.calculateStandings(state.players, state.rounds);
      const rNum = state.rounds.length;
      els.shareTextContent.value = TournamentStorage.formatStandingsShareText(state.title, rNum, standings);
    } else {
      els.btnShareTabPairing.classList.add('active');
      els.btnShareTabStandings.classList.remove('active');
      const currentR = state.rounds[state.currentRoundIndex];
      if (currentR) {
        const leavePlayers = state.players.filter(p => p.status === 'leave');
        els.shareTextContent.value = TournamentStorage.formatPairingShareText(state.title, currentR.roundNumber, currentR.pairings, leavePlayers);
      } else {
        els.shareTextContent.value = '暂无对阵信息';
      }
    }
  }

  function copyShareTextToClipboard() {
    const text = els.shareTextContent.value;
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('✅ 已成功复制到剪贴板，可直接粘贴发至微信群！', 'success');
      }).catch(() => {
        fallbackCopyText(els.shareTextContent);
      });
    } else {
      fallbackCopyText(els.shareTextContent);
    }
  }

  function fallbackCopyText(textarea) {
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('✅ 已成功复制到剪贴板！', 'success');
    } catch (e) {
      showToast('自动复制失败，请手动长按全选复制！', 'warning');
    }
  }

  /**
   * 导出与导入数据
   */
  function handleExportJSON() {
    const filename = `${state.title.replace(/[\s\/\\:*?"<>|]/g, '_')}_轮次${state.rounds.length}.json`;
    TournamentStorage.exportToFile(state, filename);
    showToast('已开始下载比赛数据备份文件！', 'success');
  }

  function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.players || !Array.isArray(parsed.players)) {
          throw new Error('无效的赛事数据结构');
        }

        Object.assign(state, parsed);
        saveState();
        closeModal(els.modalDataManage);
        renderApp();
        showToast('🎉 数据导入成功！比赛已恢复。', 'success');
      } catch (err) {
        alert('文件导入失败: ' + err.message);
      }
      els.inputFileImport.value = '';
    };
    reader.readAsText(file);
  }

  /**
   * 重置当前比赛
   */
  function handleResetTournament() {
    const groupName = state.groupId === 'men' ? '男子组' : '女子组';
    if (confirm(`⚠️ 确定要清空当前【${groupName}】的所有比赛数据并开始全新的比赛吗？此操作不可逆！`)) {
      TournamentStorage.clearTournament(state.groupId);
      state.status = 'setup';
      state.players = [];
      state.rounds = [];
      state.currentRoundIndex = 0;
      state.title = state.groupId === 'men' ? '弈星国际象棋俱乐部周积分赛 (男子组)' : '弈星国际象棋俱乐部周积分赛 (女子组)';
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
    const groupLabel = state.groupId === 'men' ? '男子组' : (state.groupId === 'women' ? '女子组' : '');
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
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-sheet-mode');
    }, 500);
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
