// Abonnement annuel sur les émulateurs (étape 5b) : prix barrés, souscription avec le paiement de test,
// prix membre appliqué à la réservation, réglages et cadeau dans le back-office, expérience réservée aux membres.
// Prérequis : émulateurs + `npm run seed` (formule active : 990 DH, -15 %, accès anticipé 48 h) + site.
const { chromium, devices } = require('playwright');
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
const int = (f) => Number(f?.integerValue ?? f?.doubleValue ?? 0);
const dh = (centimes) => `${(centimes / 100).toLocaleString('fr-FR').replace(/ | /g, ' ')} DH`;
const norm = (t) => (t ?? '').replace(/ | /g, ' ');
const shot = async (page, name) => { if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.jpg`, quality: 80, fullPage: true }); };

async function makeMember(firstName) {
  const email = `${firstName.toLowerCase()}.${Date.now()}@example.com`;
  const password = 'MotDePasse!2026';
  const { localId: uid } = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  })).json();
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  await new Promise((r) => setTimeout(r, 1500));
  const fields = { onboardingCompleted: { booleanValue: true }, status: { stringValue: 'active' }, firstName: { stringValue: firstName }, lastName: { stringValue: 'Essai' } };
  await fetch(doc(`users/${uid}`) + '?' + Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&'), {
    method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }),
  });
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
  // Une date payante en réservation directe (hors dîner social), avec des places.
  let target = null;
  for (const s of await fsList('sessions')) {
    const f = s.fields;
    if (f.createdAt && Date.now() - new Date(f.createdAt.timestampValue).getTime() < 72 * 3600000) continue; // accès anticipé membres
    if (f.status.stringValue !== 'published' || int(f.price.mapValue.fields.amount) === 0) continue;
    if (new Date(f.startAt.timestampValue).getTime() < Date.now() + 13 * 3600000 || int(f.capacity) - int(f.seatsConfirmed) - int(f.seatsHeld) < 2) continue;
    const e = await fsGet(`experiences/${f.experienceId.stringValue}`);
    if (e?.fields.status.stringValue === 'published' && e.fields.admission?.stringValue !== 'on_request' && !e.fields.membersOnly?.booleanValue) { target = { s, e }; break; }
  }
  const sid = target.s.name.split('/').pop();
  const expId = target.e.name.split('/').pop();
  const price = int(target.s.fields.price.mapValue.fields.amount);
  const memberPrice = Math.min(price, Math.round(price * 0.85 / 100) * 100); // arrondi au dirham

  const b = await chromium.launch();
  const errs = [];
  const open = async (opts) => { const p = await (await b.newContext(opts)).newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('fenêtre système : ' + d.message()); d.dismiss(); }); return p; };

  // 1. Visiteur : prix barrés
  const v = await open({ ...devices['iPhone 13'] });
  globalThis.__page = v;
  await v.goto(`${base}/experiences/${target.e.fields.slug.stringValue}`);
  assert(await visible(v.locator('s', { hasText: dh(price) })), `fiche : prix public barré (${dh(price)})`);
  assert(norm(await v.locator('main').textContent()).includes(dh(memberPrice)), `fiche : prix membre affiché (${dh(memberPrice)})`);
  assert(await v.getByRole('link', { name: 'Devenir membre' }).first().isVisible(), 'fiche : « Devenir membre »');
  await v.goto(`${base}/experiences`);
  assert(await v.locator('article s').count() > 0, 'catalogue : prix barrés sur les cartes');

  // 2. Souscription
  const yas = await makeMember('Yasmine');
  const m = await open({ ...devices['iPhone 13'] });
  globalThis.__page = m;
  await login(m, yas, '/abonnement');
  assert(await visible(m.getByText('-15 % sur toutes les expériences')), 'page Abonnement : avantages');
  await m.getByRole('button', { name: /Devenir membre — 990/ }).click();
  await m.waitForURL('**/paiement-test/**', { timeout: 20000 });
  assert(await visible(m.getByText('Abonnement annuel · 12 mois')), 'paiement de test de l’abonnement');
  await m.getByRole('button', { name: 'Simuler un paiement accepté' }).click();
  await m.waitForURL('**/abonnement?paiement=accepte', { timeout: 20000 });
  assert(await visible(m.getByText('Bienvenue parmi les membres')), 'abonnement actif');
  assert(await m.getByText('Vous êtes membre').isVisible(), 'carte de membre');
  await shot(m, 'abonnement-1-membre');
  assert((await fsGet(`memberships/${yas.uid}`)).fields.status.stringValue === 'active', 'Firestore : abonnement actif');

  // 3. Réservation au prix membre
  await m.goto(`${base}/reserver/${sid}`);
  assert(await visible(m.getByText('Votre prix membre est appliqué.')), 'tunnel : prix membre appliqué');
  const cta = m.getByRole('button', { name: /Réserver et payer/ });
  assert(norm(await cta.textContent()).includes(dh(memberPrice)), `bouton au prix membre (${dh(memberPrice)})`);
  await cta.click();
  await m.waitForURL('**/paiement-test/**', { timeout: 20000 });
  await m.getByRole('button', { name: 'Simuler un paiement accepté' }).click();
  await m.waitForURL('**/espace/reservations/**', { timeout: 20000 });
  assert(await visible(m.getByText('Réduction membre')), 'reçu : réduction membre');
  const rid = m.url().split('/espace/reservations/')[1].split('?')[0];
  const pricing = (await fsGet(`reservations/${rid}`)).fields.pricing.mapValue.fields;
  assert(int(pricing.total) === memberPrice && int(pricing.memberDiscount) === price - memberPrice, 'Firestore : total au prix membre');
  await shot(m, 'abonnement-2-recu');

  // 4. Non-membre : prix public, invitation
  const pub = await makeMember('Omar');
  const p = await open({ ...devices['iPhone 13'] });
  await login(p, pub, `/reserver/${sid}`);
  assert(await visible(p.getByText(`Vous payez ${dh(price)}.`)), 'non-membre : paie le prix public, invité à devenir membre');

  // 5. Back-office : réglages, abonnés, cadeau, expérience réservée aux membres
  const admin = await open({ viewport: { width: 1366, height: 900 } });
  globalThis.__page = admin;
  await login(admin, { email: 'admin@thecommunity.test', password: 'Demo2026!' }, '/admin');
  await admin.goto(`${base}/admin/abonnement`);
  assert(await visible(admin.locator('tr', { hasText: 'Yasmine Essai' }).getByText('Actif')), 'back-office : Yasmine abonnée');
  await admin.getByLabel('Prix annuel (DH)').fill('1200');
  await admin.getByRole('button', { name: 'Enregistrer la formule' }).click();
  assert(await visible(admin.getByText('Formule enregistrée.')), 'formule modifiée (1 200 DH)');
  await admin.getByLabel('E-mail du compte').fill(pub.email);
  await admin.getByLabel('Durée (mois)').fill('3');
  await admin.getByLabel('Motif (journalisé)').fill('Partenaire');
  await admin.getByRole('button', { name: 'Offrir' }).click();
  assert(await visible(admin.getByText(/Abonnement offert à Omar/)), 'abonnement offert à Omar');
  await shot(admin, 'abonnement-3-back-office');
  await v.goto(`${base}/abonnement`);
  assert(norm(await v.locator('main').textContent()).includes('1 200 DH'), 'page Abonnement : nouveau prix');

  await admin.goto(`${base}/admin/experiences/${expId}`);
  await admin.getByLabel('Réservée aux membres abonnés').check();
  await admin.getByRole('button', { name: 'Enregistrer' }).click();
  assert(await visible(admin.getByText('Expérience enregistrée'), 20000), 'expérience passée en « réservée aux membres »');
  const nobody = await makeMember('Ines');
  const q = await open({ ...devices['iPhone 13'] });
  await login(q, nobody, `/reserver/${sid}`);
  assert(await visible(q.getByRole('heading', { name: 'Réservé aux membres' })), 'non-membre : expérience réservée aux membres');
  assert(await q.getByRole('button', { name: /Réserver et payer/ }).count() === 0, 'non-membre : pas de bouton de réservation');

  assert(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
