import React from 'react';
import { useNotificationsAnnonces } from '../contexts/NotificationAnnonceContext';
import { plusRecentsDabord } from '../utils/tri';

const MAX_AFFICHEES = 5;

const ilYA = (iso) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

/** Cloche de l'en-tête : annonces non lues (enseignants et étudiants) */
const ClocheAnnonces = () => {
  const { actif, nonLues, marquerLues, ouvrir } = useNotificationsAnnonces();
  if (!actif) return null;

  const total = nonLues.length;
  const affichees = plusRecentsDabord(nonLues).slice(0, MAX_AFFICHEES);

  return (
    <div className="dropdown">
      <button
        type="button"
        className="nav-link btn border-0 bg-transparent position-relative px-2"
        data-bs-toggle="dropdown"
        data-bs-auto-close="outside"
        aria-expanded="false"
        aria-label={total ? `${total} annonce${total > 1 ? 's' : ''} non lue${total > 1 ? 's' : ''}` : 'Aucune nouvelle annonce'}
      >
        <i className={`bx ${total ? 'bxs-bell-ring' : 'bx-bell'} bx-sm`}></i>
        {total > 0 && (
          <span className="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle-x gstf-cloche__compteur">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>
      <div className="dropdown-menu dropdown-menu-end p-0 gstf-cloche">
        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
          <strong>Annonces</strong>
          {total > 0 && (
            <button type="button" className="btn btn-link btn-sm p-0" onClick={marquerLues}>Tout marquer comme lu</button>
          )}
        </div>
        {total === 0 ? (
          <div className="text-center text-muted small px-3 py-4">
            <i className="bx bx-bell-off d-block fs-3 mb-1"></i>
            Aucune nouvelle annonce.
          </div>
        ) : (
          <ul className="list-unstyled mb-0">
            {affichees.map((a) => (
              <li key={a.id}>
                <button type="button" className="dropdown-item gstf-cloche__item" onClick={() => ouvrir(a.id)}>
                  <span className="d-block fw-semibold text-truncate">{a.titre}</span>
                  <small className="d-block text-muted text-truncate">{a.expediteur} · {ilYA(a.created_at)}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="dropdown-item text-center text-primary border-top py-2" onClick={() => ouvrir()}>
          {total > MAX_AFFICHEES ? `Voir les ${total} annonces non lues` : 'Voir toutes les annonces'}
        </button>
      </div>
    </div>
  );
};

export default ClocheAnnonces;
