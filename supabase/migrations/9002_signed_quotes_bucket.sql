-- Archivage des devis signes.
--
-- Le PDF exact soumis a la signature doit etre conserve tel quel : c'est lui
-- que l'empreinte stockee dans `signature` engage. Le regenerer plus tard
-- depuis un gabarit modifie produirait un document different, et invaliderait
-- silencieusement toute la preuve d'integrite.
--
-- Le bucket est prive : un devis signe contient l'adresse d'un logement, le nom
-- d'un particulier et des montants. Il n'est servi que par l'application, apres
-- verification du jeton.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('signed-quotes', 'signed-quotes', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
