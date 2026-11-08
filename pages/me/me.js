const auth = require('../../utils/auth.js');
const media = require('../../utils/media.js');
const governance = require('../../utils/governance.js');
const { getState } = require('../../utils/store.js');

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function fmtDate(ts) {
  const d = new Date(ts);
  return (d.getMonth() + 1) + '-' + pad(d.getDate());
}

Page({
  data: {
    account: {},
    uidShort: '—',
    metaText: '',
    nickFirst: '遇',
    comp: { pct: 0, missing: [] },
    missingText: '',
    photos: [],
    photoCount: 0,
    maxPhotos: media.MAX_PHOTOS,
    // WXML 属性里不能直接写 a < b（会把编译器的 < 当标签起始），所以在 JS 里算好布尔量
    canAdd: true,
    blocked: [],
    reports: [],
    showBlocked: false,
    showReports: false,
    loggedIn: false
  },

  onShow() {
    if (!auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.refresh();
  },

  refresh() {
    const s = getState();
    const a = s.account || {};
    const photos = media.list();
    const reports = governance.reportList().map(function (r) {
      return {
        id: r.id,
        targetName: r.targetName,
        reasonLabel: r.reasonLabel,
        note: r.note,
        date: fmtDate(r.ts)
      };
    });
    const nowYear = new Date().getFullYear();
    const age = a.birthYear ? nowYear - a.birthYear : 0;
    const metaParts = [
      a.gender === 'f' ? '女' : a.gender === 'm' ? '男' : '',
      age ? age + ' 岁' : '',
      a.city || ''
    ].filter(function (x) { return !!x; });

    const comp = auth.completeness();
    this.setData({
      account: a,
      loggedIn: true,
      nickFirst: (a.nick || '遇').charAt(0),
      metaText: metaParts.join(' · ') || '资料待完善',
      uidShort: a.uid ? '…' + String(a.uid).slice(-6) : '—',
      comp: comp,
      missingText: (comp.missing || []).join('、'),
      photos: photos,
      photoCount: photos.length,
      canAdd: photos.length < media.MAX_PHOTOS,
      blocked: governance.blockedList(),
      reports: reports
    });
  },

  editProfile() {
    wx.navigateTo({ url: '/pages/login/login?edit=1' });
  },

  addPhoto() {
    const that = this;
    media.pick(function (res) {
      if (!res.ok && res.msg) {
        wx.showToast({ title: res.msg, icon: 'none' });
      } else if (res.ok) {
        wx.showToast({ title: '已添加 ' + res.saved.length + ' 张', icon: 'none' });
      }
      that.refresh();
    });
  },

  preview(e) {
    const path = e.currentTarget.dataset.path;
    const urls = this.data.photos.map(function (p) { return p.path; });
    wx.previewImage({ current: path, urls: urls });
  },

  delPhoto(e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '删除这张照片？',
      content: '会同时删掉本机上的文件，不能恢复。',
      confirmText: '删除',
      confirmColor: '#e8746b',
      success(res) {
        if (!res.confirm) return;
        media.remove(id);
        that.refresh();
        wx.showToast({ title: '已删除', icon: 'none' });
      }
    });
  },

  toggleBlocked() {
    this.setData({ showBlocked: !this.data.showBlocked });
  },

  toggleReports() {
    this.setData({ showReports: !this.data.showReports });
  },

  unblock(e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '解除拉黑？',
      content: '解除后会重新出现在匹配结果里。',
      confirmText: '解除',
      success(res) {
        if (!res.confirm) return;
        governance.unblock(id);
        that.refresh();
      }
    });
  },

  logout() {
    const that = this;
    wx.showModal({
      title: '退出登录？',
      content: '访谈、画像和聊天记录都还留在这台设备上，重新登录能看到。',
      confirmText: '退出',
      confirmColor: '#e8746b',
      success(res) {
        if (!res.confirm) return;
        auth.logout();
        that.setData({ loggedIn: false });
        wx.reLaunch({ url: '/pages/login/login' });
      }
    });
  },

  // 注销：不可逆，文案必须把后果说全
  deleteAccount() {
    const that = this;
    wx.showModal({
      title: '注销账号',
      content: '会删除这台设备上的全部数据：账号资料、访谈记录、画像、匹配与聊天记录、所有照片文件。删除后无法恢复，也没有云端备份可以找回。',
      confirmText: '确认注销',
      cancelText: '再想想',
      confirmColor: '#e0503f',
      success(res) {
        if (!res.confirm) return;
        // 二次确认：不可逆操作只弹一次不够
        wx.showModal({
          title: '真的要注销吗？',
          content: '这是最后一次机会。点「确定注销」后数据立刻清除。',
          confirmText: '确定注销',
          cancelText: '取消',
          confirmColor: '#e0503f',
          success(res2) {
            if (!res2.confirm) return;
            governance.deleteAccount();
            that.setData({ loggedIn: false });
            wx.reLaunch({ url: '/pages/login/login' });
          }
        });
      }
    });
  },

  goMember() {
    wx.navigateTo({ url: '/pages/member/member' });
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  }
});
