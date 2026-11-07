// Back-office sur les émulateurs (5d, 5e) : partenaires (ajout, modification, archivage, suppression),
// candidature → partenaire, villes et univers modifiables. Prérequis : émulateurs + seed + site en mode émulateurs.
const { chromium } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080';
const PROJECT = 'demo-thecommunity';
const OWNER = { Authorization: 'Bearer owner' };
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const doc = (path) => `${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;
const fsGet = async (path) => { const r = await fetch(doc(path), { headers: OWNER }); return r.ok ? r.json() : null; };
const fsList = async (path) => { const r = await fetch(doc(path) + '?pageSize=300', { headers: OWNER }); return r.ok ? ((await r.json()).documents ?? []) : []; };
const shot = async (page, name) => { if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.jpg`, quality: 80, fullPage: true }); };

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const page = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  globalThis.__page = page;
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('dialog', (d) => { errs.push('fenêtre système inattendue : ' + d.message()); d.dismiss(); });
  await page.goto(`${base}/connexion?suite=${encodeURIComponent('/admin')}`, { waitUntil: 'load' });
  await page.getByLabel('Adresse e-mail').fill('admin@thecommunity.test');
  await page.getByLabel('Mot de passe').fill('Demo2026!');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/admin$/, { timeout: 20000 });
  const stamp = Date.now();
  const name = `Studio Lumière ${stamp}`;

  // 1. Ajouter un partenaire (avec une erreur corrigée)
  await page.goto(`${base}/admin/partenaires`);
  await page.getByRole('link', { name: 'Nouveau partenaire' }).click();
  await page.waitForURL('**/admin/partenaires/nouveau');
  await page.getByLabel('Nom', { exact: true }).fill(name);
  await page.getByLabel('Type').selectOption('studio');
  await page.getByLabel('Quartier').fill('Maarif');
  await page.getByLabel('Nom du contact').fill('Yasmine');
  await page.getByLabel('E-mail').fill('pas-un-email');
  await page.getByText('Commission', { exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter le partenaire' }).click();
  assert(await visible(page.getByText('Adresse e-mail invalide.')) && await page.getByText('Champ obligatoire.').isVisible(), 'erreurs signalées (e-mail, commission manquante)');
  await page.getByLabel('E-mail').fill('contact@studio.ma');
  await page.getByLabel('Commission (%)').fill('18');
  await page.getByRole('button', { name: 'Ajouter le partenaire' }).click();
  await page.waitForURL(/\/admin\/partenaires\/[A-Za-z0-9]+\?cree=1/, { timeout: 20000 });
  assert(await visible(page.getByText('Partenaire ajouté.')), 'partenaire ajouté → fiche ouverte');
  const pid = new URL(page.url()).pathname.split('/').pop();
  let p = await fsGet(`partners/${pid}`);
  assert(p.fields.name.stringValue === name && p.fields.model.stringValue === 'commission' && Number(p.fields.defaultCommissionPercent.integerValue ?? p.fields.defaultCommissionPercent.doubleValue) === 18, 'Firestore : partenaire enregistré (commission 18 %)');

  // 2. Modifier
  await page.getByLabel('Statut').selectOption('active');
  await page.getByLabel('Téléphone').fill('+212 6 11 22 33 44');
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();
  assert(await visible(page.getByRole('status').filter({ hasText: 'Enregistré.' })), 'modification enregistrée');
  p = await fsGet(`partners/${pid}`);
  assert(p.fields.status.stringValue === 'active' && p.fields.contactPhone.stringValue === '+212 6 11 22 33 44', 'Firestore : statut et téléphone modifiés');
  await shot(page, 'partenaire-1-fiche');

  // 3. Proposé dans la fiche expérience, puis retiré une fois archivé
  const partnerOptions = async () => { await page.goto(`${base}/admin/experiences/nouvelle`); await page.locator('#f-partnerId').waitFor(); return page.locator('#f-partnerId option').allTextContents(); };
  assert((await partnerOptions()).includes(name), 'nouveau partenaire proposé dans la fiche expérience');
  await page.goto(`${base}/admin/partenaires/${pid}`);
  await page.getByRole('button', { name: 'Archiver' }).click();
  assert(await visible(page.getByRole('button', { name: 'Réactiver' })), 'partenaire archivé');
  assert(!(await partnerOptions()).includes(name), 'archivé : plus proposé dans la fiche expérience');
  await page.goto(`${base}/admin/partenaires?vue=archived`);
  assert(await visible(page.getByRole('link', { name: new RegExp(name) })), 'liste « Archivés »');

  // 4. Suppression (super-admin) ; impossible pour un partenaire utilisé
  await page.goto(`${base}/admin/partenaires/${pid}`);
  await page.getByRole('button', { name: 'Supprimer' }).click();
  await page.getByRole('button', { name: 'Oui, supprimer' }).click();
  await page.waitForURL('**/admin/partenaires?supprime=1', { timeout: 20000 });
  assert(await visible(page.getByText('Partenaire supprimé.')) && !(await fsGet(`partners/${pid}`)), 'partenaire supprimé');
  await page.goto(`${base}/admin/partenaires/p-resto-gauthier`);
  assert(await visible(page.getByText(/Suppression impossible : \d+ expérience/)) && await page.getByRole('button', { name: 'Supprimer' }).isDisabled(), 'partenaire utilisé : suppression bloquée, archivage proposé');

  // 5. Candidature → partenaire
  const appName = `Café Gauthier ${stamp}`;
  await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/partnerApplications?documentId=e2e-${stamp}`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { contactName: { stringValue: 'Omar' }, businessName: { stringValue: appName }, type: { stringValue: 'restaurant' }, city: { stringValue: 'Casablanca' }, email: { stringValue: 'omar@cafe.ma' }, phone: { stringValue: '' }, link: { stringValue: '' }, message: { stringValue: 'Un café calme, 20 places, terrasse.' }, locale: { stringValue: 'fr' }, createdAt: { timestampValue: new Date().toISOString() } } }),
  });
  await page.goto(`${base}/admin/partenaires`);
  const card = page.locator('li', { hasText: appName });
  await card.getByRole('button', { name: 'Créer le partenaire' }).click();
  await page.waitForURL(/\/admin\/partenaires\/[A-Za-z0-9]+\?depuis=candidature/, { timeout: 20000 });
  assert(await visible(page.getByText('Partenaire créé depuis la candidature')) && await page.getByLabel('Nom', { exact: true }).inputValue() === appName, 'candidature → fiche partenaire pré-remplie (prospect)');
  assert(await page.getByLabel('E-mail').inputValue() === 'omar@cafe.ma', 'coordonnées reprises');

  // 6. Villes
  await page.goto(`${base}/admin/parametres`);
  await page.getByText('+ Ajouter une ville').click();
  const cityId = `ville-${stamp}`;
  await page.getByLabel('Identifiant (adresse web)').fill(cityId);
  await page.locator('#city-new-fr').fill('Rabat');
  await page.locator('#city-new-ar').fill('الرباط');
  await page.locator('#city-new-districts').fill('Agdal, Hassan\nSouissi');
  await page.getByRole('button', { name: 'Ajouter la ville' }).click();
  assert(await visible(page.getByText(`/${cityId}`)), 'ville ajoutée à la liste');
  const city = await fsGet(`cities/${cityId}`);
  assert(city.fields.name.mapValue.fields.fr.stringValue === 'Rabat' && city.fields.isActive.booleanValue === false && city.fields.districts.arrayValue.values.length === 3, 'Firestore : ville « bientôt », 3 quartiers');

  // 7. Univers : renommer, visible sur le site public, puis remettre
  const renameEat = async (from, to) => {
    await page.goto(`${base}/admin/parametres`);
    const box = page.locator('details', { has: page.locator('#cat-eat-name-fr') });
    await box.locator('summary').click();
    await box.locator('#cat-eat-name-fr').fill(to);
    await box.getByRole('button', { name: "Enregistrer l'univers" }).click();
    const ok = await visible(box.getByRole('status').filter({ hasText: 'Enregistré.' }), 10000);
    if (!ok) console.log('[univers]', await box.locator('[role=alert]').allTextContents(), from);
    return ok;
  };
  assert(await renameEat('Dîners & gastronomie', 'Tables & gastronomie'), 'univers renommé');
  await page.goto(`${base}/`);
  assert(await visible(page.locator('footer').getByRole('link', { name: 'Tables & gastronomie' })), 'nouveau nom visible sur le site public');
  await shot(page, 'parametres-2-public');
  assert(await renameEat('Tables & gastronomie', 'Dîners & gastronomie'), 'nom d\'origine remis');
  const logs = (await fsList('auditLogs')).map((d) => d.fields.action?.stringValue);
  assert(['partner.create', 'partner.update', 'partner.archive', 'partner.delete', 'partnerApplication.convert', 'city.create', 'category.update'].every((a) => logs.includes(a)), 'toutes les actions sont journalisées');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
