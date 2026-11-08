const { getState, saveState } = require('../../utils/store.js');
const { byId } = require('../../utils/pool.js');
const governance = require('../../utils/governance.js');
const ai = require('../../utils/ai.js');
const voice = require('../../utils/voice.js');
const guard = require('../../utils/guard.js');

Page({
  data: {
    c: null,
    msgs: [],
    inputValue: '',
    recording: false,
    mentorOpen: false,
    mentorInput: '',
    mentorText: '把你们聊天的某句话贴进来，军师给你具体动作。',
    toView: '',
    voiceHint: ''
  },

  onLoad(options) {
    if (!guard.requireLogin()) return;
    const id = Number(options && options.id);
    const c = byId(id);
    if (!c) {
      wx.showToast({ title: '对象不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }

    const s = getState();
    if (s.lockedId && Number(s.lockedId) !== id) {
      const other = byId(s.lockedId);
      wx.showModal({
        title: '你正在专属 1v1 中',
        content: '系统已为你锁定与「' + (other ? other.name : '对方') + '」的一对一关系，这是为了不让任何人沦为备胎。想换人，需要先结束当前这段。',
        showCancel: false,
        confirmText: '知道了',
        success() { wx.navigateBack(); }
      });
      return;
    }

    // 锁定
    s.lockedId = id;
    if (!s.chat) s.chat = {};
    if (!s.chat[id] || !s.chat[id].length) {
      s.chat[id] = [
        { role: 'ta', text: '你好，我是' + c.name + '。看了你的画像，感觉我们有些地方挺像的，慢慢聊？' }
      ];
    }
    saveState(s);

    wx.setNavigationBarTitle({ title: c.name + ' · 专属 1v1' });

    this.setData({
      c: c,
      voiceHint: voice.isAvailable() ? '' : '语音未启用：点麦克风可查看开启方法'
    });
    this.paint(s.chat[id]);
  },

  onUnload() {
    voice.stop();
  },

  paint(list) {
    const msgs = list.map(function (m, i) {
      return { id: 'c' + i, role: m.role, text: m.text };
    });
    this.setData({ msgs: msgs, toView: 'c' + (msgs.length - 1) });
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  send() {
    const v = (this.data.inputValue || '').trim();
    if (!v) return;
    const s = getState();
    const id = s.lockedId;
    if (!id) return;
    const c = byId(id);

    s.chat[id].push({ role: 'me', text: v });
    saveState(s);
    this.setData({ inputValue: '' });
    this.paint(s.chat[id]);

    const that = this;
    // 对方隔一下再回，避免"秒回"的机器感
    setTimeout(function () {
      const s2 = getState();
      if (Number(s2.lockedId) !== Number(id)) return;
      // 走统一 AI 出口：现在落到本地规则，接云后可换真模型且这里不用改
      ai.ask('reply', { c: c, text: v }).then(function (reply) {
        // 等待期间可能已解除匹配或拉黑，写入前再确认一次
        const s3 = getState();
        if (Number(s3.lockedId) !== Number(id)) return;
        if (!s3.chat[id]) s3.chat[id] = [];
        s3.chat[id].push({ role: 'ta', text: reply });
        saveState(s3);
        if (that.data.c && that.data.c.id === id) that.paint(s3.chat[id]);
      });
    }, 620);
  },

  toggleVoice() {
    if (this.data.recording) {
      voice.stop();
      this.setData({ recording: false });
      return;
    }
    const that = this;
    voice.start({
      onStart() { that.setData({ recording: true }); },
      onPartial(text) { that.setData({ inputValue: text }); },
      onFinal(text) { that.setData({ recording: false, inputValue: (text || '').trim() }); },
      onError(res) {
        that.setData({ recording: false });
        wx.showToast({ title: '语音：' + ((res && (res.msg || res.retcode)) || '识别失败'), icon: 'none' });
      }
    });
  },

  toggleMentor() {
    this.setData({ mentorOpen: !this.data.mentorOpen });
  },

  onMentorInput(e) {
    this.setData({ mentorInput: e.detail.value });
  },

  askMentor() {
    const t = (this.data.mentorInput || '').trim();
    if (!t) {
      wx.showToast({ title: '先贴一句你们的对话', icon: 'none' });
      return;
    }
    const that = this;
    this.setData({ mentorText: '军师正在看…' });
    ai.ask('mentor', { text: t }).then(function (text) {
      that.setData({ mentorText: text });
    });
  },

  // 右上角「⋯」：举报 / 拉黑 / 结束 1v1 都收在这里
  openMenu() {
    const c = this.data.c;
    if (!c) return;
    const that = this;
    wx.showActionSheet({
      itemList: ['举报 ' + c.name, '拉黑并结束 1v1', '结束这段 1v1'],
      success(res) {
        if (res.tapIndex === 0) that.reportFlow();
        if (res.tapIndex === 1) that.blockFlow();
        if (res.tapIndex === 2) that.endLock();
      },
      fail() {}
    });
  },

  reportFlow() {
    const c = this.data.c;
    if (!c) return;
    const reasons = governance.REASONS;
    const that = this;
    wx.showActionSheet({
      itemList: reasons.map(function (r) { return r.label; }),
      success(res) {
        const hit = reasons[res.tapIndex];
        if (!hit) return;
        wx.showModal({
          title: '举报「' + c.name + '」',
          editable: true,
          placeholderText: '补充说明（选填，最多 200 字）',
          confirmText: '提交举报',
          confirmColor: '#e8746b',
          success(r2) {
            if (!r2.confirm) return;
            const out = governance.report({
              targetId: c.id,
              reason: hit.key,
              note: r2.content || ''
            });
            if (!out.ok) {
              wx.showToast({ title: out.msg, icon: 'none' });
              return;
            }
            voice.stop();
            wx.showToast({ title: '已提交，同时已拉黑', icon: 'none' });
            setTimeout(function () { wx.navigateBack(); }, 700);
          }
        });
      },
      fail() {}
    });
  },

  blockFlow() {
    const c = this.data.c;
    if (!c) return;
    const that = this;
    wx.showModal({
      title: '拉黑「' + c.name + '」？',
      content: '拉黑会同时结束这段 1v1，TA 不会再出现在匹配结果里。可以在「我的 → 已拉黑」解除。',
      confirmText: '拉黑',
      confirmColor: '#e8746b',
      success(res) {
        if (!res.confirm) return;
        governance.block(c.id);
        voice.stop();
        that.setData({ recording: false });
        wx.navigateBack();
      }
    });
  },

  useLastMsg() {
    const msgs = this.data.msgs;
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      if (msgs[i].role === 'ta') {
        this.setData({ mentorInput: msgs[i].text, mentorOpen: true });
        return;
      }
    }
    wx.showToast({ title: '还没有对方的消息', icon: 'none' });
  },

  endLock() {
    const that = this;
    wx.showModal({
      title: '结束这段 1v1？',
      content: '结束后会重新开放匹配推送，聊天记录仍保留在本机。',
      confirmText: '结束',
      confirmColor: '#e8746b',
      success(res) {
        if (!res.confirm) return;
        governance.unlock();
        wx.navigateBack();
      }
    });
  },

  back() {
    wx.navigateBack();
  }
});
