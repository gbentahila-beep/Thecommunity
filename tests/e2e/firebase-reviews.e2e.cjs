// Avis et expériences sans date sur les émulateurs (étape 5a) : l'admin crée une expérience SANS date →
// elle est listée « Déjà vécues / de nouvelles dates arrivent » ; un membre demande à être prévenu ; l'admin
// ajoute une date → notification ; une personne présente laisse un avis → visible sur la fiche ; l'admin le masque.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:8080';
const PROJECT = 'demo-thecommunity';
const OWNER = { Authorization: 'Bearer owner' };
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const doc = (p) => `${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${p}`;
const fsGet = async (p) => { const r = await fetch(doc(p), { headers: OWNER }); return r.ok ? r.json() : null; };
const fsList = async (p) => { const r = await fetch(doc(p) + '?pageSize=300', { headers: OWNER }); return r.ok ? ((await r.json()).documents ?? []) : []; };
const patch = (p, fields) => fetch(doc(p) + '?' + Object.keys(fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&'), {
  method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }),
});
const shot = async (page, name) => { if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.jpg`, quality: 80, fullPage: true }); };

async function makeMember(firstName, lastName) {
  const email = `${firstName.toLowerCase()}.${Date.now()}@example.com`;
  const password = 'MotDePasse!2026';
  const { localId: uid } = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  })).json();
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  await new Promise((r) => setTimeout(r, 1500));
  await patch(`users/${uid}`, { onboardingCompleted: { booleanValue: true }, status: { stringValue: 'active' }, firstName: { stringValue: firstName }, lastName: { stringValue: lastName } });
  return { email, password, uid };
}
async function login(page, who, suite) {
  await page.goto(`${base}/connexion?suite=${encodeURIComponent(suite)}`);
  await page.getByLabel('Adresse e-mail').fill(who.email);
  await page.getByLabel('Mot de passe').fill(who.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(`**${suite}`, { timeout: 20000 });
}

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const open = async (opts) => { const p = await (await b.newContext(opts)).newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('fenêtre système : ' + d.message()); d.dismiss(); }); return p; };
  const admin = await open({ viewport: { width: 1366, height: 900 } });
  globalThis.__page = admin;
  await login(admin, { email: 'admin@thecommunity.test', password: 'Demo2026!' }, '/admin');

  // 1. Création SANS date
  await admin.goto(`${base}/admin/experiences/nouvelle`);
  await admin.locator('#f-titleFr').fill('Atelier tapis berbère');
  await admin.locator('#f-summaryFr').fill('Découvrez le tissage berbère avec une artisane de Casablanca.');
  await admin.locator('#f-descriptionFr').fill('Deux heures pour apprendre les nœuds et les motifs du tapis berbère, en petit groupe, thé compris.');
  await admin.locator('#f-categoryId').selectOption('create');
  await admin.locator('#f-district').fill('Habous');
  await admin.locator('#f-venueName').fill('Atelier partenaire');
  await admin.locator('#f-address').fill('Quartier Habous, Casablanca');
  await admin.locator('#f-priceDh').fill('300');
  await admin.locator('#f-costPerSeatDh').fill('150');
  await admin.locator('#f-status').selectOption('published');
  await admin.getByLabel('Programmer des dates maintenant').uncheck();
  assert(await admin.getByText('Sans date, la fiche est publiée avec « Prochaines dates bientôt »').isVisible(), 'option « sans date » expliquée');
  const img = fs.readFileSync(path.join(__dirname, '../../apps/web/public/demo/atelier-ceramique.webp'));
  await admin.locator('input[type=file]').setInputFiles({ name: 'tapis.webp', mimeType: 'image/webp', buffer: img });
  await admin.getByRole('button', { name: 'Enregistrer' }).click();
  assert(await visible(admin.getByText('Expérience enregistrée'), 20000), 'expérience créée sans date');
  const exp = (await fsList('experiences')).find((d) => d.fields.slug?.stringValue === 'atelier-tapis-berbere-casablanca');
  const expId = exp.name.split('/').pop();
  assert((await fsList('sessions')).every((s) => s.fields.experienceId.stringValue !== expId), 'aucune date créée');
  await admin.goto(`${base}/admin/experiences`);
  assert(await visible(admin.getByRole('link', { name: 'Aucune — ajouter des dates' })), 'liste admin : « Aucune — ajouter des dates »');

  // 2. Listée dans le catalogue ; un membre demande à être prévenu
  const nora = await makeMember('Nora', 'Alami');
  const m = await open({ ...devices['iPhone 13'] });
  globalThis.__page = m;
  await m.goto(`${base}/experiences?categorie=create`);
  assert(await visible(m.getByRole('heading', { name: 'Déjà vécues — de nouvelles dates arrivent' })), 'catalogue : section des expériences sans date');
  assert(await visible(m.getByRole('link', { name: 'Atelier tapis berbère' })), 'catalogue : l’expérience sans date est listée');
  assert(await m.getByText('Prochaines dates bientôt').first().isVisible(), 'carte : « Prochaines dates bientôt »');
  await login(m, nora, '/experiences/atelier-tapis-berbere-casablanca');
  await m.getByRole('button', { name: 'Me prévenir des prochaines dates' }).first().click();
  assert(await visible(m.getByRole('button', { name: 'Vous serez prévenu·e' })), 'alerte « prochaines dates » activée');
  assert(await fsGet(`experienceAlerts/${expId}_${nora.uid}`), 'Firestore : alerte enregistrée');

  // 3. L'admin repropose une date → Nora est prévenue
  const future = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
  await admin.goto(`${base}/admin/experiences/${expId}`);
  await admin.getByLabel("Créer ces nouvelles dates à l'enregistrement").check();
  await admin.locator('[id="f-sessions.firstDate"]').fill(future);
  await admin.locator('[id="f-sessions.time"]').fill('16:00');
  await admin.locator('[id="f-sessions.weeks"]').fill('1');
  await admin.locator('[id="f-sessions.capacity"]').fill('8');
  await admin.getByRole('button', { name: 'Enregistrer' }).click();
  assert(await visible(admin.getByText('Expérience enregistrée'), 20000), 'date ajoutée à l’expérience');
  await m.goto(`${base}/espace/notifications`);
  assert(await visible(m.getByText('Nouvelles dates : Atelier tapis berbère')), 'Nora prévenue des nouvelles dates');

  // 4. Avis : une réservation « vécue » sur une expérience existante
  const sess = (await fsList('sessions')).find((s) => s.fields.experienceId.stringValue === expId);
  const sid = sess.name.split('/').pop();
  await m.goto(`${base}/reserver/${sid}`);
  await m.getByRole('button', { name: /Réserver et payer/ }).click();
  await m.waitForURL('**/paiement-test/**', { timeout: 20000 });
  await m.getByRole('button', { name: 'Simuler un paiement accepté' }).click();
  await m.waitForURL('**/espace/reservations/**', { timeout: 20000 });
  const rid = m.url().split('/espace/reservations/')[1].split('?')[0];
  // L'expérience a eu lieu et l'équipe a pointé Nora présente.
  const past = new Date(Date.now() - 3 * 3600000).toISOString();
  const snapFields = (await fsGet(`reservations/${rid}`)).fields.sessionSnapshot.mapValue.fields;
  await patch(`reservations/${rid}`, { status: { stringValue: 'attended' }, sessionSnapshot: { mapValue: { fields: { ...snapFields, endAt: { timestampValue: past } } } } });
  await m.goto(`${base}/espace`);
  assert(await visible(m.getByText(/Atelier tapis berbère/)), 'tableau de bord : expérience à noter');
  await m.goto(`${base}/espace/reservations/${rid}#avis`);
  await m.getByRole('button', { name: 'Publier mon avis' }).click();
  assert(await visible(m.getByText('Choisissez une note de 1 à 5 étoiles.')), 'note obligatoire');
  await m.getByRole('button', { name: '5 étoiles' }).click();
  await m.getByLabel('Votre avis').fill('Une artisane passionnante, on repart avec son petit tapis !');
  await shot(m, 'avis-1-formulaire');
  await m.getByRole('button', { name: 'Publier mon avis' }).click();
  assert(await visible(m.getByText('Merci, votre avis a été publié.')), 'avis publié');
  const rv = await fsGet(`reviews/${rid}`);
  assert(rv.fields.rating.integerValue === '5' && rv.fields.publicName.stringValue === 'Nora A.', 'Firestore : avis 5 étoiles signé « Nora A. »');
  const e2 = await fsGet(`experiences/${expId}`);
  assert(Number(e2.fields.ratingAvg.integerValue ?? e2.fields.ratingAvg.doubleValue) === 5 && e2.fields.ratingCount.integerValue === '1', 'note moyenne de l’expérience : 5 (1 avis)');

  // 5. Modération : l'admin voit l'avis, le masque
  await admin.goto(`${base}/admin/avis`);
  const row = admin.locator('tr', { hasText: 'Nora A.' });
  assert(await visible(row.getByText('passionnante')), 'back-office : avis listé');
  await row.getByRole('button', { name: 'Masquer' }).click();
  assert(await visible(row.getByText('Masqué')), 'avis masqué');
  await shot(admin, 'avis-2-back-office');
  assert((await fsGet(`experiences/${expId}`)).fields.ratingCount.integerValue === '0', 'note recalculée sans l’avis masqué');

  assert(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
