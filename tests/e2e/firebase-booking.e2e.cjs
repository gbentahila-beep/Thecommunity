// Parcours de réservation réel sur les émulateurs (phase 4a) : visiteur → connexion → e-mail à confirmer →
// choix des places → paiement de TEST refusé puis accepté → réservation confirmée → doublon refusé.
// Prérequis : émulateurs + `npm run seed` + site construit en mode émulateurs (docs/12, docs/14).
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
const shot = async (page, name) => { if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.jpg`, quality: 80, fullPage: true }); };
const int = (f) => Number(f?.integerValue ?? f?.doubleValue ?? 0);

(async () => {
  // Une date publiée, réservable (au-delà de la fermeture de 12 h), avec au moins 3 places libres.
  const now = Date.now();
  const sessions = (await fsList('sessions')).filter((d) => {
    const f = d.fields;
    const free = int(f.capacity) - int(f.seatsConfirmed) - int(f.seatsHeld);
    return f.status.stringValue === 'published' && new Date(f.startAt.timestampValue).getTime() > now + 13 * 3_600_000 && free >= 3;
  });
  let target = null;
  for (const s of sessions) {
    const exp = await fsGet(`experiences/${s.fields.experienceId.stringValue}`);
    if (exp?.fields.status.stringValue === 'published' && int(exp.fields.maxSeatsPerBooking) >= 2) { target = { s, exp }; break; }
  }
  if (!target) target = { s: sessions[0], exp: await fsGet(`experiences/${sessions[0].fields.experienceId.stringValue}`) };
  const sid = target.s.name.split('/').pop();
  const multi = int(target.exp.fields.maxSeatsPerBooking) >= 2;
  const seats = multi ? 2 : 1;
  const before = int(target.s.fields.seatsConfirmed);

  const b = await chromium.launch();
  const errs = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  globalThis.__page = page;
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300)); });
  const noOverflow = async (label) => assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${label} : pas de débordement horizontal (mobile)`);

  // 1. Visiteur non connecté
  await page.goto(`${base}/reserver/${sid}`);
  assert(await visible(page.getByRole('heading', { name: 'Connectez-vous pour réserver' })), 'visiteur : invité à se connecter');
  assert(await page.getByText('Paiement en mode test').isVisible(), 'mode test signalé avant de réserver');
  await noOverflow('tunnel de réservation');

  // 2. Compte créé, profil complété, e-mail PAS encore confirmé
  const email = `resa.${now}@example.com`;
  const password = 'MotDePasse!2026';
  const signUp = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  })).json();
  const uid = signUp.localId;
  await new Promise((r) => setTimeout(r, 1500)); // trigger de création du profil
  await fetch(doc(`users/${uid}`) + '?updateMask.fieldPaths=onboardingCompleted&updateMask.fieldPaths=firstName&updateMask.fieldPaths=status', {
    method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { onboardingCompleted: { booleanValue: true }, firstName: { stringValue: 'Nadia' }, status: { stringValue: 'active' } } }),
  });
  await page.getByRole('link', { name: 'Se connecter' }).first().click();
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(`**/reserver/${sid}`, { timeout: 20000 });
  assert(await visible(page.getByRole('heading', { name: 'Confirmez votre adresse e-mail pour réserver' })), 'retour au tunnel après connexion ; e-mail à confirmer');

  // 3. E-mail confirmé (lien de l'émulateur) → formulaire de réservation
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  await page.getByRole('button', { name: "J'ai confirmé" }).click();
  const cta = page.getByRole('button', { name: /Réserver et payer/ });
  assert(await visible(cta), 'e-mail confirmé : bouton de réservation affiché');
  if (multi) {
    await page.getByRole('button', { name: 'Une place de plus' }).click();
    assert((await page.locator('output').textContent()).trim() === '2', '2 places choisies');
  }
  const ctaText = await cta.textContent();
  await shot(page, 'reservation-1-tunnel');

  // 4. Réservation → page de paiement de TEST → refus
  await cta.click();
  await page.waitForURL('**/paiement-test/**', { timeout: 20000 });
  assert(await visible(page.getByText('Paiement de TEST')), 'page de paiement de test clairement signalée');
  const amountShown = (await page.locator('p.text-3xl').textContent()).replace(/\s/g, '');
  assert(ctaText.replace(/\s/g, '').includes(amountShown), `montant identique au bouton (${amountShown})`);
  await noOverflow('paiement de test');
  await shot(page, 'reservation-2-paiement-test');
  let res = (await fsList('reservations')).find((d) => d.fields.userId?.stringValue === uid);
  assert(res && res.fields.status.stringValue === 'pending_payment' && int(res.fields.seats) === seats, `réservation en attente de paiement (${seats} place(s))`);
  const rid = res.name.split('/').pop();
  await page.getByRole('button', { name: 'Simuler un refus de la banque' }).click();
  await page.waitForURL(`**/espace/reservations/${rid}?paiement=refuse`, { timeout: 20000 });
  assert(await visible(page.getByText("Le paiement n'a pas abouti")), 'refus : message affiché, place toujours bloquée');
  assert(await page.getByRole('heading', { name: 'Paiement en attente' }).isVisible(), 'statut « paiement en attente »');

  // 5. Nouvel essai → accepté
  await page.getByRole('button', { name: /^Payer/ }).click();
  await page.waitForURL('**/paiement-test/**', { timeout: 20000 });
  await page.getByRole('button', { name: 'Simuler un paiement accepté' }).click();
  await page.waitForURL(`**/espace/reservations/${rid}?paiement=accepte`, { timeout: 20000 });
  assert(await visible(page.getByText("C'est réservé")), 'paiement accepté : réservation confirmée');
  assert(await page.getByText('Confirmée', { exact: true }).isVisible(), 'badge « Confirmée »');
  res = await fsGet(`reservations/${rid}`);
  assert(res.fields.status.stringValue === 'confirmed' && res.fields.paidAt, 'Firestore : réservation confirmée et datée');
  const after = await fsGet(`sessions/${sid}`);
  assert(int(after.fields.seatsConfirmed) === before + seats && int(after.fields.seatsHeld) === 0, `Firestore : ${seats} place(s) confirmée(s), aucune bloquée`);
  await noOverflow('réservation confirmée');
  await shot(page, 'reservation-3-confirmee');

  // 6. Liste des réservations et doublon refusé
  await page.goto(`${base}/espace/reservations`);
  assert(await visible(page.getByRole('link', { name: new RegExp(target.exp.fields.title.mapValue.fields.fr.stringValue) })), 'réservation visible dans « Mes réservations »');
  await page.goto(`${base}/reserver/${sid}`);
  assert(await visible(page.getByRole('heading', { name: 'Vous avez déjà une place pour cette date.' })), 'déjà réservé : annoncé sur la page de réservation');
  assert(await page.getByRole('button', { name: /Réserver et payer/ }).count() === 0 && await page.getByRole('link', { name: 'Voir ma réservation' }).isVisible(), 'pas de second achat possible, lien vers la réservation');

  // 7. Version arabe
  await page.goto(`${base}/ar/reserver/${sid}`);
  assert(await page.locator('html[dir=rtl]').count() === 1 && await visible(page.getByRole('link', { name: 'عرض حجزي' })), 'tunnel disponible en arabe (RTL)');

  assert(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
