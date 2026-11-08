// 匹配引擎：硬性条件先过滤，软性偏好用「皮尔逊相关系数」算相似度
//
// 为什么不用余弦相似度：五维都是 0-100 的非负值，余弦的结果天然集中在 0.8 以上，
// 两个完全相反的人也常常算出 0.78，区分度几乎为零。改成对五维做中心化后求相关系数 r（-1~1），
// 再用 sim = (r + 1) / 2 映射到 0~1，阈值 0.70 等价于 r >= 0.40，才有实际筛选力。
const POOL = require('./pool.js').POOL;
const KEYS = ['pace', 'settle', 'spend', 'kids', 'family'];
const THRESHOLD = 0.7;

function vecOf(obj) {
  const out = [];
  for (let i = 0; i < KEYS.length; i += 1) {
    const k = KEYS[i];
    let v = obj && obj[k] != null ? Number(obj[k]) : 50;
    if (isNaN(v)) v = 50;
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    out.push(v);
  }
  return out;
}

function mean(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i += 1) s += arr[i];
  return s / arr.length;
}

function pearson(a, b) {
  const n = a.length;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i += 1) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  // 任一方五维完全一致（方差为 0）时相关系数无定义，退化为「平均绝对差」
  if (da === 0 || db === 0) {
    let diff = 0;
    for (let i = 0; i < n; i += 1) diff += Math.abs(a[i] - b[i]);
    return 1 - diff / n / 100;
  }
  return num / Math.sqrt(da * db);
}

function similarity(vecA, vecB) {
  const r = pearson(vecA, vecB);
  let sim = (r + 1) / 2;
  if (sim < 0) sim = 0;
  if (sim > 1) sim = 1;
  return sim;
}

// 找出五维里最接近 / 最分歧的两项，用于结果页解释
function explain(userVec, candVec) {
  let bestKey = KEYS[0];
  let bestDiff = 999;
  let worstKey = KEYS[0];
  let worstDiff = -1;
  for (let i = 0; i < KEYS.length; i += 1) {
    const d = Math.abs(userVec[i] - candVec[i]);
    if (d < bestDiff) { bestDiff = d; bestKey = KEYS[i]; }
    if (d > worstDiff) { worstDiff = d; worstKey = KEYS[i]; }
  }
  return { bestKey: bestKey, bestDiff: Math.round(bestDiff), worstKey: worstKey, worstDiff: Math.round(worstDiff) };
}

// blocked：被拉黑的对象 id 数组，直接排除，不进候选
function runMatch(soft, hard, blocked) {
  const u = vecOf(soft);
  const city = hard.city || '深圳';
  const ageGap = hard.ageGap || 6;
  const eduReq = hard.eduReq || 2;
  const want = hard.want || 'all';
  const myAge = hard.age || 30;
  const bl = blocked || [];
  const list = [];

  for (let i = 0; i < POOL.length; i += 1) {
    const c = POOL[i];
    if (bl.indexOf(c.id) >= 0) continue;
    if (want !== 'all' && c.gender !== want) continue;
    if (c.city !== city) continue;
    if (Math.abs(c.age - myAge) > ageGap) continue;
    if (c.edu < eduReq) continue;
    const cv = vecOf(c.vec);
    const sim = similarity(u, cv);
    if (sim >= THRESHOLD) {
      list.push({
        c: c,
        vec: cv,
        sim: sim,
        pct: Math.round(sim * 100),
        why: explain(u, cv)
      });
    }
  }

  list.sort(function (x, y) { return y.sim - x.sim; });
  return list;
}

// 放宽条件的建议：告诉用户卡在哪一道
function diagnose(soft, hard) {
  const city = hard.city || '深圳';
  const ageGap = hard.ageGap || 6;
  const eduReq = hard.eduReq || 2;
  const want = hard.want || 'all';
  const myAge = hard.age || 30;
  let sameCity = 0;
  let afterGender = 0;
  let afterAge = 0;
  let afterEdu = 0;
  for (let i = 0; i < POOL.length; i += 1) {
    const c = POOL[i];
    if (c.city !== city) continue;
    sameCity += 1;
    if (want !== 'all' && c.gender !== want) continue;
    afterGender += 1;
    if (Math.abs(c.age - myAge) > ageGap) continue;
    afterAge += 1;
    if (c.edu < eduReq) continue;
    afterEdu += 1;
  }
  return { sameCity: sameCity, afterGender: afterGender, afterAge: afterAge, afterEdu: afterEdu };
}

module.exports = {
  KEYS: KEYS,
  THRESHOLD: THRESHOLD,
  vecOf: vecOf,
  pearson: pearson,
  similarity: similarity,
  runMatch: runMatch,
  diagnose: diagnose
};
