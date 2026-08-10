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


-- ===========================================================================
-- Le cote demandeur.
--
-- Sans ces lignes, l'espace du demandeur n'existait qu'apres avoir rejoue un
-- parcours de bout en bout : `mes-logements`, le dossier de chantier et le
-- repertoire s'ouvraient vides, et l'annuaire ne remontait personne. Trois
-- ecrans livres qu'on ne pouvait pas regarder.
--
-- **Aucun compte n'est cree ici, et c'est voulu.** `requester.user_id` est
-- nullable justement pour ca : la ligne est revendiquee a la premiere connexion
-- par correspondance d'adresse (`claimRequester`). Il suffit donc de se
-- connecter avec « client@test.local » pour recuperer tout ce qui suit —
-- aucune insertion dans `auth.users`, aucun mot de passe en dur.
-- ===========================================================================

INSERT INTO requester (id, user_id, email, name, source)
VALUES (
  '00000000-0000-4000-8000-000000000007',
  NULL,
  'client@test.local',
  'Paul Martin',
  'signature'
);

-- La signature du devis deja signe. C'est ELLE qui donne le dossier : la vue du
-- demandeur se deduit de ce qu'il a signe, jamais de ce qui est arrive a
-- l'adresse (cf. `myProperties`).
INSERT INTO signature (
  id, quote_id, requester_id, signer_name, signer_email, signer_phone,
  code_validated_at, ip_address, user_agent, document_hash, archived_pdf_path
)
VALUES (
  '00000000-0000-4000-8000-000000000008',
  '00000000-0000-4000-8000-000000000006',
  '00000000-0000-4000-8000-000000000007',
  'Paul Martin',
  'client@test.local',
  '0612345678',
  now(),
  '127.0.0.1',
  'Mozilla/5.0 (seed)',
  'seed0000000000000000000000000000000000000000000000000000000000ff',
  'signed/D2026-0002.pdf'
);

-- Le fil de ce chantier-la, qui reste EN COURS : c'est l'etat le plus frequent,
-- et le seul ou le fil a un interet.
INSERT INTO chantier_post (quote_id, company_id, body, created_at)
VALUES
  (
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000001',
    'Ancien ballon déposé, arrivée d''eau condamnée. Le nouveau est livré demain matin.',
    now() - interval '6 days'
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000001',
    'Chauffe-eau posé et raccordé. Il reste le calorifugeage et la mise en service.',
    now() - interval '2 days'
  );

-- Un acompte, pour que « Vos documents » ne contienne pas que le devis.
INSERT INTO invoice (
  id, company_id, project_id, quote_id, number, type,
  due_at, total_excl_tax, total_tax, total_incl_tax,
  late_payment_rate, recovery_indemnity, operation_type, public_token
)
VALUES (
  '00000000-0000-4000-8000-000000000014',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000006',
  'F2026-0001',
  'deposit',
  now() + interval '30 days',
  27300, 2910, 30210,
  'Trois fois le taux d''intérêt légal', 4000, 'services',
  'demo0000token0000facture0000acompte'
);


-- ---------------------------------------------------------------------------
-- Une seconde entreprise, et un chantier TERMINE.
--
-- Deux etats valent mieux qu'un : le premier chantier montre le fil en cours,
-- celui-ci ouvre les garanties et la reception. Sur la MEME adresse, pour que
-- « Mes logements » montre ce qu'il sait faire de mieux — deux entreprises
-- regroupees sous un seul logement, la vue consolidee que seul le demandeur
-- possede.
-- ---------------------------------------------------------------------------

INSERT INTO company (
  id, siret, legal_name, legal_form, address_line1, postal_code, city, founded_on,
  legal_form_label, registration_number, phone, email, vat_number, quote_validity_days,
  payment_terms,
  insurer_name, insurer_address, policy_number, covered_activities, coverage_area
)
VALUES (
  '00000000-0000-4000-8000-000000000009',
  '43897654300019',
  'TOITURE MARCHAND',
  '5499',
  '8 RUE DES MENUISIERS',
  '33000',
  'BORDEAUX',
  '2001-03-12',
  'SARL',
  'RCS Bordeaux 438 976 543',
  '0556114477',
  'contact@toiture-marchand.fr',
  'FR69438976543',
  60,
  'Acompte de 30 % à la commande, solde à la réception des travaux.',
  'AXA France IARD',
  '313 Terrasses de l''Arche, 92727 Nanterre',
  'AX-2023-114552',
  'Couverture, zinguerie',
  'Gironde'
);

INSERT INTO customer (id, company_id, name, email, phone, type)
VALUES (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000009',
  'Paul Martin',
  'client@test.local',
  '0612345678',
  'individual'
);

INSERT INTO project (id, company_id, customer_id, property_id, label, status)
VALUES (
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000009',
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000003',
  'Réfection de la couverture',
  'draft'
);

INSERT INTO quote (
  id, project_id, company_id, number, status,
  committed_lead_time_days, validity_days, total_excl_tax, total_tax, total_incl_tax,
  public_token, sent_at, signed_at, completed_at, completion_source, received_at, received_by
)
VALUES (
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000009',
  'D2026-0014',
  'signed',
  12, 60, 640000, 64000, 704000,
  'demo0000token0000toiture0000signe',
  now() - interval '90 days',
  now() - interval '88 days',
  now() - interval '30 days',
  'declared',
  now() - interval '28 days',
  '00000000-0000-4000-8000-000000000007'
);

INSERT INTO quote_line (quote_id, position, label, unit, quantity, unit_price_excl_tax, tax_rate)
VALUES
  ('00000000-0000-4000-8000-000000000012', 0, 'Dépose de la couverture existante', 'm2', 120, 2000, 1000),
  ('00000000-0000-4000-8000-000000000012', 1, 'Couverture tuile terre cuite', 'm2', 120, 3000, 1000),
  ('00000000-0000-4000-8000-000000000012', 2, 'Zinguerie et solins', 'ml', 40, 1000, 1000);

INSERT INTO signature (
  id, quote_id, requester_id, signer_name, signer_email, signer_phone,
  code_validated_at, ip_address, user_agent, document_hash, archived_pdf_path, signed_at
)
VALUES (
  '00000000-0000-4000-8000-000000000013',
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000007',
  'Paul Martin',
  'client@test.local',
  '0612345678',
  now() - interval '88 days',
  '127.0.0.1',
  'Mozilla/5.0 (seed)',
  'seed00000000000000000000000000000000000000000000000000000000ee00',
  'signed/D2026-0014.pdf',
  now() - interval '88 days'
);

INSERT INTO invoice (
  id, company_id, project_id, quote_id, number, type,
  issued_at, due_at, total_excl_tax, total_tax, total_incl_tax,
  late_payment_rate, recovery_indemnity, operation_type, public_token
)
VALUES (
  '00000000-0000-4000-8000-000000000015',
  '00000000-0000-4000-8000-000000000009',
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000012',
  'F2026-0009',
  'balance',
  now() - interval '28 days',
  now() - interval '2 days',
  640000, 64000, 704000,
  'Trois fois le taux d''intérêt légal', 4000, 'services',
  'demo0000token0000facture0000solde0'
);


-- ---------------------------------------------------------------------------
-- Les attestations, et les deux cas que le repertoire doit savoir montrer.
--
-- BD PLOMBERIE est couverte aujourd'hui ; TOITURE MARCHAND ne l'est plus. Le
-- second cas est le plus important des deux : c'est celui que le produit existe
-- pour rendre visible, et le seul qu'aucun jeu de donnees heureux ne produit.
--
-- L'annuaire et la page publique lisent ces lignes : sans elles, `/annuaire` ne
-- remontait personne et `/artisan/<slug>` repondait 404.
-- ---------------------------------------------------------------------------

INSERT INTO company_activity (company_id, activity_code)
VALUES
  ('00000000-0000-4000-8000-000000000001', '30'),
  ('00000000-0000-4000-8000-000000000009', '14');

INSERT INTO insurance_certificate (
  id, company_id, kind, storage_path, insurer_name, policy_number,
  valid_from, valid_until, status, reviewed_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000000016',
    '00000000-0000-4000-8000-000000000001',
    'decennale',
    'certificates/seed-bd-plomberie.pdf',
    'SMABTP',
    'D-2024-889321',
    now() - interval '200 days',
    now() + interval '165 days',
    'validated',
    now() - interval '199 days'
  ),
  (
    '00000000-0000-4000-8000-000000000017',
    '00000000-0000-4000-8000-000000000009',
    'decennale',
    'certificates/seed-toiture-marchand.pdf',
    'AXA France IARD',
    'AX-2023-114552',
    now() - interval '500 days',
    -- Perimee depuis un mois : le repertoire doit l'annoncer, et l'annuaire
    -- doit cesser de la proposer.
    now() - interval '30 days',
    'validated',
    now() - interval '499 days'
  );

-- `confirmed_by` designe le relecteur qui a valide la ligne. Le seed n'en a
-- aucun : on pose l'identifiant de l'entreprise elle-meme, faute de mieux, et
-- parce qu'aucun ecran ne le lit aujourd'hui.
INSERT INTO certificate_activity (certificate_id, activity_code, source_label, confirmed_by)
VALUES
  (
    '00000000-0000-4000-8000-000000000016', '30',
    'Plomberie — installations sanitaires',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '00000000-0000-4000-8000-000000000017', '14',
    'Couverture',
    '00000000-0000-4000-8000-000000000009'
  );

-- ---------------------------------------------------------------------------
-- De quoi travailler au backoffice.
--
-- `/attestations` est la file quotidienne du relecteur, et elle s'ouvrait vide.
-- `/supervision` affichait bien deux anomalies — les sources n'ont jamais
-- repondu sur une base neuve — mais toutes deux techniques : aucune ne montrait
-- le travail reel, qui est de regarder un dossier.
--
-- Deux lignes suffisent, une par severite :
-- ---------------------------------------------------------------------------

-- 1. Une attestation EN ATTENTE depuis cinq jours. Au-dela de deux jours
--    ouvres, la supervision la signale en « attention » — et elle attend
--    surtout un humain dans `/attestations`.
INSERT INTO insurance_certificate (
  id, company_id, kind, storage_path, insurer_name, policy_number,
  valid_from, valid_until, status, uploaded_at
)
VALUES (
  '00000000-0000-4000-8000-000000000019',
  '00000000-0000-4000-8000-000000000001',
  'decennale',
  'certificates/seed-bd-plomberie-renouvellement.pdf',
  'SMABTP',
  'D-2026-114780',
  now() + interval '165 days',
  now() + interval '530 days',
  'pending',
  now() - interval '5 days'
);

-- 2. Une entreprise SANS ADRESSE dont l'attestation expire dans vingt jours.
--    L'article 22.3 impose un preavis avant suspension : sans adresse il ne
--    part pas, et la suspension serait irreguliere. D'ou « bloquant ».
INSERT INTO company (
  id, siret, legal_name, legal_form, address_line1, postal_code, city, founded_on,
  legal_form_label, registration_number, phone, email, quote_validity_days
)
VALUES (
  '00000000-0000-4000-8000-000000000020',
  '81234567800013',
  'ÉLEC GARONNE',
  '1000',
  '5 QUAI DE BRAZZA',
  '33100',
  'BORDEAUX',
  '2015-06-02',
  'Entreprise individuelle',
  'Répertoire des métiers 812 345 678 RM 33',
  NULL,
  -- Volontairement vide : c'est tout le sujet de l'anomalie.
  NULL,
  30
);

INSERT INTO company_activity (company_id, activity_code)
VALUES ('00000000-0000-4000-8000-000000000020', '34');

INSERT INTO insurance_certificate (
  id, company_id, kind, storage_path, insurer_name, policy_number,
  valid_from, valid_until, status, reviewed_at
)
VALUES (
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000020',
  'decennale',
  'certificates/seed-elec-garonne.pdf',
  'MAAF Pro',
  'MA-2025-660112',
  now() - interval '345 days',
  now() + interval '20 days',
  'validated',
  now() - interval '344 days'
);

INSERT INTO certificate_activity (certificate_id, activity_code, source_label, confirmed_by)
VALUES (
  '00000000-0000-4000-8000-000000000021', '34',
  'Électricité',
  '00000000-0000-4000-8000-000000000020'
);


-- Une entreprise ajoutee a la main par le demandeur : c'est la seconde table du
-- repertoire, et l'avertissement laiton qui la precede.
INSERT INTO address_book_entry (id, requester_id, free_name, phone, activity_code, note)
VALUES (
  '00000000-0000-4000-8000-000000000018',
  '00000000-0000-4000-8000-000000000007',
  'Menuiserie Lartigue',
  '0556912240',
  '18',
  'Recommandée par le voisin du 3ᵉ. Devis jamais demandé.'
);
