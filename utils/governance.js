// 安全与治理：举报、拉黑、解除 1v1、注销账号
//
// 这一层在演示版里全部落在本机，没有审核队列、没有人工处理、没有客服工单。
// 真实产品的举报必须有：后台受理队列、SLA、处置结果回执、以及违规证据留存（且要符合个保法）。
const { getState, saveState } = require('./store.js');
const { byId } = require('./pool.js');
const auth = require('./auth.js');
const media = require('./media.js');

const REASONS = [
  { key: 'fake', label: '资料造假 / 照片不是本人' },
  { key: 'harass', label: '骚扰、言语冒犯' },
  { key: 'ad', label: '广告、引流、推销' },
  { key: 'fraud', label: '诈骗、索要钱财' },
  { key: 'minor', label: '疑似未成年人' },
  { key: 'other', label: '其他' }
];

function isBlocked(id) {
  const s = getState();
  return (s.blocked || []).indexOf(Number(id)) >= 0;
}

function blockedList() {
  const s = getState();
  return (s.blocked || []).map(function (id) {
    const c = byId(id);
    return {
      id: id,
      name: c ? c.name : '已注销用户',
      initial: c ? c.name.charAt(0) : '?',
      age: c ? c.age : '',
      city: c ? c.city : ''
    };
  });
}

// 拉黑：同时解除 1v1（不能一边拉黑一边还在专属对话里）
function block(id) {
  const sid = Number(id);
  const s = getState();
  if (!s.blocked) s.blocked = [];
  if (s.blocked.indexOf(sid) < 0) s.blocked.push(sid);
  if (Number(s.lockedId) === sid) s.lockedId = null;
  s.matchIds = (s.matchIds || []).filter(function (x) { return Number(x) !== sid; });
  saveState(s);
  return true;
}

function unblock(id) {
  const sid = Number(id);
  const s = getState();
  s.blocked = (s.blocked || []).filter(function (x) { return Number(x) !== sid; });
  saveState(s);
  return true;
}

// 解除 1v1：聊天记录保留，匹配重新开放
function unlock() {
  const s = getState();
  s.lockedId = null;
  saveState(s);
  return true;
}

// 举报。默认同时拉黑（保护用户，也避免继续收到消息）
// 返回 { ok, reportId }
function report(payload) {
  const p = payload || {};
  const targetId = Number(p.targetId);
  const c = byId(targetId);
  const reason = String(p.reason || '');
  const note = String(p.note || '').slice(0, 200);

  if (!targetId) return { ok: false, msg: '举报对象无效' };
  if (!reason) return { ok: false, msg: '请选择举报原因' };

  const reasonHit = REASONS.filter(function (r) { return r.key === reason; })[0];
  const s = getState();
  if (!s.reports) s.reports = [];

  const rec = {
    id: 'r_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4),
    targetId: targetId,
    targetName: c ? c.name : '未知',
    reason: reason,
    reasonLabel: reasonHit ? reasonHit.label : '其他',
    note: note,
    ts: Date.now()
  };
  s.reports.push(rec);
  saveState(s);

  block(targetId);
  return { ok: true, reportId: rec.id, record: rec };
}

function reportList() {
  const s = getState();
  return (s.reports || []).slice().reverse();
}

// 注销：本地图片 + 全部数据。不可恢复。
function deleteAccount() {
  media.clearAllFiles();
  auth.wipe();
  return true;
}

module.exports = {
  REASONS: REASONS,
  isBlocked: isBlocked,
  blockedList: blockedList,
  block: block,
  unblock: unblock,
  unlock: unlock,
  report: report,
  reportList: reportList,
  deleteAccount: deleteAccount
};
