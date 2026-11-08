const { getState, saveState } = require('../../utils/store.js');
const { runMatch, diagnose, THRESHOLD } = require('../../utils/match.js');
const { byId, EDU_NAME } = require('../../utils/pool.js');
const governance = require('../../utils/governance.js');
const guard = require('../../utils/guard.js');

const DIM_NAME = {
  pace: '生活节奏',
  settle: '定居规划',
  spend: '消费观念',
  kids: '生育计划',
  family: '家庭关系'
};

Page({
  data: {
    list: [],
    empty: false,
    diagText: '',
    threshold: Math.round(THRESHOLD * 100),
    lockedId: 0,
    hasLock: false
  },

  onShow() {
    if (!guard.requireLogin()) return;
    this.build();
  },

  build() {
    const s = getState();
    const hard = s.hard || {};
    // 匹配是确定性的：同样的软硬条件必然算出同样的结果，不需要缓存兜底
    // blocked 里的对象直接排除，不给"拉黑了还出现"的机会
    const list = runMatch(s.soft, hard, s.blocked || []);

    const items = list.map(function (r) {
      const c = r.c;
      const best = DIM_NAME[r.why.bestKey] || '相处方式';
      return {
        id: c.id,
        name: c.name,
        initial: c.name.charAt(0),
        age: c.age,
        city: c.city,
        gender: c.gender === 'f' ? '女' : '男',
        edu: EDU_NAME[c.edu] || '本科',
        job: c.job,
        height: c.height,
        emo: c.emo,
        tags: c.tags || [],
        pct: r.pct,
        reason: '在「' + best + '」上你们几乎一致'
      };
    });

    let empty = false;
    let diagText = '';
    if (!items.length) {
      empty = true;
      const d = diagnose(s.soft, hard);
      diagText = '「' + (hard.city || '深圳') + '」共有 ' + d.sameCity + ' 位用户，' +
        '通过性别筛选剩 ' + d.afterGender + ' 位，通过年龄差剩 ' + d.afterAge + ' 位，' +
        '通过学历剩 ' + d.afterEdu + ' 位，但软性相似度都没有达到 ' + Math.round(THRESHOLD * 100) + '%。';
    }

    this.setData({
      list: items,
      empty: empty,
      diagText: diagText,
      hasLock: !!s.lockedId,
      lockedId: s.lockedId || 0
    });
  },

  openChat(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/chat/chat?id=' + id });
  },

  lockFirst() {
    if (!this.data.list.length) return;
    const id = this.data.list[0].id;
    wx.navigateTo({ url: '/pages/chat/chat?id=' + id });
  },

  // 结果页也能直接举报/拉黑，不必先进入聊天
  openMenu(e) {
    const id = Number(e.currentTarget.dataset.id);
    const name = e.currentTarget.dataset.name || 'TA';
    const that = this;
    wx.showActionSheet({
      itemList: ['举报 ' + name, '拉黑 ' + name],
      success(res) {
        if (res.tapIndex === 0) that.reportFlow(id, name);
        if (res.tapIndex === 1) that.blockFlow(id, name);
      },
      fail() {}
    });
  },

  reportFlow(id, name) {
    const reasons = governance.REASONS;
    const that = this;
    wx.showActionSheet({
      itemList: reasons.map(function (r) { return r.label; }),
      success(res) {
        const hit = reasons[res.tapIndex];
        if (!hit) return;
        wx.showModal({
          title: '举报「' + name + '」',
          editable: true,
          placeholderText: '补充说明（选填，最多 200 字）',
          confirmText: '提交举报',
          confirmColor: '#e8746b',
          success(r2) {
            if (!r2.confirm) return;
            const out = governance.report({
              targetId: id,
              reason: hit.key,
              note: r2.content || ''
            });
            if (!out.ok) {
              wx.showToast({ title: out.msg, icon: 'none' });
              return;
            }
            that.build();
            wx.showToast({ title: '已提交，同时已拉黑', icon: 'none' });
          }
        });
      },
      fail() {}
    });
  },

  blockFlow(id, name) {
    const that = this;
    wx.showModal({
      title: '拉黑「' + name + '」？',
      content: '拉黑后 TA 不会再出现在你的匹配结果里，无法互相发消息。可以在「我的 → 已拉黑」解除。',
      confirmText: '拉黑',
      confirmColor: '#e8746b',
      success(res) {
        if (!res.confirm) return;
        governance.block(id);
        that.build();
        wx.showToast({ title: '已拉黑', icon: 'none' });
      }
    });
  },

  goCalibrate() {
    wx.redirectTo({ url: '/pages/calibrate/calibrate' });
  },

  goMember() {
    wx.navigateTo({ url: '/pages/member/member' });
  }
});
