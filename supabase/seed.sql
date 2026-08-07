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

INSERT INTO company (id, siret, legal_name, legal_form, address_line1, postal_code, city, founded_on)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  '50769820700036',
  'BD PLOMBERIE (BD PLOMBERIE)',
  '5710',
  '43 RUE SIMONE SIGNORET',
  '33530',
  'BASSENS',
  '2008-09-01'
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
  committed_lead_time_days, total_excl_tax, total_tax, total_incl_tax,
  public_token, sent_at
)
VALUES (
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000001',
  'D2026-0001',
  'sent',
  5, 91000, 9700, 100700,
  'demo0000token0000pour0000verification',
  now()
);

INSERT INTO quote_line (quote_id, position, label, unit, quantity, unit_price_excl_tax, tax_rate)
VALUES
  ('00000000-0000-4000-8000-000000000005', 0, 'Chauffe-eau 200 L posé', 'u', 1, 85000, 1000),
  ('00000000-0000-4000-8000-000000000005', 1, 'Déplacement', 'u', 1, 6000, 2000);
