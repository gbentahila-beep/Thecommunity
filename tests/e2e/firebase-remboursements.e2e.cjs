// Étape 22 sur les émulateurs : la fiche affiche la politique d'annulation de l'activité ; un membre réserve et paie
// (TEST) → la politique est copiée sur la réservation → après l'activité (date simulée dans le passé), il demande un
// remboursement depuis sa réservation → l'équipe rembourse 50 DH dans /admin/remboursements → le paiement passe en
// « partiellement remboursé » → le participant voit la décision et le message de l'équipe.
// Prérequis : émulateurs + `npm run seed` + site construit en mode émulateurs.
const { chromium } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:8080';
const PROJECT = 'demo-thecommunity';
const OWNER = { Authorization: 'Bearer owner' };
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const doc = (p) => `${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${p}`;
const fsGet = async (p) => { const r = await fetch(doc(p), { headers: OWNER }); return r.ok ? r.json() : null; };
const fsWhere = async (collection, field, value) => {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }),
  });
  return (await r.json()).filter((x) => x.document).map((x) => x.document);
};
const until = async (fn, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 500)); } return null; };

async function login(page, email, password, suite) {
  await page.goto(`${base}/connexion?suite=${encodeURIComponent(suite)}`, { waitUntil: 'load' });
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}
async function member(tag, firstName) {
  const email = `${tag}.${Date.now()}@example.com`;
  const password = 'MotDePasse!2026';
  const signUp = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  })).json();
  const uid = signUp.localId;
  await new Promise((r) => setTimeout(r, 1500));
  const fields = { onboardingCompleted: { booleanValue: true }, firstName: { stringValue: firstName }, lastName: { stringValue: 'Test' }, status: { stringValue: 'active' }, birthDate: { stringValue: '1992-04-12' }, email: { stringValue: email }, languages: { arrayValue: { values: [{ stringValue: 'fr' }] } } };
  await fetch(doc(`users/${uid}`) + '?' + Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&'), {
    method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }),
  });
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  return { email, password, uid, firstName };
}


const int = (f) => Number(f?.integerValue ?? f?.doubleValue ?? 0);
/** Prochaine date publiée réservable d'une expérience « tout en ligne » sans activité physique (hors accès anticipé). */
async function bookable(exp) {
  const now = Date.now();
  const s = (await fsWhere('sessions', 'experienceId', exp)).filter((d) => {
    const f = d.fields;
    if (f.status.stringValue !== 'published') return false;
    if (f.createdAt && now - new Date(f.createdAt.timestampValue).getTime() < 72 * 3600000) return false;
    return new Date(f.startAt.timestampValue).getTime() > now + 13 * 3_600_000 && int(f.capacity) - int(f.seatsConfirmed) - int(f.seatsHeld) >= 1;
  }).sort((a, b) => a.fields.startAt.timestampValue.localeCompare(b.fields.startAt.timestampValue))[0];
  return s ? s.name.split('/').pop() : null;
}

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const watch = (p) => p.on('pageerror', (e) => errs.push(e.message));

  // 1. La fiche affiche la politique d'annulation de l'activité
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  watch(page);
  globalThis.__page = page;
  await page.goto(`${base}/experiences/soiree-gnaoua-rooftop-medina`, { waitUntil: 'load' });
  assert(await visible(page.getByText("Annulation gratuite jusqu'à 48 h avant.")), 'fiche : politique d\'annulation de l\'activité');

  // 2. Un membre réserve et paie (TEST)
  const m = await member('remb', 'Rania');
  const sid = await bookable('exp-gnaoua');
  assert(sid, 'une date de la soirée gnaoua est réservable');
  await login(page, m.email, m.password, `/reserver/${sid}`);
  await page.waitForURL(`**/reserver/${sid}`, { timeout: 25000 });
  await page.getByRole('button', { name: /^Réserver$/ }).click();
  await page.waitForURL('**/paiement-test/**', { timeout: 25000 });
  await page.getByRole('button', { name: 'Simuler un paiement accepté' }).click();
  await page.waitForURL('**/espace/reservations/**', { timeout: 30000 });
  const rid = page.url().split('/espace/reservations/')[1].split('?')[0];
  const r0 = await until(async () => { const d = await fsGet(`reservations/${rid}`); return d?.fields?.status?.stringValue === 'confirmed' ? d : null; });
  assert(r0 && r0.fields.cancellationPolicy?.mapValue?.fields?.id?.stringValue === 'standard-48h', 'réservation confirmée, politique d\'annulation copiée');
  assert(!(await page.getByTestId('refund-request').count()), 'avant l\'activité : pas de demande de remboursement (annulation à la place)');

  // 3. L'activité est passée (simulé) : demande de remboursement depuis la réservation
  const past = new Date(Date.now() - 2 * 86_400_000).toISOString();
  await fetch(doc(`reservations/${rid}`) + '?updateMask.fieldPaths=sessionSnapshot.startAt&updateMask.fieldPaths=sessionSnapshot.endAt', { method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields: { sessionSnapshot: { mapValue: { fields: { startAt: { timestampValue: past }, endAt: { timestampValue: past } } } } } }) });
  await page.goto(`${base}/espace/reservations/${rid}`, { waitUntil: 'load' });
  const box = page.getByTestId('refund-request');
  assert(await visible(box), 'après l\'activité : « Un problème avec cette activité ? »');
  await box.getByRole('button').click();
  await page.locator('#refund-reason').selectOption('not_delivered');
  await page.locator('#refund-message').fill('Bof');
  await box.getByRole('button', { name: 'Envoyer ma demande' }).click();
  assert(await visible(page.getByRole('alert').filter({ hasText: '10 caractères' })), 'message trop court refusé');
  await page.locator('#refund-message').fill('Le guide ne s\'est pas présenté au point de rendez-vous ; nous avons attendu 40 minutes.');
  await box.getByRole('button', { name: 'Envoyer ma demande' }).click();
  assert(await visible(page.getByTestId('refund-sent'), 20000) || await visible(page.getByTestId('refund-status'), 20000), 'demande envoyée');
  await page.goto(`${base}/espace/reservations/${rid}`, { waitUntil: 'load' });
  assert(await visible(page.getByTestId('refund-status').filter({ hasText: 'en cours d\'examen' })), 'statut « en cours d\'examen »');

  // 4. L'équipe rembourse en partie
  const admin = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  watch(admin);
  globalThis.__page = admin;
  await login(admin, 'admin@thecommunity.test', 'Demo2026!', '/admin/remboursements');
  await admin.waitForURL('**/admin/remboursements', { timeout: 25000 });
  const card = admin.getByTestId('refund-request-admin').filter({ hasText: 'Rania' });
  assert(await visible(card), 'équipe : la demande apparaît');
  await card.getByRole('button', { name: 'Rembourser en partie' }).click();
  await card.locator(`#refund-amount-${rid}`).fill('50');
  await card.locator(`#refund-message-${rid}`).fill('Geste pour le retard du guide.');
  await card.getByRole('button', { name: 'Confirmer', exact: true }).click();
  const r1 = await until(async () => { const d = await fsGet(`reservations/${rid}`); return int(d?.fields?.refundedAmount) === 5000 ? d : null; }, 30000);
  assert(r1, 'Firestore : 50 DH remboursés sur la réservation');
  await admin.goto(`${base}/admin/remboursements`, { waitUntil: 'load' });
  assert(!(await admin.getByTestId('refund-request-admin').filter({ hasText: 'Rania' }).count()), 'équipe : la demande n\'est plus « à traiter »');
  assert(await visible(admin.locator('li').filter({ hasText: 'Remboursée en partie' }).filter({ hasText: 'Rania' })), 'équipe : « Déjà traitées » → Remboursée en partie');
  const req = await fsGet(`refundRequests/${rid}`);
  assert(req.fields.status.stringValue === 'partially_refunded' && int(req.fields.amount) === 5000, 'Firestore : demande « partially_refunded », 50 DH');
  const pay = await fsGet(`payments/${r1.fields.paymentId.stringValue}`);
  assert(pay.fields.status.stringValue === 'partially_refunded', 'paiement « partiellement remboursé »');

  // 5. Le participant voit la décision
  globalThis.__page = page;
  await page.goto(`${base}/espace/reservations/${rid}`, { waitUntil: 'load' });
  assert(/Remboursement partiel accepté : 50 DH/.test((await page.getByTestId('refund-status').textContent()).replace(/\u202f|\u00a0/g, ' ')), 'participant : « Remboursement partiel accepté : 50 DH »');
  assert(await page.getByTestId('refund-status').getByText('Geste pour le retard du guide.').isVisible(), 'participant : message de l\'équipe');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (globalThis.__page && process.env.FAIL_SHOT) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  if (globalThis.__page) console.error('URL au moment de l’échec :', globalThis.__page.url());
  process.exit(1);
});
