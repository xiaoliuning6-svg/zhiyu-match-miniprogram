const { getState, saveState } = require('../../utils/store.js');
const { buildProfileText, answeredDims } = require('../../utils/interview.js');
const guard = require('../../utils/guard.js');

const DIM_META = [
  { key: 'pace', name: '生活节奏', left: '安静宅家', right: '热闹外放' },
  { key: 'settle', name: '定居意愿', left: '随遇而安', right: '强烈想定居' },
  { key: 'spend', name: '消费观念', left: '极简爱存钱', right: '享受当下' },
  { key: 'kids', name: '生育意愿', left: '倾向不要', right: '希望要孩子' },
  { key: 'family', name: '家庭边界', left: '小家庭独立', right: '看重大家庭' }
];

const CITIES = ['深圳', '广州', '上海', '北京', '杭州', '成都'];
const GAPS = [3, 4, 5, 6, 8, 10];
const EDUS = ['大专', '本科', '硕士', '博士'];
const WANTS = ['不限', '女生', '男生'];

Page({
  data: {
    dims: [],
    cities: CITIES,
    cityIndex: 0,
    gaps: GAPS,
    gapIndex: 3,
    edus: EDUS,
    eduIndex: 1,
    wants: WANTS,
    wantIndex: 0,
    age: 30,
    quality: 0,
    qualityText: ''
  },

  onLoad() {
    if (!guard.requireLogin()) return;
    const s = getState();
    const soft = s.soft || {};
    const hard = s.hard || {};
    const dims = DIM_META.map(function (m) {
      return {
        key: m.key,
        name: m.name,
        left: m.left,
        right: m.right,
        value: soft[m.key] == null ? 50 : soft[m.key]
      };
    });
    const q = answeredDims(s.interview && s.interview.answers);
    this.setData({
      dims: dims,
      cityIndex: Math.max(0, CITIES.indexOf(hard.city || '深圳')),
      age: hard.age || 30,
      gapIndex: Math.max(0, GAPS.indexOf(hard.ageGap || 6)),
      eduIndex: Math.max(0, (hard.eduReq || 2) - 1),
      wantIndex: hard.want === 'f' ? 1 : hard.want === 'm' ? 2 : 0,
      quality: q,
      qualityText: q >= 5 ? '五个维度都聊到了，画像可信度高' : q >= 3 ? '有 ' + (5 - q) + ' 个维度信息偏少，可能影响匹配' : '信息偏少，建议回去补聊几轮'
    });
  },

  onSlide(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.detail.value;
    const dims = this.data.dims.map(function (d) {
      if (d.key === key) d.value = val;
      return d;
    });
    this.setData({ dims: dims });
  },

  onCity(e) { this.setData({ cityIndex: Number(e.detail.value) }); },
  onGap(e) { this.setData({ gapIndex: Number(e.detail.value) }); },
  onEdu(e) { this.setData({ eduIndex: Number(e.detail.value) }); },
  onWant(e) { this.setData({ wantIndex: Number(e.detail.value) }); },

  onAge(e) {
    let v = parseInt(e.detail.value, 10);
    if (isNaN(v)) v = 30;
    this.setData({ age: v });
  },

  submit() {
    const s = getState();
    const soft = {};
    this.data.dims.forEach(function (d) { soft[d.key] = Number(d.value); });
    const want = this.data.wantIndex === 1 ? 'f' : this.data.wantIndex === 2 ? 'm' : 'all';
    s.soft = soft;
    s.hard = {
      city: CITIES[this.data.cityIndex],
      age: this.data.age,
      ageGap: GAPS[this.data.gapIndex],
      eduReq: this.data.eduIndex + 1,
      want: want
    };
    s.profileText = buildProfileText(s);
    s.matchIds = [];
    s.lockedId = null;
    saveState(s);
    wx.redirectTo({ url: '/pages/profile/profile' });
  },

  back() {
    wx.reLaunch({ url: '/pages/index/index' });
  }
});
