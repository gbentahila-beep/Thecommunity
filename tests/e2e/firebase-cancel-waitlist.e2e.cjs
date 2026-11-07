// Annulation et liste d'attente sur les émulateurs (phase 4b) : A réserve la dernière place, B s'inscrit sur la
// liste d'attente, A annule (remboursé), la place est proposée à B, qui paie. Prérequis : émulateurs + seed + site.
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
  // Date d'essai d'UNE place, dans 5 jours, sur une expérience en réservation directe.
  const sessions = await fsList('sessions');
  let model = null;
  for (const s of sessions) {
    if (s.fields.status.stringValue !== 'published') continue;
    // Pas une date encore en accès anticipé réservé aux membres (créée il y a moins de 48 h).
    if (s.fields.createdAt && Date.now() - new Date(s.fields.createdAt.timestampValue).getTime() < 72 * 3600000) continue;
    const e = await fsGet(`experiences/${s.fields.experienceId.stringValue}`);
    if (e?.fields.status.stringValue === 'published' && e.fields.admission?.stringValue !== 'on_request' && int(s.fields.price.mapValue.fields.amount) > 0) { model = s; break; }
  }
  const sid = `e2e-complet-${Date.now()}`;
  const start = new Date(Date.now() + 5 * 86_400_000);
  const { createdAt: _c, ...modelFields } = model.fields;
  const fields = { ...modelFields, capacity: { integerValue: '1' }, seatsConfirmed: { integerValue: '0' }, seatsHeld: { integerValue: '0' }, waitlistCount: { integerValue: '0' },
    startAt: { timestampValue: start.toISOString() }, endAt: { timestampValue: new Date(start.getTime() + 7_200_000).toISOString() } };
  await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/sessions?documentId=${sid}`, { method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });
  const price = int(model.fields.price.mapValue.fields.amount);

  const b = await chromium.launch();
  const errs = [];
  const open = async () => { const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('fenêtre système inattendue : ' + d.message()); d.dismiss(); }); return p; };

  // 1. Amina prend la dernière place et paie
  const amina = await makeMember('Amina');
  const pa = await open();
  globalThis.__page = pa;
  await login(pa, amina, `/reserver/${sid}`);
  await pa.getByRole('button', { name: /Réserver et payer/ }).click();
  assert(await payOnTestPage(pa), 'Amina : dernière place réservée et payée');
  const aminaRes = pa.url().split('/espace/reservations/')[1].split('?')[0];
  assert((await fsGet(`sessions/${sid}`)).fields.status.stringValue === 'full', 'date complète');

  // 2. Bilal s'inscrit sur la liste d'attente
  const bilal = await makeMember('Bilal');
  const pb = await open();
  await login(pb, bilal, `/reserver/${sid}`);
  assert(await visible(pb.getByText('Toutes les places sont prises')), 'Bilal : date complète annoncée');
  await pb.getByRole('button', { name: "Rejoindre la liste d'attente" }).click();
  assert(await visible(pb.getByRole('heading', { name: "Vous êtes sur la liste d'attente" })), 'Bilal inscrit sur la liste d’attente');
  assert(await pb.getByText('Vous êtes en tête').isVisible(), 'position affichée (en tête)');
  await shot(pb, 'attente-1-inscrit');
  await pb.goto(`${base}/espace/reservations`);
  assert(await visible(pb.getByRole('heading', { name: "Mes listes d'attente" })), '« Mes réservations » : liste d’attente affichée');

  // 3. Amina annule (plus de 48 h avant : remboursement intégral)
  await pa.goto(`${base}/espace/reservations/${aminaRes}`);
  assert(await visible(pa.getByText(/vous serez remboursé de/)), 'montant remboursable annoncé avant d’annuler');
  await pa.getByRole('button', { name: 'Annuler ma réservation' }).click();
  assert(await visible(pa.getByText(/Annuler cette réservation \? Vous serez remboursé/)), 'confirmation affichée dans la page (sans fenêtre système)');
  await pa.getByRole('button', { name: 'Oui, annuler' }).click();
  assert(await visible(pa.getByText(/Réservation annulée : .* vous sont remboursés/)), 'annulation confirmée avec remboursement');
  assert(await pa.getByText('Remboursée', { exact: true }).isVisible(), 'badge « Remboursée »');
  const ra = await fsGet(`reservations/${aminaRes}`);
  assert(ra.fields.status.stringValue === 'refunded' && int(ra.fields.cancellation.mapValue.fields.refundAmount) === price, 'Firestore : remboursement intégral');
  await shot(pa, 'attente-2-annulee');

  // 4. La place est proposée à Bilal, qui paie
  await pb.goto(`${base}/espace/notifications`);
  assert(await visible(pb.getByText("Une place s'est libérée pour vous")), 'Bilal prévenu par notification');
  const entry = await fsGet(`sessions/${sid}/waitlist/${bilal.uid}`);
  assert(entry.fields.status.stringValue === 'offered', 'Firestore : place proposée à Bilal');
  await pb.goto(`${base}/espace/reservations/${entry.fields.reservationId.stringValue}`);
  assert(await visible(pb.getByText("Une place s'est libérée pour vous !")), 'réservation proposée : bandeau');
  await shot(pb, 'attente-3-offre');
  await pb.getByRole('button', { name: /^Payer/ }).click();
  assert(await payOnTestPage(pb), 'Bilal paie : participation confirmée');
  const s = (await fsGet(`sessions/${sid}`)).fields;
  assert(int(s.seatsConfirmed) === 1 && int(s.seatsHeld) === 0 && int(s.waitlistCount) === 0 && s.status.stringValue === 'full', 'Firestore : 1 place confirmée, liste vide');

  assert(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
