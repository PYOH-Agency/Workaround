-- Referentiel des activites du batiment, nomenclature France Assureurs
-- (revision 2019). C'est une DONNEE, pas du code : elle s'enrichit par une
-- nouvelle migration, sans toucher au schema.
--
-- PROVENANCE : transcrite d'une source secondaire publiant la nomenclature,
-- faute d'acces direct au document de France Assureurs. Les libelles doivent
-- correspondre a ceux que portent les attestations, sans quoi la correspondance
-- etablie par le relecteur travaillerait sur un vocabulaire decale. A confronter
-- au document officiel avant la premiere mise en production.
--
-- `requires_decennale` est renseigne activite par activite. Une entree de la
-- nomenclature n'engage pas necessairement l'article 1792 du Code civil : le
-- paysagiste et l'agencement y figurent parce que les assureurs les nomment sur
-- les memes contrats, non parce qu'ils constituent un ouvrage.

INSERT INTO activity (code, label, family, requires_decennale) VALUES
  ('1',    'Démolition',                                    'site',      true),
  ('2',    'Terrassement',                                  'site',      true),
  ('3',    'Amélioration des sols',                         'site',      true),
  ('4',    'V.R.D. — canalisations, assainissement, chaussées, trottoirs, pavage, arrosage, espaces verts', 'site', true),
  ('4.1',  'Paysagiste',                                    'site',      false),
  ('5',    'Montage d''échafaudage — étaiement',            'site',      true),
  ('6',    'Traitement amiante',                            'site',      true),
  ('7',    'Traitement curatif (insectes xylophages, champignons)', 'site', true),
  ('8',    'Assèchement des murs',                          'site',      true),
  ('9',    'Fondations spéciales',                          'structure', true),
  ('10',   'Maçonnerie et béton armé, sauf précontraint in situ', 'structure', true),
  ('11',   'Béton précontraint in situ',                    'structure', true),
  ('12',   'Charpente et structure en bois',                'structure', true),
  ('13',   'Charpente et structure métallique',             'structure', true),
  ('14',   'Couverture',                                    'envelope',  true),
  ('15',   'Étanchéité de toiture, terrasse et plancher intérieur', 'envelope', true),
  ('16',   'Étanchéité et imperméabilisation de cuvelage, réservoirs et piscines', 'envelope', true),
  ('17',   'Calfeutrement, protection, imperméabilité et étanchéité des façades', 'envelope', true),
  ('18',   'Menuiseries extérieures',                       'envelope',  true),
  ('19',   'Bardages de façade',                            'envelope',  true),
  ('20',   'Façades-rideaux',                               'envelope',  true),
  ('21',   'Structures et couvertures textiles',            'envelope',  true),
  ('22',   'Menuiseries intérieures',                       'fitting',   true),
  ('23',   'Plâtrerie — staff, stuc, gypserie',             'fitting',   true),
  ('24',   'Serrurerie — métallerie',                       'fitting',   true),
  ('25',   'Vitrerie — miroiterie',                         'fitting',   true),
  ('26',   'Peinture',                                      'fitting',   true),
  ('27',   'Revêtement de surfaces en matériaux souples et parquets flottants', 'fitting', true),
  ('28',   'Revêtement de surfaces en matériaux durs — chapes et sols coulés', 'fitting', true),
  ('29',   'Isolation thermique, acoustique, frigorifique', 'fitting',   true),
  ('18.1', 'Agencement de cuisines, magasins, salles de bain', 'fitting', false),
  ('30',   'Plomberie — installations sanitaires',          'technical', true),
  ('31',   'Installations thermiques de génie climatique',  'technical', true),
  ('32',   'Fumisterie',                                    'technical', true),
  ('33',   'Installations d''aéraulique et de conditionnement d''air', 'technical', true),
  ('34',   'Électricité',                                   'technical', true),
  ('35',   'Four et cheminée industriels',                  'technical', true),
  ('36',   'Ascenseurs',                                    'technical', true),
  ('37',   'Piscines',                                      'technical', true),
  ('38',   'Maison à ossature bois',                        'technical', true),
  ('39',   'Géothermie',                                    'technical', true)
ON CONFLICT (code) DO NOTHING;
