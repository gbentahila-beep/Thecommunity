// Étape 18 sur les émulateurs : toutes les activités, de la fiche à la composition des groupes.
// Padel (activité physique, questionnaire « niveau ») : case des conditions obligatoire → paiement de TEST →
// invitation au questionnaire → réponses vérifiées → l'équipe voit les réponses et propose les groupes.
// Paintball (21 ans et plus) : âge vérifié par le serveur. Membre de confiance : statut donné par l'équipe,
// proposition de sortie, refus avec message.
// Prérequis : émulateurs + `npm run seed` + site construit en mode émulateurs (docs/12, docs/14).
const { chromium } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:8080';
const PROJECT = 'demo-thecommunity';
const OWNER = { Authorization: 'Bearer owner' };
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

/** Compte confirmé, profil complété (date de naissance donnée). */
async function member(tag, firstName, birthDate) {
  const email = `${tag}.${Date.now()}@example.com`;
  const password = 'MotDePasse!2026';
  const signUp = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  })).json();
  const uid = signUp.localId;
  await new Promise((r) => setTimeout(r, 1500));
  const fields = { onboardingCompleted: { booleanValue: true }, firstName: { stringValue: firstName }, lastName: { stringValue: 'Activites' }, status: { stringValue: 'active' }, birthDate: { stringValue: birthDate }, email: { stringValue: email }, languages: { arrayValue: { values: [{ stringValue: 'fr' }] } } };
  await fetch(doc(`users/${uid}`) + '?' + Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&'), {
    method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }),
  });
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  return { email, password, uid, firstName };
}

/** Prochaine date publiée réservable d'une expérience (hors accès anticipé des membres). */
async function bookable(exp, seats) {
  const now = Date.now();
  const s = (await fsWhere('sessions', 'experienceId', exp)).filter((d) => {
    const f = d.fields;
    if (f.status.stringValue !== 'published') return false;
    if (f.createdAt && now - new Date(f.createdAt.timestampValue).getTime() < 72 * 3600000) return false;
    return new Date(f.startAt.timestampValue).getTime() > now + 13 * 3_600_000 && int(f.capacity) - int(f.seatsConfirmed) - int(f.seatsHeld) >= seats;
  }).sort((a, b) => a.fields.startAt.timestampValue.localeCompare(b.fields.startAt.timestampValue))[0];
  return s ? s.name.split('/').pop() : null;
}

/** Réserve par le tunnel, avec la case des conditions d'activité physique, puis paiement de TEST accepté. */
async function bookWithTerms(page, sid, uid) {
  await page.waitForURL(`**/reserver/${sid}`, { timeout: 20000 });
  const cta = page.getByRole('button', { name: /Réserver et payer|Réserver gratuitement|Recevoir les coordonnées/ });
  await cta.click();
  assert(await visible(page.getByText('Cochez la case pour accepter les conditions de participation aux activités physiques.')), 'tunnel : la case des conditions est obligatoire');
  await page.getByTestId('physical-terms').getByRole('checkbox').check();
  await cta.click();
  await page.waitForURL('**/paiement-test/**', { timeout: 20000 });
  const rid = (await until(async () => (await fsWhere('reservations', 'userId', uid))[0])).name.split('/').pop();
  await page.getByRole('button', { name: 'Simuler un paiement accepté' }).click();
  await page.waitForURL(`**/espace/reservations/${rid}?paiement=accepte`, { timeout: 20000 });
  return rid;
}

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const exp = await fsGet('experiences/exp-padel');
  assert(exp?.fields.physicalActivity?.booleanValue === true && exp.fields.questionnaire.arrayValue.values.length === 3, 'padel semé : activité physique et questionnaire de 3 questions');
  const sid = await bookable('exp-padel', 2);
  assert(sid, 'une date de padel est réservable');

  // 1. Joueuse A : conditions obligatoires, paiement, questionnaire
  const a = await member('padel-a', 'Amal', '1994-03-12');
  const pa = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  globalThis.__page = pa;
  pa.on('pageerror', (e) => errs.push(e.message));
  await login(pa, a.email, a.password, `/reserver/${sid}`);
  const ridA = await bookWithTerms(pa, sid, a.uid);
  const resA = await fsGet(`reservations/${ridA}`);
  assert(resA.fields.status.stringValue === 'confirmed' && resA.fields.physicalTerms.mapValue.fields.version.stringValue === '2026-11-19', 'Firestore : réservation confirmée, conditions acceptées (version enregistrée)');
  const note = await until(async () => ((await fetch(doc(`users/${a.uid}/notifications`) + '?pageSize=50', { headers: OWNER }).then((r) => r.json())).documents ?? []).find((d) => d.fields.type?.stringValue === 'questionnaire'));
  assert(note && note.fields.link.stringValue === `/espace/reservations/${ridA}#questionnaire`, 'notification : invitation au questionnaire');
  const q = pa.getByTestId('questionnaire');
  assert(await visible(q), 'réservation : section « Votre questionnaire »');
  await q.getByRole('button', { name: 'Envoyer mes réponses' }).click();
  assert(await q.getByText('Choisissez une réponse.').count() === 2, 'questionnaire : 2 réponses obligatoires signalées');
  await q.getByText('Confirmé : je joue en compétition ou presque').click();
  await q.getByText('Pour gagner').click();
  await q.getByRole('button', { name: 'Envoyer mes réponses' }).click();
  assert(await visible(q.getByText('Réponses enregistrées.')), 'questionnaire : réponses enregistrées');
  const ans = (await fsGet(`reservations/${ridA}`)).fields.questionnaire.mapValue.fields.answers.mapValue.fields;
  assert(int(ans.qlevel) === 2 && int(ans.qgoal) === 2, 'Firestore : réponses enregistrées par le serveur (niveau confirmé, pour gagner)');

  // 2. Joueur B : réserve sans répondre → pastille « Questionnaire à remplir »
  const bm = await member('padel-b', 'Bilal', '1992-07-01');
  const pb = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  globalThis.__page = pb;
  await login(pb, bm.email, bm.password, `/reserver/${sid}`);
  await bookWithTerms(pb, sid, bm.uid);
  await pb.goto(`${base}/espace/reservations`, { waitUntil: 'load' });
  assert(await visible(pb.getByTestId('questionnaire-todo')), 'mes réservations : « Questionnaire à remplir »');

  // 3. Paintball 21 ans et plus : refusé par le serveur pour une personne de 19 ans
  const young = await member('paintball-c', 'Chama', `${new Date().getUTCFullYear() - 20}-01-10`);
  const sidPb = await bookable('exp-paintball', 1);
  assert(sidPb, 'une date de paintball est réservable');
  const pc = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  globalThis.__page = pc;
  await login(pc, young.email, young.password, `/reserver/${sidPb}`);
  await pc.waitForURL(`**/reserver/${sidPb}`, { timeout: 20000 });
  await pc.getByTestId('physical-terms').getByRole('checkbox').check();
  await pc.getByRole('button', { name: /Réserver et payer|Recevoir les coordonnées/ }).click();
  assert(await visible(pc.getByText('Cette expérience demande un âge minimum plus élevé que le vôtre.')), 'paintball : âge minimum vérifié par le serveur (19 ans refusé)');

  // 4. Équipe : réponses visibles dans les groupes, proposition de l'algorithme
  const admin = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  globalThis.__page = admin;
  await login(admin, 'admin@thecommunity.test', 'Demo2026!', `/admin/sessions/${sid}/groupes`);
  await admin.waitForURL(`**/admin/sessions/${sid}/groupes`, { timeout: 25000 });
  assert(await visible(admin.getByTestId('questionnaire-summary')), 'groupes : résumé du questionnaire');
  await admin.getByRole('button', { name: "Proposer avec l'algorithme" }).click();
  assert(await visible(admin.getByText("Nouvelle proposition de l'algorithme.")), "groupes : proposition de l'algorithme");
  assert(await visible(admin.getByTestId('member-answers').filter({ hasText: 'Confirmé' })), 'groupes : réponses de la joueuse affichées à l\'équipe');

  // 5. Membre de confiance : statut, proposition, refus avec message
  await admin.goto(`${base}/admin/utilisateurs?q=${encodeURIComponent(a.email)}`, { waitUntil: 'load' });
  await admin.getByRole('button', { name: 'Rendre membre de confiance' }).click();
  assert(await until(async () => (await fsGet(`users/${a.uid}`)).fields.trustedHost?.booleanValue === true), 'équipe : Amal devient membre de confiance');
  await pa.goto(`${base}/espace/proposer`, { waitUntil: 'load' });
  await pa.getByLabel('Titre de la sortie').fill('Padel du dimanche matin');
  await pa.getByLabel(/^Description/).fill('Deux terrains, tous niveaux, équipes par niveau puis un café au club.');
  await pa.getByLabel('Quartier').fill('Racine');
  await pa.getByLabel(/^Dates envisagées/).fill('Dimanches de décembre, 10 h');
  await pa.getByRole('button', { name: 'Envoyer ma proposition' }).click();
  assert(await visible(pa.getByTestId('proposal-sent')), 'membre de confiance : proposition envoyée');
  const prop = await until(async () => (await fsWhere('outingProposals', 'userId', a.uid))[0]);
  assert(prop && prop.fields.status.stringValue === 'pending' && prop.fields.firstName.stringValue === 'Amal', 'Firestore : proposition en attente, prénom du membre');
  await admin.goto(`${base}/admin/propositions`, { waitUntil: 'load' });
  const card = admin.getByTestId('proposal').filter({ hasText: 'Padel du dimanche matin' });
  assert(await visible(card), 'équipe : proposition visible');
  await card.getByRole('button', { name: 'Refuser' }).click();
  await card.getByLabel('Message pour le membre').fill('Le club est complet en décembre : proposez-nous janvier !');
  await card.getByRole('button', { name: 'Envoyer le refus' }).click();
  assert(await until(async () => (await fsGet(`outingProposals/${prop.name.split('/').pop()}`)).fields.status.stringValue === 'declined'), 'Firestore : proposition refusée');
  await pa.goto(`${base}/espace/proposer`, { waitUntil: 'load' });
  assert(await visible(pa.getByText('Le club est complet en décembre')), 'membre : message de l\'équipe affiché');

  console.log(errs.length ? 'ERREURS NAVIGATEUR:\n' + errs.join('\n') : 'aucune erreur navigateur');
  await b.close();
  if (errs.length) process.exit(1);
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
