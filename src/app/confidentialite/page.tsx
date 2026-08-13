import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { PublicShell } from '@/ui/shells/public-shell'

export const metadata = {
  title: 'Protection de vos données',
}

/**
 * Information des personnes, au sens de l'article 13 du RGPD.
 *
 * Le point delicat est le partage des roles : sur les donnees d'un client
 * final, c'est l'artisan qui decide, pas nous. Nous n'en sommes que le
 * sous-traitant. Sur le compte de l'artisan lui-meme, en revanche, nous
 * sommes responsable de traitement.
 */
export default function PrivacyPage() {
  return (
    <PublicShell>
      <div className="flex flex-col gap-8 text-sm leading-relaxed text-ink">
        <Heading level={1}>Protection de vos données</Heading>

      <section className="flex flex-col gap-2">
        <Heading level={3} as="h2">Qui décide de quoi</Heading>
        <Text size="sm" tone="soft">
          Si vous êtes <strong>un client</strong> ayant reçu un devis : c’est l’entreprise
          artisanale qui vous l’a adressé qui décide des données vous concernant et de leur usage.
          Nous n’intervenons que comme prestataire technique, sur ses instructions. Adressez-lui vos
          demandes en priorité ; nous les relaierons si vous nous écrivez.
        </Text>
        <Text size="sm" tone="soft">
          Si vous êtes <strong>une entreprise inscrite</strong> : nous décidons des traitements liés
          à votre compte et, à terme, à votre page publique.
        </Text>
      </section>

      <section className="flex flex-col gap-2">
        <Heading level={3} as="h2">Ce que nous traitons, et pourquoi</Heading>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-field text-left">
              <th className="py-2 font-medium">Données</th>
              <th className="py-2 font-medium">Finalité</th>
              <th className="py-2 font-medium">Base légale</th>
            </tr>
          </thead>
          <tbody className="align-top">
            <tr className="border-b border-rule">
              <td className="py-2 pr-3">Compte de l’entreprise</td>
              <td className="py-2 pr-3">Fournir le service</td>
              <td className="py-2">Exécution du contrat</td>
            </tr>
            <tr className="border-b border-rule">
              <td className="py-2 pr-3">Nom, e-mail, téléphone et adresse du client</td>
              <td className="py-2 pr-3">Établir et transmettre le devis</td>
              <td className="py-2">Exécution du contrat</td>
            </tr>
            <tr className="border-b border-rule">
              <td className="py-2 pr-3">
                Code envoyé par SMS, horodatage de sa validation, adresse IP et navigateur au moment
                de la signature
              </td>
              <td className="py-2 pr-3">
                Établir qui a signé et que le document n’a pas été modifié
              </td>
              <td className="py-2">Obligation légale et intérêt légitime probatoire</td>
            </tr>
            <tr>
              <td className="py-2 pr-3">Devis signé, archivé tel quel</td>
              <td className="py-2 pr-3">Preuve en cas de litige, obligations comptables</td>
              <td className="py-2">Obligation légale</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-2">
        <Heading level={3} as="h2">Combien de temps</Heading>
        <ul className="list-disc pl-5">
          <li>Devis non signé : trois ans après le dernier échange.</li>
          <li>
            Devis signé, facture et pièces comptables : dix ans, au titre des obligations
            comptables.
          </li>
          <li>
            Preuve de signature — code validé, adresse IP, empreinte du document : dix ans, alignés
            sur la durée de la garantie décennale.
          </li>
          <li>
            Code reçu par SMS : supprimé dès qu’il a servi ou expiré. Il n’est jamais conservé en
            clair.
          </li>
          <li>Compte inactif : trois ans après le dernier accès.</li>
        </ul>
      </section>

      {/*
        Le verrou n° 1 de l'AIPD : la page disait ce que nous faisons du nom, de
        l'adresse et du telephone, jamais que la signature fait du client le
        TEMOIN d'une mesure publiee sur un tiers.
      */}
      <section className="flex flex-col gap-2">
        <Heading level={3} as="h2">Si vous avez signé un devis</Heading>
        <Text size="sm" tone="soft">
          Votre signature fait de vous le <strong>témoin</strong> d’un chantier. Elle atteste qu’il
          a eu lieu, à cette date et à ce prix — et c’est ce qui permet de publier sur l’entreprise
          des chiffres vérifiables plutôt que déclaratifs.{' '}
          <strong>Rien de ce qui vous identifie n’est publié</strong> : ni votre nom, ni votre
          adresse, ni le montant de vos travaux. Seuls des taux agrégés sur douze mois le sont, et
          jamais en dessous de dix chantiers.
        </Text>
        <Text size="sm" tone="soft">
          L’entreprise peut contester la façon dont son délai a été mesuré. Vous recevez alors une
          question, et vous êtes libre de ne pas y répondre.
        </Text>
      </section>

      <section className="flex flex-col gap-2">
        <Heading level={3} as="h2">Qui d’autre y a accès</Heading>
        <Text size="sm" tone="soft">
          Notre hébergeur, notre prestataire d’envoi d’e-mails et de SMS, et l’autorité qui horodate
          les signatures — cette dernière ne reçoit qu’une empreinte du document, jamais son
          contenu. Aucune donnée n’est vendue ni cédée à des fins publicitaires.
        </Text>
      </section>

      <section className="flex flex-col gap-2">
        <Heading level={3} as="h2">Vos droits</Heading>
        <Text size="sm" tone="soft">
          Vous pouvez demander l’accès à vos données, leur rectification, leur effacement, la
          limitation de leur traitement, ou vous opposer à celui-ci. Certaines données ne peuvent
          toutefois pas être effacées avant leur échéance : un devis signé et sa preuve de signature
          servent à établir un droit en cas de litige, et la loi nous impose de les conserver.
        </Text>
        <Text size="sm" tone="soft">
          Pour exercer ces droits, écrivez à{' '}
          <Link href="mailto:bonjour@dequerre.fr">bonjour@dequerre.fr</Link>. Si vous êtes un client
          et que la demande porte sur un devis, adressez-la d’abord à l’entreprise qui vous l’a
          envoyé ; nous la relaierons au besoin. Vous pouvez également introduire une réclamation
          auprès de la CNIL.
        </Text>
        </section>
      </div>
    </PublicShell>
  )
}
