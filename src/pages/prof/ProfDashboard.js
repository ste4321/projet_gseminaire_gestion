import React from 'react';
import Accueil from '../Accueil';

const ProfDashboard = () => (
  <Accueil
    annoncesTo="/prof/annonce"
    liens={[{ to: '/prof/annonce', icon: 'bx-message-square-dots', label: 'Annonces' }]}
    aVenir="Bientôt : vos matières et la saisie de vos notes."
  />
);

export default ProfDashboard;
