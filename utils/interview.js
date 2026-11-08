// 五维深度访谈定义 + 答案到软性偏好的推导
// 设计口径：5 个维度 × 每维 2 轮（主问题 + 追问），共 10 轮，产出平均 400 字以上画像

const DIMS = [
  {
    key: 'pace',
    name: '生活节奏',
    icon: '⏱',
    q: '先聊聊日常吧——你平时的工作节奏大概是什么样？周末一般怎么过？',
    follow: '那如果另一半的生活节奏和你差很远（比如你想安静待着、对方天天想出门），你能接受吗？',
    probe: '能说得更具体点吗？比如一周里典型的休息日你会怎么安排。'
  },
  {
    key: 'settle',
    name: '定居规划',
    icon: '🏙',
    q: '未来三五年，你打算在哪个城市安顿下来？这个想法有多坚定？',
    follow: '如果对方因为工作想去另一个城市发展，你会怎么选？',
    probe: '再具体点——买房、户口、离父母远近，这些你更看重哪个？'
  },
  {
    key: 'spend',
    name: '消费观念',
    icon: '💰',
    q: '你怎么看待花钱这件事？平时会存钱或者理财吗？',
    follow: '两个人的钱希望怎么管？各花各的、还是放一起规划？',
    probe: '举个例子吧：一笔大额支出（比如旅行或者买大件），你会怎么决定？'
  },
  {
    key: 'kids',
    name: '生育计划',
    icon: '👶',
    q: '关于要不要孩子、大概什么时候要，你心里的想法是什么？',
    follow: '如果对方在这件事上和你想法不一样，你会怎么处理？',
    probe: '再往下想一步：有了孩子之后，你希望谁来承担主要的照顾？'
  },
  {
    key: 'family',
    name: '家庭关系',
    icon: '🏠',
    q: '你和家人的关系怎么样？希望另一半怎么和你家人相处？',
    follow: '小家庭和大家庭之间的边界，你希望怎么划？',
    probe: '举个具体的：如果父母临时来住一个月，你觉得没问题吗？'
  }
];

// 关键词表：命中加分/减分，每命中一次 ±14，最终夹在 5~95
const LEX = {
  pace: {
    low: ['宅', '安静', '独处', '在家', '看书', '刷剧', '规律', '早睡', '一个人', '不爱出门', '安静待'],
    high: ['外向', '社交', '朋友多', '聚会', '运动', '旅行', '热闹', '户外', '爬山', '健身', '蹦', '经常出去']
  },
  settle: {
    low: ['随缘', '看情况', '哪都行', '不着急', '漂着', '没定', '说不定', '都可以'],
    high: ['定居', '买房', '安顿', '不回老家', '长期', '扎根', '留下来', '深圳', '广州', '上海', '北京', '杭州', '成都', '一定']
  },
  spend: {
    low: ['存钱', '理财', '节省', '攒', '记账', '不乱花', '性价比', '极简', '抠', '省钱'],
    high: ['享受', '品质', '喜欢就买', '花钱', '体验', '不将就', '舍得', '旅费', '买好的', '精致']
  },
  kids: {
    low: ['不要孩子', '不要', '丁克', '不想要', '不考虑', '再说吧', '不想生', '没打算'],
    high: ['想要', '两个孩子', '一个孩子', '孩子', '生', '宝宝', '要娃', '喜欢小孩']
  },
  family: {
    low: ['独立', '边界', '分开住', '小家庭', '不太管', '自己决定', '各过各'],
    high: ['顾家', '亲密', '一起住', '照顾', '父母', '孝顺', '经常回', '大家庭', '陪家人']
  }
};

function scoreDim(key, texts) {
  const lex = LEX[key];
  if (!lex) return 50;
  const joined = texts.join(' ');
  let score = 50;
  lex.high.forEach(function (w) {
    if (joined.indexOf(w) >= 0) score += 14;
  });
  lex.low.forEach(function (w) {
    if (joined.indexOf(w) >= 0) score -= 14;
  });
  if (score < 5) score = 5;
  if (score > 95) score = 95;
  return score;
}

// answers: { pace: ['t1','t2'], ... } -> { pace: 62, ... }
function deriveSoft(answers) {
  const out = {};
  DIMS.forEach(function (d) {
    const arr = (answers && answers[d.key]) || [];
    out[d.key] = arr.length ? scoreDim(d.key, arr) : 50;
  });
  return out;
}

// 五维里答得比较实在的维度数（用于判断画像质量）
function answeredDims(answers) {
  let n = 0;
  DIMS.forEach(function (d) {
    const arr = (answers && answers[d.key]) || [];
    if (arr.length >= 2 && arr.join('').length >= 12) n += 1;
  });
  return n;
}

function dimByKey(key) {
  for (let i = 0; i < DIMS.length; i += 1) {
    if (DIMS[i].key === key) return DIMS[i];
  }
  return null;
}

// 根据用户原话生成 400 字以上画像（模板 + 引用原话，保证信息密度）
function buildProfileText(state) {
  const dims = [
    { key: 'pace', label: '生活节奏' },
    { key: 'settle', label: '定居规划' },
    { key: 'spend', label: '消费观念' },
    { key: 'kids', label: '生育计划' },
    { key: 'family', label: '家庭关系' }
  ];
  const answers = (state.interview && state.interview.answers) || {};
  const soft = state.soft || {};
  const hard = state.hard || {};
  const parts = [];

  parts.push('【我是谁】' + (hard.age || 30) + ' 岁，目前在' + (hard.city || '深圳') + '生活，' +
    '希望认识' + (hard.want === 'f' ? '女生' : hard.want === 'm' ? '男生' : '合适的另一半') + '。');

  dims.forEach(function (d) {
    const arr = answers[d.key] || [];
    const v = soft[d.key] == null ? 50 : soft[d.key];
    const side = v <= 35 ? '偏左' : v >= 65 ? '偏右' : '中间';
    const said = arr.length ? '我原话是「' + arr[0].slice(0, 46) + '」。' : '这一项我还没细说。';
    let comment = '';
    if (d.key === 'pace') {
      comment = v <= 35 ? '我更需要安静的相处方式，周末愿意在家待着也算幸福。'
        : v >= 65 ? '我喜欢把生活排得满一点，出门、见朋友、运动都让我有电。'
        : '我能静也能动，关键看和谁一起。';
    } else if (d.key === 'settle') {
      comment = v <= 35 ? '城市这件事我不太执着，能一起商量。'
        : v >= 65 ? '我很想在一个城市扎下来，长期异地我大概率接受不了。'
        : '倾向稳定，但愿意为对的人调整。';
    } else if (d.key === 'spend') {
      comment = v <= 35 ? '我对花钱比较克制，愿意为长期目标攒。'
        : v >= 65 ? '我认同钱要花在体验上，生活品质不能太将就。'
        : '该省的省、该花的花，看重性价比。';
    } else if (d.key === 'kids') {
      comment = v <= 35 ? '孩子这件事我倾向于不要，希望对方想法一致。'
        : v >= 65 ? '我是想要孩子的，也希望对方是认真考虑过这件事的人。'
        : '可以商量，但需要在婚前聊透。';
    } else {
      comment = v <= 35 ? '我更看重小家庭的独立，和长辈保持尊重但有边界的距离。'
        : v >= 65 ? '我很看重家庭氛围，愿意和长辈走得很近。'
        : '边界可以谈，前提是双方都舒服。';
    }
    parts.push('【' + d.label + '】' + said + comment);
  });

  parts.push('【我在找什么】硬性上，我希望对方在' + (hard.city || '深圳') + '，年龄和我相差不超过 ' +
    (hard.ageGap || 6) + ' 岁，学历' + (hard.eduReq >= 3 ? '本科以上且越高越好' : '不低于大专') +
    '。软性上，我更在意五维里能不能对上——不是条件清单，是过日子方式是否合得来。');
  parts.push('【我的态度】我愿意认真进入一段一对一的关系，不希望被当成选项之一，也不会把别人当备胎。');

  return parts.join('\n');
}

module.exports = {
  DIMS: DIMS,
  deriveSoft: deriveSoft,
  answeredDims: answeredDims,
  dimByKey: dimByKey,
  buildProfileText: buildProfileText
};
