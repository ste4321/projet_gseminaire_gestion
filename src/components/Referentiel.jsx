// Éléments communs aux pages de référentiels (années académiques, niveaux, semestres) :
// liste en chargement, fenêtre d'ajout / modification, ouverture des fenêtres Bootstrap.

export const fenetre = (id) => window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id));

/** Lignes grisées pendant le premier chargement */
export const ListeChargement = ({ lignes = 3, large = false }) => (
  <ul className="gstf-ref-liste" aria-busy="true">
    {Array.from({ length: lignes }, (_, i) => (
      <li key={i} className="gstf-ref-ligne" aria-hidden="true">
        <span className={`gstf-squelette gstf-ref-pastille ${large ? 'gstf-ref-pastille--large' : ''}`} />
        <span className="flex-grow-1">
          <span className="gstf-squelette d-block mb-2" style={{ width: `${9 + (i % 3) * 3}rem`, height: '0.95rem' }} />
          <span className="gstf-squelette d-block" style={{ width: '14rem', height: '0.75rem' }} />
        </span>
      </li>
    ))}
  </ul>
);

/** Fenêtre de formulaire (ajout / modification) : croix intégrée, un seul bouton principal */
export const FenetreFormulaire = ({ id, titre, sousTitre, onSubmit, valide, enCours, libelleValider, children }) => (
  <div className="modal fade" id={id} tabIndex="-1" aria-labelledby={`${id}-titre`} aria-hidden="true">
    <div className="modal-dialog modal-dialog-centered">
      <form className="modal-content gstf-ref-modal" onSubmit={onSubmit} noValidate>
        <div className="modal-header">
          <div className="min-w-0">
            <h5 className="modal-title" id={`${id}-titre`}>{titre}</h5>
            {sousTitre && <small className="text-muted">{sousTitre}</small>}
          </div>
          <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={enCours || !valide}>
            {enCours ? 'Patientez…' : libelleValider}
          </button>
        </div>
      </form>
    </div>
  </div>
);

/** Boutons Modifier / Supprimer d'une ligne (visibles au survol ; toujours sur écran tactile) */
export const ActionsLigne = ({ nom, onModifier, onSupprimer, suppressionImpossible }) => (
  <div className="gstf-ref-actions">
    <button type="button" className="btn btn-sm btn-icon btn-outline-secondary" onClick={onModifier}
      title="Modifier" aria-label={`Modifier ${nom}`}>
      <i className="bx bx-edit"></i>
    </button>
    {/* span : l'info-bulle reste visible même quand le bouton est désactivé */}
    <span title={suppressionImpossible || 'Supprimer'}>
      <button type="button" className="btn btn-sm btn-icon btn-outline-secondary gstf-ref-supprimer" onClick={onSupprimer}
        disabled={Boolean(suppressionImpossible)} aria-label={`Supprimer ${nom}`}>
        <i className="bx bx-trash"></i>
      </button>
    </span>
  </div>
);

export const pluriel = (n, mot, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;
