-- Depot des attestations d'assurance. Compartiment PRIVE : une attestation
-- porte le numero de police et l'identite de l'assure. Elle est lue par
-- l'application avec la cle de service, jamais servie directement.

INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;
