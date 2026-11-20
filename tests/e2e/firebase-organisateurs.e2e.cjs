// Étape 20 sur les émulateurs : un organisateur s'inscrit (pièce justificative et logo envoyés dans Storage),
// l'équipe valide, l'organisateur crée une activité avec photo → envoyée pour validation (invisible) → l'équipe
// publie → visible sur le site → un membre réserve et paie (TEST) → l'organisateur voit la réservation et le
// participant. Le club de démonstration (club@thecommunity.test) ne voit que ses propres données.
// Prérequis : émulateurs + `npm run seed` + site construit en mode émulateurs.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
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
  const fields = { onboardingCompleted: { booleanValue: true }, firstName: { stringValue: firstName }, lastName: { stringValue: 'Orga' }, status: { stringValue: 'active' }, birthDate: { stringValue: '1992-04-12' }, email: { stringValue: email }, languages: { arrayValue: { values: [{ stringValue: 'fr' }] } } };
  await fetch(doc(`users/${uid}`) + '?' + Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&'), {
    method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }),
  });
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  return { email, password, uid, firstName };
}

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const watch = (p) => p.on('pageerror', (e) => errs.push(e.message));
  const stamp = Date.now().toString(36);
  const name = `Club Test ${stamp}`;

  // 1. Inscription organisateur depuis /pro (pièce PDF + logo envoyés dans le stockage)
  const o = await member('orga', 'Nadia');
  const pro = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  watch(pro);
  globalThis.__page = pro;
  await login(pro, o.email, o.password, '/pro');
  await pro.waitForURL('**/pro', { timeout: 25000 });
  assert(await visible(pro.getByRole('heading', { level: 1, name: 'Proposez vos activités sur The Host Club' })), '/pro : présentation pour un membre sans compte organisateur');
  await pro.getByRole('link', { name: 'Créer mon compte organisateur' }).click();
  await pro.waitForURL('**/pro/inscription');
  await pro.locator('#o-businessName').fill(name);
  await pro.locator('#o-contactName').fill('Nadia Orga');
  await pro.locator('#o-phone').fill('+212 600 000 000');
  await pro.locator('#o-address').fill("12 boulevard d'Anfa, Casablanca");
  await pro.getByRole('checkbox', { name: 'Sport & bien-être' }).check();
  await pro.locator('#o-description').fill('Club de padel avec quatre terrains couverts et des coachs diplômés, pour tous les niveaux.');
  await pro.locator('#o-documents').setInputFiles({ name: 'registre-commerce.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% test\n') });
  assert(await visible(pro.getByTestId('documents').getByText('registre-commerce.pdf')), 'pièce justificative envoyée');
  await pro.locator('#o-logo').setInputFiles({ name: 'logo.webp', mimeType: 'image/webp', buffer: fs.readFileSync(path.join(__dirname, '../../apps/web/public/demo/padel.webp')) });
  assert(await visible(pro.getByText('Image ajoutée ✓')), 'logo envoyé');
  await pro.locator('#o-acceptTerms').check();
  await pro.getByRole('button', { name: 'Envoyer ma demande' }).click();
  await pro.waitForURL(/\/pro$/, { timeout: 25000 });
  assert(await visible(pro.getByTestId('organizer-status').filter({ hasText: 'en cours de relecture' })), 'demande envoyée → /pro : « en cours de relecture »');
  const orgDocs = await until(async () => (await fsWhere('organizers', 'name', name))[0]);
  const orgId = orgDocs.name.split('/').pop();
  const det = await fsGet(`organizers/${orgId}/private/details`);
  const docPath = det.fields.documents.arrayValue.values[0].mapValue.fields.path.stringValue;
  assert(orgDocs.fields.status.stringValue === 'pending' && docPath.startsWith(`organizer-uploads/${o.uid}/documents/`), 'Firestore : compte « en attente », pièce dans le dossier privé de la personne');
  const stored = await fetch(`http://127.0.0.1:9199/v0/b/${PROJECT}.appspot.com/o/${encodeURIComponent(docPath)}`);
  assert(stored.status === 403 || stored.status === 401, 'pièce justificative non publique (lecture anonyme refusée)');
  await pro.goto(base + '/pro/activites', { waitUntil: 'load' });
  assert(pro.url().endsWith('/pro'), 'pages réservées aux comptes validés : retour à l\'accueil de l\'espace');

  // 2. L'équipe valide le compte
  const admin = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  watch(admin);
  globalThis.__page = admin;
  await login(admin, 'admin@thecommunity.test', 'Demo2026!', '/admin/organisateurs');
  await admin.waitForURL('**/admin/organisateurs', { timeout: 25000 });
  await admin.getByTestId('admin-organizer').filter({ hasText: name }).getByRole('link', { name: 'Ouvrir' }).click();
  await admin.waitForURL(`**/admin/organisateurs/${orgId}`);
  assert(await admin.getByTestId('organizer-documents').getByRole('button', { name: 'registre-commerce.pdf' }).isVisible(), "l'équipe voit la pièce justificative");
  await admin.getByRole('button', { name: 'Valider le compte' }).click();
  assert(await visible(admin.getByRole('status').filter({ hasText: "L'organisateur est prévenu" }), 30000), 'compte validé');
  const approved = await until(async () => { const d = await fsGet(`organizers/${orgId}`); return d.fields.status.stringValue === 'approved' ? d : null; });
  assert(approved && approved.fields.logoPath?.stringValue?.startsWith(`organizers/${orgId}/public/`), 'Firestore : validé, logo copié dans le dossier public');
  const logo = await fetch(`http://127.0.0.1:9199/v0/b/${PROJECT}.appspot.com/o/${encodeURIComponent(approved.fields.logoPath.stringValue)}?alt=media`);
  assert(logo.ok, 'logo public lisible');

  // 3. L'organisateur crée une activité avec photo → envoyée pour validation
  globalThis.__page = pro;
  await pro.goto(base + '/pro', { waitUntil: 'load' });
  assert(await visible(pro.getByRole('heading', { level: 1, name })), '/pro : tableau de bord après validation');
  await pro.goto(base + '/pro/activites/nouvelle', { waitUntil: 'load' });
  const future = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
  await pro.locator('#f-titleFr').fill(`Padel découverte ${stamp}`);
  await pro.locator('#f-summaryFr').fill('Une heure et demie de padel en double, matériel prêté.');
  await pro.locator('#f-descriptionFr').fill('Quatre terrains couverts, un coach pour les débutants, équipes équilibrées selon le niveau de chacun.');
  await pro.locator('#f-categoryId').selectOption('move');
  await pro.locator('#f-district').fill('Anfa');
  await pro.locator('#f-venueName').fill(name);
  await pro.locator('#f-address').fill("12 boulevard d'Anfa, Casablanca");
  await pro.locator('#f-priceDh').fill('180');
  await pro.locator('#f-status').selectOption('published');
  await pro.locator('[id="f-sessions.firstDate"]').fill(future);
  await pro.locator('[id="f-sessions.time"]').fill('10:00');
  await pro.locator('[id="f-sessions.weeks"]').fill('1');
  await pro.locator('[id="f-sessions.capacity"]').fill('8');
  await pro.locator('fieldset', { hasText: '6. Photos' }).locator('input[type=file]').setInputFiles({ name: 'padel.webp', mimeType: 'image/webp', buffer: fs.readFileSync(path.join(__dirname, '../../apps/web/public/demo/padel.webp')) });
  await pro.getByRole('button', { name: 'Enregistrer' }).click();
  assert(await visible(pro.getByText("Elle est envoyée à l'équipe pour validation"), 30000), 'activité envoyée pour validation');
  const exp = await until(async () => (await fsWhere('experiences', 'organizerId', orgId))[0]);
  const expId = exp.name.split('/').pop();
  const slug = exp.fields.slug.stringValue;
  assert(exp.fields.status.stringValue === 'pending_review', 'Firestore : « pending_review »');
  assert(exp.fields.images.arrayValue.values[0].mapValue.fields.path.stringValue.startsWith(`organizers/${orgId}/public/`), 'photo dans le dossier public de l\'organisateur');
  const hidden = await pro.goto(`${base}/experiences/${slug}`, { waitUntil: 'load' });
  assert(hidden.status() === 404, 'pas encore visible sur le site');
  await pro.goto(base + '/pro/activites', { waitUntil: 'load' });
  assert(await visible(pro.getByTestId('pro-activity').filter({ hasText: 'En relecture' })), 'mes activités : « En relecture »');

  // 4. L'équipe publie
  globalThis.__page = admin;
  await admin.goto(base + '/admin/experiences?vue=review', { waitUntil: 'load' });
  await admin.getByRole('row', { name: new RegExp(`Padel découverte ${stamp}`) }).getByRole('link', { name: 'Modifier' }).click();
  await admin.waitForURL(`**/admin/experiences/${expId}`);
  await admin.getByRole('button', { name: "Publier l'activité" }).click();
  assert(await visible(admin.getByText("Publiée. L'organisateur est prévenu."), 30000), "l'équipe publie l'activité");
  await until(async () => (await fsGet(`experiences/${expId}`)).fields.status.stringValue === 'published');
  const pub = await admin.goto(`${base}/experiences/${slug}`, { waitUntil: 'load' });
  assert(pub.status() === 200 && await visible(admin.getByRole('heading', { level: 1, name: `Padel découverte ${stamp}` })), 'visible sur le site');
  const notes = (await (await fetch(doc(`users/${o.uid}/notifications`), { headers: OWNER })).json()).documents ?? [];
  assert(notes.some((n) => n.fields.type.stringValue === 'organizer_experience_published'), "l'organisateur est notifié de la publication");

  // 5. Un membre réserve et paie (TEST) ; l'organisateur voit la réservation et le participant
  const buyer = await member('client', 'Karim');
  const sid = (await fsWhere('sessions', 'experienceId', expId))[0].name.split('/').pop();
  // Hors période d'accès anticipé réservée aux membres abonnés (date « créée » il y a 4 jours).
  await fetch(doc(`sessions/${sid}`) + '?updateMask.fieldPaths=createdAt', { method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields: { createdAt: { timestampValue: new Date(Date.now() - 96 * 3600000).toISOString() } } }) });
  const c = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  watch(c);
  globalThis.__page = c;
  await login(c, buyer.email, buyer.password, `/reserver/${sid}`);
  await c.waitForURL(`**/reserver/${sid}`, { timeout: 25000 });
  const terms = c.getByTestId('physical-terms');
  if (await terms.count()) await terms.getByRole('checkbox').check();
  await c.getByRole('button', { name: /Réserver et payer/ }).click();
  await c.waitForURL('**/paiement-test/**', { timeout: 25000 });
  await c.getByRole('button', { name: 'Simuler un paiement accepté' }).click();
  const resv = await until(async () => (await fsWhere('reservations', 'organizerId', orgId)).find((r) => r.fields.status.stringValue === 'confirmed'));
  assert(resv, 'réservation confirmée, rattachée à l\'organisateur');
  globalThis.__page = pro;
  await pro.goto(base + '/pro/reservations', { waitUntil: 'load' });
  assert(await visible(pro.getByTestId('pro-reservation').filter({ hasText: 'Karim O.' })), 'organisateur : réservation visible (prénom + initiale)');
  await pro.goto(`${base}/pro/dates/${sid}`, { waitUntil: 'load' });
  assert(await visible(pro.getByTestId('pro-participant').filter({ hasText: 'Karim O.' })), 'organisateur : participant de la date');
  assert(await pro.getByText('Pointage 3 h avant le début').isVisible(), 'pointage : ouvert 3 h avant');

  // 6. Cloisonnement : le club de démonstration ne voit que ses données ; un organisateur n'entre pas au back-office
  const club = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  watch(club);
  globalThis.__page = club;
  await login(club, 'club@thecommunity.test', 'Demo2026!', '/pro/activites');
  await club.waitForURL('**/pro/activites', { timeout: 25000 });
  const clubActs = await club.getByTestId('pro-activity').allTextContents();
  assert(clubActs.length === 1 && /Padel entre inconnus/.test(clubActs[0]), 'club de démonstration : seulement « Padel entre inconnus »');
  const foreign = await club.goto(`${base}/pro/activites/${expId}`, { waitUntil: 'load' });
  assert(foreign.status() === 404, "activité d'un autre organisateur : introuvable");
  await club.goto(`${base}/pro/reservations`, { waitUntil: 'load' });
  assert(!(await club.getByTestId('pro-reservation').filter({ hasText: 'Karim O.' }).count()), "réservations d'un autre organisateur : invisibles");
  const bo = await club.goto(`${base}/admin`, { waitUntil: 'load' });
  assert(bo.status() === 404, 'un organisateur n\'accède pas au back-office');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (globalThis.__page && process.env.FAIL_SHOT) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  if (globalThis.__page) console.error('URL au moment de l’échec :', globalThis.__page.url());
  process.exit(1);
});
