import React, { useState } from 'react';
import { getConsultation, quitterConsultation } from '../auth/consultation';

const LIBELLES = { etudiant: 'étudiant', prof: 'enseignant' };

// Bandeau affiché en permanence quand l'administration consulte l'espace d'une autre personne.
const BandeauConsultation = () => {
  const consultation = getConsultation();
  const [enCours, setEnCours] = useState(false);

  if (!consultation) return null;

  return (
    <div className="gstf-consultation" role="status">
      <i className="bx bx-show gstf-consultation__icone" aria-hidden="true"></i>
      <div className="gstf-consultation__texte">
        Vous consultez l'espace {LIBELLES[consultation.role] || ''} de <strong>{consultation.nom}</strong>
        <span className="gstf-consultation__detail"><span className="gstf-consultation__sep"> · </span>lecture seule, aucune modification possible</span>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-light"
        disabled={enCours}
        onClick={() => {
          setEnCours(true);
          quitterConsultation();
        }}
      >
        <i className="bx bx-arrow-back me-1"></i>
        {enCours ? 'Retour…' : 'Revenir à mon compte'}
      </button>
    </div>
  );
};

export default BandeauConsultation;
