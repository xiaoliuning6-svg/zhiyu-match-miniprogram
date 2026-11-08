// 登录守卫：内页统一在 onLoad/onShow 首行调用
//
// 为什么需要：小程序页面可以被分享链接直接打开（如 /pages/chat/chat?id=3），
// 不设守卫时未登录用户能进到内页，读到空账号下的默认条件，匹配结果不可信。
const auth = require('./auth.js');

function requireLogin() {
  if (auth.isLoggedIn()) return true;
  // 内页也可能是「分享链接直达」的入口页：此时 appLaunch 路由尚未完成，
  // 立刻 reLaunch 会打断路由（devtools 报 routeLoadTimedOut、整屏白）。
  // 延后一帧再跳，保证路由先走完。
  setTimeout(function () {
    wx.reLaunch({ url: '/pages/login/login' });
  }, 60);
  return false;
}

module.exports = {
  requireLogin: requireLogin
};
