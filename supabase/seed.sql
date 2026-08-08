-- Jeu de donnees de developpement.
--
-- Applique automatiquement apres les migrations a chaque `supabase db reset`,
-- donc aussi avant chaque `pnpm test`. Il existe parce que la suite de tests
-- remet la base a zero : sans lui, toute verification manuelle devait etre
-- refaite a la main apres le moindre lancement de tests.
--
-- Les identifiants sont fixes, pour que les URL de verification ne changent
-- jamais. Les tests, eux, s'isolent par identifiants generes : ils ne peuvent
-- pas entrer en collision avec ces lignes.

INSERT INTO company (
  id, siret, legal_name, legal_form, address_line1, postal_code, city, founded_on,
  legal_form_label, registration_number, phone, email, vat_number, quote_validity_days,
  payment_terms,
  insurer_name, insurer_address, policy_number, covered_activities, coverage_area
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  '50769820700036',
  'BD PLOMBERIE (BD PLOMBERIE)',
  '5710',
  '43 RUE SIMONE SIGNORET',
  '33530',
  'BASSENS',
  '2008-09-01',
  -- Mentions obligatoires sur tout devis adresse a un particulier.
  'SAS',
  'RCS Bordeaux 507 698 207',
  '0556000000',
  'contact@bd-plomberie.fr',
  'FR51507698207',
  90,
  'Acompte de 30 % à la commande, solde à la réception des travaux.',
  -- Mentions d'assurance (art. L243-2 du Code des assurances).
  'SMABTP',
  '114 avenue Émile Zola, 75015 Paris',
  'D-2024-889321',
  'Plomberie, chauffage, installations sanitaires',
  'France métropolitaine'
);

INSERT INTO customer (id, company_id, name, email, phone, type)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Paul Martin',
  'client@test.local',
  '0612345678',
  'individual'
);

INSERT INTO property (id, fingerprint, address_line1, postal_code, city)
VALUES (
  '00000000-0000-4000-8000-000000000003',
  -- sha256('12 rue fondaudege|33000|bordeaux'), cf. src/domain/address.ts
  '801fb5dd2615d80e0000000000000000000000000000000000000000000000ff',
  '12 rue Fondaudège',
  '33000',
  'Bordeaux'
);

INSERT INTO project (id, company_id, customer_id, property_id, label, status)
VALUES (
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  'Remplacement chauffe-eau',
  'draft'
);

INSERT INTO quote (
  id, project_id, company_id, number, status,
  committed_lead_time_days, validity_days, total_excl_tax, total_tax, total_incl_tax,
  public_token, sent_at
)
VALUES (
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000001',
  'D2026-0001',
  'sent',
  5, 90, 91000, 9700, 100700,
  'demo0000token0000pour0000verification',
  now()
);

INSERT INTO quote_line (quote_id, position, label, unit, quantity, unit_price_excl_tax, tax_rate)
VALUES
  ('00000000-0000-4000-8000-000000000005', 0, 'Chauffe-eau 200 L posé', 'u', 1, 85000, 1000),
  ('00000000-0000-4000-8000-000000000005', 1, 'Déplacement', 'u', 1, 6000, 2000);

-- Un second devis, celui-la signe : c'est le point de depart de tout parcours de
-- facturation. Le premier reste au statut « envoye » pour que la signature
-- elle-meme demeure verifiable a la main sans rejouer le parcours entier.
--
-- Deux taux de TVA, volontairement : un acompte sur devis mono-taux ne
-- revelerait jamais une erreur de ventilation.
INSERT INTO quote (
  id, project_id, company_id, number, status,
  committed_lead_time_days, validity_days, total_excl_tax, total_tax, total_incl_tax,
  public_token, sent_at, signed_at
)
VALUES (
  '00000000-0000-4000-8000-000000000006',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000001',
  'D2026-0002',
  'signed',
  5, 90, 91000, 9700, 100700,
  'demo0000token0000devis0000signe00',
  now(), now()
);

INSERT INTO quote_line (quote_id, position, label, unit, quantity, unit_price_excl_tax, tax_rate)
VALUES
  ('00000000-0000-4000-8000-000000000006', 0, 'Chauffe-eau 200 L posé', 'u', 1, 85000, 1000),
  ('00000000-0000-4000-8000-000000000006', 1, 'Déplacement', 'u', 1, 6000, 2000);
