// Parcours réel sur les émulateurs Firebase (phase 3b).
// Prérequis : émulateurs lancés + `npm run seed`, site construit et démarré avec la configuration
// des émulateurs (voir docs/12-phase-3-avancement.md). Usage : node tests/e2e/firebase-auth.e2e.cjs
const { chromium, devices } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:8080';
const PROJECT = 'demo-thecommunity';
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };

// Lecture Firestore « admin » via l'API REST de l'émulateur (jeton « owner » accepté par l'émulateur).
async function fsGet(path) {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, { headers: { Authorization: 'Bearer owner' } });
  return r.ok ? r.json() : null;
}
async function fsList(path) {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path}?pageSize=300`, { headers: { Authorization: 'Bearer owner' } });
  return r.ok ? ((await r.json()).documents ?? []) : [];
}
async function oobCodes() {
  return (await (await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)).json()).oobCodes ?? [];
}
const visible = (locator, ms = 10000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const waitFor = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await new Promise(r => setTimeout(r, 300)); } return null; };

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
  const page = await ctx.newPage();
  globalThis.__page = page;
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push(e.message));
  const go = async (p) => { await page.goto(base + p, { waitUntil: 'load' }); await page.waitForTimeout(400); };

  // Catalogue lu depuis Firestore
  await go('/experiences');
  assert(await page.getByRole('link', { name: 'Dîner entre inconnus' }).count() >= 1, 'catalogue lu depuis Firestore');

  // Espace protégé
  await go('/espace');
  assert(page.url().includes('/connexion'), 'espace membre : redirection vers la connexion sans session');

  // Erreur de connexion
  await page.getByLabel('Adresse e-mail').fill('salma@thecommunity.test');
  await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  assert(await visible(page.getByText('E-mail ou mot de passe incorrect.'), 10000) || await page.getByText('E-mail ou mot de passe incorrect.').waitFor({ timeout: 10000 }).then(() => true), 'mauvais mot de passe refusé');

  // Inscription
  const email = `rita.${Date.now()}@example.com`;
  await go('/inscription');
  await page.getByLabel('Prénom').fill('Rita');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill('MotDePasse!2026');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  assert(await page.getByText("Merci d'accepter les conditions").isVisible(), 'inscription refusée sans consentement');
  await page.locator('input[name="consent"]').check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.waitForURL('**/bienvenue', { timeout: 20000 });
  assert(await page.locator('#f-firstName').inputValue() === 'Rita', 'questionnaire pré-rempli avec le prénom saisi');

  // Questionnaire enregistré par le serveur
  await page.locator('#f-lastName').fill('Bentahila');
  await page.locator('#f-birthDate').fill('1992-06-30');
  await page.getByRole('button', { name: 'Continuer' }).click();
  for (const l of ['Français', 'Darija']) await page.getByRole('button', { name: l, exact: true }).click();
  for (const i of ['Gastronomie', 'Art', 'Voyage']) await page.getByRole('button', { name: i, exact: true }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Rencontrer de nouvelles personnes' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex') });
  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.waitForURL(/\/espace$/, { timeout: 20000 });
  assert(await page.getByRole('heading', { name: 'Bonjour Rita' }).isVisible(), 'arrivée dans l’espace membre');
  const users = await fsList('users');
  const me = users.find(u => u.fields?.email?.stringValue === email);
  assert(me && me.fields.onboardingCompleted.booleanValue === true && me.fields.role.stringValue === 'user', 'profil enregistré dans Firestore (rôle user)');
  assert(me.fields.consents?.mapValue?.fields?.version?.stringValue === '2026-11', 'consentements horodatés (version 2026-11)');
  assert(me.fields.photoPath?.stringValue?.startsWith('users/'), 'photo de profil envoyée dans Storage');
  const uid = me.name.split('/').pop();

  // Confirmation d'e-mail
  assert(await page.getByText('Confirmez votre adresse e-mail').isVisible(), 'bandeau « confirmez votre e-mail »');
  const code = await waitFor(async () => (await oobCodes()).find(c => c.email === email && c.requestType === 'VERIFY_EMAIL'));
  assert(code, 'e-mail de vérification émis');
  await fetch(code.oobLink);
  await page.getByRole('button', { name: "J'ai confirmé" }).click();
  await page.waitForTimeout(1500);
  assert(!(await page.getByText('Confirmez votre adresse e-mail').isVisible()), 'bandeau retiré après confirmation');

  // Préférences enregistrées dans le compte
  await go('/espace/preferences');
  await page.getByRole('switch').nth(2).check({ force: true });
  await page.waitForTimeout(800);
  assert((await fsGet(`users/${uid}`)).fields.notificationPrefs.mapValue.fields.marketingEmail.booleanValue === true, 'préférence enregistrée dans Firestore');

  // Favori synchronisé au compte
  await go('/experiences/atelier-ceramique-cil');
  await page.getByRole('button', { name: 'Ajouter aux favoris' }).first().click();
  assert(await waitFor(async () => (await fsList(`users/${uid}/favorites`)).length === 1, 8000), 'favori enregistré dans le compte');

  // Déconnexion
  await go('/espace');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await page.waitForTimeout(1500);
  await go('/espace');
  assert(page.url().includes('/connexion'), 'déconnexion : espace de nouveau protégé');

  // Connexion d'un membre existant (données de démonstration)
  await page.getByLabel('Adresse e-mail').fill('salma@thecommunity.test');
  await page.getByLabel('Mot de passe').fill('Demo2026!');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/espace$/, { timeout: 20000 });
  assert(await page.getByRole('heading', { name: 'Bonjour Salma' }).isVisible(), 'connexion de Salma');
  await go('/espace/reservations/res-demo-escape');
  assert(await page.getByText('Équipe B').isVisible(), 'groupe révélé lu depuis Firestore');
  const other = (await fsList('reservations')).find(r => r.fields.userId.stringValue !== 'demo-salma');
  const otherId = other.name.split('/').pop();
  await go(`/espace/reservations/${otherId}`);
  assert(await page.getByText('Page introuvable').isVisible(), 'la réservation d’un autre membre est introuvable');

  await go('/espace/notifications');
  await page.getByRole('button', { name: 'Tout marquer comme lu' }).click();
  assert(await waitFor(async () => (await fsList('users/demo-salma/notifications')).every(n => n.fields.readAt?.timestampValue), 8000), 'notifications marquées lues dans Firestore');

  await go('/espace/preferences');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: /Télécharger mes données/ }).click()]);
  const data = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
  assert(data.account.email === 'salma@thecommunity.test' && data.reservations.length === 5 && data.reservations.every(r => r.userId === 'demo-salma'), 'export : uniquement ses propres données');
  await page.getByRole('button', { name: 'Supprimer mon compte' }).click();
  await page.getByRole('button', { name: 'Confirmer la demande de suppression' }).click();
  assert(await visible(page.getByText('Demande de suppression enregistrée'), 8000), 'demande de suppression enregistrée');

  // API de session : refus d'un jeton invalide
  const bad = await page.request.post(base + '/api/session', { data: { idToken: 'faux' } });
  assert(bad.status() === 401, 'cookie de session refusé pour un jeton invalide');

  // Mot de passe oublié
  await page.getByRole('button', { name: 'Se déconnecter' }).first().click().catch(() => undefined);
  await go('/mot-de-passe-oublie');
  await page.getByLabel('Adresse e-mail').fill('salma@thecommunity.test');
  await page.getByRole('button', { name: 'Envoyer le lien' }).click();
  assert(await visible(page.getByText('un e-mail vient de vous être envoyé'), 8000), 'mot de passe oublié : message envoyé');
  assert(await waitFor(async () => (await oobCodes()).some(c => c.email === 'salma@thecommunity.test' && c.requestType === 'PASSWORD_RESET')), 'lien de réinitialisation émis');

  // Contact
  await go('/contact');
  await page.getByLabel('Votre prénom').fill('Rita');
  await page.getByLabel('Votre e-mail').fill('rita@example.com');
  await page.getByLabel('Votre message').fill('Bonjour, je voudrais proposer un lieu partenaire.');
  await page.getByRole('button', { name: 'Envoyer' }).click();
  assert(await visible(page.getByText('Merci ! Votre message a bien été envoyé'), 8000), 'message de contact enregistré');

  console.log(errs.length ? 'ERREURS NAVIGATEUR:\n' + errs.join('\n') : 'aucune erreur navigateur');
  await b.close();
  if (errs.length) process.exit(1);
})().catch(async e => {
  console.error(e.message);
  const p = globalThis.__page;
  if (p && process.env.FAIL_SHOT) {
    await p.screenshot({ path: process.env.FAIL_SHOT }).catch(() => undefined);
    console.error('URL au moment de l’échec :', p.url());
  }
  process.exit(1);
});
