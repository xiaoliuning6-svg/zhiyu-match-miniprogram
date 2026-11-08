// 本机账号：没有后端，所以没有 openid、没有 session、没有跨设备
//
// 这里刻意不做的事（别误会成"已实现"）：
//   · 不发短信、不校验手机号真实性 —— phone 字段只是本机记一笔
//   · 不做实名、不做人脸核身 —— 个人主体接不了，代码里也没有假装做了
//   · 不做密码/验证码登录 —— 没有服务端就没有可信凭据
// 真实产品里这三件事缺一不可，且婚恋类目还要企业资质。
const { getState, saveState, resetState } = require('./store.js');

const NICK_MAX = 12;
const AGE_MIN = 18;
const AGE_MAX = 80;

function newUid() {
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function getAccount() {
  return getState().account || {};
}

function isLoggedIn() {
  const a = getAccount();
  return !!a.loggedIn && !!a.uid;
}

// 资料完整度：昵称/性别/出生年/城市/头像/照片，六项各占一份
function completeness() {
  const s = getState();
  const a = s.account || {};
  const items = [
    { k: '昵称', ok: !!a.nick },
    { k: '性别', ok: a.gender === 'f' || a.gender === 'm' },
    { k: '出生年', ok: !!a.birthYear },
    { k: '城市', ok: !!a.city },
    { k: '头像', ok: !!a.avatar },
    { k: '照片', ok: (s.photos || []).length > 0 }
  ];
  let done = 0;
  items.forEach(function (it) { if (it.ok) done += 1; });
  return {
    pct: Math.round((done / items.length) * 100),
    missing: items.filter(function (it) { return !it.ok; }).map(function (it) { return it.k; })
  };
}

// 登录/更新资料。返回 { ok, msg }
function login(input) {
  const inp = input || {};
  const nick = String(inp.nick || '').trim();
  if (!nick) return { ok: false, msg: '请填写昵称' };
  if (nick.length > NICK_MAX) return { ok: false, msg: '昵称最多 ' + NICK_MAX + ' 个字' };

  const gender = inp.gender === 'f' || inp.gender === 'm' ? inp.gender : '';
  if (!gender) return { ok: false, msg: '请选择性别' };

  const nowYear = new Date().getFullYear();
  const birthYear = Number(inp.birthYear) || 0;
  if (birthYear) {
    const age = nowYear - birthYear;
    if (age < AGE_MIN || age > AGE_MAX) {
      return { ok: false, msg: '年龄需在 ' + AGE_MIN + '–' + AGE_MAX + ' 岁之间' };
    }
  }

  const phone = String(inp.phone || '').trim();
  if (phone && !/^1\d{10}$/.test(phone)) {
    return { ok: false, msg: '手机号格式不对（11 位、1 开头）' };
  }

  const s = getState();
  const a = s.account || {};
  s.account = {
    uid: a.uid || newUid(),
    nick: nick,
    gender: gender,
    birthYear: birthYear || a.birthYear || 0,
    city: inp.city || a.city || '深圳',
    phone: phone,
    avatar: inp.avatar !== undefined ? inp.avatar : (a.avatar || ''),
    loggedIn: true,
    createdAt: a.createdAt || Date.now()
  };

  // 与匹配条件联动：城市、年龄、想认识的性别
  if (!s.hard) s.hard = {};
  s.hard.city = s.account.city;
  if (s.account.birthYear) s.hard.age = nowYear - s.account.birthYear;
  s.hard.want = gender === 'f' ? 'm' : 'f';

  saveState(s);
  return { ok: true, account: s.account };
}

// 退出登录：只清登录态，访谈/画像/聊天记录都留着（同一台设备上还能回来）
function logout() {
  const s = getState();
  if (!s.account) s.account = {};
  s.account.loggedIn = false;
  saveState(s);
  return true;
}

// 彻底注销：本地文件 + 全部数据，不可恢复。调用方负责二次确认。
// 照片文件的清理由 governance.deleteAccount 统一处理（避免循环依赖 media）
function wipe() {
  return resetState();
}

module.exports = {
  NICK_MAX: NICK_MAX,
  AGE_MIN: AGE_MIN,
  AGE_MAX: AGE_MAX,
  newUid: newUid,
  getAccount: getAccount,
  isLoggedIn: isLoggedIn,
  completeness: completeness,
  login: login,
  logout: logout,
  wipe: wipe
};
