import { pgTable, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const company = pgTable('company', {
  id: uuid('id').primaryKey().defaultRandom(),
  siret: text('siret').notNull().unique(),
  legalName: text('legal_name').notNull(),
  legalForm: text('legal_form'),
  addressLine1: text('address_line1'),
  postalCode: text('postal_code'),
  city: text('city'),
  foundedOn: timestamp('founded_on', { withTimezone: true }),

  // Mentions obligatoires sur un devis de travaux adresse a un particulier
  // (arrete du 24 janvier 2017, Code de la consommation). Nullables en base —
  // l'inscription reste a un seul champ —, mais exigees avant tout devis.
  legalFormLabel: text('legal_form_label'),
  registrationNumber: text('registration_number'),
  phone: text('phone'),
  email: text('email'),
  vatNumber: text('vat_number'),
  // En franchise en base, le devis porte « TVA non applicable, art. 293 B du
  // CGI » au lieu d'un numero.
  vatExempt: boolean('vat_exempt').notNull().default(false),
  quoteValidityDays: integer('quote_validity_days').default(90),
  paymentTerms: text('payment_terms'),

  // Mentions dues entre professionnels (art. L441-9 et D441-5 du Code de
  // commerce). L'indemnite de 40 EUR est fixee par la loi, seul le taux est
  // declare par l'entreprise.
  latePaymentRate: text('late_payment_rate').default('trois fois le taux d’intérêt légal'),
  // Commande l'exigibilite de la TVA : a l'encaissement pour une prestation de
  // services, ce qui declenche le e-reporting des donnees de paiement.
  operationType: text('operation_type', { enum: ['services', 'goods', 'mixed'] })
    .notNull()
    .default('services'),

  // Mentions d'assurance obligatoires sur tout devis et toute facture du
  // batiment (art. L243-2 du Code des assurances). Nullables en base — on
  // n'alourdit pas l'inscription —, mais exigees avant toute emission de devis.
  // Declaratives ici ; M3 les confrontera a l'attestation.
  insurerName: text('insurer_name'),
  insurerAddress: text('insurer_address'),
  policyNumber: text('policy_number'),
  coveredActivities: text('covered_activities'),
  coverageArea: text('coverage_area'),

  /**
   * L'adresse d'abonnement iCalendar. `null` tant qu'elle n'a pas ete demandee.
   *
   * **Ce jeton EST l'autorisation** — il n'y a pas de session derriere une
   * adresse collee dans Google. Il doit donc pouvoir etre regenere, ce qui
   * revoque l'ancienne du meme geste.
   */
  agendaFeedToken: text('agenda_feed_token').unique(),

  /**
   * La cle de l'objet dans le bucket PUBLIC `company-logos`, ou `null`.
   *
   * On stocke la CLE, pas l'URL : l'URL publique s'en derive (voir
   * `logoPublicUrl`). La cle porte un suffixe d'horodatage — `{id}/{ts}.{ext}` —
   * pour qu'un remplacement change d'adresse et contourne le cache du CDN, ce
   * qu'un `upsert` sur une cle fixe ne ferait pas.
   */
  logoPath: text('logo_path'),

  /**
   * L'offre a laquelle l'entreprise est abonnee.
   *
   * `free` par defaut, et c'est structurant : le capteur — devis, facture,
   * passeport, agenda, espace demandeur — reste gratuit a vie. Ce qui passe
   * derriere la porte est ecrit noir sur blanc dans la table des capacites
   * (src/domain/authorization.ts), et rien d'autre.
   *
   * La bascule est MANUELLE, depuis le backoffice. Aucun encaissement n'est
   * automatise en M8 : les dix premiers abonnements se signent au telephone de
   * toute facon, et cela laisse apprendre le prix avant de le figer.
   */
  plan: text('plan', { enum: ['free', 'pro'] })
    .notNull()
    .default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const member = pgTable('member', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => company.id),
  // Identifiant de l'utilisateur dans auth.users de Supabase.
  userId: uuid('user_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role', { enum: ['owner', 'member'] })
    .notNull()
    .default('owner'),
  /**
   * Le retrait d'un membre. `null` tant qu'il a l'acces.
   *
   * **On retire, on n'efface pas.** Le journal garde son identifiant Supabase
   * dans `actor_id` sur tout ce qu'il a fait ; supprimer la ligne rendrait ces
   * faits illisibles. Il perd l'acces, sa trace reste.
   */
  removedAt: timestamp('removed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Une invitation a rejoindre une entreprise.
 *
 * **Aucun jeton.** L'invitation se reclame par l'ADRESSE, prouvee par le lien
 * magique — exactement comme le dossier du demandeur en M6·A. Un jeton se
 * transfere ; une boite aux lettres, non. La colonne n'aurait ajoute qu'une
 * surface d'attaque pour affaiblir la preuve.
 *
 * Ni acceptee ni revoquee : elle est en attente. Les deux dates cohabitent
 * plutot qu'un statut, pour la meme raison qu'ailleurs — un statut se met a
 * jour, une date s'ecrit une fois et repond « quand ? ».
 */
export const memberInvitation = pgTable(
  'member_invitation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    /** **Toujours normalisee** — voir `normalizeEmail`. C'est la cle d'identite. */
    email: text('email').notNull(),
    role: text('role', { enum: ['owner', 'member'] })
      .notNull()
      .default('member'),
    /** L'identifiant Supabase de celui qui a invite, comme `event.actor_id`. */
    invitedBy: uuid('invited_by').notNull(),
    invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [index('member_invitation_email_idx').on(t.email)],
)

/**
 * Le logement est PARTAGE entre entreprises : deux artisans intervenant a la
 * meme adresse pointent sur la meme ligne. C'est ce qui rendra possible la vue
 * consolidee du demandeur. L'unicite est portee par l'empreinte calculee dans
 * src/domain/address.ts.
 */
export const property = pgTable(
  'property',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fingerprint: text('fingerprint').notNull().unique(),
    addressLine1: text('address_line1').notNull(),
    addressLine2: text('address_line2'),
    postalCode: text('postal_code').notNull(),
    city: text('city').notNull(),
    builtYear: integer('built_year'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('property_postal_code_idx').on(t.postalCode)],
)

export const companyRelations = relations(company, ({ many }) => ({
  members: many(member),
}))

export const memberRelations = relations(member, ({ one }) => ({
  company: one(company, { fields: [member.companyId], references: [company.id] }),
}))
