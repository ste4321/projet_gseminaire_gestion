// Écrans d'attente pendant le téléchargement d'un écran (voir pages/chargement.js).
// Même principe que les squelettes de données : la forme de la page apparaît tout de suite.
import { Os, StatsChargement, ListeCarteChargement } from './Squelettes';

/** Contenu d'une page en cours de téléchargement : le menu et l'en-tête restent affichés */
export const ChargementPage = () => (
  <div className="container-xxl flex-grow-1 container-p-y gstf-apparition-differee">
    <span className="visually-hidden" role="status">Chargement de la page…</span>
    <Os className="d-block mb-4" largeur="14rem" hauteur="1.6rem" />
    <StatsChargement nombre={3} />
    <ListeCarteChargement lignes={5} titre />
  </div>
);

/** Espace entier en cours de téléchargement (juste après la connexion) : menu, en-tête et contenu grisés */
const ChargementEspace = () => (
  <div className="gstf-chargement-espace" aria-busy="true">
    <span className="visually-hidden" role="status">Ouverture de votre espace…</span>
    <aside className="gstf-chargement-espace__menu" aria-hidden="true">
      <Os className="d-block mb-5" largeur="9rem" hauteur="2rem" />
      {[8, 10, 7, 9, 11, 8].map((l, i) => (
        <Os key={i} className="d-block mb-4" largeur={`${l}rem`} hauteur="0.95rem" />
      ))}
    </aside>
    <div className="gstf-chargement-espace__page">
      <div className="gstf-chargement-espace__entete" aria-hidden="true">
        <Os largeur="12rem" hauteur="1.2rem" />
        <Os largeur="2.4rem" hauteur="2.4rem" style={{ borderRadius: '50%' }} />
      </div>
      <ChargementPage />
    </div>
  </div>
);

export default ChargementEspace;
