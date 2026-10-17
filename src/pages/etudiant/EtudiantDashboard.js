import React from 'react';
import Accueil from '../Accueil';

const EtudiantDashboard = () => (
  <Accueil
    annoncesTo="/etudiant/annonce"
    liens={[
      { to: '/etudiant/notes', icon: 'bx-spreadsheet', label: 'Mes notes et mon bulletin' },
      { to: '/etudiant/edt', icon: 'bx-calendar', label: 'Emploi du temps' },
      { to: '/etudiant/annonce', icon: 'bx-message-square-dots', label: 'Annonces' },
      { to: '/etudiant/listeProf', icon: 'bx-user-voice', label: 'Enseignants' },
    ]}
  />
);

export default EtudiantDashboard;
