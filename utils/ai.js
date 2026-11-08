// 统一 AI 出口。当前是「本地规则引擎」，不是大模型 —— 别把它当 AI 读。
//
// 为什么要这一层：访谈追问、对方回复、军师建议三处现在都是 if-else 规则，
// 将来接真模型时只改这一个文件，页面和调用方一行都不用动。
//
// === 接真模型（等云服务开通后）的唯一改动点 ===
// 1) 新增 utils/cloud.js：
//      const { createMiniProgramWorkBuddyCloud } = require('@tencent-ai/workbuddy-cloud-sdk/miniprogram')
//      const cloud = createMiniProgramWorkBuddyCloud({ endpoint, publishableKey, wx })
// 2) 把下面 callLLM() 的实现改成 cloud.llm.chat({ model, messages })
// 3) 把 LLM.enabled 置为 true
// 页面无需改动，因为它们只依赖 ask() 返回的 Promise。
//
// 注意：小程序前端不能放任何长期密钥；无密钥调用必须走云服务代理，
// 所以「接真 AI」和「开通云服务」是同一件事，不是两件。

const advice = require('./advice.js');

const LLM = {
  enabled: false,      // 置 true 才会走 callLLM
  model: 'gpt-4o-mini',// 接云后按云端可用模型改
  timeoutMs: 12000
};

const PROMPTS = {
  mentor: '你是婚恋相处参谋。只给具体可执行的动作，不替用户说话，不超过 5 行。用户贴的对话：',
  reply: '你在扮演一位认真相亲的普通人，回复要自然、口语、不超过 40 字，不要油腻。对方说：',
  followup: '你是深度访谈员。针对用户上一句回答，追问一个更具体的问题，不超过 30 字。用户说：'
};

function buildMessages(kind, payload) {
  const sys = PROMPTS[kind] || '你是助手，回答简短。';
  let user = '';
  if (kind === 'reply') user = String((payload && payload.text) || '');
  else user = String((payload && payload.text) || '');
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user }
  ];
}

// 本地兜底：规则引擎。任何异常都落到这里，保证界面不会卡住
function localFallback(kind, payload) {
  const p = payload || {};
  try {
    if (kind === 'mentor') return advice.mentorAdvice(p.text || '');
    if (kind === 'reply') return advice.taReply(p.c, p.text || '');
    if (kind === 'followup') return p.fallback || '';
    return p.fallback || '';
  } catch (e) {
    return p.fallback || '';
  }
}

// 预留给接云后的实现。现在直接 reject，由 ask() 兜底到规则引擎。
function callLLM(kind, payload) {
  return new Promise(function (resolve, reject) {
    if (!LLM.enabled) {
      reject(new Error('LLM_NOT_ENABLED'));
      return;
    }
    // TODO(接云后)：换成 cloud.llm.chat({ model: LLM.model, messages: buildMessages(kind, payload) })
    //               .then(function (res) { resolve(res.choices[0].message.content); })
    reject(new Error('LLM_NOT_WIRED'));
  });
}

// 统一入口：永远 resolve 一个字符串，不抛错
function ask(kind, payload) {
  return callLLM(kind, payload)
    .then(function (text) {
      const t = String(text || '').trim();
      if (!t) throw new Error('EMPTY');
      return t;
    })
    .catch(function () {
      return localFallback(kind, payload);
    });
}

function mode() {
  return LLM.enabled ? 'llm' : 'local';
}

module.exports = {
  LLM: LLM,
  PROMPTS: PROMPTS,
  buildMessages: buildMessages,
  ask: ask,
  mode: mode,
  localFallback: localFallback
};
