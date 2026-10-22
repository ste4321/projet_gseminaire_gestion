import React from 'react';
import BoutonCopier from './BoutonCopier';

const initiales = (nom = '') =>
  nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('') || '?';

/**
 * Fiche courte d'un enseignant (même présentation que la fiche étudiant).
 * Seules les coordonnées renseignées s'affichent ; l'état du compte n'est montré qu'à l'administration.
 */
const FicheEnseignant = ({ modalId, enseignant, role, onModifier, onSupprimer, onOuvrirEspace }) => {
  const admin = role === 'admin';
  const coordonnees = [
    { icone: 'bx-envelope', libelle: 'Email', valeur: enseignant?.email, lien: enseignant?.email && `mailto:${enseignant.email}`, copier: "Copier l'email" },
    { icone: 'bx-phone', libelle: 'Téléphone', valeur: enseignant?.telephone, lien: enseignant?.telephone && `tel:${enseignant.telephone.replace(/\s+/g, '')}`, copier: 'Copier le téléphone' },
    { icone: 'bx-map', libelle: 'Adresse', valeur: enseignant?.adresse },
  ].filter((l) => l.valeur);

  return (
    <div className="modal fade" id={modalId} tabIndex="-1" aria-labelledby={`${modalId}-titre`} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          {enseignant && (
            <>
              <div className="modal-header border-0 pb-0">
                <div className="d-flex align-items-center gap-3 min-w-0">
                  <span className="gstf-fiche-etudiant__avatar" aria-hidden="true">{initiales(enseignant.nom_prenom)}</span>
                  <div className="min-w-0">
                    <h5 className="modal-title mb-1 text-truncate" id={`${modalId}-titre`}>{enseignant.nom_prenom}</h5>
                    {admin ? (
                      enseignant.id_user_cession
                        ? <span className="badge bg-label-primary">Compte de connexion</span>
                        : <span className="badge bg-label-secondary">Sans compte de connexion</span>
                    ) : (
                      <small className="text-muted">Enseignant</small>
                    )}
                  </div>
                </div>
                <button type="button" className="btn-close align-self-start" data-bs-dismiss="modal" aria-label="Fermer"></button>
              </div>

              <div className="modal-body">
                {coordonnees.length > 0 ? (
                  <ul className="list-unstyled mb-0 gstf-fiche-etudiant__infos">
                    {coordonnees.map((l) => (
                      <li key={l.icone}>
                        <i className={`bx ${l.icone}`} aria-hidden="true" title={l.libelle}></i>
                        <span className="visually-hidden">{l.libelle} : </span>
                        {l.lien ? <a href={l.lien} className="text-truncate">{l.valeur}</a> : <span className="text-truncate">{l.valeur}</span>}
                        {l.copier && <BoutonCopier texte={l.valeur} libelle={l.copier} />}
                      </li>
                    ))}
                  </ul>
                ) : (
                  // Une seule ligne plutôt que trois « Non renseigné »
                  <p className="text-muted mb-0">
                    <i className="bx bx-info-circle me-1"></i>Aucune coordonnée renseignée.
                  </p>
                )}
              </div>

              <div className="modal-footer">
                {admin && onSupprimer && (
                  <button type="button" className="btn btn-outline-danger me-auto" onClick={onSupprimer}>
                    <i className="bx bx-trash me-1"></i>Supprimer
                  </button>
                )}
                {/* {admin && enseignant.id_user_cession && onOuvrirEspace && (
                  <button type="button" className="btn btn-outline-primary" onClick={onOuvrirEspace} title="Voir son espace en lecture seule">
                    <i className="bx bx-show me-1"></i>Voir son espace
                  </button>
                )} */}
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Fermer</button>
                {admin && (
                  <button type="button" className="btn btn-primary" onClick={onModifier}>
                    <i className="bx bx-edit me-1"></i>Modifier
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FicheEnseignant;
