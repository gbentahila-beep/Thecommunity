// Étape 24 sur les émulateurs : un membre présent laisse un avis AVEC une photo (envoyée dans son dossier privé) →
// la photo n'est pas publique → l'équipe la publie → elle apparaît sur la fiche ; le club (organisateur) répond depuis
// /pro/avis → la réponse s'affiche sous l'avis et le membre est prévenu ; un autre membre signale l'avis → l'équipe
// le garde ; l'historique de modération retrace tout.
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

  // 1. Un membre réserve le padel (activité du club), paie (TEST) ; l'activité est ensuite « passée », il était présent.
  const m = await member('avis', 'Yasmine');
  const sid = await bookable('exp-padel');
  assert(sid, 'une date de padel est réservable');
  const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  watch(page);
  globalThis.__page = page;
  await login(page, m.email, m.password, `/reserver/${sid}`);
  await page.waitForURL(`**/reserver/${sid}`, { timeout: 25000 });
  const terms = page.getByTestId('physical-terms');
  if (await terms.count()) await terms.getByRole('checkbox').check();
  await page.getByRole('button', { name: /^Réserver$/ }).click();
  await page.waitForURL('**/paiement-test/**', { timeout: 25000 });
  await page.getByRole('button', { name: 'Simuler un paiement accepté' }).click();
  await page.waitForURL('**/espace/reservations/**', { timeout: 30000 });
  const rid = page.url().split('/espace/reservations/')[1].split('?')[0];
  await until(async () => (await fsGet(`reservations/${rid}`))?.fields?.status?.stringValue === 'confirmed');
  const past = (h) => new Date(Date.now() - h * 3600000).toISOString();
  await fetch(doc(`reservations/${rid}`) + '?updateMask.fieldPaths=status&updateMask.fieldPaths=sessionSnapshot.startAt&updateMask.fieldPaths=sessionSnapshot.endAt', {
    method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { status: { stringValue: 'attended' }, sessionSnapshot: { mapValue: { fields: { startAt: { timestampValue: past(5) }, endAt: { timestampValue: past(3) } } } } } }),
  });

  // 2. Avis avec photo
  await page.goto(`${base}/espace/reservations/${rid}#avis`, { waitUntil: 'load' });
  await page.getByRole('button', { name: '5 étoiles' }).click();
  await page.getByLabel('Votre avis').fill('Matchs bien équilibrés et accueil chaleureux du club.');
  await page.locator(`#review-photo-${rid}`).setInputFiles({ name: 'terrain.webp', mimeType: 'image/webp', buffer: fs.readFileSync(path.join(__dirname, '../../apps/web/public/demo/padel.webp')) });
  assert(await page.getByTestId('review-photo-name').textContent() === 'terrain.webp', 'photo choisie');
  await page.getByRole('button', { name: 'Publier mon avis' }).click();
  assert(await visible(page.getByText('Merci, votre avis a été publié.'), 20000), 'avis publié');
  assert(await visible(page.getByTestId('review-photo-status').filter({ hasText: 'après vérification' })), 'membre : photo en attente de vérification');
  const rv0 = (await fsGet(`reviews/${rid}`)).fields;
  const upload = rv0.photo.mapValue.fields.path.stringValue;
  assert(upload.startsWith(`review-uploads/${m.uid}/`) && rv0.photo.mapValue.fields.status.stringValue === 'pending', 'Firestore : photo « pending » dans le dossier privé');
  const pub = await fetch(`http://127.0.0.1:9199/v0/b/demo-thecommunity.appspot.com/o/${encodeURIComponent(upload)}?alt=media`);
  assert(pub.status === 403, 'photo privée : pas d\'accès public avant vérification');
  const v = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  watch(v);
  await v.goto(`${base}/experiences/padel-entre-inconnus-anfa`, { waitUntil: 'load' });
  const item = v.getByTestId('review-item').filter({ hasText: 'Matchs bien équilibrés' });
  assert(await visible(item) && !(await item.getByTestId('review-photo').count()), 'fiche : avis visible, photo pas encore publiée');

  // 3. L'équipe publie la photo
  const admin = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  watch(admin);
  globalThis.__page = admin;
  await login(admin, 'admin@thecommunity.test', 'Demo2026!', '/admin/avis?vue=photos');
  await admin.waitForURL('**/admin/avis?vue=photos', { timeout: 25000 });
  const ph = admin.locator('[data-testid=review-panel]').filter({ has: admin.getByTestId('pending-photo') }).first();
  assert(await visible(ph.getByTestId('pending-photo')), 'équipe : photo privée affichée');
  await until(async () => (await ph.getByTestId('pending-photo').evaluate((img) => img.naturalWidth)) > 0, 10000);
  assert((await ph.getByTestId('pending-photo').evaluate((img) => img.naturalWidth)) > 0, 'équipe : la photo se charge');
  await ph.getByRole('button', { name: 'Publier la photo' }).click();
  const rv1 = await until(async () => { const f = (await fsGet(`reviews/${rid}`)).fields; return f.photo.mapValue.fields.status.stringValue === 'approved' ? f : null; }, 30000);
  assert(rv1 && rv1.photo.mapValue.fields.path.stringValue.startsWith(`reviews/${rid}/`), 'Firestore : photo publiée dans reviews/…');
  globalThis.__page = v;
  await v.goto(`${base}/experiences/padel-entre-inconnus-anfa`, { waitUntil: 'load' });
  assert(await visible(v.getByTestId('review-item').filter({ hasText: 'Matchs bien équilibrés' }).getByTestId('review-photo')), 'fiche : photo publiée');

  // 4. Le club répond depuis son espace
  const club = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  watch(club);
  globalThis.__page = club;
  await login(club, 'club@thecommunity.test', 'Demo2026!', '/pro/avis');
  await club.waitForURL('**/pro/avis', { timeout: 25000 });
  const pr = club.getByTestId('pro-review').filter({ hasText: 'Matchs bien équilibrés' });
  await pr.getByRole('button', { name: 'Répondre' }).click();
  await pr.locator('textarea').fill('Merci Yasmine ! Revenez quand vous voulez pour un tournoi.');
  await pr.getByRole('button', { name: 'Publier la réponse' }).click();
  assert(await visible(pr.getByTestId('pro-review-reply').filter({ hasText: 'Revenez quand vous voulez' }), 20000), '/pro : réponse publiée');
  globalThis.__page = v;
  await v.goto(`${base}/experiences/padel-entre-inconnus-anfa`, { waitUntil: 'load' });
  assert(await visible(v.getByTestId('review-item').filter({ hasText: 'Matchs bien équilibrés' }).getByTestId('review-reply').filter({ hasText: 'Réponse de Club Padel Anfa' })), 'fiche : réponse du club sous l\'avis');
  const notes = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/users/${m.uid}/notifications`, { headers: OWNER }).then((r) => r.json());
  assert((notes.documents ?? []).some((d) => d.fields.type?.stringValue === 'review_reply'), 'membre prévenu de la réponse');

  // 5. Un autre membre signale ; l'équipe garde l'avis
  const k = await member('signal', 'Karim');
  const kp = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  watch(kp);
  globalThis.__page = kp;
  await login(kp, k.email, k.password, '/experiences/padel-entre-inconnus-anfa');
  await kp.waitForURL('**/experiences/padel-entre-inconnus-anfa', { timeout: 25000 });
  const kitem = kp.getByTestId('review-item').filter({ hasText: 'Matchs bien équilibrés' });
  await kitem.getByRole('button', { name: 'Signaler' }).click();
  await kitem.getByLabel('Motif').selectOption('false_info');
  await kitem.getByRole('button', { name: 'Envoyer le signalement' }).click();
  assert(await visible(kitem.getByRole('status').filter({ hasText: "l'équipe va vérifier" }), 20000), 'signalement envoyé');
  globalThis.__page = admin;
  await admin.goto(`${base}/admin/avis?vue=signales`, { waitUntil: 'load' });
  const row = admin.getByTestId('admin-review').filter({ hasText: 'Yasmine' });
  assert(await visible(row.getByText('Signalé (1)')), 'équipe : avis signalé (1)');
  const panel = admin.getByTestId('review-panel').filter({ hasText: "Faux ou sans rapport avec l'activité" }).first();
  await panel.locator('input[id^="mod-note-"]').fill('Avis vérifié avec le club : conforme.');
  await panel.getByRole('button', { name: "Garder l'avis" }).click();
  const rv2 = await until(async () => { const f = (await fsGet(`reviews/${rid}`)).fields; return f.reportsOpen?.integerValue === '0' ? f : null; }, 20000);
  assert(rv2 && rv2.status.stringValue === 'published', 'avis gardé, signalement traité');
  const hist = (await fsGet(`reviews/${rid}/private/history`)).fields.events.arrayValue.values.map((x) => x.mapValue.fields.action.stringValue);
  assert(JSON.stringify(hist) === JSON.stringify(['created', 'photo_approved', 'reply', 'reported', 'reports_kept']), `historique : ${hist.join(', ')}`);

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (globalThis.__page && process.env.FAIL_SHOT) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  if (globalThis.__page) console.error('URL au moment de l’échec :', globalThis.__page.url());
  process.exit(1);
});
