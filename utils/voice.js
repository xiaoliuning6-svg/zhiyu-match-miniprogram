// 语音输入封装（微信同声传译插件 WechatSI）
//
// 为什么要做「可用性探测」而不是直接写死：
// 插件必须在「小程序后台 - 设置 - 第三方设置 - 插件管理」里添加后，app.json 声明才有效。
// 用测试号 / touristappid 时通常拿不到授权，一旦在 app.json 里硬声明就会直接编译失败。
// 所以这里默认不声明插件，运行时探测：拿不到就降级成键盘输入并给出开启指引，绝不让整个小程序挂掉。
let mgr = null;
let probed = false;

function getManager() {
  if (probed && !mgr) return null;
  if (mgr) return mgr;
  try {
    // eslint-disable-next-line no-undef
    const plugin = requirePlugin('WechatSI');
    mgr = plugin.getRecordRecognitionManager();
    probed = true;
    return mgr;
  } catch (e) {
    probed = true;
    mgr = null;
    return null;
  }
}

function isAvailable() {
  return !!getManager();
}

// 不可用时的具体指引（不是一句"暂不支持"）
function setupGuide() {
  return '语音输入需要先启用「微信同声传译」插件：\n\n1. 登录小程序后台 → 设置 → 第三方设置 → 插件管理 → 添加「微信同声传译」（AppID: wx069ba97219f66d99）\n2. 在 app.json 的 plugins 里声明：\n"plugins": { "WechatSI": { "version": "0.3.5", "provider": "wx069ba97219f66d99" } }\n3. 重新编译，麦克风按钮即可使用。\n\n在此之前可以正常用键盘输入。';
}

function showGuide() {
  wx.showModal({
    title: '语音输入未启用',
    content: setupGuide(),
    showCancel: false,
    confirmText: '知道了'
  });
}

// opts: { onStart, onPartial(text), onFinal(text), onError(res) }
function start(opts) {
  const o = opts || {};
  const manager = getManager();
  if (!manager) {
    showGuide();
    return false;
  }

  const begin = function () {
    manager.onStart = function () {
      if (o.onStart) o.onStart();
    };
    manager.onRecognize = function (res) {
      if (o.onPartial && res && res.result) o.onPartial(res.result);
    };
    manager.onStop = function (res) {
      if (o.onFinal && res && res.result) o.onFinal(res.result);
    };
    manager.onError = function (res) {
      if (o.onError) o.onError(res || {});
    };
    try {
      // 单次最长 60 秒，中文识别
      manager.start({ duration: 60000, lang: 'zh_CN' });
    } catch (e) {
      if (o.onError) o.onError({ retcode: -1, msg: '启动录音失败：' + (e.message || '') });
    }
  };

  wx.getSetting({
    success: function (res) {
      const auth = res.authSetting || {};
      if (auth['scope.record'] === false) {
        wx.showModal({
          title: '需要麦克风权限',
          content: '你之前拒绝过录音权限。点「去设置」打开「麦克风」开关后再试。',
          confirmText: '去设置',
          success: function (r) {
            if (r.confirm) wx.openSetting({});
          }
        });
        return;
      }
      if (auth['scope.record'] === true) {
        begin();
        return;
      }
      wx.authorize({
        scope: 'scope.record',
        success: begin,
        fail: function () {
          wx.showToast({ title: '未授权麦克风，无法语音输入', icon: 'none' });
        }
      });
    },
    fail: begin
  });

  return true;
}

function stop() {
  const manager = getManager();
  if (!manager) return;
  try { manager.stop(); } catch (e) { /* 已经停了，忽略 */ }
}

module.exports = {
  isAvailable: isAvailable,
  setupGuide: setupGuide,
  showGuide: showGuide,
  start: start,
  stop: stop
};
