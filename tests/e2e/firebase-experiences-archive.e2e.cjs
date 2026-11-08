// Archiver / réactiver / supprimer une expérience (5i) sur les émulateurs.
// Prérequis : émulateurs + seed + site en mode émulateurs (admin@thecommunity.test est super-admin).
const { chromium } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080';
const PROJECT = 'demo-thecommunity';
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const root = `${FS}/v1/projects/${PROJECT}/databases/(default)/documents`;
const fsGet = async (path) => { const r = await fetch(`${root}/${path}`, { headers: OWNER }); return r.ok ? r.json() : null; };
const fsList = async (path) => { const r = await fetch(`${root}/${path}?pageSize=300`, { headers: OWNER }); return r.ok ? ((await r.json()).documents ?? []) : []; };
const fsCreate = async (col, id, fields) => { const r = await fetch(`${root}/${col}?documentId=${id}`, { method: 'POST', headers: OWNER, body: JSON.stringify({ fields }) }); if (!r.ok) throw new Error(`création ${col}/${id} : ${r.status} ${await r.text()}`); };
const fsPatch = async (path, fields) => { const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&'); const r = await fetch(`${root}/${path}?${mask}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields }) }); if (!r.ok) throw new Error(`maj ${path} : ${r.status}`); };
const str = (v) => ({ stringValue: v });
const int = (v) => ({ integerValue: String(v) });

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const page = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  globalThis.__page = page;
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('dialog', (d) => { errs.push('fenêtre système inattendue : ' + d.message()); d.dismiss(); });
  const stamp = Date.now().toString(36);

  // Deux expériences copiées d'une expérience de démonstration : A (publiée, une date à venir sans participant), B (brouillon, jamais réservée).
  const source = (await fsList('experiences')).find((d) => d.fields.status?.stringValue === 'published');
  const srcSession = (await fsList('sessions')).find((d) => d.fields.experienceId?.stringValue === source.name.split('/').pop());
  const A = `arch${stamp}`, B = `supp${stamp}`, SA = `sess${stamp}`;
  const titleA = `Atelier à archiver ${stamp}`, titleB = `Atelier à supprimer ${stamp}`;
  await fsCreate('experiences', A, { ...source.fields, slug: str(`atelier-a-archiver-${stamp}`), title: { mapValue: { fields: { fr: str(titleA) } } }, status: str('published') });
  await fsCreate('experiences', B, { ...source.fields, slug: str(`atelier-a-supprimer-${stamp}`), title: { mapValue: { fields: { fr: str(titleB) } } }, status: str('draft') });
  const start = new Date(Date.now() + 5 * 86400000);
  await fsCreate('sessions', SA, { ...srcSession.fields, experienceId: str(A), startAt: { timestampValue: start.toISOString() }, endAt: { timestampValue: new Date(start.getTime() + 7200000).toISOString() }, seatsConfirmed: int(0), seatsHeld: int(0), waitlistCount: int(0), status: str('published') });

  await page.goto(`${base}/connexion?suite=${encodeURIComponent('/admin')}`, { waitUntil: 'load' });
  await page.getByLabel('Adresse e-mail').fill('admin@thecommunity.test');
  await page.getByLabel('Mot de passe').fill('Demo2026!');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/admin$/, { timeout: 20000 });

  // 1. Archivage refusé tant qu'il reste des participants à venir
  await fsPatch(`sessions/${SA}`, { seatsConfirmed: int(1) });
  await page.goto(`${base}/admin/experiences/${A}`);
  await page.getByRole('button', { name: 'Archiver', exact: true }).click();
  await page.getByRole('button', { name: 'Oui, archiver' }).click();
  assert(await visible(page.getByRole('alert').filter({ hasText: 'Des dates à venir ont encore des participants' })), 'archivage refusé : participants à venir');
  assert((await fsGet(`experiences/${A}`)).fields.status.stringValue === 'published', 'Firestore : toujours publiée');

  // 2. Archiver
  await fsPatch(`sessions/${SA}`, { seatsConfirmed: int(0) });
  await page.getByRole('button', { name: 'Archiver', exact: true }).click();
  await page.getByRole('button', { name: 'Oui, archiver' }).click();
  assert(await visible(page.getByRole('status').filter({ hasText: 'archivée' })), 'expérience archivée (bandeau)');
  assert((await fsGet(`experiences/${A}`)).fields.status.stringValue === 'archived' && (await fsGet(`sessions/${SA}`)).fields.status.stringValue === 'draft', 'Firestore : archivée, date vide repassée en brouillon');

  // 3. Listes du back-office
  await page.goto(`${base}/admin/experiences`);
  assert(!(await page.getByText(titleA).isVisible()), 'liste « En cours » : expérience archivée absente');
  await page.getByRole('link', { name: 'Archivées' }).click();
  await page.waitForURL('**/admin/experiences?vue=archived');
  const row = page.getByRole('row', { name: new RegExp(titleA) });
  assert(await visible(row) && await row.getByText('Archivée').isVisible(), 'liste « Archivées » : expérience avec badge');

  // 4. Site public : fiche « n'est plus proposée », non référencée, absente du catalogue
  await page.goto(`${base}/experiences/atelier-a-archiver-${stamp}`);
  assert(await visible(page.getByRole('heading', { level: 1, name: titleA })) && await page.getByText("Cette expérience n'est plus proposée.").isVisible(), 'fiche publique : « n\'est plus proposée »');
  assert((await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'), 'fiche archivée non référencée');
  await page.goto(`${base}/experiences`);
  assert(!(await page.getByText(titleA).isVisible()), 'catalogue : expérience archivée absente');

  // 4 bis. Favoris (5j) : une expérience archivée reste dans les favoris, en dernier, avec la mention
  const source_id = source.name.split('/').pop();
  await fsCreate('users/demo-superadmin/favorites', A, { createdAt: { timestampValue: new Date().toISOString() } });
  await fsCreate('users/demo-superadmin/favorites', source_id, { createdAt: { timestampValue: new Date().toISOString() } }).catch(() => {});
  await page.goto(`${base}/espace/historique`);
  const favs = page.locator('li').filter({ has: page.getByRole('button', { name: 'Retirer des favoris' }) });
  assert(await visible(favs.filter({ hasText: titleA }).getByText("N'est plus proposée")), 'favoris : expérience archivée avec la mention « N\'est plus proposée »');
  assert((await favs.last().innerText()).includes(titleA), 'favoris : expérience archivée en dernier');

  // 5. Réactiver → brouillon
  await page.goto(`${base}/admin/experiences/${A}`);
  await page.getByRole('button', { name: 'Réactiver (en brouillon)' }).click();
  await page.waitForFunction(() => !document.body.innerText.includes('Réactiver (en brouillon)'), null, { timeout: 15000 });
  assert((await fsGet(`experiences/${A}`)).fields.status.stringValue === 'draft', 'Firestore : réactivée en brouillon');

  // 6. Suppression refusée pour une expérience qui a eu des participants
  await fsCreate('reservations', `res${stamp}`, { experienceId: str(A), sessionId: str(SA), userId: str('quelquun'), status: str('cancelled_by_member') });
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await page.getByRole('button', { name: 'Oui, supprimer' }).click();
  assert(await visible(page.getByRole('alert').filter({ hasText: 'a déjà eu des participants' })), 'suppression refusée : historique');
  assert(!!(await fsGet(`experiences/${A}`)), 'Firestore : expérience conservée');

  // 7. Supprimer une expérience jamais réservée
  await page.goto(`${base}/admin/experiences/${B}`);
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await page.getByRole('button', { name: 'Oui, supprimer' }).click();
  await page.waitForURL('**/admin/experiences?supprime=1', { timeout: 20000 });
  assert(await visible(page.getByText('Expérience supprimée.')), 'suppression confirmée');
  assert(!(await fsGet(`experiences/${B}`)), 'Firestore : expérience supprimée');
  const logs = (await fsList('auditLogs')).map((d) => d.fields.action?.stringValue);
  assert(['experience.archive', 'experience.activate', 'experience.delete'].every((a) => logs.includes(a)), 'actions journalisées');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch(async (e) => {
  console.error(e.message);
  if (process.env.FAIL_SHOT && globalThis.__page) await globalThis.__page.screenshot({ path: process.env.FAIL_SHOT, fullPage: true }).catch(() => {});
  process.exit(1);
});
