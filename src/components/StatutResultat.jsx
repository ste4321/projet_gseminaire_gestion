import React from 'react';

// Résultat calculé par le serveur (ReleveService) : « Validé » (moyenne ≥ 10) ou « Rattrapage ».
// null = toutes les notes ne sont pas encore saisies (ou publiées).
// Étiquette sobre : bordure fine et icône ; une seule couleur d'accent (bordeaux) pour le rattrapage.
const STYLES = {
  'Validé': { classe: 'gstf-resultat--valide', icone: 'bx-check' },
  'Rattrapage': { classe: 'gstf-resultat--rattrapage', icone: 'bx-revision' },
};

const StatutResultat = ({ statut, attente = 'En attente' }) => {
  const style = STYLES[statut] || { classe: 'gstf-resultat--attente', icone: 'bx-time-five' };
  return (
    <span className={`gstf-resultat ${style.classe}`}>
      <i className={`bx ${style.icone}`} aria-hidden="true"></i>
      {statut || attente}
    </span>
  );
};

export default StatutResultat;
