// Kit presse (données de démonstration) : contenu en 3 langues, fichiers téléchargeables, copie, mobile.
// Usage : site lancé (npx next start -p 3100 dans apps/web), puis node tests/e2e/presse.e2e.cjs
const { chromium } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.locator('footer').getByRole('link', { name: 'Presse' }).click();
  await page.waitForURL('**/presse');
  assert(await page.getByRole('heading', { level: 1, name: 'Kit presse' }).isVisible(), 'lien « Presse » du pied de page → kit presse');
  for (const h of ['En bref', 'Faits clés', 'La fondatrice', 'Logos', 'Couleurs', 'Typographies', 'Photos', 'Contact presse']) {
    assert(await page.getByRole('heading', { level: 2, name: h }).isVisible(), `section « ${h} »`);
  }
  const links = await page.locator('a[download]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  assert(links.length === 14, `14 fichiers téléchargeables (6 logos × SVG/PNG + 2 photos) — ${links.length}`);
  for (const href of links) {
    const r = await fetch(base + href);
    assert(r.ok && Number(r.headers.get('content-length') ?? 1) > 0, `fichier disponible : ${href}`);
  }
  await page.getByRole('button', { name: 'Copier' }).first().click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  assert(clip.startsWith('The Host Club organise à Casablanca'), 'présentation copiée dans le presse-papiers');
  assert(await page.getByText('Copié').first().isVisible(), 'copie confirmée à l’écran');
  assert(!(await page.content()).match(/\d+\s*(membres|participants)\b/), 'aucun chiffre de fréquentation inventé');

  const m = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  m.on('pageerror', (e) => errs.push(e.message));
  for (const [path, title, dir] of [['/presse', 'Kit presse', 'ltr'], ['/en/presse', 'Press kit', 'ltr'], ['/ar/presse', 'الملف الصحفي', 'rtl']]) {
    await m.goto(base + path, { waitUntil: 'load' });
    assert(await m.getByRole('heading', { level: 1, name: title }).isVisible(), `${path} : titre « ${title} »`);
    assert((await m.locator('html').getAttribute('dir')) === dir, `${path} : sens d'écriture ${dir}`);
    assert(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${path} : pas de débordement (mobile)`);
  }
  assert(errs.length === 0, `aucune erreur JavaScript (${errs.join(' | ')})`);
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
