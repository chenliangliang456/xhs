const fs = require('fs');
const path = require('path');
const { launchPersistentContext } = require('../src/services/cookieStore');

(async () => {
  const profilesDir = path.join(__dirname, '../profiles');
  const dirs = fs.readdirSync(profilesDir).filter((d) => !d.startsWith('_'));
  const profileDir = path.join(profilesDir, dirs[0]);
  const pw = require('playwright');
  const ctx = await launchPersistentContext(pw, profileDir, true);
  const page = ctx.pages()[0] || (await ctx.newPage());

  const noteResponses = [];
  page.on('response', async (r) => {
    if (r.url().includes('/web_api/sns/v2/note') && r.request().method() === 'POST') {
      let body = null;
      try {
        body = await r.json();
      } catch {
        body = await r.text().catch(() => null);
      }
      noteResponses.push({ status: r.status(), body });
    }
  });

  await page.goto('https://creator.xiaohongshu.com/publish/publish?target=image', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(4000);
  await page.locator('input[type="file"]').first().setInputFiles(path.join(__dirname, '../materials/a/a1.png'));
  await page.waitForTimeout(10000);

  const title = `验证发布${Date.now().toString().slice(-4)}`;
  await page.locator('input[placeholder*="标题"]').fill(title);
  await page.locator('[contenteditable=true]').first().fill('这是验证发布的正文');
  await page.waitForTimeout(2000);

  const box = await page.locator('xhs-publish-btn').first().boundingBox();
  console.log('click at 0.65', box.x + box.width * 0.65, box.y + box.height / 2);
  await page.mouse.click(box.x + box.width * 0.65, box.y + box.height / 2);

  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);
    if (noteResponses.length) break;
  }

  console.log('note API responses:', JSON.stringify(noteResponses, null, 2));

  await page.waitForTimeout(5000);
  const bodyAfter = await page.locator('body').innerText();
  console.log('has 发布成功:', bodyAfter.includes('发布成功'));
  console.log('has 审核中:', bodyAfter.includes('审核中'));
  console.log('url:', page.url());

  await page.goto('https://creator.xiaohongshu.com/new/note-manager', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(6000);
  const mgr = await page.locator('body').innerText();
  console.log('note manager has title:', mgr.includes(title));
  console.log('note count hint:', mgr.match(/全部笔记\((\d+)\)/)?.[1]);
  console.log('mgr excerpt:', mgr.slice(0, 800));

  await ctx.close();
})().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});
