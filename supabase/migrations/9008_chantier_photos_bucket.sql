-- Photos de chantier. Compartiment PRIVE : elles montrent l'interieur du
-- logement de quelqu'un. Elles sont lues par l'application avec la cle de
-- service et servies par une adresse signee a duree courte, jamais
-- directement — comme les attestations d'assurance.

INSERT INTO storage.buckets (id, name, public)
VALUES ('chantier-photos', 'chantier-photos', false)
ON CONFLICT (id) DO NOTHING;
