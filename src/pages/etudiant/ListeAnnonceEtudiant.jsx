import React, { useEffect } from 'react';
import { useAnnonce } from '../contexts/AnnonceContext';

const ListeAnnonceEtudiant = () => {
  const { annonces, markAllAsRead } = useAnnonce();

  useEffect(() => {
    markAllAsRead();
  }, []);

  return (
    <div className="container mt-4">
      <h3>Annonces</h3>
      {annonces.map((a) => (
        <div key={a.id} className="card mb-3 p-3">
          <h5>{a.titre}</h5>
          <p>{a.contenu}</p>
          <small>Publié par {a.auteur_nom} ({a.auteur_role}) le {new Date(a.published_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
};

export default ListeAnnonceEtudiant;
