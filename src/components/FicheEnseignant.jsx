import React from 'react';
import BoutonCopier from './BoutonCopier';

const initiales = (nom = '') =>
  nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('') || '?';

/** Fiche courte d'un enseignant : identité et coordonnées (même présentation que la fiche étudiant) */
const FicheEnseignant = ({ modalId, enseignant, role, onModifier }) => {
  const lignes = [
    { icone: 'bx-envelope', valeur: enseignant?.email, lien: enseignant?.email && `mailto:${enseignant.email}`, copier: 'Copier l\'email' },
    { icone: 'bx-phone', valeur: enseignant?.telephone, lien: enseignant?.telephone && `tel:${enseignant.telephone.replace(/\s+/g, '')}` },
    { icone: 'bx-map', valeur: enseignant?.adresse },
  ];

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
                    <h5 className="modal-title mb-0 text-truncate" id={`${modalId}-titre`}>{enseignant.nom_prenom}</h5>
                    <small className="text-muted">
                      Enseignant{!enseignant.id_user_cession && ' · sans compte de connexion'}
                    </small>
                  </div>
                </div>
                <button type="button" className="btn-close align-self-start" data-bs-dismiss="modal" aria-label="Fermer"></button>
              </div>

              <div className="modal-body">
                <ul className="list-unstyled mb-0 gstf-fiche-etudiant__infos">
                  {lignes.map((l) => (
                    <li key={l.icone}>
                      <i className={`bx ${l.icone}`} aria-hidden="true"></i>
                      {l.valeur
                        ? (l.lien ? <a href={l.lien} className="text-truncate">{l.valeur}</a> : <span className="text-truncate">{l.valeur}</span>)
                        : <span className="text-muted">Non renseigné</span>}
                      {l.valeur && l.copier && <BoutonCopier texte={l.valeur} libelle={l.copier} />}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Fermer</button>
                {role === 'admin' && (
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
