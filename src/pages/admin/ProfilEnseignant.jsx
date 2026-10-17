import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../../api/client';
import CompteConnexion from '../../components/CompteConnexion';

// Profil d'un enseignant vu par l'administration, sans se connecter à son compte.
const initiales = (nom = '') => nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase();

const ProfilEnseignant = () => {
  const { id } = useParams();
  const [profil, setProfil] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    setProfil(null);
    setErreur(null);
    api.get(`/enseignants/${id}/profil`)
      .then((res) => setProfil(res.data))
      .catch((err) => setErreur(errorMessage(err, "Impossible de charger le profil de l'enseignant.")));
  }, [id]);

  const retour = <Link to="/admin/listeProf" className="btn btn-link px-0 mb-2"><i className="bx bx-arrow-back me-1"></i>Enseignants</Link>;

  if (erreur) {
    return <div className="container-xxl flex-grow-1 container-p-y">{retour}<div className="alert alert-danger">{erreur}</div></div>;
  }
  if (!profil) {
    return (
      <div className="container-xxl flex-grow-1 container-p-y text-center py-5" role="status">
        <div className="spinner-border text-primary"></div>
        <p className="mt-2 text-muted">Chargement du profil…</p>
      </div>
    );
  }

  const { enseignant, compte, annonces } = profil;

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      {retour}

      <div className="card mb-4">
        <div className="card-body gstf-profil-entete">
          <div className="gstf-profil-avatar" aria-hidden="true">{initiales(enseignant.nom_prenom)}</div>
          <div className="flex-grow-1">
            <h4 className="fw-bold mb-1">{enseignant.nom_prenom}</h4>
            <div className="mb-2"><span className="badge bg-label-primary">Enseignant</span></div>
            <ul className="gstf-profil-infos">
              <li><i className="bx bx-envelope"></i>{enseignant.email || 'Pas d\'email'}</li>
              <li><i className="bx bx-phone"></i>{enseignant.telephone || 'Pas de téléphone'}</li>
              <li><i className="bx bx-map"></i>{enseignant.adresse || 'Pas d\'adresse'}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-4 mb-4">
          <CompteConnexion compte={compte} nom={enseignant.nom_prenom}
            onMisAJour={(c) => setProfil((p) => ({ ...p, compte: c }))} />
        </div>
        <div className="col-lg-8 mb-4">
          <div className="card mb-4">
            <div className="card-header"><h5 className="card-title gstf-section-title mb-0">Matières enseignées</h5></div>
            <div className="card-body text-muted">
              <i className="bx bx-info-circle me-1"></i>
              Les matières ne sont pas encore reliées aux enseignants. Ce sera fait à l'étape « espace enseignant ».
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h5 className="card-title gstf-section-title mb-0">Dernières annonces publiées</h5></div>
            {annonces.length === 0 ? (
              <div className="card-body text-muted">Aucune annonce publiée par cet enseignant.</div>
            ) : (
              <ul className="list-group list-group-flush">
                {annonces.map((a) => (
                  <li key={a.id} className="list-group-item d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <span className="fw-semibold">{a.titre}</span>
                      <small className="text-muted d-block">{a.niveau || 'Tous les niveaux'} · {a.annee}</small>
                    </div>
                    <small className="text-muted text-nowrap">{new Date(a.date).toLocaleDateString('fr-FR')}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilEnseignant;
