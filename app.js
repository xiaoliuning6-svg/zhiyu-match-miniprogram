// 知遇 · AI 深度婚恋匹配（演示版）
// 数据全部落在本地存储，不联网、不收集真实隐私；实名/人脸/婚况/资金托管均为模拟。
const { loadState, initState } = require('./utils/store.js');

App({
  globalData: {
    appName: '知遇',
    price: 2000,
    // 五维软性偏好（0-100），改这里就能整体调权重口径
    dims: [
      { key: 'pace', name: '生活节奏', left: '偏爱安静宅家', right: '喜欢热闹外放' },
      { key: 'settle', name: '定居意愿', left: '随遇而安', right: '强烈想定居' },
      { key: 'spend', name: '消费观念', left: '极简爱存钱', right: '享受当下' },
      { key: 'kids', name: '生育意愿', left: '倾向不要孩子', right: '希望要孩子' },
      { key: 'family', name: '家庭边界', left: '小家庭强独立', right: '看重大家庭' }
    ]
  },

  onLaunch() {
    // 首次进入初始化本地状态
    const s = loadState();
    if (!s) initState();
  }
});
