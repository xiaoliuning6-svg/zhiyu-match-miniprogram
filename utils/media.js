// 照片：选图 → 存成本地持久文件 → 记录路径
//
// 为什么不能只用 chooseMedia 返回的临时路径：
//   tempFilePath 只在当前生命周期有效，小程序重启后就失效，
//   所以必须用 FileSystemManager.saveFile 落成 savedFilePath 才能长期显示。
//
// 边界：这是「本机文件」，不是「云端存储」。清除小程序缓存/换手机/重装都会丢，
// 也没有任何审核与鉴权。真实产品必须上传到带鉴权的对象存储并做内容审核。
const { getState, saveState } = require('./store.js');

const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;   // 单张上限 5MB（压缩后一般 200–600KB）

function fs() {
  return wx.getFileSystemManager();
}

function list() {
  return getState().photos || [];
}

function remainCount() {
  return Math.max(0, MAX_PHOTOS - list().length);
}

function isUsable(item) {
  return item && item.path && String(item.path).indexOf('tmp') === -1;
}

// 把一批临时文件逐个落盘，回调返回 { ok, saved:[], failed:[] }
function saveTemps(tempFiles, cb) {
  const files = (tempFiles || []).slice(0, remainCount());
  if (!files.length) {
    cb({ ok: false, saved: [], failed: [], msg: '已达上限' });
    return;
  }
  const saved = [];
  const failed = [];
  let i = 0;

  function next() {
    if (i >= files.length) {
      if (saved.length) {
        const s = getState();
        const photos = (s.photos || []).concat(saved);
        s.photos = photos;
        saveState(s);
      }
      cb({ ok: saved.length > 0, saved: saved, failed: failed });
      return;
    }
    const f = files[i];
    i += 1;

    if (f.size && f.size > MAX_BYTES) {
      failed.push({ path: f.tempFilePath, msg: '超过 5MB' });
      next();
      return;
    }

    fs().saveFile({
      tempFilePath: f.tempFilePath,
      success(res) {
        saved.push({
          id: 'p_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4),
          path: res.savedFilePath,
          ts: Date.now()
        });
        next();
      },
      fail() {
        failed.push({ path: f.tempFilePath, msg: '保存失败' });
        next();
      }
    });
  }

  next();
}

// 选图并落盘。cb({ ok, saved, failed, msg })
function pick(cb) {
  const done = cb || function () {};
  const remain = remainCount();
  if (remain <= 0) {
    done({ ok: false, saved: [], failed: [], msg: '最多 ' + MAX_PHOTOS + ' 张，先删一张再加' });
    return;
  }

  const onPicked = function (tempFiles) {
    saveTemps(tempFiles, done);
  };

  // chooseMedia 需要基础库 2.10.0+；老版本退到 chooseImage
  if (wx.chooseMedia) {
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        onPicked(res.tempFiles || []);
      },
      fail() {
        done({ ok: false, saved: [], failed: [], msg: '已取消' });
      }
    });
    return;
  }

  wx.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success(res) {
      onPicked((res.tempFilePaths || []).map(function (p) { return { tempFilePath: p }; }));
    },
    fail() {
      done({ ok: false, saved: [], failed: [], msg: '已取消' });
    }
  });
}

// 选单张并落盘，用于头像。cb({ ok, path })
function pickAvatar(cb) {
  const done = cb || function () {};
  const onPicked = function (tempFilePath) {
    if (!tempFilePath) {
      done({ ok: false });
      return;
    }
    fs().saveFile({
      tempFilePath: tempFilePath,
      success(res) { done({ ok: true, path: res.savedFilePath }); },
      fail() { done({ ok: false, msg: '头像保存失败' }); }
    });
  };

  if (wx.chooseMedia) {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const f = (res.tempFiles || [])[0];
        onPicked(f && f.tempFilePath);
      },
      fail() { done({ ok: false }); }
    });
    return;
  }
  wx.chooseImage({
    count: 1,
    success(res) { onPicked((res.tempFilePaths || [])[0]); },
    fail() { done({ ok: false }); }
  });
}

function removeFileQuietly(path) {
  if (!path) return;
  try {
    fs().unlink({ filePath: path, fail() {} });
  } catch (e) {
    // 文件已不存在时忽略
  }
}

function remove(id) {
  const s = getState();
  const arr = s.photos || [];
  const hit = arr.filter(function (p) { return p.id === id; })[0];
  s.photos = arr.filter(function (p) { return p.id !== id; });
  saveState(s);
  if (hit) removeFileQuietly(hit.path);
  return s.photos;
}

// 注销时清掉所有本地图片（含头像）
function clearAllFiles() {
  const s = getState();
  (s.photos || []).forEach(function (p) { removeFileQuietly(p.path); });
  if (s.account && s.account.avatar) removeFileQuietly(s.account.avatar);
}

module.exports = {
  MAX_PHOTOS: MAX_PHOTOS,
  MAX_BYTES: MAX_BYTES,
  list: list,
  remainCount: remainCount,
  isUsable: isUsable,
  pick: pick,
  pickAvatar: pickAvatar,
  remove: remove,
  removeFileQuietly: removeFileQuietly,
  clearAllFiles: clearAllFiles
};
