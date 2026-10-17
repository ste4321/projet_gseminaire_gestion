import React from 'react';
import Accueil from '../Accueil';

const EtudiantDashboard = () => (
  <Accueil
    annoncesTo="/etudiant/annonce"
    liens={[
      { to: '/etudiant/edt', icon: 'bx-calendar', label: 'Emploi du temps' },
      { to: '/etudiant/annonce', icon: 'bx-message-square-dots', label: 'Annonces' },
      { to: '/etudiant/listeProf', icon: 'bx-user-voice', label: 'Enseignants' },
    ]}
    aVenir="Bientôt : vos notes et votre bulletin."
  />
);

export default EtudiantDashboard;
