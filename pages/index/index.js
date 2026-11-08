const { getState, resetState } = require('../../utils/store.js');
const { DIMS } = require('../../utils/interview.js');
const { POOL } = require('../../utils/pool.js');
const auth = require('../../utils/auth.js');

Page({
  data: {
    mode: 'empty',      // empty 未开始 / doing 访谈中 / done 已完成
    mainText: '开始遇见',
    resumeDim: 1,
    dimTotal: DIMS.length,
    poolSize: POOL.length,
    nick: '',
    nickFirst: '遇',
    avatar: '',
    features: [
      { i: '🎙', t: 'AI 红娘「小遇」先聊 20 分钟', d: '五个维度各追问一轮，不是填表勾选' },
      { i: '🎯', t: '像搜索一样找人', d: '硬性条件先过滤，软性偏好算相关系数，≥70% 才推' },
      { i: '🔒', t: '没有人沦为备胎', d: '双向心动后锁死新推送，同一时间只认真对一个人' },
      { i: '💡', t: 'AI 军师随身', d: '聊天卡住时给具体动作，只当参谋不代聊' }
    ]
  },

  onShow() {
    // 未登录先登录：没有账号就没有城市/年龄，匹配跑不出可信结果
    if (!auth.isLoggedIn()) {
      // 为什么延后一帧：入口页的首次 appLaunch 路由还没走完时立刻 reLaunch，
      // 会把当前路由打断，devtools 里表现为 routeLoadTimedOut + 整屏白（只剩导航栏）。
      // 先让入口页完成一次完整渲染，再跳登录。
      if (this._redirecting) return;
      this._redirecting = true;
      setTimeout(function () {
        wx.reLaunch({ url: '/pages/login/login' });
      }, 60);
      return;
    }
    this._redirecting = false;
    const a = auth.getAccount();
    this.setData({
      nick: a.nick || '未命名',
      nickFirst: (a.nick || '遇').charAt(0),
      avatar: a.avatar || ''
    });
    this.refresh();
  },

  goMe() {
    wx.navigateTo({ url: '/pages/me/me' });
  },

  refresh() {
    const s = getState();
    const iv = s.interview || {};
    const log = iv.log || [];
    const idx = iv.idx || 0;
    let mode = 'empty';
    if (s.profileText && idx >= DIMS.length) {
      mode = 'done';
    } else if (log.length > 0) {
      mode = 'doing';
    }
    const texts = {
      empty: '开始遇见',
      doing: '继续访谈（第 ' + Math.min(idx + 1, DIMS.length) + ' / ' + DIMS.length + ' 维）',
      done: '查看我的画像'
    };
    this.setData({
      mode: mode,
      mainText: texts[mode],
      resumeDim: Math.min(idx + 1, DIMS.length)
    });
  },

  onMainTap() {
    if (this.data.mode === 'done') {
      wx.redirectTo({ url: '/pages/profile/profile' });
      return;
    }
    wx.redirectTo({ url: '/pages/interview/interview' });
  },

  goStart() {
    wx.redirectTo({ url: '/pages/interview/interview' });
  },

  goResume() {
    wx.redirectTo({ url: '/pages/interview/interview' });
  },

  goProfile() {
    wx.redirectTo({ url: '/pages/profile/profile' });
  },

  restart() {
    const that = this;
    wx.showModal({
      title: '重新开始访谈？',
      content: '会清空已填写的访谈内容和画像，匹配记录也会一起清掉。',
      confirmText: '重新开始',
      confirmColor: '#e8746b',
      success(res) {
        if (!res.confirm) return;
        resetState();
        that.refresh();
        wx.showToast({ title: '已重置', icon: 'success' });
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '知遇 · 先深聊 5 个维度，再决定要不要认识',
      path: '/pages/index/index'
    };
  }
});
