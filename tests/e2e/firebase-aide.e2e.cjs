// Centre d'aide branché sur les émulateurs : « Cet article vous a-t-il aidé ? », candidature partenaire,
// lecture dans le back-office. Prérequis : émulateurs + `npm run seed` + site construit en mode émulateurs (docs/12, docs/14).
const { chromium, devices } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const PROJECT = 'demo-thecommunity';
const FS = 'http://127.0.0.1:8080';
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const fsList = async (c) => {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${c}?pageSize=300`, { headers: { Authorization: 'Bearer owner' } });
  return r.ok ? ((await r.json()).documents ?? []) : [];
};

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  globalThis.__page = page;
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('dialog', (d) => { errs.push('dialog: ' + d.message()); d.dismiss(); });

  // 1. Retour sur un article (visiteur non connecté)
  const before = (await fsList('helpFeedback')).length;
  await page.goto(`${base}/aide/liste-d-attente`);
  assert(await visible(page.getByText('Cet article vous a-t-il aidé ?')), 'question « utile ? » affichée');
  await page.getByRole('button', { name: 'Non' }).click();
  assert(await visible(page.getByText(/Dites-nous ce qui manquait/)), 'réponse « Non » : remerciement + lien Contact');
  const fb = await fsList('helpFeedback');
  const last = fb.find((d) => d.fields.article.stringValue === 'liste-d-attente' && d.fields.helpful.booleanValue === false);
  assert(fb.length === before + 1 && last && last.fields.locale.stringValue === 'fr', 'Firestore : retour anonyme enregistré (article, non, fr)');

  // 2. Candidature partenaire
  await page.goto(`${base}/devenir-partenaire`);
  const stamp = Date.now();
  await page.getByLabel('Votre prénom et nom').fill('Yasmine Alaoui');
  await page.getByLabel("Nom du lieu ou de l'activité").fill(`Studio Lumière ${stamp}`);
  await page.getByLabel("Type d'activité").selectOption('studio');
  await page.getByLabel('E-mail professionnel').fill('contact@studio-lumiere.ma');
  await page.getByLabel('Site web ou Instagram (facultatif)').fill('instagram.com/studiolumiere');
  await page.getByLabel('Présentez votre lieu ou votre activité').fill('Cours de yoga en petit groupe à Maarif, 12 personnes maximum, terrasse.');
  await page.getByRole('button', { name: 'Envoyer ma candidature' }).click();
  assert(await visible(page.getByText(/Votre candidature est bien reçue/)), 'candidature envoyée');
  const app = (await fsList('partnerApplications')).find((d) => d.fields.businessName.stringValue === `Studio Lumière ${stamp}`);
  assert(app && app.fields.type.stringValue === 'studio' && app.fields.city.stringValue === 'Casablanca' && app.fields.phone.stringValue === '', 'Firestore : candidature au bon format (ville par défaut, téléphone vide)');

  // 3. Back-office
  const admin = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  admin.on('pageerror', (e) => errs.push(e.message));
  await admin.goto(`${base}/connexion?suite=${encodeURIComponent('/admin')}`, { waitUntil: 'load' });
  await admin.getByLabel('Adresse e-mail').fill('admin@thecommunity.test');
  await admin.getByLabel('Mot de passe').fill('Demo2026!');
  await admin.getByRole('button', { name: 'Se connecter' }).click();
  await admin.waitForURL(/\/admin$/, { timeout: 20000 });
  await admin.goto(`${base}/admin/partenaires`, { waitUntil: 'load' });
  assert(await visible(admin.getByText(`Studio Lumière ${stamp}`)), 'back-office : candidature listée dans Partenaires');
  await admin.goto(`${base}/admin/aide`, { waitUntil: 'load' });
  const row = admin.getByRole('row', { name: /La liste d.attente/ });
  assert(await visible(row), 'back-office : retours par article (Centre d\'aide)');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
