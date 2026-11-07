// Back-office des réservations sur les émulateurs (phase 4c) : déplacer, annuler (remboursé), pointer,
// exporter (journalisé), annuler une date. Prérequis : émulateurs + seed + site en mode émulateurs.
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
async function bookAndPay(page, sid) {
  await page.goto(`${base}/reserver/${sid}`);
  await page.getByRole('button', { name: /Réserver et payer/ }).click();
  await page.waitForURL('**/paiement-test/**', { timeout: 20000 });
  await page.getByRole('button', { name: 'Simuler un paiement accepté' }).click();
  await page.waitForURL('**/espace/reservations/**', { timeout: 20000 });
  return page.url().split('/espace/reservations/')[1].split('?')[0];
}

(async () => {
  // Trois dates d'essai de la même expérience (réservation directe, payante).
  let model = null;
  for (const s of await fsList('sessions')) {
    if (s.fields.status.stringValue !== 'published') continue;
    // Pas une date encore en accès anticipé réservé aux membres (créée il y a moins de 48 h).
    if (s.fields.createdAt && Date.now() - new Date(s.fields.createdAt.timestampValue).getTime() < 72 * 3600000) continue;
    const e = await fsGet(`experiences/${s.fields.experienceId.stringValue}`);
    // Format qui ferme 2 h avant (pas un dîner social, fermé 12 h avant) : la 3e date commence dans 2 h 30.
    if (e?.fields.status.stringValue === 'published' && e.fields.admission?.stringValue !== 'on_request' && e.fields.bookingMode.stringValue !== 'social_dinner' && int(s.fields.price.mapValue.fields.amount) > 0) { model = s; break; }
  }
  const mk = async (name, hours) => {
    const start = new Date(Date.now() + hours * 3_600_000);
    const { createdAt: _c, ...modelFields } = model.fields;
  const fields = { ...modelFields, capacity: { integerValue: '2' }, seatsConfirmed: { integerValue: '0' }, seatsHeld: { integerValue: '0' }, waitlistCount: { integerValue: '0' },
      startAt: { timestampValue: start.toISOString() }, endAt: { timestampValue: new Date(start.getTime() + 7_200_000).toISOString() } };
    const id = `e2e-${name}-${Date.now()}`;
    await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/sessions?documentId=${id}`, { method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });
    return id;
  };
  const s1 = await mk('s1', 120);
  const s2 = await mk('s2', 144);
  const s3 = await mk('s3', 2.5);

  const b = await chromium.launch();
  const errs = [];
  const open = async (opts) => { const p = await (await b.newContext(opts)).newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('fenêtre système inattendue : ' + d.message()); d.dismiss(); }); return p; };
  const m1 = await makeMember('Karim');
  const m2 = await makeMember('Leila');
  const p1 = await open({ ...devices['iPhone 13'] });
  globalThis.__page = p1;
  await login(p1, m1, `/reserver/${s1}`);
  const r1 = await bookAndPay(p1, s1);
  const p2 = await open({ ...devices['iPhone 13'] });
  await login(p2, m2, `/reserver/${s3}`);
  const r2 = await bookAndPay(p2, s3);
  assert(r1 && r2, 'deux réservations payées (Karim, Leila)');

  const admin = await open({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  globalThis.__page = admin;
  await login(admin, { email: 'admin@thecommunity.test', password: 'Demo2026!' }, '/admin');
  const row = (name) => admin.locator('tr', { hasText: name });

  // 1. Déplacer Karim de S1 vers S2
  await admin.goto(`${base}/admin/sessions/${s1}`);
  await row('Karim').getByRole('button', { name: 'Déplacer' }).click();
  await row('Karim').locator('select').selectOption(s2);
  await row('Karim').getByRole('button', { name: 'Confirmer le déplacement' }).click();
  assert(await row('Karim').waitFor({ state: 'detached', timeout: 15000 }).then(() => true, () => false), 'Karim déplacé : plus sur la première date');
  assert((await fsGet(`reservations/${r1}`)).fields.sessionId.stringValue === s2, 'Firestore : réservation sur la nouvelle date');
  await admin.goto(`${base}/admin/sessions/${s2}`);
  assert(await visible(row('Karim').getByText('Confirmée')), 'Karim visible et confirmé sur la nouvelle date');

  // 2. Annuler la réservation de Karim (remboursement intégral, motif)
  await row('Karim').getByRole('button', { name: 'Annuler' }).click();
  assert(await row('Karim').getByText(/Intégral/).isVisible(), 'choix du remboursement proposé (intégral par défaut)');
  await row('Karim').getByLabel('Motif (journalisé)').fill('Partenaire indisponible');
  await shot(admin, 'bo-1-annulation');
  await row('Karim').getByRole('button', { name: /Annuler la réservation de Karim/ }).click();
  assert(await visible(row('Karim').getByText('Remboursée')), 'réservation de Karim remboursée');
  const c = (await fsGet(`reservations/${r1}`)).fields.cancellation.mapValue.fields;
  assert(c.by.stringValue === 'admin' && c.reason.stringValue === 'Partenaire indisponible', 'Firestore : annulation par l’équipe, motif enregistré');

  // 3. Côté Karim
  await p1.goto(`${base}/espace/reservations/${r1}`);
  assert(await visible(p1.getByText(/annulée par l'équipe/)), 'Karim voit l’annulation par l’équipe et son remboursement');
  await p1.goto(`${base}/espace/notifications`);
  assert(await visible(p1.getByText('Votre réservation a changé de date')) && await visible(p1.getByText('Votre réservation a été annulée')), 'Karim prévenu (déplacement puis annulation)');

  // 4. Pointage de Leila (date dans 2 h 30)
  await admin.goto(`${base}/admin/sessions/${s3}`);
  await row('Leila').getByRole('button', { name: 'Présent' }).click();
  assert(await visible(row('Leila').getByText('Vécue')), 'Leila pointée présente');
  await shot(admin, 'bo-2-pointage');

  // 5. Export journalisé
  const [download] = await Promise.all([admin.waitForEvent('download'), admin.getByRole('button', { name: /Exporter/ }).click()]);
  assert(download.suggestedFilename() === `participants-${s3}.csv`, 'export CSV téléchargé');
  const logs = (await fsList('auditLogs')).filter((l) => l.fields.targetId?.stringValue === s3);
  assert(logs.some((l) => l.fields.action.stringValue === 'export.participants'), 'export journalisé');

  // 6. Annuler la date S1
  await admin.goto(`${base}/admin/sessions/${s1}`);
  await admin.getByRole('button', { name: 'Annuler cette date' }).click();
  await admin.getByLabel('Motif communiqué aux participants').fill('Météo');
  await admin.getByRole('button', { name: "Confirmer l'annulation de la date" }).click();
  assert(await visible(admin.getByText('Date annulée')), 'date annulée dans le back-office');
  assert((await fsGet(`sessions/${s1}`)).fields.status.stringValue === 'cancelled', 'Firestore : date annulée');

  // 7. Liste des réservations
  await admin.goto(`${base}/admin/reservations?q=${encodeURIComponent('karim')}`);
  assert(await visible(admin.getByRole('link', { name: 'Gérer' })), 'liste des réservations : accès à la gestion');

  assert(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
