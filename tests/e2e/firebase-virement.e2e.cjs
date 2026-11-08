// Étape 5h, phase 1 sur les émulateurs : paiement par virement bancaire, de bout en bout.
// Super-admin : activation du virement (RIB fictif d'essai) → membre : réservation, instructions (référence, RIB, échéance),
// réservation « en attente de votre virement » → équipe : « Virements », virement reçu → membre : réservation confirmée,
// billet, facture → super-admin : retour au paiement de test.
// Prérequis : émulateurs + `npm run seed` + site construit en mode émulateurs (docs/12, docs/14).
const { chromium } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:8080';
const PROJECT = 'demo-thecommunity';
const OWNER = { Authorization: 'Bearer owner' };
const FAKE_RIB = '000111000000000000000099'; // fictif : uniquement pour ce test
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const doc = (path) => `${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;
const fsGet = async (path) => { const r = await fetch(doc(path), { headers: OWNER }); return r.ok ? r.json() : null; };
const fsWhere = async (collection, field, value) => {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }),
  });
  return (await r.json()).filter((x) => x.document).map((x) => x.document);
};
const int = (f) => Number(f?.integerValue ?? f?.doubleValue ?? 0);
const until = async (fn, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 500)); } return null; };

async function login(page, email, password, suite) {
  await page.goto(`${base}/connexion?suite=${encodeURIComponent(suite)}`, { waitUntil: 'load' });
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

(async () => {
  const now = Date.now();
  // Une date réservable directement, à plus de 4 jours (échéance = 48 h), sans restriction membres.
  const published = await fsWhere('sessions', 'status', 'published');
  let target = null;
  for (const s of published) {
    const f = s.fields;
    if (f.createdAt && now - new Date(f.createdAt.timestampValue).getTime() < 72 * 3600000) continue;
    if (new Date(f.startAt.timestampValue).getTime() < now + 4 * 86400000) continue;
    if (int(f.capacity) - int(f.seatsConfirmed) - int(f.seatsHeld) < 1) continue;
    const exp = await fsGet(`experiences/${f.experienceId.stringValue}`);
    const e = exp?.fields;
    if (!e || e.status.stringValue !== 'published' || e.admission?.stringValue === 'on_request' || e.membersOnly?.booleanValue) continue;
    target = { s, exp };
    break;
  }
  assert(target, 'une date réservable à plus de 4 jours');
  const sid = target.s.name.split('/').pop();

  const b = await chromium.launch();
  const errs = [];
  const track = (p) => { p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('fenêtre système : ' + d.message()); d.dismiss(); }); globalThis.__page = p; return p; };
  const admin = track(await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage());

  // 1. Super-admin : activation du virement (RIB exigé, 24 chiffres)
  await login(admin, 'admin@thecommunity.test', 'Demo2026!', '/admin/parametres');
  await admin.waitForURL('**/admin/parametres', { timeout: 25000 });
  await admin.getByLabel(/Virement bancaire/).check();
  await admin.locator('#pay-holder').fill('The Host Club (compte fictif)');
  await admin.locator('#pay-bank').fill("Banque d'essai");
  await admin.locator('#pay-rib').fill('1234');
  await admin.getByRole('button', { name: 'Enregistrer le mode de paiement' }).click();
  assert(await visible(admin.getByText('Le RIB compte 24 chiffres.')), 'paramètres : RIB incomplet refusé');
  await admin.locator('#pay-rib').fill('000 111 0000000000000000 99');
  await admin.getByRole('button', { name: 'Enregistrer le mode de paiement' }).click();
  assert(await visible(admin.getByText('Enregistré.')), 'paramètres : virement activé');
  const pay = await until(async () => { const d = await fsGet('settings/payment'); return d?.fields.provider.stringValue === 'bank_transfer' ? d : null; });
  assert(pay, 'Firestore : settings/payment = virement');
  assert((await fsGet('settings/bankTransfer')).fields.rib.stringValue === FAKE_RIB, 'Firestore : RIB enregistré sans espaces');

  // 2. Membre : réservation par virement
  const email = `virement.${now}@example.com`;
  const password = 'MotDePasse!2026';
  const signUp = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  })).json();
  const uid = signUp.localId;
  await new Promise((r) => setTimeout(r, 1500));
  await fetch(doc(`users/${uid}`) + '?updateMask.fieldPaths=onboardingCompleted&updateMask.fieldPaths=firstName&updateMask.fieldPaths=lastName&updateMask.fieldPaths=status', {
    method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { onboardingCompleted: { booleanValue: true }, firstName: { stringValue: 'Karim' }, lastName: { stringValue: 'Virement' }, status: { stringValue: 'active' } } }),
  });
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  const page = track(await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage());
  await login(page, email, password, `/reserver/${sid}`);
  await page.waitForURL(`**/reserver/${sid}`, { timeout: 20000 });
  assert(await visible(page.getByText(/Paiement par virement bancaire : après la réservation/)), 'tunnel : paiement par virement annoncé');
  assert(!(await page.getByText('Paiement en mode test').isVisible()), 'tunnel : plus de mention « mode test »');
  const cta = page.getByRole('button', { name: /par virement/ });
  assert(await visible(cta), 'tunnel : bouton « Réserver et payer … par virement »');
  assert(await page.getByText(/bloquée jusqu'à réception du virement : 48 h maximum/).isVisible(), 'tunnel : place bloquée 48 h maximum');
  await cta.click();
  await page.waitForURL('**/paiement/virement/**', { timeout: 25000 });
  const paymentId = page.url().split('/').pop().split('?')[0];
  const ref = (await page.getByTestId('transfer-reference').innerText()).trim();
  assert(/^THC-[2-9A-Z]{6}$/.test(ref), `instructions : référence unique (${ref})`);
  const bankText = await page.getByTestId('transfer-bank').innerText();
  assert(bankText.includes('000 111 0000000000000000 99') && bankText.includes("Banque d'essai"), 'instructions : RIB et banque affichés');
  assert(/À effectuer avant le/.test(await page.getByTestId('transfer-summary').innerText()), 'instructions : échéance affichée');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'instructions : pas de débordement (mobile)');
  const p = await fsGet(`payments/${paymentId}`);
  assert(p.fields.provider.stringValue === 'bank_transfer' && p.fields.reference.stringValue === ref && p.fields.status.stringValue === 'initiated', 'Firestore : virement en attente avec sa référence');
  const rid = p.fields.reservationId.stringValue;
  const mail = await until(async () => (await fsWhere('mail', 'refs.paymentId', paymentId)).find((m) => m.fields.kind.stringValue === 'transfer_instructions'));
  assert(mail && mail.fields.text.stringValue.includes(ref), 'e-mail : instructions avec la référence');

  // 3. Réservation en attente de virement
  await page.goto(`${base}/espace/reservations/${rid}`, { waitUntil: 'load' });
  assert(await visible(page.getByText('En attente de votre virement')), 'réservation : « En attente de votre virement »');
  assert((await page.getByTestId('transfer-pending').innerText()).includes(ref), 'réservation : référence rappelée');
  assert(await page.getByRole('link', { name: 'Voir les coordonnées bancaires' }).isVisible(), 'réservation : lien vers les coordonnées bancaires');
  assert(await page.getByTestId('ticket').count() === 0, 'réservation : pas de billet avant le virement');

  // 4. Équipe : virement reçu
  await admin.goto(`${base}/admin/virements?q=${ref.toLowerCase().replace('-', ' ')}`, { waitUntil: 'load' });
  const row = admin.getByTestId(`transfer-${ref}`);
  assert(await visible(row), 'Virements : recherche tolérante par référence');
  await row.getByRole('button', { name: 'Virement reçu' }).click();
  assert(await visible(row.getByText(/reçus avec la référence/)), 'Virements : confirmation dans la page (montant et référence)');
  await row.getByRole('button', { name: 'Confirmer' }).click();
  const confirmed = await until(async () => (await fsGet(`reservations/${rid}`)).fields.status.stringValue === 'confirmed');
  assert(confirmed, 'Firestore : réservation confirmée');
  assert(await until(async () => (await row.count()) === 0), 'Virements : la ligne disparaît des virements à valider');
  assert(await until(async () => (await fsGet(`invoices/inv_${paymentId}`)) !== null), 'facture émise à la validation');

  // 5. Membre : billet
  await page.goto(`${base}/espace/reservations/${rid}`, { waitUntil: 'load' });
  assert(await visible(page.getByTestId('ticket')), 'réservation : billet avec QR code après validation');
  await page.goto(`${base}/paiement/virement/${paymentId}`, { waitUntil: 'load' });
  assert(await visible(page.getByText('Virement reçu')), 'instructions : « Virement reçu »');

  // 5 bis (C) : abonnement payé par virement, attente visible sur la page Abonnement, puis validé
  await page.goto(`${base}/abonnement`, { waitUntil: 'load' });
  await page.getByRole('button', { name: /Devenir membre/ }).click();
  await page.waitForURL('**/paiement/virement/**', { timeout: 25000 });
  const memPayment = page.url().split('/').pop().split('?')[0];
  const memRef = (await page.getByTestId('transfer-reference').innerText()).trim();
  assert(/^THC-/.test(memRef) && memRef !== ref, `abonnement : nouvelle référence (${memRef})`);
  await page.goto(`${base}/abonnement`, { waitUntil: 'load' });
  const pendingBox = page.getByTestId('membership-transfer');
  assert(await visible(pendingBox) && (await pendingBox.innerText()).includes(memRef), 'page Abonnement : « En attente de votre virement » avec la référence');
  assert(await page.getByRole('button', { name: /Devenir membre/ }).count() === 0, 'page Abonnement : pas de second achat pendant l’attente');
  await admin.goto(`${base}/admin/virements?q=${memRef}`, { waitUntil: 'load' });
  const memRow = admin.getByTestId(`transfer-${memRef}`);
  await memRow.getByRole('button', { name: 'Virement reçu' }).click();
  await memRow.getByRole('button', { name: 'Confirmer' }).click();
  assert(await until(async () => (await fsGet(`memberships/${uid}`))?.fields?.status?.stringValue === 'active'), 'abonnement activé à la validation du virement');
  await page.goto(`${base}/abonnement`, { waitUntil: 'load' });
  assert(await visible(page.getByText('Vous êtes membre')) && await page.getByTestId('membership-transfer').count() === 0, 'page Abonnement : membre, plus de virement en attente');
  assert((await fsGet(`payments/${memPayment}`)).fields.status.stringValue === 'succeeded', 'Firestore : paiement d’abonnement reçu');

  // 6. Retour au paiement de test
  await admin.goto(`${base}/admin/parametres`, { waitUntil: 'load' });
  await admin.getByLabel(/Paiement de test/).check();
  await admin.getByRole('button', { name: 'Enregistrer le mode de paiement' }).click();
  assert(await visible(admin.getByText('Enregistré.')), 'paramètres : retour au paiement de test');
  assert(await until(async () => (await fsGet('settings/payment')).fields.provider.stringValue === 'sandbox'), 'Firestore : paiement de test rétabli');

  assert(errs.length === 0, `aucune erreur JavaScript (${errs.join(' | ')})`);
  await b.close();
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
