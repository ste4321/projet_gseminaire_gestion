import React from 'react';
import { useNotificationsAnnonces } from '../contexts/NotificationAnnonceContext';
import { useNotificationsEtudiant } from '../contexts/NotificationsEtudiantContext';
import { ilYA } from '../utils/dates';

const MAX_AFFICHEES = 8;
const instant = (iso) => (iso ? new Date(iso).getTime() : 0);

/**
 * Cloche de l'en-tête : tout ce qui est nouveau depuis la dernière visite, au même endroit.
 * Enseignants : annonces. Étudiants : annonces, notes publiées, emploi du temps mis à jour.
 */
const ClocheAnnonces = () => {
  const { actif, nonLues, marquerLues, ouvrir } = useNotificationsAnnonces();
  const { elements: nouveautesEtudiant, toutMarquerLu } = useNotificationsEtudiant();
  if (!actif) return null;

  const elements = [
    ...nonLues.map((a) => ({
      cle: `annonce-${a.id}`,
      icone: 'bxs-megaphone',
      titre: a.titre,
      detail: `Annonce · ${a.expediteur}`,
      quand: a.created_at,
      ouvrir: () => ouvrir(a.id),
    })),
    ...nouveautesEtudiant,
  ].sort((a, b) => instant(b.quand) - instant(a.quand));

  const total = elements.length;
  const affichees = elements.slice(0, MAX_AFFICHEES);
  const toutLu = () => {
    marquerLues();
    toutMarquerLu();
  };

  return (
    <div className="dropdown">
      <button
        type="button"
        className="nav-link btn border-0 bg-transparent position-relative px-2"
        data-bs-toggle="dropdown"
        data-bs-auto-close="outside"
        aria-expanded="false"
        aria-label={total ? `${total} notification${total > 1 ? 's' : ''} non lue${total > 1 ? 's' : ''}` : 'Aucune nouvelle notification'}
      >
        <i className={`bx ${total ? 'bxs-bell-ring' : 'bx-bell'} bx-sm`}></i>
        {total > 0 && (
          <span className="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle-x gstf-cloche__compteur">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>
      <div className="dropdown-menu dropdown-menu-end p-0 gstf-cloche">
        <div className="gstf-cloche__entete">
          <span className="text-nowrap">
            <strong className="text-body">Notifications</strong>
            {total > 0 && <small className="text-muted ms-2">{total} nouvelle{total > 1 ? 's' : ''}</small>}
          </span>
          {total > 0 && (
            <button type="button" className="gstf-cloche__tout-lire" onClick={toutLu} title="Tout marquer comme lu">
              <i className="bx bx-check-double" aria-hidden="true"></i>Tout lire
            </button>
          )}
        </div>
        {total === 0 ? (
          <div className="text-center text-muted small px-3 py-4">
            <i className="bx bx-bell-off d-block fs-3 mb-1"></i>
            Rien de nouveau pour l'instant.
          </div>
        ) : (
          <ul className="list-unstyled mb-0 gstf-cloche__liste">
            {affichees.map((e) => (
              <li key={e.cle}>
                <button type="button" className="dropdown-item gstf-cloche__item" onClick={e.ouvrir}>
                  <span className="gstf-cloche__icone" aria-hidden="true"><i className={`bx ${e.icone}`}></i></span>
                  <span className="min-w-0 flex-grow-1">
                    <span className="gstf-cloche__titre">{e.titre}</span>
                    <small className="gstf-cloche__detail">{e.detail} · {ilYA(e.quand)}</small>
                  </span>
                  <span className="gstf-cloche__point" aria-hidden="true"></span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {total > MAX_AFFICHEES && (
          <div className="text-center small text-muted py-2">et {total - MAX_AFFICHEES} autre{total - MAX_AFFICHEES > 1 ? 's' : ''}…</div>
        )}
        <button type="button" className="dropdown-item gstf-cloche__pied" onClick={() => ouvrir()}>
          Voir toutes les annonces
        </button>
      </div>
    </div>
  );
};

export default ClocheAnnonces;
