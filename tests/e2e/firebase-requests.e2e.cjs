// Participation « sur demande » sur les émulateurs : demande d'un membre → l'admin accepte → paiement de test →
// confirmé ; une autre demande est refusée. Prérequis : émulateurs + `npm run seed` + site en mode émulateurs.
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

/** Membre prêt à réserver (e-mail confirmé, profil complet), créé directement dans les émulateurs. */
async function makeMember(firstName, profession) {
  const email = `${firstName.toLowerCase()}.${Date.now()}@example.com`;
  const password = 'MotDePasse!2026';
  const { localId: uid } = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  })).json();
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  await new Promise((r) => setTimeout(r, 1500)); // trigger de création du profil
  const fields = {
    onboardingCompleted: { booleanValue: true }, status: { stringValue: 'active' }, firstName: { stringValue: firstName }, lastName: { stringValue: 'Test' },
    birthDate: { stringValue: '1994-03-12' }, profession: { stringValue: profession }, bio: { stringValue: 'Curieuse et bavarde.' },
    interests: { arrayValue: { values: [{ stringValue: 'gastronomy' }, { stringValue: 'art' }, { stringValue: 'travel' }] } },
  };
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&');
  await fetch(doc(`users/${uid}`) + '?' + mask, { method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });
  return { email, password, uid };
}

async function login(page, who, suite) {
  await page.goto(`${base}/connexion?suite=${encodeURIComponent(suite)}`);
  await page.getByLabel('Adresse e-mail').fill(who.email);
  await page.getByLabel('Mot de passe').fill(who.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(`**${suite}`, { timeout: 20000 });
}

(async () => {
  // Une date du « Dîner entre inconnus » (sur demande), au-delà de la fermeture de 12 h, avec des places.
  const now = Date.now();
  const sessions = (await fsList('sessions')).filter((d) => {
    const f = d.fields;
    return f.experienceId.stringValue === 'exp-diner-inconnus' && f.status.stringValue === 'published'
      && new Date(f.startAt.timestampValue).getTime() > now + 13 * 3_600_000 && int(f.capacity) - int(f.seatsConfirmed) - int(f.seatsHeld) >= 2;
  });
  const sid = sessions[0].name.split('/').pop();
  const exp = await fsGet('experiences/exp-diner-inconnus');
  assert(exp.fields.admission.stringValue === 'on_request', 'expérience de démonstration « sur demande »');

  const b = await chromium.launch();
  const errs = [];
  const open = async (opts) => { const p = await (await b.newContext(opts)).newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('fenêtre système inattendue : ' + d.message()); d.dismiss(); }); return p; };
  const member = await open({ ...devices['iPhone 13'] });
  globalThis.__page = member;
  const nadia = await makeMember('Nadia', 'Architecte');

  // 1. Fiche : bouton « Demander à participer »
  await member.goto(`${base}/experiences/${exp.fields.slug.stringValue}`);
  assert(await visible(member.getByText("Participation sur demande : l'équipe valide chaque inscription.")), 'fiche : participation sur demande annoncée');
  assert(await member.getByRole('link', { name: 'Demander à participer' }).count() >= 1, 'fiche : bouton « Demander à participer »');

  // 2. Demande
  await login(member, nadia, `/reserver/${sid}`);
  assert(await visible(member.getByRole('heading', { name: 'Participation sur demande' })), 'tunnel : explication (paiement seulement après acceptation)');
  assert(await member.getByRole('button', { name: /Réserver et payer/ }).count() === 0, 'pas de paiement immédiat');
  await member.getByLabel('Pourquoi souhaitez-vous participer ?').fill('Nouvelle à Casablanca, j’adore les tables où l’on refait le monde.');
  await member.getByLabel('Votre compte Instagram').fill('pas valide !');
  await member.getByRole('button', { name: 'Envoyer ma demande' }).click();
  assert(await visible(member.getByText('Compte Instagram invalide')), 'Instagram invalide refusé');
  await member.getByLabel('Votre compte Instagram').fill('https://instagram.com/Nadia.Test');
  await shot(member, 'demande-1-formulaire');
  await member.getByRole('button', { name: 'Envoyer ma demande' }).click();
  assert(await visible(member.getByRole('heading', { name: 'Demande envoyée' })), 'demande envoyée');
  const req = await fsGet(`bookingRequests/${sid}_${nadia.uid}`);
  assert(req.fields.status.stringValue === 'pending' && req.fields.instagram.stringValue === 'nadia.test', 'Firestore : demande en attente, Instagram normalisé');
  assert(int((await fsGet(`sessions/${sid}`)).fields.seatsHeld) === int(sessions[0].fields.seatsHeld), 'aucune place bloquée avant acceptation');
  await member.goto(`${base}/espace/reservations`);
  assert(await visible(member.getByText('En attente de réponse')), '« Mes réservations » : demande en attente');

  // 3. Une seconde personne, qui sera refusée
  const yanis = await makeMember('Yanis', 'Ingénieur');
  const other = await open({ ...devices['iPhone 13'] });
  await login(other, yanis, `/reserver/${sid}`);
  await other.getByRole('button', { name: 'Envoyer ma demande' }).click();
  assert(await visible(other.getByRole('heading', { name: 'Demande envoyée' })), 'deuxième demande envoyée (message facultatif)');

  // 4. Back-office : l'admin accepte Nadia et refuse Yanis
  const admin = await open({ viewport: { width: 1366, height: 900 } });
  await login(admin, { email: 'admin@thecommunity.test', password: 'Demo2026!' }, '/admin');
  assert(await visible(admin.getByText(/demandes? de participation à traiter/)), 'tableau de bord : demandes à traiter signalées');
  await admin.goto(`${base}/admin/participations`);
  const card = (name) => admin.locator('article', { hasText: `${name} Test` });
  assert(await visible(card('Nadia')), 'back-office : demande de Nadia affichée');
  assert(await card('Nadia').getByText('Architecte').isVisible() && await card('Nadia').getByText('refait le monde').isVisible(), 'profil et message visibles');
  assert(await card('Nadia').getByRole('link', { name: 'nadia.test' }).getAttribute('href') === 'https://www.instagram.com/nadia.test/', 'lien Instagram');
  await shot(admin, 'demande-2-back-office');
  await card('Nadia').getByRole('button', { name: 'Accepter' }).click();
  assert(await card('Nadia').getByRole('button', { name: 'Accepter' }).waitFor({ state: 'detached', timeout: 15000 }).then(() => true, () => false), 'Nadia acceptée');
  await card('Yanis').getByRole('button', { name: 'Refuser' }).click();
  await card('Yanis').getByRole('button', { name: 'Confirmer le refus de Yanis' }).click();
  assert(await card('Yanis').getByRole('button', { name: /Refuser|Confirmer le refus/ }).waitFor({ state: 'detached', timeout: 15000 }).then(() => true, () => false), 'Yanis refusé');
  assert(await visible(admin.getByText('Acceptée')) && await visible(admin.getByText('Refusée')), 'dernières décisions affichées');

  // 5. Nadia : notification, place réservée 24 h, paiement
  await member.goto(`${base}/espace/notifications`);
  assert(await visible(member.getByText('Votre demande est acceptée')), 'notification « demande acceptée »');
  await member.goto(`${base}/reserver/${sid}`);
  await member.getByRole('link', { name: 'Voir et payer ma réservation' }).click();
  assert(await visible(member.getByText(/Votre place vous est réservée jusqu'au/)), 'place réservée jusqu’au lendemain (24 h)');
  await shot(member, 'demande-3-acceptee');
  await member.getByRole('button', { name: /^Payer/ }).click();
  await member.waitForURL('**/paiement-test/**', { timeout: 20000 });
  await member.getByRole('button', { name: 'Simuler un paiement accepté' }).click();
  assert(await visible(member.getByText("C'est réservé")), 'paiement de test → participation confirmée');

  // 6. Yanis : refus affiché
  await other.goto(`${base}/reserver/${sid}`);
  assert(await visible(other.getByRole('heading', { name: 'Demande non retenue' })), 'Yanis voit que sa demande n’est pas retenue');

  assert(errs.length === 0, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
