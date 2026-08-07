import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { company, property } from './company'

/**
 * Le client appartient a l'entreprise et n'est jamais partage — contrairement
 * au logement.
 *
 * `type` et `siret` sont collectes des M1 alors qu'ils ne servent qu'en M2 :
 * la nature du client determine l'obligation applicable (facturation
 * electronique pour un professionnel, e-reporting pour un particulier), et une
 * facture B2B exige le SIRET du client. Les ajouter plus tard supposerait de
 * rappeler tous les clients deja saisis.
 */
export const customer = pgTable('customer', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => company.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  // Obligatoire a l'envoi d'un devis : porte l'identification du signataire par SMS.
  phone: text('phone'),
  type: text('type', { enum: ['individual', 'business'] })
    .notNull()
    .default('individual'),
  siret: text('siret'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const project = pgTable('project', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => company.id),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customer.id),
  propertyId: uuid('property_id')
    .notNull()
    .references(() => property.id),
  label: text('label').notNull(),
  status: text('status', { enum: ['draft', 'in_progress', 'completed', 'abandoned'] })
    .notNull()
    .default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const customerRelations = relations(customer, ({ one }) => ({
  company: one(company, { fields: [customer.companyId], references: [company.id] }),
}))

export const projectRelations = relations(project, ({ one }) => ({
  company: one(company, { fields: [project.companyId], references: [company.id] }),
  customer: one(customer, { fields: [project.customerId], references: [customer.id] }),
  property: one(property, { fields: [project.propertyId], references: [property.id] }),
}))
