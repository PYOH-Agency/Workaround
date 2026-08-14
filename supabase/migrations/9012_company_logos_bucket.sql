-- Logo d'entreprise. Compartiment PUBLIC : le logo est fait pour etre vu et
-- indexe sur la page publique de l'entreprise. Contrairement aux photos de
-- chantier et aux attestations, rien n'y est confidentiel. Les limites de
-- taille et de type sont portees par le bucket ET revalidees dans le service.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  1048576,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
