const fs = require('fs'), path = require('path');
const ROOT = process.argv[2];
const files = [];
(function walk(d) {
  fs.readdirSync(d).forEach(n => {
    const p = path.join(d, n), st = fs.statSync(p);
    if (st.isDirectory()) { if (n !== 'node_modules' && n !== '_docs') walk(p); }
    else if (n.endsWith('.wxml')) files.push(p);
  });
})(ROOT);

const VOID = new Set(['input','icon','progress','switch','slider','radio','checkbox','import','include','wxs','br']);
let problems = 0;

files.forEach(f => {
  const rel = path.relative(ROOT, f);
  const src = fs.readFileSync(f, 'utf8');
  const issues = [];

  // 1. 表达式里出现 < 或 > —— WXML 编译器的头号杀手
  const mustache = src.match(/\{\{[^}]*\}\}/g) || [];
  mustache.forEach(m => {
    if (/[<>]/.test(m)) issues.push('表达式含尖括号: ' + m);
  });

  // 2. 裸 & （非实体）
  const rawAmp = src.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g);
  if (rawAmp) issues.push('裸 & 出现 ' + rawAmp.length + ' 次（需写 &amp;）');

  // 3. 标签配对（正确识别 <image ... /> 与 <image></image>）
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let m, stack = [];
  while ((m = re.exec(src))) {
    const closing = m[1] === '/', tag = m[2], selfClose = m[4] === '/';
    if (closing) {
      if (!stack.length) { issues.push('多余闭合 </' + tag + '>'); continue; }
      const top = stack.pop();
      if (top !== tag) issues.push('错配: 期望 </' + top + '> 实际 </' + tag + '>');
    } else if (selfClose) {
      // 自闭合，入栈出栈都不需要
    } else if (VOID.has(tag)) {
      // 空元素标签允许不闭合（WXML 里 <image> 可不写闭合）
    } else {
      stack.push(tag);
    }
  }
  if (stack.length) issues.push('未闭合: ' + stack.join(', '));

  if (issues.length) {
    problems++;
    console.log('✗ ' + rel);
    issues.forEach(i => console.log('    - ' + i));
  } else {
    console.log('✓ ' + rel);
  }
});
console.log(problems === 0 ? '\nWXML_LINT_OK  全部 ' + files.length + ' 个文件通过' : '\nWXML_LINT_FAIL  ' + problems + ' 个文件有问题');
