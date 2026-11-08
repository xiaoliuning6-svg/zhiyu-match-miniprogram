const { getState, saveState } = require('../../utils/store.js');
const { DIMS, deriveSoft, buildProfileText } = require('../../utils/interview.js');
const voice = require('../../utils/voice.js');
const guard = require('../../utils/guard.js');

const TOTAL_ROUNDS = DIMS.length * 2;

Page({
  data: {
    log: [],
    inputValue: '',
    recording: false,
    dimIndex: 1,
    dimTotal: DIMS.length,
    dimName: '',
    dimIcon: '',
    pct: 0,
    roundHint: '',
    placeholder: '',
    toView: '',
    voiceHint: ''
  },

  onLoad() {
    if (!guard.requireLogin()) return;
    const s = getState();
    const iv = s.interview;
    if (!iv.answers) iv.answers = {};
    if (!iv.log) iv.log = [];
    if (iv.idx >= DIMS.length) {
      // 已经聊完了，直接去校准/画像
      wx.redirectTo({ url: '/pages/calibrate/calibrate' });
      return;
    }
    if (iv.log.length === 0) {
      iv.log.push({ role: 'ai', text: DIMS[0].q });
      saveState(s);
    }
    const voiceHint = voice.isAvailable() ? '' : '语音未启用：点麦克风可查看开启方法';
    this.setData({ voiceHint: voiceHint });
    this.paint(iv);
  },

  onUnload() {
    voice.stop();
  },

  paint(iv) {
    const d = DIMS[iv.idx];
    const done = iv.idx * 2 + iv.sub;
    const pct = Math.round((done / TOTAL_ROUNDS) * 100);
    const log = iv.log.map(function (m, i) {
      return { id: 'm' + i, role: m.role, text: m.text };
    });
    this.setData({
      log: log,
      dimIndex: iv.idx + 1,
      dimName: d.name,
      dimIcon: d.icon,
      pct: pct,
      roundHint: iv.sub === 0 ? '第 1 轮 · 主问题' : '第 2 轮 · 追问',
      placeholder: iv.sub === 0 ? '用你自己的话回答…' : '再具体说说…',
      toView: 'm' + (log.length - 1)
    });
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  send() {
    const v = (this.data.inputValue || '').trim();
    if (!v) {
      wx.showToast({ title: '先说点什么吧', icon: 'none' });
      return;
    }
    const s = getState();
    const iv = s.interview;
    const d = DIMS[iv.idx];

    iv.log.push({ role: 'me', text: v });
    if (!iv.answers[d.key]) iv.answers[d.key] = [];
    iv.answers[d.key].push(v);

    if (iv.sub === 0) {
      iv.sub = 1;
      iv.log.push({ role: 'ai', text: d.follow });
      this.setData({ inputValue: '' });
      saveState(s);
      this.paint(iv);
      return;
    }

    // 第二轮回完，进入下一个维度
    iv.idx += 1;
    iv.sub = 0;
    this.setData({ inputValue: '' });

    if (iv.idx >= DIMS.length) {
      s.soft = deriveSoft(iv.answers);
      s.profileText = buildProfileText(s);
      saveState(s);
      wx.redirectTo({ url: '/pages/calibrate/calibrate' });
      return;
    }

    iv.log.push({ role: 'ai', text: DIMS[iv.idx].q });
    saveState(s);
    this.paint(iv);
  },

  toggleVoice() {
    if (this.data.recording) {
      voice.stop();
      this.setData({ recording: false });
      return;
    }
    const that = this;
    voice.start({
      onStart() {
        that.setData({ recording: true });
      },
      onPartial(text) {
        that.setData({ inputValue: text });
      },
      onFinal(text) {
        that.setData({ recording: false, inputValue: (text || '').trim() });
      },
      onError(res) {
        that.setData({ recording: false });
        const msg = (res && (res.msg || res.retcode)) || '识别失败';
        wx.showToast({ title: '语音：' + msg, icon: 'none' });
      }
    });
  },

  quit() {
    wx.reLaunch({ url: '/pages/index/index' });
  }
});
