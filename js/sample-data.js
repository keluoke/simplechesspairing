/**
 * 示例演示数据 (Sample Data for Quick Demo)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SampleTournamentData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 用户男子组名单 (20人)
  const menPlayerNames = [
    '胡安蓬',
    '朱乐逸',
    '张承楷',
    '邱子涵',
    '彭奕超',
    '王般若',
    '韩翼阳',
    '颜旋',
    '李奥',
    '马睿含',
    '梅宇涵',
    '王子骞',
    '曾元昊',
    '陈宇拓',
    '陈豫谦',
    '赵胤训',
    '梅书涵',
    '程佑滔',
    '徐伯逸',
    '张隽恺'
  ];

  // 用户女子组名单 (7人)
  const womenPlayerNames = [
    '张昕妍',
    '刘欣萌',
    '虞伊菲',
    '刘洛妤',
    '王子格',
    '姜景然',
    '王沐苓'
  ];

  // 示例选手名单 (方便一键填充)
  const defaultPlayerNames = [
    '张伟',
    '王芳',
    '李明',
    '刘洋',
    '陈晨',
    '赵磊',
    '孙悦',
    '周强'
  ];

  // 预置已进行完第1轮的8人比赛，方便用户立即体验第2轮编排、请假、加人
  const demoTournament8Players = {
    title: '弈星国际象棋俱乐部周积分赛',
    currentRoundIndex: 1, // 当前正在第2轮 (0-based: index 1)
    status: 'in_progress', // 'setup', 'in_progress', 'finished'
    players: [
      { id: 1, name: '张伟', initialSeed: 1, status: 'active' },
      { id: 2, name: '王芳', initialSeed: 2, status: 'active' },
      { id: 3, name: '李明', initialSeed: 3, status: 'active' },
      { id: 4, name: '刘洋', initialSeed: 4, status: 'active' },
      { id: 5, name: '陈晨', initialSeed: 5, status: 'active' },
      { id: 6, name: '赵磊', initialSeed: 6, status: 'active' },
      { id: 7, name: '孙悦', initialSeed: 7, status: 'active' },
      { id: 8, name: '周强', initialSeed: 8, status: 'active' }
    ],
    rounds: [
      {
        roundNumber: 1,
        pairings: [
          { board: 1, whiteId: 1, whiteName: '张伟', whiteScore: 0, blackId: 5, blackName: '陈晨', blackScore: 0, result: '1-0' },
          { board: 2, whiteId: 6, whiteName: '赵磊', whiteScore: 0, blackId: 2, blackName: '王芳', blackScore: 0, result: '0-1' },
          { board: 3, whiteId: 3, whiteName: '李明', whiteScore: 0, blackId: 7, blackName: '孙悦', blackScore: 0, result: '0.5-0.5' },
          { board: 4, whiteId: 8, whiteName: '周强', whiteScore: 0, blackId: 4, blackName: '刘洋', blackScore: 0, result: '0-1' }
        ]
      }
    ]
  };

  return {
    menPlayerNames,
    womenPlayerNames,
    defaultPlayerNames,
    demoTournament8Players
  };
});
