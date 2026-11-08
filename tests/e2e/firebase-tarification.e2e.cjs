// Étape 11 sur les émulateurs : tarification en deux parts, de la fiche au billet.
// Visiteur → réservation d'une expérience « prix fixe chez le partenaire » (brunch : 59 DH en ligne + 80 DH sur place)
// → paiement de TEST → réservation avec part sur place figée + billet QR → facture avec la mention « hors facture »
// → équipe : fiche du billet, part partenaire réglée → tableau de bord « En ligne / sur place » → formulaire (section 5).
// Prérequis : émulateurs + `npm run seed` + site construit en mode émulateurs (docs/12, docs/14).
const { chromium } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:8080';
const PROJECT = 'demo-thecommunity';
const OWNER = { Authorization: 'Bearer owner' };
const EXP = 'exp-brunch-inconnus';
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const doc = (path) => `${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;
const fsGet = async (path) => { const r = await fetch(doc(path), { headers: OWNER }); return r.ok ? r.json() : null; };
const fsList = async (path) => { const r = await fetch(doc(path) + '?pageSize=300', { headers: OWNER }); return r.ok ? ((await r.json()).documents ?? []) : []; };
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
  const exp = await fsGet(`experiences/${EXP}`);
  const pricing = exp.fields.pricing.mapValue.fields;
  assert(pricing.model.stringValue === 'fixed_partner' && int(pricing.partner.mapValue.fields.price.mapValue.fields.amount) === 8000, 'expérience semée en « prix fixe chez le partenaire » (80 DH sur place)');
  const session = (await fsWhere('sessions', 'experienceId', EXP)).find((d) => {
    const f = d.fields;
    if (f.experienceId.stringValue !== EXP || f.status.stringValue !== 'published') return false;
    if (f.createdAt && now - new Date(f.createdAt.timestampValue).getTime() < 72 * 3600000) return false;
    return new Date(f.startAt.timestampValue).getTime() > now + 13 * 3_600_000 && int(f.capacity) - int(f.seatsConfirmed) - int(f.seatsHeld) >= 1;
  });
  assert(session, 'une date du brunch est réservable');
  const sid = session.name.split('/').pop();
  const online = int(session.fields.price.mapValue.fields.amount);

  const b = await chromium.launch();
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  globalThis.__page = page;
  page.on('pageerror', (e) => errs.push(e.message));

  // 1. Fiche publique : total, part en ligne, part sur place, réductions sur la part en ligne seulement
  await page.goto(`${base}/experiences/${exp.fields.slug.stringValue}`, { waitUntil: 'load' });
  const box = page.getByTestId('two-part');
  assert(await visible(box), 'fiche : encadré « Comment se règle cette expérience »');
  const boxText = await box.innerText();
  assert(boxText.includes(`${online / 100} DH`) && boxText.includes('80 DH') && boxText.includes('uniquement à la part payée en ligne'), 'fiche : part en ligne, part sur place, réductions limitées à la part en ligne');
  assert(await page.locator('aside').getByText(`${(online + 8000) / 100} DH`).first().isVisible(), `fiche : total par personne (${(online + 8000) / 100} DH)`);

  // 2. Compte confirmé → tunnel : « À régler sur place » et bouton de paiement sur la seule part en ligne
  const email = `deuxparts.${now}@example.com`;
  const password = 'MotDePasse!2026';
  const signUp = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  })).json();
  const uid = signUp.localId;
  await new Promise((r) => setTimeout(r, 1500));
  await fetch(doc(`users/${uid}`) + '?updateMask.fieldPaths=onboardingCompleted&updateMask.fieldPaths=firstName&updateMask.fieldPaths=lastName&updateMask.fieldPaths=status', {
    method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { onboardingCompleted: { booleanValue: true }, firstName: { stringValue: 'Salwa' }, lastName: { stringValue: 'Deuxparts' }, status: { stringValue: 'active' } } }),
  });
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  await login(page, email, password, `/reserver/${sid}`);
  await page.waitForURL(`**/reserver/${sid}`, { timeout: 20000 });
  const onSite = page.getByTestId('on-site');
  assert(await visible(onSite), 'tunnel : bloc « À régler sur place »');
  const onSiteText = await onSite.innerText();
  assert(onSiteText.includes('80 DH') && onSiteText.includes('au lieu partenaire'), 'tunnel : 80 DH sur place, lieu non dévoilé avant la veille');
  const cta = page.getByRole('button', { name: /Réserver et payer/ });
  const ctaText = (await cta.textContent()).replace(/\s/g, '');
  assert(!ctaText.includes('139'), `bouton de paiement : la part sur place n'est pas facturée en ligne (${ctaText})`);

  // 3. Paiement de TEST accepté → réservation : part sur place figée, billet QR
  await cta.click();
  await page.waitForURL('**/paiement-test/**', { timeout: 20000 });
  const rid = (await until(async () => (await fsWhere('reservations', 'userId', uid))[0])).name.split('/').pop();
  await page.getByRole('button', { name: 'Simuler un paiement accepté' }).click();
  await page.waitForURL(`**/espace/reservations/${rid}?paiement=accepte`, { timeout: 20000 });
  const res = await fsGet(`reservations/${rid}`);
  const snap = res.fields.partnerSnapshot.mapValue.fields;
  assert(res.fields.status.stringValue === 'confirmed', 'réservation confirmée');
  assert(snap.model.stringValue === 'fixed_partner' && int(snap.price.mapValue.fields.amount) === 8000 && int(res.fields.onSiteAmount) === 8000, 'Firestore : copie figée de la part partenaire (80 DH)');
  assert(res.fields.partnerPaymentStatus.stringValue === 'due_on_site', 'Firestore : part partenaire « à régler sur place »');
  assert(int(res.fields.pricing.mapValue.fields.unitAmount) === online, 'Firestore : le prix payé en ligne ne contient que la part organisation');
  const row = page.getByTestId('on-site');
  assert(await visible(row) && (await row.innerText()).includes('80 DH'), 'réservation : « À régler sur place 80 DH »');
  assert(await page.getByText('Payé en ligne').first().isVisible(), 'réservation : « Payé en ligne »');
  const ticket = page.getByTestId('ticket');
  assert(await visible(ticket) && (await ticket.locator('svg').count()) === 1, 'billet : QR code affiché');
  const code = ((await ticket.innerText()).match(/Code du billet : ([A-Z0-9]+)/) ?? [])[1];
  assert(code && code.length >= 6, `billet : code court (${code})`);

  // 4. Facture : mention « hors facture », jamais encaissée
  const inv = await until(async () => (await fsWhere('invoices', 'reservationId', rid))[0]);
  assert(inv && (inv.fields.onSiteNote?.stringValue ?? '').includes('non encaissé par The Host Club'), 'facture : mention de la part sur place, non encaissée');
  assert(int(inv.fields.totals.mapValue.fields.ttc) === int(res.fields.pricing.mapValue.fields.total), 'facture : total = montant payé en ligne');

  // 5. Équipe : billet retrouvé par son code, part partenaire réglée
  const admin = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  globalThis.__page = admin;
  await login(admin, 'admin@thecommunity.test', 'Demo2026!', `/admin/billets?q=${code}`);
  await admin.waitForURL(`**/admin/billets/${rid}`, { timeout: 25000 });
  assert(await visible(admin.getByText('Billet valide')), 'équipe : code du billet → fiche du billet, « Billet valide »');
  assert((await admin.getByTestId('ticket-on-site').innerText()).includes('80 DH'), 'équipe : 80 DH à régler au partenaire');
  await admin.getByRole('button', { name: 'Part partenaire réglée' }).click();
  assert(await visible(admin.getByRole('button', { name: 'Part partenaire non réglée' })), 'équipe : part partenaire marquée réglée');
  assert((await fsGet(`reservations/${rid}`)).fields.partnerPaymentStatus.stringValue === 'paid_on_site', 'Firestore : part partenaire « réglée sur place »');
  assert(await admin.getByRole('button', { name: 'Marquer présent' }).isDisabled(), 'équipe : pointage fermé plus de 3 h avant le début');
  await admin.goto(`${base}/admin/billets/${rid}`, { waitUntil: 'load' });

  // 6. Tableau de bord « En ligne / sur place »
  await admin.setViewportSize({ width: 1366, height: 900 });
  await admin.goto(`${base}/admin/encaissements?experience=${EXP}`, { waitUntil: 'load' });
  const totals = await admin.getByTestId('ledger-totals').innerText();
  assert(/Sur place réglé\s*80 DH/i.test(totals), 'tableau de bord : 80 DH réglés sur place');
  assert(/Sur place attendu \(prix fixe\)\s*\d/i.test(totals), 'tableau de bord : part fixe attendue chiffrée');

  // 7. Formulaire : section 5 pré-remplie, avertissement « prix figé »
  await admin.goto(`${base}/admin/experiences/${EXP}`, { waitUntil: 'load' });
  assert(await admin.locator('input[name=pricingModel][value=fixed_partner]').isChecked(), 'formulaire : formule « prix fixe chez le partenaire » cochée');
  assert((await admin.locator('#f-partnerPriceDh').inputValue()) === '80', 'formulaire : prix partenaire 80 DH');
  assert(await admin.getByText(/déjà réservées? : leur prix est figé/).isVisible(), 'formulaire : avertissement, les réservations existantes gardent leur prix');
  await admin.locator('#f-partnerPriceDh').fill('95');
  assert((await admin.locator('#tarification').innerText()).includes('95 DH sur place'), 'formulaire : aperçu client mis à jour en direct');

  assert(errs.length === 0, `aucune erreur JavaScript (${errs.join(' | ')})`);
  await b.close();
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
