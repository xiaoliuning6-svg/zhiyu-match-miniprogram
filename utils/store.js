// 本地状态存储：所有数据只在这台手机上，不联网、不上传
//
// 版本说明：
//   v1  只有访谈/画像/匹配/聊天/会员
//   v2  增加 account（本机账号）、photos（本地照片）、blocked（拉黑）、reports（举报）
// 迁移策略：v1 数据保留，只补默认字段，不丢用户已填内容
const KEY = 'zy_state_v1';
const VERSION = 2;

function emptyState() {
  return {
    version: VERSION,
    createdAt: Date.now(),

    // 本机账号：没有后端，uid 在本机生成，换设备即换人
    account: {
      uid: '',
      nick: '',
      gender: '',        // 'f' / 'm'
      birthYear: 0,
      city: '',
      phone: '',         // 只做格式记录，不发送短信、不做核验
      avatar: '',        // 本地文件路径
      loggedIn: false,
      createdAt: 0
    },

    // 访谈进度
    interview: {
      idx: 0,          // 当前维度序号
      sub: 0,          // 当前维度第几轮追问
      log: [],         // [{role:'ai'|'me', text}]
      answers: {}      // { pace: ['...','...'], ... }
    },
    // 五维软性偏好（0-100）
    soft: { pace: 50, settle: 50, spend: 50, kids: 50, family: 50 },
    // 硬性条件
    hard: { city: '深圳', age: 30, eduReq: 2, ageGap: 6, want: 'all' },
    profileText: '',
    matchIds: [],
    lockedId: null,
    chat: {},

    // 个人照片：[{ id, path, ts }] path 是本地持久化路径
    photos: [],

    // 治理：被拉黑的对象 id（对应 pool 里的 id）
    blocked: [],
    // 治理：举报记录 [{ id, targetId, targetName, reason, note, ts }]
    reports: [],

    member: { paid: false, paidAt: 0 },
    flags: { guideSeen: false, accountInit: false }
  };
}

function initState() {
  const s = emptyState();
  saveState(s);
  return s;
}

// v1 -> v2：补齐新字段，保留旧值
function migrate(s) {
  const base = emptyState();
  const out = s;
  Object.keys(base).forEach(function (k) {
    if (out[k] === undefined || out[k] === null) out[k] = base[k];
  });
  // account / 数组类字段单独合并，避免旧对象缺子键
  out.account = Object.assign({}, base.account, out.account || {});
  if (!Array.isArray(out.photos)) out.photos = [];
  if (!Array.isArray(out.blocked)) out.blocked = [];
  if (!Array.isArray(out.reports)) out.reports = [];
  if (!out.flags || typeof out.flags !== 'object') out.flags = base.flags;
  out.flags = Object.assign({}, base.flags, out.flags);
  out.version = VERSION;
  saveState(out);
  return out;
}

function loadState() {
  let s;
  try {
    s = wx.getStorageSync(KEY);
  } catch (e) {
    return null;
  }
  if (!s || typeof s !== 'object') return null;
  if (s.version === VERSION) return s;
  if (s.version === 1) return migrate(s);
  // 未知版本：不静默清掉，标记后交给调用方决定
  return null;
}

function getState() {
  const s = loadState();
  return s || initState();
}

function saveState(s) {
  try {
    wx.setStorageSync(KEY, s);
    return true;
  } catch (e) {
    wx.showToast({ title: '本地存储写入失败', icon: 'none' });
    return false;
  }
}

// 浅合并更新并落盘
function patch(partial) {
  const s = getState();
  Object.keys(partial).forEach(function (k) {
    s[k] = partial[k];
  });
  saveState(s);
  return s;
}

function resetState() {
  try { wx.removeStorageSync(KEY); } catch (e) {}
  return initState();
}

module.exports = {
  KEY: KEY,
  VERSION: VERSION,
  emptyState: emptyState,
  initState: initState,
  loadState: loadState,
  getState: getState,
  saveState: saveState,
  patch: patch,
  resetState: resetState,
  migrate: migrate
};
