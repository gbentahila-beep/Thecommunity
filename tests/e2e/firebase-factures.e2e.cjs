// Factures et e-mails sur les émulateurs (5c) : paiement → reçu de test, téléchargement protégé, annulation → avoir,
// « Mes factures », boîte d'envoi, renvoi depuis le back-office, réglages société. Prérequis : émulateurs + seed + site.
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
  // Une date payante dans 5 jours (annulation remboursée), copiée d'une date publiée.
  const sessions = await fsList('sessions');
  let model = null;
  for (const s of sessions) {
    if (s.fields.status.stringValue !== 'published') continue;
    if (s.fields.createdAt && Date.now() - new Date(s.fields.createdAt.timestampValue).getTime() < 72 * 3600000) continue;
    const e = await fsGet(`experiences/${s.fields.experienceId.stringValue}`);
    if (e?.fields.status.stringValue === 'published' && e.fields.admission?.stringValue !== 'on_request' && int(s.fields.price.mapValue.fields.amount) > 0) { model = s; break; }
  }
  const sid = `e2e-facture-${Date.now()}`;
  const start = new Date(Date.now() + 5 * 86_400_000);
  const { createdAt: _c, ...modelFields } = model.fields;
  const fields = { ...modelFields, capacity: { integerValue: '4' }, seatsConfirmed: { integerValue: '0' }, seatsHeld: { integerValue: '0' }, waitlistCount: { integerValue: '0' },
    startAt: { timestampValue: start.toISOString() }, endAt: { timestampValue: new Date(start.getTime() + 7_200_000).toISOString() } };
  await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/sessions?documentId=${sid}`, { method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });

  const b = await chromium.launch();
  const errs = [];
  const open = async (opts = { ...devices['iPhone 13'] }) => { const ctx = await b.newContext(opts); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('fenêtre système inattendue : ' + d.message()); d.dismiss(); }); return p; };
  const noOverflow = async (p, label) => assert(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${label} : pas de débordement horizontal`);

  // 1. Paiement → reçu de TEST sur la réservation
  const yasmine = await makeMember('Yasmine');
  const page = await open();
  globalThis.__page = page;
  await login(page, yasmine, `/reserver/${sid}`);
  await page.getByRole('button', { name: /Réserver et payer/ }).click();
  assert(await payOnTestPage(page), 'réservation payée (paiement de test)');
  const rid = page.url().split('/espace/reservations/')[1].split('?')[0];
  const invoices = async () => (await fsList('invoices')).filter((d) => d.fields.userId.stringValue === yasmine.uid);
  let inv = (await invoices()).find((d) => d.fields.kind.stringValue === 'invoice');
  const number = inv?.fields.number.stringValue;
  assert(inv && /^TEST-FA-\d{4}-\d{6}$/.test(number) && inv.fields.pdfReady.booleanValue === true, `Firestore : reçu de test émis (${number}), PDF prêt`);
  await page.reload();
  assert(await visible(page.getByRole('heading', { name: 'Facture et documents' })), 'réservation : rubrique « Facture et documents »');
  assert(await page.getByText(number).isVisible(), 'numéro du document affiché');

  // 2. Téléchargement : PDF pour la titulaire, refusé sans session
  const dl = await page.request.get(`${base}/api/factures/${inv.name.split('/').pop()}`);
  const body = await dl.body();
  assert(dl.status() === 200 && dl.headers()['content-type'] === 'application/pdf' && body.subarray(0, 5).toString() === '%PDF-', 'téléchargement : vrai PDF pour la titulaire');
  assert(dl.headers()['content-disposition'].includes(`${number}.pdf`), 'nom de fichier = numéro du document');
  const anon = await fetch(`${base}/api/factures/${inv.name.split('/').pop()}`);
  assert(anon.status === 401, 'sans session : refusé');
  const other = await makeMember('Omar');
  const po = await open();
  await login(po, other, '/espace/factures');
  assert((await po.request.get(`${base}/api/factures/${inv.name.split('/').pop()}`)).status() === 404, 'un autre membre ne peut pas la télécharger (404)');
  assert(await visible(po.getByText("Aucun document pour l'instant")), 'Omar : « Mes factures » vide');

  // 3. Annulation remboursée → avoir
  await page.getByRole('button', { name: 'Annuler ma réservation' }).click();
  await page.getByRole('button', { name: 'Oui, annuler' }).click();
  assert(await visible(page.getByText(/Réservation annulée : .* vous sont remboursés/)), 'annulation remboursée');
  let cn = null;
  for (let i = 0; i < 20 && !cn; i++) { cn = (await invoices()).find((d) => d.fields.kind.stringValue === 'credit_note'); if (!cn) await new Promise((r) => setTimeout(r, 500)); }
  assert(cn && cn.fields.relatedInvoiceNumber.stringValue === number && /^TEST-AV-/.test(cn.fields.number.stringValue), `avoir émis et rattaché (${cn?.fields.number.stringValue})`);
  await page.goto(`${base}/espace/factures`);
  assert(await visible(page.getByRole('heading', { name: 'Mes factures' })) && await page.getByText(number).isVisible() && await page.getByText(cn.fields.number.stringValue).isVisible(), '« Mes factures » : reçu et reçu de remboursement listés');
  assert(await page.getByText('Documents de test : aucun paiement réel').isVisible(), 'mention « documents de test »');
  await noOverflow(page, '/espace/factures');
  await shot(page, 'factures-1-membre');

  // 4. Back-office : boîte d'envoi, paiements, société
  const admin = await open({ viewport: { width: 1366, height: 900 } });
  await login(admin, { email: 'admin@thecommunity.test', password: 'Demo2026!' }, '/admin');
  await admin.goto(`${base}/admin/emails`);
  const confirm = admin.locator('li', { hasText: 'C\'est réservé' }).filter({ hasText: yasmine.email });
  assert(await visible(confirm), 'boîte d\'envoi : e-mail de confirmation rangé (non envoyé)');
  assert(await visible(admin.locator('li', { hasText: 'Remboursement de' }).filter({ hasText: yasmine.email })), 'boîte d\'envoi : e-mail de remboursement');
  await confirm.first().locator('summary').click();
  const frame = admin.frameLocator(`iframe[title^="Aperçu : C'est réservé"]`).first();
  assert(await visible(frame.getByText('Paiement de TEST')), 'aperçu de l\'e-mail (mention test)');
  await shot(admin, 'factures-2-boite-envoi');
  await admin.goto(`${base}/admin/paiements`);
  const row = admin.getByRole('row', { name: new RegExp(number) });
  assert(await visible(row), 'paiements : numéro du document affiché');
  await row.getByRole('button', { name: 'Renvoyer par e-mail' }).click();
  assert(await visible(row.getByText("Rangé dans la boîte d'envoi (test).")), 'renvoi par e-mail depuis le back-office');
  await admin.goto(`${base}/admin/parametres`);
  await admin.getByLabel('Raison sociale').fill('The Host Club SARL');
  await admin.getByLabel('ICE', { exact: true }).fill('123');
  await admin.getByLabel('Adresse du siège').fill('Bd d\'Anfa, Casablanca');
  await admin.getByRole('button', { name: 'Enregistrer' }).click();
  assert(await visible(admin.getByText('Valeur invalide.')), 'société : ICE invalide refusé');
  await admin.getByLabel('ICE', { exact: true }).fill('001234567000089');
  await admin.getByRole('button', { name: 'Enregistrer' }).click();
  assert(await visible(admin.getByText('Enregistré. Les prochains documents')), 'société enregistrée (super-admin)');
  const company = await fsGet('settings/company');
  assert(company.fields.ice.stringValue === '001234567000089', 'Firestore : société enregistrée');
  await fetch(doc('settings/company'), { method: 'DELETE', headers: OWNER });
  await fetch(doc('settings/email'), { method: 'DELETE', headers: OWNER });

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
