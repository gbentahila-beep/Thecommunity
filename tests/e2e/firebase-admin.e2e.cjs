// Back-office branché sur les émulateurs Firebase (phase 3c).
// Mêmes prérequis que firebase-auth.e2e.cjs. Usage : node tests/e2e/firebase-admin.e2e.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const PROJECT = 'demo-thecommunity';
const FS = 'http://127.0.0.1:8080';
const AUTH = 'http://127.0.0.1:9099';
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 10000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const fsQuery = async (collection, field, value) => {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }),
  });
  return (await r.json()).filter((x) => x.document).map((x) => x.document);
};
const fsGet = async (p) => (await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${p}`, { headers: { Authorization: 'Bearer owner' } })).json();
const authLookup = async (email) => (await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, {
  method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: [email] }),
})).json()).users?.[0];

async function login(page, email, password = 'Demo2026!', suite = '/admin') {
  await page.goto(`${base}/connexion?suite=${encodeURIComponent(suite)}`, { waitUntil: 'load' });
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const newPage = async () => {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('dialog', (d) => { errs.push('fenêtre système inattendue : ' + d.message()); d.dismiss(); });
    globalThis.__page = p;
    return p;
  };

  // 1. Accès
  let page = await newPage();
  await page.goto(base + '/admin', { waitUntil: 'load' });
  assert(page.url().includes('/connexion') && decodeURIComponent(page.url()).includes('suite=/admin'), 'back-office : redirection vers la connexion sans session');
  await login(page, 'salma@thecommunity.test', 'Demo2026!', '/espace');
  await page.waitForURL(/\/espace$/, { timeout: 20000 });
  await page.goto(base + '/admin', { waitUntil: 'load' });
  assert(await visible(page.getByText('Page introuvable')), 'un membre n’accède pas au back-office (404)');

  page = await newPage();
  await login(page, 'admin@thecommunity.test');
  await page.waitForURL(/\/admin$/, { timeout: 20000 });
  assert(await visible(page.getByText('admin@thecommunity.test')), 'connexion admin → tableau de bord, compte affiché');
  assert(await visible(page.getByRole('cell', { name: 'Dîner entre inconnus' })), 'tableau de bord lu depuis Firestore');

  // 2. Création d'une expérience avec photo et 2 dates
  const future = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
  await page.goto(base + '/admin/experiences/nouvelle', { waitUntil: 'load' });
  await page.locator('#f-titleFr').fill('Atelier calligraphie arabe');
  await page.locator('#f-summaryFr').fill('Initiez-vous au qalam avec un calligraphe de Casablanca.');
  await page.locator('#f-descriptionFr').fill('Deux heures pour découvrir les styles naskh et maghribi, en petit groupe, thé à la menthe compris.');
  await page.locator('#f-categoryId').selectOption('create');
  await page.locator('#f-district').fill('Habous');
  await page.locator('#f-venueName').fill('Maison d’hôtes partenaire');
  await page.locator('#f-address').fill('Quartier Habous, Casablanca');
  await page.locator('#f-priceDh').fill('250');
  await page.locator('#f-costPerSeatDh').fill('120');
  await page.locator('#f-status').selectOption('published');
  await page.locator('[id="f-sessions.firstDate"]').fill(future);
  await page.locator('[id="f-sessions.time"]').fill('16:00');
  await page.locator('[id="f-sessions.weeks"]').fill('2');
  await page.locator('[id="f-sessions.capacity"]').fill('10');
  const img = fs.readFileSync(path.join(__dirname, '../../apps/web/public/demo/atelier-ceramique.webp'));
  await page.locator('input[type=file]').setInputFiles({ name: 'calligraphie.webp', mimeType: 'image/webp', buffer: img });
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  assert(await visible(page.getByText('Expérience enregistrée'), 20000), 'expérience enregistrée');
  const exps = await fsQuery('experiences', 'slug', 'atelier-calligraphie-arabe-casablanca');
  assert(exps.length === 1, 'document expérience créé (adresse « atelier-calligraphie-arabe-casablanca »)');
  const expId = exps[0].name.split('/').pop();
  const sessions = await fsQuery('sessions', 'experienceId', expId);
  assert(sessions.length === 2 && sessions.every((s) => s.fields.capacity.integerValue === '10'), '2 dates de 10 places créées');
  const eco = await fsGet(`experiences/${expId}/private/economics`);
  assert(eco.fields.costPerSeat.integerValue === '12000', 'modèle économique enregistré (coût 120 DH)');
  const imgPath = exps[0].fields.images.arrayValue.values[0].mapValue.fields.path.stringValue;
  const imgRes = await fetch(`http://127.0.0.1:9199/v0/b/${PROJECT}.appspot.com/o/${encodeURIComponent(imgPath)}?alt=media`);
  assert(imgRes.ok && imgPath.startsWith(`experiences/${expId}/`), 'photo envoyée dans Storage');

  // 3. Visible sur le site public
  await page.goto(base + '/experiences/atelier-calligraphie-arabe-casablanca', { waitUntil: 'load' });
  assert(await visible(page.getByRole('heading', { name: 'Atelier calligraphie arabe' })), 'fiche publique de la nouvelle expérience');
  const loaded = await page.locator('img[src*="9199"]').first().evaluate((el) => el.complete && el.naturalWidth > 0);
  assert(loaded, 'photo affichée depuis Storage');
  await page.goto(base + '/experiences?categorie=create', { waitUntil: 'load' });
  assert(await visible(page.getByRole('link', { name: 'Atelier calligraphie arabe' })), 'présente dans le catalogue (cache rafraîchi)');

  // 4. Modification du prix
  await page.goto(`${base}/admin/experiences/${expId}`, { waitUntil: 'load' });
  await page.locator('#f-priceDh').fill('199');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  assert(await visible(page.getByText('Expérience enregistrée'), 20000), 'modification enregistrée');
  assert((await fsGet(`experiences/${expId}`)).fields.price.mapValue.fields.amount.integerValue === '19900', 'nouveau prix en base (199 DH)');
  assert((await fsQuery('sessions', 'experienceId', expId)).length === 2, 'pas de dates en double à la modification');
  await page.goto(base + '/experiences/atelier-calligraphie-arabe-casablanca', { waitUntil: 'load' });
  assert(await visible(page.getByText('199 DH')), 'nouveau prix affiché sur le site');

  // 5. Validation serveur
  await page.goto(base + '/admin/experiences/nouvelle', { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  assert(await visible(page.getByText(/champs? à corriger/)), 'formulaire incomplet refusé avant envoi');

  // 6. Suspension d'un membre
  // Un membre de démonstration (mot de passe connu « Demo2026! »).
  const victim = (await fsQuery('users', 'role', 'user')).find((u) => /\/u-\d+$/.test(u.name));
  const victimEmail = victim.fields.email.stringValue;
  await page.goto(`${base}/admin/utilisateurs?q=${encodeURIComponent(victimEmail)}`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'Suspendre' }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  assert(await visible(page.getByRole('button', { name: 'Réactiver' })), 'compte suspendu depuis le back-office (confirmation dans la page)');
  assert((await authLookup(victimEmail)).disabled === true, 'compte désactivé côté authentification');
  const vp = await newPage();
  await login(vp, victimEmail, 'Demo2026!', '/espace');
  assert(await visible(vp.getByText('Ce compte est suspendu')), 'le membre suspendu ne peut plus se connecter');
  await page.getByRole('button', { name: 'Réactiver' }).click();
  assert(await visible(page.getByRole('button', { name: 'Suspendre' })), 'compte réactivé');

  // 7. Nomination d'un admin par le super-admin
  await page.locator(`select[id^="role-"]`).first().selectOption('admin');
  assert(await visible(page.getByText('Donner le rôle « Admin » à ce compte ?')), 'confirmation du rôle dans la page');
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await page.waitForFunction(() => document.querySelector('select[id^="role-"]')?.value === 'admin');
  await page.waitForTimeout(1500);
  const claims = JSON.parse((await authLookup(victimEmail)).customAttributes ?? '{}');
  assert(claims.role === 'admin', 'custom claim « admin » posé par le serveur');
  const np = await newPage();
  await login(np, victimEmail);
  await np.waitForURL(/\/admin$/, { timeout: 20000 });
  assert(await visible(np.getByText(victimEmail)), 'le nouvel admin accède au back-office');
  await np.goto(base + '/admin/utilisateurs', { waitUntil: 'load' });
  assert((await np.locator('select[id^="role-"]').count()) === 0, 'un admin (non super-admin) ne voit pas le choix des rôles');

  // 8. Journal et demandes 09-08
  const logs = await (await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/auditLogs?pageSize=100`, { headers: { Authorization: 'Bearer owner' } })).json();
  const actions = (logs.documents ?? []).map((d) => d.fields.action.stringValue);
  assert(['experience.create', 'experience.update', 'user.setStatus', 'user.setRole'].every((a) => actions.includes(a)), 'actions sensibles journalisées');
  await page.goto(base + '/admin/demandes', { waitUntil: 'load' });
  assert(await visible(page.getByRole('heading', { name: 'Demandes loi 09-08' })), 'page des demandes 09-08');

  console.log(errs.length ? 'ERREURS NAVIGATEUR:\n' + errs.join('\n') : 'aucune erreur navigateur');
  await b.close();
  if (errs.length) process.exit(1);
})().catch(async (e) => {
  console.error(e.message);
  const p = globalThis.__page;
  if (p && process.env.FAIL_SHOT) { await p.screenshot({ path: process.env.FAIL_SHOT }).catch(() => undefined); console.error('URL au moment de l’échec :', p.url()); }
  process.exit(1);
});
