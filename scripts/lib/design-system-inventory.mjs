/**
 * L'inventaire du design system, sa seule source.
 *
 * Extrait de `check-design-system.mjs` le jour ou les deux l'ont fait passer
 * la limite de 250 lignes : la table et le controle qui la lit sont deux
 * choses, et c'est la table qui grossit a chaque jalon.
 */

/**
 * L'inventaire du design system, tel que l'arrete la spec « image de marque »
 * (§6.1). Il est **ferme** : pas d'Accordion, pas de Tabs, tant qu'aucun ecran
 * ne les reclame. Un composant absent de cette table est soit mal place, soit
 * une extension que personne n'a decidee.
 *
 * Deux entrees ont ete ajoutees apres l'implementation, parce que l'inventaire
 * avait ete arrete avant elle et que le besoin s'est revele reel :
 *
 * - `ButtonLink` — le HTML distingue agir et naviguer. Imbriquer un `<button>`
 *   dans un `<a>` est invalide et brouille le role annonce.
 * - `QuoteLinesTable` — distinct de `QuoteLineEditor` : l'un lit, l'autre
 *   saisit, et ils n'ont ni les memes contraintes ni les memes balises.
 *
 * Huit entrees supplementaires pour la landing (spec landing §7.1) :
 *
 * - `SectionHeader`, `StepCard` — repetes onze fois sur les deux pages.
 * - `Reveal`, `Stagger` — les deux gestes de marque encapsules. Sans eux,
 *   chaque section reimplemente l'animation et oublie prefers-reduced-motion.
 *   `RevealTick` les accompagne : le carre qui se pose dans un `Reveal`.
 * - `SiretLookup`, `QuoteLinkForm` — les deux actions publiques.
 * - `PrinciplePanel` — les engagements du §12 du socle.
 * - `LandingShell` — navigation a lien croise. `PublicShell` est un gabarit de
 *   document : lui greffer une navigation commerciale le denaturerait.
 *
 * Deux entrees pour les portes (spec A1) : `SignOut`, la sortie, qu'une par
 * coquille aurait triplee (§7) ; `AdminShell`, les ecrans internes, a qui
 * `AppShell` imposait la navigation de l'artisan (§8).
 *
 * Quatre entrees pour la reprise des treize ecrans (spec « reprise des treize
 * ecrans » §5). Chacune etait DEJA ecrite a la main dans les ecrans : les
 * nommer arrete une derive plutot qu'elle n'ouvre une extension.
 *
 * - `Notice` — l'encart d'alerte, recopie cinq fois avec la meme chaine de
 *   classes et deja deux espacements divergents.
 * - `PageHeader` — le bloc titre, recopie treize fois ; et le retour, qui
 *   vivait en bas de page.
 * - `Rail`, `RailItem` — la suite posee sur un filet, la ou la pile de cartes
 *   ne disait pas qu'un evenement vient apres l'autre.
 * - `DataTable` — le tableau de comparaison. Distinct de `QuoteLinesTable`
 *   comme `QuoteLineEditor` l'est deja de lui : l'un connait les lignes d'un
 *   devis, l'autre ne connait rien de son contenu.
 *
 * N'y figurent PAS, et c'est une decision : `WeekGrid`, `ProgressGauge` et
 * `CopyField` n'ont qu'un seul ecran lecteur et restent aupres de lui, comme
 * `SituationForm` ou `BusyNotice`.
 *
 * Deux entrees pour l'accueil (spec « accueil artisan » §9) :
 *
 * - `TaskRow` — une ligne echeance / objet / geste. `RailItem` porte une suite
 *   chronologique et n'a ni colonne d'action ni colonne de montant.
 * - `MoneyFlow` — la barre segmentee de l'argent en cours. Ni `DataTable`
 *   (aucune comparaison) ni `SummaryLine` (aucun total a additionner).
 *
 * Deux entrees pour l'arrivee (spec A2 §4) :
 *
 * - `ScreenNote` — la carte qui presente un ecran, une fois. Les deux coquilles
 *   connectees la posent, sur six ecrans : la loger dans l'une d'elles
 *   obligerait l'autre a en dependre. Elle n'est pas un `Notice` : celui-ci
 *   interrompt, et ses trois tons sont des etats — danger, mise en garde,
 *   verification. Une presentation n'alarme pas, elle se referme.
 * - `ReopenNotes` — le geste inverse, pose a cote de la sortie. Meme argument
 *   que `SignOut`, et il vaut a la lettre : deux coquilles la rendent, une par
 *   coquille l'aurait dupliquee.
 *
 * Toute autre addition doit passer par la spec avant d'arriver ici.
 */
export const INVENTORY = {
  atoms: [
    'Button', 'ButtonLink', 'Input', 'Textarea', 'Select', 'Checkbox', 'Label',
    'HelperText', 'FieldError', 'Badge', 'Icon', 'Spinner', 'Link', 'Heading',
    'Text', 'Money', 'DateText', 'Separator', 'Skeleton',
  ],
  molecules: [
    'Field', 'Card', 'StatusBadge', 'SealBadge', 'LogoLockup', 'EmptyState',
    'Toast', 'Tooltip', 'ButtonGroup', 'SummaryLine', 'Dialog', 'ThemeToggle',
    'SectionHeader', 'StepCard', 'Reveal', 'Stagger', 'RevealTick', 'SignOut',
    'Notice', 'PageHeader', 'Rail', 'RailItem', 'TaskRow', 'ScreenNote', 'ReopenNotes',
    // La navigation doit connaitre la page courante, et un composant serveur ne
    // peut pas lire l'URL. L'isoler garde `AppHeader` cote serveur au lieu d'y
    // verser `Lockup` et `Text` pour un seul `usePathname()`. Molecule et non
    // organisme : elle ne compose que des atomes.
    'AppNav',
  ],
  organisms: [
    'AppHeader', 'QuoteTable', 'QuoteLineEditor', 'QuoteLinesTable', 'TotalsPanel',
    'VatBreakdown', 'LegalMentionsPanel', 'PaymentTimeline', 'SignaturePanel',
    'SiretLookup', 'QuoteLinkForm', 'PrinciplePanel', 'DataTable',
    // Ajoute en M6·B : le client et l'entreprise lisent la MEME chronologie.
    // La loger dans l'un des deux ecrans obligerait l'autre a importer une
    // fonctionnalite voisine, ce que l'autonomie des fonctionnalites interdit.
    'ChantierTimeline',
    'MoneyFlow',
  ],
  shells: ['AppShell', 'PublicShell', 'PdfShell', 'LandingShell', 'SpaceShell', 'AdminShell'],
  brand: ['Mark', 'Seal', 'Lockup'],
}
