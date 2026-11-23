// Étape 31 sur les émulateurs : deux personnes d'un même groupe (expérience terminée) — Amal dit « J'aimerais revoir
// Badr » (Badr n'en sait rien), puis Badr dit pareil → « C'est réciproque » pour les deux (notification) ; Badr invite
// Amal à une prochaine date → Amal est prévenue ; Chama demande à ne plus être réunie avec Amal.
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


const ts = (ms) => ({ timestampValue: new Date(ms).toISOString() });
const str = (v) => ({ stringValue: v });
const put = (path, fields) => fetch(doc(path), { method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const watch = (p) => p.on('pageerror', (e) => errs.push(e.message));
  const run = Date.now().toString(36);
  const [amal, badr, chama] = [await member('amal', 'Amal'), await member('badr', 'Badr'), await member('chama', 'Chama')];
  // Une expérience terminée il y a 3 jours, un groupe révélé, trois présences.
  const start = Date.now() - 3 * 86_400_000;
  const sid = `meet-${run}`;
  const gid = `${sid}_t1`;
  await put(`sessions/${sid}`, { experienceId: str('exp-street-art'), status: str('published'), startAt: ts(start), endAt: ts(start + 7_200_000), capacity: { integerValue: '10' } });
  await put(`groups/${gid}`, {
    sessionId: str(sid), status: str('revealed'), label: str('Table 1'),
    memberIds: { arrayValue: { values: [amal.uid, badr.uid, chama.uid].map(str) } },
    members: { arrayValue: { values: [[amal, 'Amal'], [badr, 'Badr'], [chama, 'Chama']].map(([u, n]) => ({ mapValue: { fields: { uid: str(u.uid), firstName: str(n), interests: { arrayValue: { values: [str('culture')] } } } } })) } },
  });
  for (const u of [amal, badr, chama]) {
    await put(`reservations/${sid}_${u.uid}`, {
      userId: str(u.uid), sessionId: str(sid), experienceId: str('exp-street-art'), status: str('attended'), groupId: str(gid), seats: { integerValue: '1' },
      createdAt: ts(start - 86_400_000),
      sessionSnapshot: { mapValue: { fields: { title: { mapValue: { fields: { fr: str('Balade street art au centre-ville') } } }, startAt: ts(start), endAt: ts(start + 7_200_000) } } },
      pricing: { mapValue: { fields: { total: { integerValue: '9000' }, currency: str('MAD'), unitAmount: { integerValue: '9000' } } } },
    });
  }

  // 1. Amal : « J'aimerais revoir Badr » — privé
  const pa = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  watch(pa);
  globalThis.__page = pa;
  await login(pa, amal.email, amal.password, '/espace/rencontres');
  await pa.waitForURL('**/espace/rencontres', { timeout: 25000 });
  const g = pa.getByTestId('meet-group').filter({ hasText: 'Balade street art' });
  assert(await visible(g) && await g.getByTestId('meet-member').count() === 2, 'Amal : son groupe et les 2 autres membres');
  await g.getByTestId('meet-member').filter({ hasText: 'Badr' }).getByRole('button', { name: "J'aimerais revoir Badr" }).click();
  assert(await visible(g.getByRole('button', { name: /Vous aimeriez revoir Badr/ }), 20000), 'Amal : souhait enregistré');
  assert(await until(async () => (await fsGet(`meetWishes/${amal.uid}_${badr.uid}`))?.fields), 'Firestore : souhait privé');
  assert(!(await fsGet(`connections/${[amal.uid, badr.uid].sort().join('_')}`)), 'pas encore de connexion');

  // 2. Badr : réciproque
  const pb = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  watch(pb);
  globalThis.__page = pb;
  await login(pb, badr.email, badr.password, '/espace/rencontres');
  await pb.waitForURL('**/espace/rencontres', { timeout: 25000 });
  assert(!(await pb.getByTestId('meet-contact').count()), 'Badr : ne voit rien du souhait d\'Amal');
  const gb = pb.getByTestId('meet-group').filter({ hasText: 'Balade street art' });
  await gb.getByTestId('meet-member').filter({ hasText: 'Amal' }).getByRole('button', { name: "J'aimerais revoir Amal" }).click();
  assert(await visible(gb.getByRole('status').filter({ hasText: 'Envie partagée' }), 20000), 'Badr : « Envie partagée »');
  await pb.reload({ waitUntil: 'load' });
  const contact = pb.getByTestId('meet-contact').filter({ hasText: 'Amal' });
  assert(await visible(contact), 'Badr : Amal dans « C\'est réciproque »');
  const notifs = async (uid, type) => ((await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}/notifications`, { headers: OWNER }).then((r) => r.json())).documents ?? []).filter((d) => d.fields.type?.stringValue === type).length;
  assert(await notifs(amal.uid, 'meet_match') === 1 && await notifs(badr.uid, 'meet_match') === 1, 'les deux sont prévenus');

  // 3. Badr invite Amal à une prochaine date
  await contact.getByRole('button', { name: 'Inviter Amal à une expérience' }).click();
  await contact.locator('select').selectOption({ index: 1 });
  await contact.getByRole('button', { name: "Envoyer l'invitation" }).click();
  assert(await visible(pb.getByRole('status').filter({ hasText: 'Invitation envoyée à Amal' }), 20000), 'invitation envoyée');
  assert(await until(async () => (await notifs(amal.uid, 'meet_invite')) === 1), 'Amal reçoit l\'invitation');

  // 4. Chama ne veut plus être réunie avec Amal
  const pc = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  watch(pc);
  globalThis.__page = pc;
  await login(pc, chama.email, chama.password, '/espace/rencontres');
  await pc.waitForURL('**/espace/rencontres', { timeout: 25000 });
  const ma = pc.getByTestId('meet-member').filter({ hasText: 'Amal' });
  await ma.getByRole('button', { name: 'Ne plus être réuni·e avec Amal' }).click();
  await ma.getByRole('button', { name: 'Confirmer' }).click();
  assert(await visible(ma.getByTestId('meet-avoided'), 20000), 'Chama : « ne plus être réunie »');
  assert(await until(async () => (await fsGet(`avoids/${chama.uid}`))?.fields?.uids?.arrayValue?.values?.[0]?.stringValue === amal.uid), 'Firestore : demande privée enregistrée');

  // 5. Étape 30 — « Pour vous » : univers préféré « Jeux », hors activités déjà réservées
  await fetch(doc(`users/${amal.uid}`) + '?updateMask.fieldPaths=favoriteCategories&updateMask.fieldPaths=gender', { method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields: { favoriteCategories: { arrayValue: { values: [str('play')] } }, gender: str('female') } }) });
  globalThis.__page = pa;
  await pa.goto(base + '/experiences', { waitUntil: 'load' });
  const fy = pa.getByTestId('for-you');
  assert(await visible(fy, 20000) && await fy.getByRole('link').count() > 0, '« Pour vous » sur le catalogue (personne connectée)');
  const links = await fy.getByRole('link').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  const play = new Set(['/experiences/escape-game-en-equipe-maarif', '/experiences/quiz-blind-test-gauthier', '/experiences/soiree-jeux-de-societe-maarif', '/experiences/karaoke-entre-inconnus-gauthier', '/experiences/paintball-entre-inconnus-bouskoura']);
  assert(links.some((h) => play.has(h)), `« Pour vous » : des jeux en tête (${links.join(', ')})`);
  await pa.goto(base + '/', { waitUntil: 'load' });
  assert(await visible(pa.getByTestId('for-you'), 20000), '« Pour vous » sur l\'accueil');
  const anon = await (await b.newContext()).newPage();
  await anon.goto(base + '/experiences', { waitUntil: 'networkidle' });
  assert(!(await anon.getByTestId('for-you').count()), 'rien pour une personne non connectée');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (globalThis.__page && process.env.FAIL_SHOT) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  if (globalThis.__page) console.error('URL au moment de l’échec :', globalThis.__page.url());
  process.exit(1);
});
