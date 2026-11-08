// Composition des tables sur les émulateurs (6) : proposition de l'algorithme, correction, enregistrement,
// révélation (notification + e-mail), fiche hôte et marque-places, vue du membre.
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



const put = (path, fields) => fetch(doc(path), { method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });
const str = (v) => ({ stringValue: v });
const num = (v) => ({ integerValue: String(v) });
const arr = (xs) => ({ arrayValue: { values: xs.map(str) } });

(async () => {
  // Une nouvelle date du « Dîner entre inconnus » (tables de 5 à 7) dans 5 jours, avec 11 participants confirmés.
  const exp = await fsGet('experiences/exp-diner-inconnus');
  const model = (await fsList('sessions')).find((s) => s.fields.experienceId.stringValue === 'exp-diner-inconnus');
  const sid = `e2e-tables-${Date.now()}`;
  const start = new Date(Date.now() + 5 * 86_400_000);
  const { createdAt: _c, groupsStatus: _g, ...mf } = model.fields;
  await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/sessions?documentId=${sid}`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { ...mf, capacity: num(30), seatsConfirmed: num(11), seatsHeld: num(0), waitlistCount: num(0), groupsStatus: str('none'),
      startAt: { timestampValue: start.toISOString() }, endAt: { timestampValue: new Date(start.getTime() + 7_200_000).toISOString() } } }),
  });
  const snapshot = { mapValue: { fields: { title: exp.fields.title, slug: exp.fields.slug, startAt: { timestampValue: start.toISOString() }, endAt: { timestampValue: new Date(start.getTime() + 7_200_000).toISOString() }, district: str('Gauthier'), coverImagePath: str(''), categoryId: str('eat'), bookingMode: str('social_dinner') } } };
  const reservation = async (rid, uid) => put(`reservations/${rid}`, {
    userId: str(uid), sessionId: str(sid), experienceId: str('exp-diner-inconnus'), cityId: str('casablanca'), categoryId: str('eat'), seats: num(1), status: str('confirmed'),
    pricing: { mapValue: { fields: { unitAmount: num(18900), seats: num(1), subtotal: num(18900), discount: num(0), fees: num(0), total: num(18900), currency: str('MAD') } } },
    sessionSnapshot: snapshot, createdAt: { timestampValue: new Date().toISOString() }, paidAt: { timestampValue: new Date().toISOString() },
  });
  const names = ['Amine', 'Bouchra', 'Chadi', 'Dounia', 'Elias', 'Fatima', 'Ghita', 'Hamza', 'Ilham', 'Jad'];
  for (let i = 0; i < names.length; i++) {
    const uid = `e2e-${sid}-${i}`;
    await put(`users/${uid}`, { firstName: str(names[i]), lastName: str('Test'), email: str(`${uid}@example.com`), birthDate: str(`${1988 + i}-03-0${1 + (i % 8)}`), gender: str(i % 2 ? 'female' : 'male'), languages: arr(i === 0 ? ['en'] : ['fr', 'en']), interests: arr(['food', 'travel']), status: str('active'), onboardingCompleted: { booleanValue: true } });
    await reservation(`e2e-r-${sid}-${i}`, uid);
  }
  const salma = await makeMember('Salma');
  const rid = `e2e-r-${sid}-me`;
  await reservation(rid, salma.uid);

  const b = await chromium.launch();
  const errs = [];
  const open = async (opts = { ...devices['iPhone 13'] }) => { const ctx = await b.newContext(opts); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('fenêtre système inattendue : ' + d.message()); d.dismiss(); }); return p; };

  // 1. Équipe : proposition, enregistrement, révélation
  const admin = await open({ viewport: { width: 1366, height: 900 } });
  globalThis.__page = admin;
  await login(admin, { email: 'admin@thecommunity.test', password: 'Demo2026!' }, '/admin');
  await admin.goto(`${base}/admin/sessions/${sid}/groupes`);
  assert(await visible(admin.getByRole('region', { name: 'Non placés' })), '11 participants confirmés, encore non placés');
  await admin.getByRole('button', { name: "Proposer avec l'algorithme" }).click();
  assert(await visible(admin.getByRole('region', { name: 'Table 1' })) && await admin.getByRole('region', { name: 'Table 2' }).isVisible(), "l'algorithme propose 2 tables");
  assert(await admin.getByRole('region', { name: 'Non placés' }).count() === 0, 'tout le monde est placé');
  assert(await admin.getByText(/État : Proposition de l.algorithme/).isVisible(), 'état : proposition');
  let groups = (await fsList('groups')).filter((g) => g.fields.sessionId.stringValue === sid);
  assert(groups.length === 2 && groups.every((g) => g.fields.status.stringValue === 'proposed'), 'Firestore : 2 tables proposées');
  // Correction à la main : Salma passe à l'autre table.
  const salmaRow = admin.locator(`#mv-${salma.uid}`);
  const current = await salmaRow.inputValue();
  const other = groups.map((g) => g.name.split('/').pop()).find((g) => g !== current);
  await salmaRow.selectOption(other);
  await admin.getByRole('button', { name: 'Enregistrer la composition' }).click();
  assert(await visible(admin.getByText('Composition enregistrée.')), 'composition enregistrée');
  assert(await visible(admin.getByText(/État : Enregistrés/)), 'état : enregistrés');
  await shot(admin, 'tables-1-composition');
  await admin.getByRole('button', { name: 'Révéler aux participants' }).click();
  await admin.getByRole('button', { name: 'Oui, révéler' }).click();
  assert(await visible(admin.getByText('Groupes révélés : les participants sont prévenus.')), 'groupes révélés');
  const res = await fsGet(`reservations/${rid}`);
  assert(res.fields.groupId.stringValue === other && res.fields.venue, 'Firestore : Salma à sa nouvelle table, lieu communiqué');
  const mails = (await fsList('mail')).filter((m) => m.fields.kind?.stringValue === 'group_revealed' && m.fields.refs?.mapValue.fields.sessionId?.stringValue === sid);
  assert(mails.length === 11, 'un e-mail « votre table est prête » par participant (boîte d\'envoi)');

  // 2. Fiche hôte et marque-places
  await admin.goto(`${base}/admin/sessions/${sid}/fiche-hote`);
  await admin.getByLabel('Hôte ou hôtesse').fill('Aya');
  await admin.getByLabel('Déroulé et consignes').fill('19 h 45 accueil, 20 h tour de table.');
  await admin.getByRole('button', { name: 'Enregistrer la fiche' }).click();
  assert(await visible(admin.getByText('Enregistré.')), 'fiche hôte enregistrée');
  assert(await admin.getByRole('region', { name: /Table 1/ }).isVisible() && await admin.getByText('Salma', { exact: true }).isVisible(), 'marque-places par table');
  await shot(admin, 'tables-2-fiche-hote');

  // 3. Membre : sa table et le lieu
  const page = await open();
  await login(page, salma, `/espace/reservations/${rid}`);
  const label = (await fsGet(`groups/${other}`)).fields.label.stringValue;
  assert(await visible(page.getByText(new RegExp(`Votre groupe · ${label}`))), `membre : « Votre groupe · ${label} »`);
  const tablemates = (await fsGet(`groups/${other}`)).fields.members.arrayValue.values.map((v) => v.mapValue.fields.firstName.stringValue).filter((n) => n !== 'Salma');
  assert(await page.getByText(tablemates[0], { exact: true }).first().isVisible(), 'membre : prénoms de la table visibles');
  assert(await page.getByText(/Restaurant partenaire/).first().isVisible(), 'membre : lieu révélé');
  assert(!(await page.getByText('@example.com').count()), 'aucune coordonnée des autres membres');
  await shot(page, 'tables-3-membre');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
