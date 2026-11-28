/** Ce qu'il est utile de demander pour une expérience (voir welcomeNeeds dans @thecommunity/shared). */
export type WelcomeNeeds = { food: boolean; languages: boolean };

/** Titres du bloc selon ce qui est demandé (« Pour votre accueil » ou « Langue de votre groupe ») ; serveur et navigateur. */
export function welcomeTitleKeys(needs: WelcomeNeeds) {
  return needs.food
    ? ({ title: "title", intro: "intro", edit: "editTitle" } as const)
    : ({ title: "titleLanguages", intro: "introLanguages", edit: "editTitleLanguages" } as const);
}
