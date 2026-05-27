const fs = require('fs');
const path = require('path');
const { launchPersistentContext } = require('../src/services/cookieStore');

async function setup(page) {
  await page.goto('https://creator.xiaohongshu.com/publish/publish?target=image', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(4000);
  await page.locator('input[type="file"]').first().setInputFiles(path.join(__dirname, '../materials/a/a1.png'));
  await page.waitForTimeout(10000);
  const title = `真发布${Date.now().toString().slice(-4)}`;
  await page.locator('input[placeholder*="标题"]').fill(title);
  await page.locator('[contenteditable=true]').first().fill('验证正文');
  await page.waitForTimeout(2000);
  return title;
}

function attachApiListener(page) {
  const apis = [];
  page.on('response', (r) => {
    const u = r.url();
    if (/note|publish|post|galaxy|edith.*note/.test(u) && r.request().method() === 'POST') {
      apis.push({ url: u.slice(0, 120), status: r.status() });
    }
  });
  return apis;
}

async function tryClick(name, fn) {
  const profilesDir = path.join(__dirname, '../profiles');
  const dirs = fs.readdirSync(profilesDir).filter((d) => !d.startsWith('_'));
  const profileDir = path.join(profilesDir, dirs[0]);
  const pw = require('playwright');
  const ctx = await launchPersistentContext(pw, profileDir, true);
  const page = ctx.pages()[0] || (await ctx.newPage());
  const apis = attachApiListener(page);
  const title = await setup(page);

  try {
    await fn(page);
    await page.waitForTimeout(10000);
    const body = await page.locator('body').innerText();
    console.log(
      name,
      '-> 发布成功?',
      body.includes('发布成功'),
      'apis',
      apis.length,
      JSON.stringify(apis.slice(0, 5))
    );
    return { name, success: body.includes('发布成功'), apis, title };
  } catch (e) {
    console.log(name, 'ERR', e.message);
    return { name, error: e.message };
  } finally {
    await ctx.close();
  }
}

(async () => {
  const method = process.argv[2] || 'pierce';

  if (method === 'pierce') {
    await tryClick('pierce text=发布', async (page) => {
      const btn = page.locator('xhs-publish-btn').locator('text=发布');
      console.log('  pierce count', await btn.count());
      if (await btn.count()) await btn.first().click({ force: true });
    });
  } else if (method === 'coords') {
    for (const ratio of [0.5, 0.65, 0.75, 0.85, 0.92]) {
      await tryClick(`click ratio ${ratio}`, async (page) => {
        const box = await page.locator('xhs-publish-btn').first().boundingBox();
        await page.mouse.click(box.x + box.width * ratio, box.y + box.height / 2);
      });
    }
  } else if (method === 'dispatch') {
    await tryClick('dispatch click event', async (page) => {
      await page.evaluate(() => {
        const el = document.querySelector('xhs-publish-btn');
        el?.click();
        el?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
    });
  } else if (method === 'role') {
    await tryClick('getByRole button 发布', async (page) => {
      const btn = page.getByRole('button', { name: /^发布$/ });
      console.log('  role count', await btn.count());
      if (await btn.count()) await btn.last().click();
    });
  }
})().catch(console.error);
