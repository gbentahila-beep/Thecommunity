// Refonte du 8 novembre (mode démo) : accueil (8a), menu « Découvrir » (8b), blog (8c).
const { chromium, devices } = require('playwright');
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const assert = (c, m) => { if (!c) throw new Error('ÉCHEC: ' + m); console.log('ok -', m); };
const visible = (locator, ms = 15000) => locator.first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const watch = (p) => { p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('dialog: ' + d.message()); d.dismiss(); }); };
  const noOverflow = async (p, label) => assert(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${label} : pas de débordement horizontal`);

  // ——— Bureau ———
  const desk = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const d = await desk.newPage(); watch(d);
  await d.goto(`${base}/`);
  assert(await d.getByRole('heading', { level: 1, name: /Your people\s*are out there\./ }).isVisible(), 'accroche « Your people are out there. »');
  assert(await d.getByText('Sortez de votre routine. Rencontrez de nouvelles personnes. Dites oui à quelque chose de différent.').isVisible(), 'sous-titre de l\'accroche');

  // Menu Découvrir
  const header = d.locator('header');
  for (const l of ['À propos', 'Comment ça marche', 'Blog']) assert(await header.getByRole('link', { name: l, exact: true }).isVisible(), `menu : ${l}`);
  const discover = header.getByRole('button', { name: 'Découvrir' });
  assert(await discover.getAttribute('aria-expanded') === 'false', 'Découvrir fermé au départ');
  await discover.focus();
  await d.keyboard.press('ArrowDown');
  const menu = d.getByRole('navigation', { name: /univers/i });
  assert(await visible(menu), 'Découvrir ouvert au clavier');
  for (const l of ['Dîners & gastronomie', 'Sport & bien-être', 'Jeux', 'Ateliers', 'Sorties']) assert(await menu.getByRole('link', { name: l }).isVisible(), `menu Découvrir : ${l}`);
  await d.keyboard.press('Escape');
  assert(await discover.getAttribute('aria-expanded') === 'false', 'Échap referme le menu');
  await discover.hover();
  await menu.getByRole('link', { name: 'Jeux' }).click();
  await d.waitForURL('**/casablanca/play');
  assert(true, 'Découvrir → Jeux ouvre l\'univers');

  // Sections de l'accueil
  await d.goto(`${base}/`);
  const how = d.locator('section', { has: d.getByRole('heading', { name: 'Comment ça marche', exact: true }) });
  assert(await how.getByRole('link', { name: /Découvrir les expériences/ }).getAttribute('href') === '/experiences', 'carte 2 : bouton vers les expériences');
  assert(await how.locator('img').count() === 3, 'carte 3 : trois photos');
  const uni = d.locator('section[aria-labelledby="universes-title"]');
  assert(await uni.locator('li').count() === 5, 'cinq univers');
  const boxes = await uni.locator('li').evaluateAll((lis) => lis.map((li) => { const img = li.querySelector('img').getBoundingClientRect(); const h = li.querySelector('h3').getBoundingClientRect(); return img.left > h.left; }));
  assert(boxes.every((right, i) => right === (i % 2 === 0)), 'univers en alternance photo à droite / à gauche');
  assert(await d.getByRole('heading', { level: 2, name: 'Pourquoi venir' }).isVisible(), 'section « Pourquoi venir »');
  assert(await d.getByRole('heading', { name: 'Questions fréquentes' }).isVisible(), 'FAQ sur l\'accueil');
  assert(await d.getByRole('link', { name: /Consulter le centre d'aide/ }).getAttribute('href') === '/aide', 'renvoi vers le centre d\'aide');

  // Blog
  await header.getByRole('link', { name: 'Blog', exact: true }).click();
  await d.waitForURL('**/blog');
  assert(await d.getByRole('heading', { level: 1, name: 'Inconnus aujourd\'hui, amis demain' }).isVisible(), 'titre du blog');
  const tabs = d.getByRole('navigation', { name: 'Thèmes du blog' });
  for (const l of ['Tous les articles', 'City guide', 'Conversation', 'Amitié', 'Comment fonctionne The Host Club']) assert(await tabs.getByRole('link', { name: l }).isVisible(), `onglet ${l}`);
  assert(await tabs.getByRole('link', { name: 'Tous les articles' }).getAttribute('aria-current') === 'page', 'onglet Tous actif');
  const featured = d.getByRole('link', { name: "Dîner avec des inconnus : c'est quoi, et comment ça se passe ?" }).first();
  assert(await featured.getAttribute('href') === '/blog/diner-avec-des-inconnus', 'article « Commencer ici » mis en avant');
  assert(await d.getByText('Commencer ici').first().isVisible(), 'mention « Commencer ici »');
  const mostRead = d.locator('section[aria-labelledby="most-read"]');
  assert(await mostRead.getByRole('heading', { name: 'Les plus lus' }).isVisible() && await mostRead.getByRole('link').count() === 6, '« Les plus lus » : 6 articles en liste compacte');
  assert(await mostRead.locator('img').count() === 6, 'liste compacte avec vignettes');
  const browse = d.locator('section[aria-labelledby="browse"]');
  assert(await browse.getByRole('link').count() === 19, '« Parcourir les articles » : 19 articles');
  const popular = browse.getByRole('button', { name: 'Plus lus' });
  const recent = browse.getByRole('button', { name: 'Récents' });
  assert(await popular.getAttribute('aria-pressed') === 'true', 'tri « Plus lus » par défaut');
  const firstPopular = await browse.getByRole('link').first().textContent();
  await recent.click();
  assert(await recent.getAttribute('aria-pressed') === 'true' && (await browse.getByRole('link').first().textContent()) !== firstPopular, 'tri « Récents » change l\'ordre');
  await browse.getByRole('searchbox', { name: 'Rechercher un article' }).fill('amitie adulte');
  assert(await browse.getByRole('link').count() >= 1 && await browse.getByRole('link', { name: /amis à l'âge adulte/ }).isVisible(), 'recherche sans accents');
  await browse.getByRole('searchbox').fill('zzzz introuvable');
  assert(await browse.getByText('Aucun article ne correspond à votre recherche.').isVisible(), 'recherche sans résultat annoncée');
  await browse.getByRole('button', { name: 'Effacer la recherche' }).click();
  assert(await browse.getByRole('link').count() === 19, 'recherche effacée');
  await tabs.getByRole('link', { name: 'City guide' }).click();
  await d.waitForURL('**/blog/theme/city-guide');
  assert(await d.getByRole('heading', { level: 1, name: 'City guide' }).isVisible(), 'page de thème : titre');
  assert(await d.getByText(/3 articles · Mis à jour le/).isVisible(), 'page de thème : nombre d\'articles et date');
  assert(await d.getByRole('heading', { name: 'Rencontrer du monde à Casablanca' }).isVisible(), 'carte « Rencontrer du monde à Casablanca »');
  assert(await d.getByRole('link', { name: 'Trouver mon groupe' }).getAttribute('href') === '/experiences' && await d.getByRole('link', { name: 'Choisir une autre ville' }).getAttribute('href') === '/#villes', 'carte : deux boutons');
  assert(await d.locator('main ul.divide-y a[href^="/blog/"]').count() >= 3, 'City guide : 3 articles en liste');
  assert(await d.getByRole('heading', { name: 'Questions fréquentes' }).isVisible(), 'City guide : FAQ en bas');
  await d.getByText('Faut-il parler arabe pour rencontrer du monde ?').click();
  assert(await d.getByText(/français, la darija/).isVisible(), 'FAQ City guide dépliable');
  const useful = d.locator('section[aria-labelledby="useful-also"]');
  assert(await useful.getByRole('heading', { name: 'Utile aussi' }).isVisible() && await useful.getByRole('link').count() === 3, '« Utile aussi » : 3 articles');
  await d.getByRole('navigation', { name: 'Thèmes du blog' }).getByRole('link', { name: 'Comment fonctionne The Host Club' }).click();
  await d.waitForURL('**/blog/theme/the-host-club');
  assert(await d.getByText(/7 articles/).isVisible(), 'The Host Club : 7 articles');
  await d.getByRole('link', { name: /Réserver sa première expérience, étape par étape/ }).first().click();
  await d.waitForURL('**/blog/reserver-sa-premiere-experience');
  assert(await d.getByRole('heading', { level: 1, name: 'Réserver sa première expérience, étape par étape' }).isVisible(), 'page article');
  assert(await d.locator('main ol li').count() >= 8, 'article : étapes numérotées');
  const summary = d.getByTestId('article-summary');
  assert(await summary.getByText('L\'essentiel').isVisible() && await summary.locator('li').count() === 4, 'article : encadré « L\'essentiel » (4 points)');
  await d.goto(`${base}/blog/solitude-et-sante`);
  const who = d.locator('main a[href^="https://www.who.int/"]');
  assert(await who.count() === 1 && await who.getAttribute('target') === '_blank' && /noopener/.test(await who.getAttribute('rel')), 'source externe (OMS) : nouvel onglet, noopener');
  assert(!(await d.locator('main').textContent()).includes('[Organisation'), 'lien externe rendu, pas de crochets bruts');
  await d.goto(`${base}/blog/reserver-sa-premiere-experience`);
  const related = d.locator('section[aria-labelledby="useful-also"]');
  assert(await related.getByRole('heading', { name: 'À lire aussi' }).isVisible() && await related.getByRole('link').count() === 3, 'trois articles liés');
  const ld = JSON.parse(await d.locator('script[type="application/ld+json"]').first().textContent());
  assert(ld['@type'] === 'BlogPosting' && ld.headline.startsWith('Réserver'), 'données structurées BlogPosting');
  assert(/\/blog\/reserver-sa-premiere-experience$/.test(await d.locator('link[rel="canonical"]').getAttribute('href')), 'URL canonique');

  // Anglais / arabe
  await d.goto(`${base}/en/blog`);
  assert(await d.getByRole('heading', { level: 1, name: 'Strangers Today, Friends Tomorrow' }).isVisible(), 'blog en anglais');
  await d.goto(`${base}/ar/blog/bien-ecouter`);
  assert(await d.locator('html').getAttribute('dir') === 'rtl', 'arabe : page en RTL');
  assert(await d.getByRole('heading', { level: 1, name: 'كيف تصبح شخصاً يُصغي حقاً' }).isVisible(), 'arabe : article traduit');
  assert(await d.locator('main article [lang="fr"]').count() === 0, 'arabe : plus de texte français affiché à la place');
  assert(await d.getByTestId('article-summary').getByText('باختصار').isVisible(), 'arabe : encadré « L\'essentiel » traduit');
  await d.goto(`${base}/ar/blog/theme/city-guide`);
  assert(await d.getByText('هل يجب أن أتحدث العربية للتعرّف على الناس؟').isVisible(), 'arabe : FAQ City guide traduite');
  for (const [path, h1] of [['/ar/charte', 'قواعد المجتمع'], ['/ar/securite', 'السلامة'], ['/ar/cgu', 'الشروط العامة للاستخدام'], ['/ar/cgv', 'الشروط العامة للبيع'], ['/ar/confidentialite', 'سياسة الخصوصية']]) {
    await d.goto(`${base}${path}`);
    assert(await d.getByRole('heading', { level: 1, name: h1 }).isVisible() && !(await d.getByText('النص العربي قيد الترجمة').isVisible()), `arabe : ${path} traduit`);
  }
  await d.goto(`${base}/ar/blog`);
  assert(await d.getByRole('heading', { level: 1, name: 'غرباء اليوم، أصدقاء الغد' }).isVisible(), 'titre du blog en arabe');

  // 404
  assert((await d.goto(`${base}/blog/nexiste-pas`)).status() === 404, 'article inconnu → 404');
  assert((await d.goto(`${base}/blog/theme/nexiste-pas`)).status() === 404, 'thème inconnu → 404');

  // 8e : À propos
  await d.goto(`${base}/a-propos`);
  assert(await d.getByRole('heading', { level: 1, name: /Des inconnus à table\.\s*Des amis en repartant\./ }).isVisible(), 'À propos : accroche');
  const founder = d.locator('section[aria-labelledby="founder"]');
  const [imgBox, textBox] = [await founder.locator('img').boundingBox(), await founder.getByRole('heading', { name: 'Aya Snoussi' }).boundingBox()];
  assert(imgBox.x < textBox.x, 'créatrice : photo à gauche, texte à droite');
  assert(await d.getByRole('heading', { name: 'Ce qui compte pour elle' }).isVisible(), 'ce qui compte pour elle');
  const tools = d.locator('section[aria-labelledby="tools-title"]');
  assert(await tools.getByRole('heading', { name: 'Nos outils pour créer du lien' }).isVisible() && await tools.locator('li').count() === 8, 'outils : 8 cartes');
  const prevT = tools.getByRole('button', { name: 'Outil précédent' }).first(), nextT = tools.getByRole('button', { name: 'Outil suivant' }).first();
  assert(await prevT.isDisabled() && await nextT.isEnabled(), 'outils : au départ, seulement « suivant »');
  await nextT.click();
  await d.waitForFunction(() => document.querySelector('section[aria-labelledby="tools-title"] ul').scrollLeft > 50);
  await d.waitForTimeout(600);
  assert(await prevT.isEnabled(), 'outils : puis les deux sens');
  const gallery = d.locator('section[aria-labelledby="gallery"]');
  assert(await gallery.getByRole('heading', { name: 'Des rencontres qui valent mille images' }).isVisible() && await gallery.locator('img').count() === 8, 'galerie : 8 photos');

  // 8h : Confidentialité
  await d.goto(`${base}/confidentialite`);
  assert(await d.getByRole('columnheader', { name: 'Base légale' }).first().isVisible(), 'confidentialité : tableau finalité / base / durée');
  assert(await d.getByRole('rowheader', { name: 'Transmettre régime, allergies et langues de table au lieu' }).isVisible(), 'confidentialité : régime et allergies avec accord');
  assert(await d.getByRole('cell', { name: /Envoi des e-mails/ }).isVisible(), 'confidentialité : prestataires listés');
  assert(await d.getByRole('heading', { name: '12. Mineurs et protection de l\'enfance' }).isVisible(), 'confidentialité : protection des mineurs');

  // 10f : identité sur le site
  await d.goto(`${base}/`);
  assert(await d.locator('header img[src="/images/brand/logo-horizontal-prune.svg"]').isVisible(), '10f : logo vectoriel dans l\'en-tête');
  assert(await d.locator('footer img[src="/images/brand/logo-horizontal-prune.svg"]').count() === 1, '10f : logo vectoriel dans le pied de page');
  assert((await d.locator('meta[property="og:image"]').getAttribute('content')).endsWith('/images/brand/og.jpg'), '10f : image de partage');
  assert(await d.locator('link[rel="manifest"]').count() === 1 && await d.locator('link[rel="apple-touch-icon"]').count() === 1, '10f : manifeste et icône d\'application');
  for (const u of ['/favicon.ico', '/manifest.webmanifest', '/images/brand/icon-512.png']) assert((await d.request.get(`${base}${u}`)).ok(), `10f : ${u} servi`);
  await d.goto(`${base}/admin/partenaires/p-atelier-cil/chevalet`);
  assert(await d.getByText('Réservé', { exact: true }).first().isVisible() && await d.locator('svg path').count() > 2, '10f : chevalet « Réservé » avec QR code');
  await d.goto(`${base}/admin/sessions/ses-ceramique-1/fiche-hote`);
  assert(await d.getByRole('heading', { name: 'Cartes de bienvenue' }).isVisible() && await d.getByText('Bienvenue à table').first().isVisible(), '10f : cartes de bienvenue imprimables');

  // 12 : « Comment ça marche » présentée comme sur l'accueil
  await d.goto(`${base}/comment-ca-marche`);
  assert(await d.getByRole('heading', { level: 1, name: 'Comment ça marche' }).isVisible(), '12 : titre de la page');
  const howCards = d.locator('section[aria-label="Comment ça marche"] ol > li');
  assert(await howCards.count() === 3 && await d.locator('section[aria-label="Comment ça marche"] img').count() === 3, '12 : trois cartes décalées comme sur l\'accueil');
  assert(await d.getByRole('heading', { name: 'Les formats' }).isVisible() && await d.getByRole('heading', { name: 'Votre sécurité' }).isVisible(), '12 : formats et sécurité conservés');

  // ——— Mobile ———
  const mob = await b.newContext({ ...devices['iPhone 13'] });
  const m = await mob.newPage(); watch(m);
  for (const path of ['/', '/blog', '/blog/theme/conversation', '/blog/questions-pour-lancer-une-conversation', '/ar', '/ar/blog']) {
    await m.goto(`${base}${path}`);
    await noOverflow(m, `mobile ${path}`);
  }
  await m.goto(`${base}/`);
  assert(await m.locator('footer').getByRole('link', { name: 'Blog' }).isVisible(), 'mobile : Blog dans le pied de page');

  // Menu burger (mobile) — la barre du bas reste en place
  assert(await m.getByRole('navigation', { name: 'Navigation mobile' }).isVisible(), 'mobile : barre du bas conservée');
  assert(await m.locator('header').getByRole('link', { name: "S'inscrire" }).isVisible(), 'mobile : bouton S\'inscrire dans la barre du haut');
  const burger = m.getByRole('button', { name: 'Ouvrir le menu' });
  await burger.click();
  const dialog = m.getByRole('dialog', { name: 'Menu' });
  assert(await visible(dialog), 'menu burger ouvert');
  assert(await m.evaluate(() => document.body.style.overflow) === 'hidden', 'page bloquée derrière le menu');
  for (const l of ['À propos', 'Comment ça marche', 'Blog', 'Se connecter', "S'inscrire"]) assert(await dialog.getByRole('link', { name: l, exact: true }).isVisible(), `menu burger : ${l}`);
  const disc = dialog.getByRole('button', { name: 'Découvrir' });
  assert(!(await dialog.getByRole('link', { name: 'Jeux' }).isVisible()), 'Découvrir replié au départ');
  await disc.click();
  assert(await disc.getAttribute('aria-expanded') === 'true' && await dialog.getByRole('link', { name: 'Jeux' }).isVisible(), 'Découvrir se déplie');
  await dialog.getByRole('button', { name: 'Villes' }).click();
  assert(await dialog.getByText('Bientôt').first().isVisible(), 'Villes : villes « bientôt »');
  const topEl = await m.evaluate(() => { const r = document.querySelector('[role=dialog]').getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, Math.min(r.bottom - 10, innerHeight - 10)); return !!el.closest('[role=dialog]'); });
  assert(topEl, 'le menu passe au-dessus de la barre du bas');
  await m.keyboard.press('Escape');
  assert(!(await dialog.isVisible()), 'Échap ferme le menu');
  assert(await m.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Ouvrir le menu', 'focus rendu au bouton du menu');
  await burger.click();
  await m.getByRole('dialog').getByRole('link', { name: 'Blog', exact: true }).click();
  await m.waitForURL('**/blog');
  assert(!(await m.getByRole('dialog').isVisible().catch(() => false)), 'menu fermé après navigation');

  // 8d / 8f / 8g : Sécurité, Règles de la communauté, CGU
  await d.goto(`${base}/charte`);
  assert(await d.getByRole('heading', { level: 1, name: 'Règles de la communauté' }).isVisible(), 'page Règles de la communauté');
  for (const h of ['Les lignes rouges', 'Pas de discrimination à table', 'Les mesures', 'Recours']) assert(await d.getByRole('heading', { level: 2, name: h }).isVisible(), `règles : ${h}`);
  assert(await d.locator('main').getByRole('link', { name: 'Sécurité' }).first().getAttribute('href') === '/securite', 'règles → lien Sécurité');
  await d.goto(`${base}/securite`);
  for (const h of ['Avant l\'expérience', 'Pendant l\'expérience', 'Sorties, sport et activités en plein air', 'En cas d\'urgence', 'Après l\'expérience']) assert(await d.getByRole('heading', { level: 2, name: h }).isVisible(), `sécurité : ${h}`);
  assert(await d.getByText('Police : 19').isVisible(), 'numéros d\'urgence au Maroc');
  await d.goto(`${base}/cgu`);
  for (const h of ['3. Ce que nous faisons, et ce que fait le lieu', '4. Ce que nous ne pouvons pas garantir', '10. Photos et vidéos', '12. Signalements, sanctions et recours']) assert(await d.getByRole('heading', { level: 2, name: h }).isVisible(), `CGU : ${h}`);
  assert(await d.locator('footer').getByRole('link', { name: 'Règles de la communauté' }).getAttribute('href') === '/charte', 'pied de page → Règles de la communauté');
  await d.goto(`${base}/en/charte`);
  assert(await d.getByRole('heading', { level: 1, name: 'Community rules' }).isVisible(), 'règles en anglais');
  for (const path of ['/charte', '/securite', '/cgu', '/confidentialite', '/a-propos', '/ar/a-propos', '/blog/theme/city-guide', '/ar/confidentialite', '/ar/blog/que-faire-a-casablanca', '/ar/aide']) { await m.goto(`${base}${path}`); await noOverflow(m, `mobile ${path}`); }
  await m.goto(`${base}/confidentialite`);
  assert(await m.locator('dl dt', { hasText: 'Base légale' }).first().isVisible(), 'mobile : tableau en fiches');

  assert(errs.length === 0, 'aucune erreur navigateur' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await b.close();
  console.log('TOUT EST OK');
})().catch((e) => { console.error(e.message); process.exit(1); });
