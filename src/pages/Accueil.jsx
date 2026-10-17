import React from 'react';
import { Link } from 'react-router-dom';
import { useAnnonce } from '../contexts/AnnonceContext';

const dateLongue = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';

const majuscule = (texte) => texte.charAt(0).toUpperCase() + texte.slice(1);

const salutation = () => {
  const heure = new Date().getHours();
  return heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';
};

/**
 * Accueil des espaces enseignant et étudiant : dernières annonces et accès rapides.
 * Props : liens = [{ to, icon, label }], annoncesTo = lien vers la page des annonces
 */
const Accueil = ({ liens, annoncesTo, aVenir }) => {
  const { annonces = [], loading } = useAnnonce() || {};
  const nomPrenom = localStorage.getItem('nom_prenom') || '';
  const dernieres = annonces.slice(0, 4);

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="card mb-4">
        <div className="card-body d-flex flex-wrap align-items-center gap-3">
          <img src="/images/logo-GS.jpg" alt="" width="64" height="64" className="rounded-circle" />
          <div>
            <h4 className="mb-1">{salutation()}{nomPrenom ? `, ${nomPrenom}` : ''}</h4>
            <p className="mb-0 text-muted">{majuscule(dateLongue(new Date().toISOString()))}</p>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-7 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title gstf-section-title mb-0">Dernières annonces</h5>
              <Link to={annoncesTo} className="btn btn-sm btn-outline-primary">Toutes les annonces</Link>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4" role="status">
                  <div className="spinner-border spinner-border-sm text-primary"></div>
                  <span className="ms-2 text-muted">Chargement…</span>
                </div>
              ) : dernieres.length === 0 ? (
                <div className="gstf-empty py-4">
                  <i className="bx bx-message-square-dots d-block"></i>
                  Aucune annonce pour le moment.
                </div>
              ) : (
                <ul className="list-unstyled mb-0">
                  {dernieres.map((a) => (
                    <li key={a.id} className="py-2 border-bottom">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <strong className="text-truncate">{a.titre}</strong>
                        {a.niveau && <span className="badge bg-label-primary">{a.niveau.niveau}</span>}
                      </div>
                      <p className="mb-1 text-muted small" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {a.description}
                      </p>
                      <small className="text-muted">{a.expediteur} · {new Date(a.created_at).toLocaleDateString('fr-FR')}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title gstf-section-title mb-0">Accès rapides</h5>
            </div>
            <div className="card-body d-grid gap-2 align-content-start">
              {liens.map((l) => (
                <Link key={l.to} to={l.to} className="gstf-quick-link">
                  <i className={`bx ${l.icon}`} aria-hidden="true"></i>{l.label}
                </Link>
              ))}
              <Link to="/changer-mot-de-passe" className="gstf-quick-link">
                <i className="bx bx-lock-alt" aria-hidden="true"></i>Changer mon mot de passe
              </Link>
              {aVenir && <p className="small text-muted mt-2 mb-0"><i className="bx bx-time-five me-1"></i>{aVenir}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Accueil;
