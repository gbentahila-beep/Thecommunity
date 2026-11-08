// Codes promo, frais de service et préférences d'accueil sur les émulateurs (5f, 5g) : création du code et des frais
// dans le back-office, prix détaillé et code au tunnel, régime / allergies avec accord, fiche pour le lieu.
const { chromium, devices } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:8080';
const PROJECT = 'demo-thecommunity';
const OWNER = { Authorization: 'Bearer owner' };
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const doc = (path) => `${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;
const fsGet = async (path) => { const r = await fetch(doc(path), { headers: OWNER }); return r.ok ? r.json() : null; };
const fsList = async (path) => { const r = await fetch(doc(path) + '?pageSize=300', { headers: OWNER }); return r.ok ? ((await r.json()).documents ?? []) : []; };
const int = (f) => Number(f?.integerValue ?? f?.doubleValue ?? 0);
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
  const fields = { onboardingCompleted: { booleanValue: true }, status: { stringValue: 'active' }, firstName: { stringValue: firstName } };
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
async function payOnTestPage(page) {
  await page.waitForURL('**/paiement-test/**', { timeout: 20000 });
  await page.getByRole('button', { name: 'Simuler un paiement accepté' }).click();
  return visible(page.getByText("C'est réservé"));
}



(async () => {
  // Une date payante dans 5 jours, copiée d'une date publiée (parcourue à l'envers, voir firebase-factures).
  const sessions = (await fsList('sessions')).reverse();
  let model = null;
  for (const s of sessions) {
    if (s.fields.status.stringValue !== 'published') continue;
    if (s.fields.createdAt && Date.now() - new Date(s.fields.createdAt.timestampValue).getTime() < 72 * 3600000) continue;
    const e = await fsGet(`experiences/${s.fields.experienceId.stringValue}`);
    if (e?.fields.status.stringValue === 'published' && e.fields.admission?.stringValue !== 'on_request' && e.fields.membersOnly?.booleanValue !== true && int(s.fields.price.mapValue.fields.amount) >= 10000) { model = s; break; }
  }
  const sid = `e2e-promo-${Date.now()}`;
  const start = new Date(Date.now() + 5 * 86_400_000);
  const { createdAt: _c, ...modelFields } = model.fields;
  const fields = { ...modelFields, capacity: { integerValue: '6' }, seatsConfirmed: { integerValue: '0' }, seatsHeld: { integerValue: '0' }, waitlistCount: { integerValue: '0' },
    startAt: { timestampValue: start.toISOString() }, endAt: { timestampValue: new Date(start.getTime() + 7_200_000).toISOString() } };
  await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/sessions?documentId=${sid}`, { method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });
  const price = int(model.fields.price.mapValue.fields.amount);

  const b = await chromium.launch();
  const errs = [];
  const open = async (opts = { ...devices['iPhone 13'] }) => { const ctx = await b.newContext(opts); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('fenêtre système inattendue : ' + d.message()); d.dismiss(); }); return p; };
  const noOverflow = async (p, label) => assert(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${label} : pas de débordement horizontal`);
  const code = `AMIS${String(Date.now()).slice(-6)}`;

  // 1. Équipe : un code de 20 %, des frais de 10 DH par place
  const admin = await open({ viewport: { width: 1366, height: 900 } });
  globalThis.__page = admin;
  await login(admin, { email: 'admin@thecommunity.test', password: 'Demo2026!' }, '/admin');
  await admin.goto(`${base}/admin/promos`);
  await admin.getByText('+ Nouveau code promo').click();
  await admin.locator('#promo-new-code').fill(code.toLowerCase());
  await admin.locator('#promo-new-value').fill('20');
  await admin.locator('#promo-new-validTo').fill('2099-12-31');
  await admin.locator('#promo-new-maxRedemptions').fill('10');
  await admin.getByRole('button', { name: 'Créer le code' }).click();
  assert(await visible(admin.getByText('Code créé.')), 'code promo créé dans le back-office');
  assert(await visible(admin.getByText(code, { exact: true })), 'code listé en majuscules');
  await admin.goto(`${base}/admin/parametres`);
  await admin.getByLabel('Montant par place').check();
  await admin.getByLabel('Montant par place (DH)').fill('10');
  await admin.getByRole('button', { name: 'Enregistrer les frais' }).click();
  assert(await visible(admin.locator('form', { has: admin.getByRole('button', { name: 'Enregistrer les frais' }) }).getByRole('status')), 'frais de service enregistrés (10 DH par place)');

  // 2. Membre : prix détaillé, code refusé puis accepté, préférences, paiement
  const nadia = await makeMember('Nadia');
  const page = await open();
  globalThis.__page = page;
  await login(page, nadia, `/reserver/${sid}`);
  assert(await visible(page.getByText('Frais de service')), 'frais de service affichés avant le paiement');
  await page.getByRole('button', { name: 'Vous avez un code promo ?' }).click();
  await page.getByLabel('Code promo').fill('INCONNU1');
  await page.getByRole('button', { name: 'Appliquer' }).click();
  assert(await visible(page.getByText("Ce code n'existe pas.")), 'code inconnu refusé');
  await page.getByLabel('Code promo').fill(code.toLowerCase());
  await page.getByRole('button', { name: 'Appliquer' }).click();
  assert(await visible(page.getByText(new RegExp(`Code ${code} appliqué`))), 'code appliqué');
  const discount = Math.round(price * 0.2 / 100) * 100;
  const total = price - discount + 1000;
  const cta = page.getByRole('button', { name: /Réserver et payer/ });
  const ctaText = (await cta.textContent()).replace(/\s/g, '');
  assert(ctaText.includes(String(total / 100)), `montant du bouton = prix − 20 % + 10 DH (${total / 100} DH)`);
  await page.getByText('Pour votre accueil (facultatif)').click();
  await page.getByLabel('Régime alimentaire').selectOption('vegetarian');
  await page.getByLabel('Allergies ou intolérances').fill('Arachides');
  await cta.click();
  assert(await visible(page.getByText('Cochez cette case pour transmettre votre régime ou vos allergies.')), "accord demandé avant de transmettre régime / allergies");
  await page.getByLabel(/J'accepte que ces informations/).check();
  await noOverflow(page, 'tunnel avec code et préférences');
  await shot(page, 'promo-1-tunnel');
  await cta.click();
  assert(await payOnTestPage(page), 'réservation payée');
  const rid = page.url().split('/espace/reservations/')[1].split('?')[0];
  const res = await fsGet(`reservations/${rid}`);
  const pr = res.fields.pricing.mapValue.fields;
  assert(pr.promoCode.stringValue === code && int(pr.discount) === discount && int(pr.fees) === 1000 && int(pr.total) === total, 'Firestore : code, remise, frais et total');
  const pf = res.fields.preferences.mapValue.fields;
  assert(pf.diet.stringValue === 'vegetarian' && pf.allergies.stringValue === 'Arachides' && pf.shareWithVenue.booleanValue === true && pf.consentAt, 'Firestore : régime, allergie, accord daté');
  assert(int((await fsGet(`promoCodes/${code}`)).fields.redemptionsCount) === 1, 'code compté au paiement');

  // 3. Ma réservation : lignes du prix, préférences modifiables
  await page.reload();
  assert(await visible(page.getByText(`Code ${code}`)) && await page.getByText('Frais de service').first().isVisible(), 'réservation : lignes « code » et « frais »');
  await page.locator('#edit-pref-allergies').fill('Arachides, crustacés');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  assert(await visible(page.getByRole('status').filter({ hasText: 'Enregistré.' })), 'préférences modifiées depuis la réservation');
  assert((await fsGet(`reservations/${rid}`)).fields.preferences.mapValue.fields.allergies.stringValue === 'Arachides, crustacés', 'Firestore : allergies mises à jour');
  await noOverflow(page, 'ma réservation');

  // 4. Équipe : participants, fiche pour le lieu, utilisations du code
  await admin.goto(`${base}/admin/sessions/${sid}`);
  assert(await visible(admin.getByText('Allergie : Arachides, crustacés')) && await admin.getByRole('cell', { name: /Végétarien/ }).isVisible(), 'participants : régime et allergie visibles');
  await admin.getByRole('link', { name: 'Fiche pour le lieu' }).click();
  await admin.waitForURL(`**/admin/sessions/${sid}/fiche-lieu`);
  assert(await visible(admin.getByText('Végétarien : 1')) && await admin.getByText(/Nadia.*allergie : Arachides, crustacés/).isVisible(), 'fiche pour le lieu : régime et allergie avec le prénom');
  assert(await admin.getByText(/Ni nom de famille ni coordonnées|ne contient ni nom de famille/).isVisible() && !(await admin.getByText(nadia.email).count()), 'fiche sans coordonnées');
  await shot(admin, 'promo-2-fiche-lieu');
  await admin.goto(`${base}/admin/promos`);
  assert(await visible(admin.locator('li', { hasText: code }).getByRole('meter', { name: '1 / 10 utilisations' })), 'back-office : 1 utilisation sur 10');

  // 5. Remise à zéro des frais
  await admin.goto(`${base}/admin/parametres`);
  await admin.getByLabel('Aucun frais').check();
  await admin.getByRole('button', { name: 'Enregistrer les frais' }).click();
  assert(await visible(admin.locator('form', { has: admin.getByRole('button', { name: 'Enregistrer les frais' }) }).getByRole('status')), 'frais remis à « aucun »');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
