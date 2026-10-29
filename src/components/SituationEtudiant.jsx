import React from 'react';

// Étiquette « Passant », « Redoublant », « Nouveau »… (voir situationAnnee dans utils/parcours).
// Même forme que StatutResultat : seul le redoublement prend la couleur d'accent.
const STYLES = {
  passant: { classe: 'gstf-resultat--valide', icone: 'bx-up-arrow-alt' },
  redoublant: { classe: 'gstf-resultat--rattrapage', icone: 'bx-revision' },
  nouveau: { classe: 'gstf-resultat--valide', icone: 'bx-user-plus' },
  sortie: { classe: 'gstf-resultat--attente', icone: 'bx-log-out-circle' },
};

const SituationEtudiant = ({ situation }) => {
  if (!situation) return null;
  const style = STYLES[situation.type] || STYLES.sortie;
  return (
    <span className={`gstf-resultat ${style.classe}`} title={situation.aide}>
      <i className={`bx ${style.icone}`} aria-hidden="true"></i>
      {situation.libelle}
    </span>
  );
};

export default SituationEtudiant;
