const fs = require('fs');
const path = require('path');
const { launchPersistentContext } = require('../src/services/cookieStore');

(async () => {
  const profilesDir = path.join(__dirname, '../profiles');
  const dirs = fs.readdirSync(profilesDir).filter(
    (d) => !d.startsWith('_') && fs.statSync(path.join(profilesDir, d)).isDirectory()
  );
  const profileDir = path.join(profilesDir, dirs[0]);
  const pw = require('playwright');
  const ctx = await launchPersistentContext(pw, profileDir, true);
  const page = ctx.pages()[0] || (await ctx.newPage());

  await page.goto('https://creator.xiaohongshu.com/publish/publish?target=image', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(4000);
  await page.locator('input[type="file"]').first().setInputFiles(path.join(__dirname, '../materials/a/a1.png'));
  await page.waitForTimeout(8000);
  await page.locator('input[placeholder*="标题"]').fill('测试按钮结构');
  await page.locator('[contenteditable=true]').first().fill('正文内容');
  await page.waitForTimeout(2000);

  const info = await page.evaluate(() => {
    const el = document.querySelector('xhs-publish-btn');
    if (!el) return { found: false };
    const getTree = (node, depth = 0) => {
      if (depth > 6) return '...';
      const children = [...node.children].map((c) => ({
        tag: c.tagName,
        text: (c.innerText || '').slice(0, 40),
        class: (c.className || '').toString().slice(0, 80),
        rect: c.getBoundingClientRect
          ? { x: c.getBoundingClientRect().x, y: c.getBoundingClientRect().y, w: c.getBoundingClientRect().width, h: c.getBoundingClientRect().height }
          : null,
        children: c.children.length ? getTree(c, depth + 1) : [],
      }));
      return children;
    };
    return {
      found: true,
      innerHTML: el.innerHTML.slice(0, 3000),
      tree: getTree(el),
    };
  });
  console.log(JSON.stringify(info, null, 2));

  // Find all visible publish-related elements
  const allPublish = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('*').forEach((el) => {
      const text = (el.innerText || '').trim();
      if (text === '发布' || text === '暂存离开' || text.includes('暂存离开')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          results.push({
            tag: el.tagName,
            text: text.slice(0, 30),
            class: (el.className || '').toString().slice(0, 80),
            x: r.x, y: r.y, w: r.width, h: r.height,
            parent: el.parentElement?.tagName,
          });
        }
      }
    });
    return results;
  });
  console.log('publish elements:', JSON.stringify(allPublish, null, 2));

  // screenshot for debug
  await page.screenshot({ path: path.join(__dirname, '../logs/publish-btn-debug.png'), fullPage: true });
  console.log('screenshot saved');

  await ctx.close();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
