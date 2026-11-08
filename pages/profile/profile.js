const { getState, saveState } = require('../../utils/store.js');
const { buildProfileText } = require('../../utils/interview.js');
const { runMatch } = require('../../utils/match.js');
const { EDU_NAME } = require('../../utils/pool.js');
const guard = require('../../utils/guard.js');

const DIM_META = [
  { key: 'pace', name: '生活节奏', left: '宅', right: '外放' },
  { key: 'settle', name: '定居意愿', left: '随缘', right: '定居' },
  { key: 'spend', name: '消费观念', left: '节省', right: '享受' },
  { key: 'kids', name: '生育意愿', left: '不要', right: '要孩子' },
  { key: 'family', name: '家庭边界', left: '独立', right: '大家庭' }
];

Page({
  data: {
    blocks: [],
    dims: [],
    charCount: 0,
    hardText: '',
    matching: false
  },

  onLoad() {
    if (!guard.requireLogin()) return;
    const s = getState();
    if (!s.profileText) {
      s.profileText = buildProfileText(s);
      saveState(s);
    }
    const lines = String(s.profileText).split('\n');
    const blocks = lines.map(function (line) {
      const isHead = line.indexOf('【') === 0;
      return { t: line, h: isHead };
    });
    const soft = s.soft || {};
    const dims = DIM_META.map(function (m) {
      const v = soft[m.key] == null ? 50 : soft[m.key];
      return { name: m.name, value: v, left: m.left, right: m.right, w: v };
    });
    const hard = s.hard || {};
    const wantText = hard.want === 'f' ? '女生' : hard.want === 'm' ? '男生' : '不限';
    this.setData({
      blocks: blocks,
      dims: dims,
      charCount: String(s.profileText).replace(/\s/g, '').length,
      hardText: (hard.city || '深圳') + ' · ' + (hard.age || 30) + ' 岁 · 年龄差 ≤' + (hard.ageGap || 6) +
        ' · ' + (EDU_NAME[hard.eduReq] || '本科') + '以上 · 想认识' + wantText
    });
  },

  goMatch() {
    if (this.data.matching) return;
    this.setData({ matching: true });
    const that = this;
    setTimeout(function () {
      const s = getState();
      // 必须带上 blocked：否则已拉黑的人会被重新写回 matchIds
      const list = runMatch(s.soft, s.hard, s.blocked || []);
      s.matchIds = list.map(function (x) { return x.c.id; });
      saveState(s);
      that.setData({ matching: false });
      wx.redirectTo({ url: '/pages/match/match' });
    }, 260);
  },

  edit() {
    wx.redirectTo({ url: '/pages/calibrate/calibrate' });
  }
});
