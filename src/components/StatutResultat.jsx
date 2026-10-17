import React from 'react';

// Résultat calculé par le serveur (ReleveService) : « Validé » (moyenne ≥ 10) ou « Rattrapage ».
// null = toutes les notes ne sont pas encore saisies (ou publiées).
const CLASSES = {
  'Validé': 'bg-label-success',
  'Rattrapage': 'bg-label-warning',
};

const StatutResultat = ({ statut, attente = 'En attente' }) => {
  if (!statut) return <span className="badge bg-label-secondary">{attente}</span>;
  return <span className={`badge ${CLASSES[statut] || 'bg-label-secondary'}`}>{statut}</span>;
};

export default StatutResultat;
