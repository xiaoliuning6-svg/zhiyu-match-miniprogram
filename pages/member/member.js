const { getState, saveState, resetState } = require('../../utils/store.js');
const guard = require('../../utils/guard.js');

const PRICE = 2000;
const DAY = 24 * 60 * 60 * 1000;

function fmtDate(ts) {
  const d = new Date(ts);
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

Page({
  data: {
    paid: false,
    price: PRICE,
    paidDate: '',
    expireDate: '',
    daysLeft: 0,
    dayPct: 0,
    remainText: ''
  },

  onShow() {
    if (!guard.requireLogin()) return;
    this.refresh();
  },

  refresh() {
    const s = getState();
    const m = s.member || { paid: false, paidAt: 0 };
    if (!m.paid || !m.paidAt) {
      this.setData({ paid: false });
      return;
    }
    const expire = m.paidAt + 3 * 365 * DAY;
    const left = expire - Date.now();
    const days = Math.max(0, Math.ceil(left / DAY));
    const total = 3 * 365;
    this.setData({
      paid: true,
      paidDate: fmtDate(m.paidAt),
      expireDate: fmtDate(expire),
      daysLeft: days,
      dayPct: Math.min(100, Math.round(((total - days) / total) * 100)),
      remainText: left > 0 ? '保障期内 · 还剩 ' + days + ' 天' : '保障期已结束'
    });
  },

  pay() {
    const that = this;
    wx.showModal({
      title: '开启保障',
      content: '演示版不会发起真实支付。点击「模拟支付」后，会按 ¥' + PRICE +
        ' 生成一份三年期保障记录（仅存在本机），用于体验完整流程。',
      confirmText: '模拟支付',
      confirmColor: '#e8746b',
      success(res) {
        if (!res.confirm) return;
        const s = getState();
        s.member = { paid: true, paidAt: Date.now() };
        saveState(s);
        that.refresh();
        wx.showToast({ title: '已开通（模拟）', icon: 'success' });
      }
    });
  },

  claim() {
    wx.showModal({
      title: '未领证退款（模拟）',
      content: '真实产品里，这一步走银行托管的退款流程，需要实名、领证或未领证的材料核验。演示版只展示交互，不会发起任何资金动作。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  resetAll() {
    const that = this;
    wx.showModal({
      title: '清空演示数据',
      content: '会删除访谈记录、画像、匹配结果、聊天和会员状态，回到初始状态。',
      confirmText: '清空',
      confirmColor: '#e8746b',
      success(res) {
        if (!res.confirm) return;
        resetState();
        that.refresh();
        wx.showToast({ title: '已清空', icon: 'success' });
        setTimeout(function () {
          wx.reLaunch({ url: '/pages/index/index' });
        }, 600);
      }
    });
  }
});
