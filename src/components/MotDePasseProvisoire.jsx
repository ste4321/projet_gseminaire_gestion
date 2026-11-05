import React, { useState } from 'react';

/**
 * Affiche un identifiant et son mot de passe provisoire, une seule fois.
 * Le serveur ne conserve pas ce mot de passe en clair : une fois la fenêtre fermée,
 * il faudra le réinitialiser depuis le Portail.
 *
 * Props : identifiants = { nom, email, mot_de_passe, actif? } | null, onClose
 * (actif : le compte est déjà activé, inutile de le rappeler)
 */
// Petit bouton icône pour copier une seule valeur
const BoutonCopie = ({ actif, onClick, libelle }) => (
  <button
    type="button"
    className={`flex-shrink-0 d-inline-flex align-items-center ${actif ? 'text-success' : 'text-primary'}`}
    style={{ background: 'none', border: 0, padding: 0, margin: 0, fontSize: '0.85rem', lineHeight: 1, cursor: 'pointer' }}
    onClick={onClick}
    title={actif ? 'Copié' : libelle}
    aria-label={libelle}
  >
    <i className={`bx ${actif ? 'bx-check' : 'bx-copy'}`}></i>
  </button>
);

const MotDePasseProvisoire = ({ identifiants, onClose }) => {
  // Quel élément vient d'être copié : 'tout', 'email', 'mdp' ou null
  const [copie, setCopie] = useState(null);

  if (!identifiants) return null;

  const texte = `Identifiant : ${identifiants.email}\nMot de passe provisoire : ${identifiants.mot_de_passe}`;

  const copier = async (valeur, cle) => {
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(cle);
      setTimeout(() => setCopie((c) => (c === cle ? null : c)), 2000);
    } catch (e) {
      // Presse-papiers indisponible (HTTP, ancien navigateur) : l'admin peut sélectionner le texte
    }
  };

  const fermer = () => {
    setCopie(null);
    onClose();
  };

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="mdp-provisoire-titre">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="mdp-provisoire-titre">
                <i className="bx bx-key me-2"></i>Identifiants provisoires
              </h5>
            </div>
            <div className="modal-body">
              {identifiants.nom && <p className="mb-3">Compte de <strong>{identifiants.nom}</strong></p>}

              <dl className="row mb-3">
                <dt className="col-sm-5">Identifiant</dt>
                <dd className="col-sm-7 d-flex align-items-center gap-2">
                  <code className="text-break user-select-all">{identifiants.email}</code>
                  <BoutonCopie actif={copie === 'email'} onClick={() => copier(identifiants.email, 'email')} libelle="Copier l'identifiant" />
                </dd>
                <dt className="col-sm-5">Mot de passe provisoire</dt>
                <dd className="col-sm-7 d-flex align-items-center gap-2">
                  <code className="fs-5 user-select-all" style={{ letterSpacing: '0.08em' }}>{identifiants.mot_de_passe}</code>
                  <BoutonCopie actif={copie === 'mdp'} onClick={() => copier(identifiants.mot_de_passe, 'mdp')} libelle="Copier le mot de passe" />
                </dd>
              </dl>

              <div className="alert alert-warning mb-0" role="alert">
                <strong>Ce mot de passe ne sera plus jamais affiché.</strong> Transmettez-le à la personne
                maintenant. Elle devra le remplacer à sa première connexion.
                {!identifiants.actif && <> Pensez aussi à <strong>activer le compte</strong> dans le Portail.</>}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-primary" onClick={() => copier(texte, 'tout')}>
                <i className={`bx ${copie === 'tout' ? 'bx-check' : 'bx-copy'} me-1`}></i>
                {copie === 'tout' ? 'Copié' : 'Tout copier'}
              </button>
              <button type="button" className="btn btn-primary" onClick={fermer}>
                J'ai noté le mot de passe
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
};

export default MotDePasseProvisoire;
