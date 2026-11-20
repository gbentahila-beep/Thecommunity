// Étapes 28 à 32 (démonstration) : « venir seul·e » mis en avant, prix membre discret, textes de paiement cohérents,
// parcours en 5 étapes ; fiches « Qui allez-vous rencontrer ? » ; « Mes rencontres » ; profil enrichi ; navigation.
// Prérequis : site de démonstration lancé (npx next start -p 3100).
const { chromium } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 10000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  globalThis.__page = p;

  // ——— 28 ———
  await p.goto(base + '/', { waitUntil: 'load' });
  assert(await p.getByRole('heading', { level: 1 }).textContent() === 'Your peopleare out there.', '28 : accroche inchangée');
  const trust = p.getByTestId('home-trust');
  assert(await trust.getByText('Venez seul·e : tout le monde est là pour rencontrer du monde').isVisible(), '28 : repère « venez seul·e »');
  assert(await trust.getByText('Nous composons les groupes pour faciliter les échanges').isVisible(), '28 : repère « groupes composés »');
  const order = await p.evaluate(() => { const t = document.querySelector('[data-testid=home-trust]'); const h = [...document.querySelectorAll('h2')].find((x) => x.textContent.startsWith('Cette semaine')); return t && h ? t.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING : 0; });
  assert(order > 0, '28 : repères avant « Cette semaine »');
  await p.goto(base + '/experiences/padel-entre-inconnus-anfa', { waitUntil: 'load' });
  assert(await p.locator('aside').getByText('150 DH').first().isVisible() && await p.locator('aside').getByTestId('member-price').textContent() === '128 DH membres', '28 : prix public en grand, prix membre discret');
  assert(!(await p.locator('s').count()) && !(await p.getByRole('link', { name: 'Devenir membre' }).count()), '28 : ni prix barré ni « Devenir membre » sur une expérience ouverte à tous');
  assert(await p.getByRole('link', { name: 'Rejoindre cette expérience' }).first().isVisible(), '28 : bouton « Rejoindre cette expérience »');
  await p.goto(base + '/a-propos', { waitUntil: 'load' });
  assert(!(await p.getByText('bientôt par carte').count()), '28 : plus de « bientôt par carte » dans À propos');
  await p.goto(base + '/aide/payer-ma-reservation', { waitUntil: 'load' });
  const art = (await p.locator('article').textContent());
  assert(!art.includes('[[') && !art.includes('(bientôt)') && art.includes("n'est pas encore ouvert"), '28 : aide « Payer » selon le moyen ouvert (démo : aucun)');
  await p.goto(base + '/comment-ca-marche', { waitUntil: 'load' });
  assert(await p.getByTestId('booking-steps').locator('li').count() === 5, '28 : parcours en 5 étapes');
  await p.goto(base + '/espace', { waitUntil: 'load' });
  assert(await visible(p.getByTestId('membership-suggestion')), '28 : abonnement proposé après une première expérience (espace membre)');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (globalThis.__page && process.env.FAIL_SHOT) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  if (globalThis.__page) console.error('URL au moment de l’échec :', globalThis.__page.url());
  process.exit(1);
});
