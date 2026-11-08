const auth = require('../../utils/auth.js');
const media = require('../../utils/media.js');
const { getState } = require('../../utils/store.js');

const CITIES = ['深圳', '广州', '上海', '北京', '杭州', '成都'];

Page({
  data: {
    nick: '',
    gender: '',
    birthYear: 0,
    birthValue: '1996-01-01',
    age: 0,
    maxBirth: '',
    minBirth: '1946-01-01',
    cities: CITIES,
    cityIndex: 0,
    phone: '',
    avatarPath: '',
    submitting: false
  },

  onLoad(options) {
    const nowYear = new Date().getFullYear();
    // ?edit=1 是「编辑资料」，已登录用户允许进来改
    const isEdit = !!(options && options.edit === '1');
    this._isEdit = isEdit;
    if (isEdit) {
      wx.setNavigationBarTitle({ title: '编辑资料' });
    } else if (auth.isLoggedIn()) {
      // 已登录直接回首页，避免重复登录。同样延后一帧，别打断当前路由。
      setTimeout(function () {
        wx.reLaunch({ url: '/pages/index/index' });
      }, 60);
      return;
    }
    const s = getState();
    const a = s.account || {};
    const hard = s.hard || {};
    const cityIdx = Math.max(0, CITIES.indexOf(a.city || hard.city || '深圳'));
    const birthYear = a.birthYear || 0;
    this.setData({
      nick: a.nick || '',
      gender: a.gender || '',
      birthYear: birthYear,
      birthValue: birthYear ? birthYear + '-01-01' : '1996-01-01',
      age: birthYear ? nowYear - birthYear : 0,
      maxBirth: (nowYear - auth.AGE_MIN) + '-12-31',
      minBirth: (nowYear - auth.AGE_MAX) + '-01-01',
      cityIndex: cityIdx,
      phone: a.phone || '',
      avatarPath: a.avatar || ''
    });
    // 本次新落盘但最终没提交的头像，离开时清掉，避免留孤儿文件
    this._newAvatar = '';
    this._committed = false;
  },

  onUnload() {
    if (this._newAvatar && !this._committed) {
      media.removeFileQuietly(this._newAvatar);
    }
  },

  onNick(e) {
    this.setData({ nick: e.detail.value });
  },

  onGender(e) {
    this.setData({ gender: e.currentTarget.dataset.g });
  },

  onBirth(e) {
    const v = String(e.detail.value || '');
    const y = parseInt(v.slice(0, 4), 10) || 0;
    this.setData({
      birthYear: y,
      birthValue: y + '-01-01',
      age: y ? new Date().getFullYear() - y : 0
    });
  },

  onCity(e) {
    this.setData({ cityIndex: Number(e.detail.value) });
  },

  onPhone(e) {
    this.setData({ phone: e.detail.value });
  },

  chooseAvatar() {
    const that = this;
    media.pickAvatar(function (res) {
      if (!res.ok) {
        if (res.msg) wx.showToast({ title: res.msg, icon: 'none' });
        return;
      }
      // 换头像时把上一张本次新选的删掉
      if (that._newAvatar && that._newAvatar !== res.path) {
        media.removeFileQuietly(that._newAvatar);
      }
      that._newAvatar = res.path;
      that.setData({ avatarPath: res.path });
    });
  },

  submit() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });

    const res = auth.login({
      nick: this.data.nick,
      gender: this.data.gender,
      birthYear: this.data.birthYear,
      city: CITIES[this.data.cityIndex],
      phone: this.data.phone,
      avatar: this.data.avatarPath
    });

    if (!res.ok) {
      this.setData({ submitting: false });
      wx.showToast({ title: res.msg, icon: 'none' });
      return;
    }

    this._committed = true;
    if (this._isEdit) {
      wx.navigateBack();
      return;
    }
    wx.reLaunch({ url: '/pages/index/index' });
  },

  goBack() {
    wx.reLaunch({ url: '/pages/index/index' });
  }
});
