import React, { useState } from 'react';

/**
 * Affiche un identifiant et son mot de passe provisoire, une seule fois.
 * Le serveur ne conserve pas ce mot de passe en clair : une fois la fenêtre fermée,
 * il faudra le réinitialiser depuis le Portail.
 *
 * Props : identifiants = { nom, email, mot_de_passe } | null, onClose
 */
const MotDePasseProvisoire = ({ identifiants, onClose }) => {
  const [copie, setCopie] = useState(false);

  if (!identifiants) return null;

  const texte = `Identifiant : ${identifiants.email}\nMot de passe provisoire : ${identifiants.mot_de_passe}`;

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch (e) {
      // Presse-papiers indisponible (HTTP, ancien navigateur) : l'admin peut sélectionner le texte
    }
  };

  const fermer = () => {
    setCopie(false);
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
                <dd className="col-sm-7 text-break"><code>{identifiants.email}</code></dd>
                <dt className="col-sm-5">Mot de passe provisoire</dt>
                <dd className="col-sm-7">
                  <code className="fs-5 user-select-all" style={{ letterSpacing: '0.08em' }}>{identifiants.mot_de_passe}</code>
                </dd>
              </dl>

              <div className="alert alert-warning mb-0" role="alert">
                <strong>Ce mot de passe ne sera plus jamais affiché.</strong> Transmettez-le à la personne
                maintenant. Elle devra le remplacer à sa première connexion. Pensez aussi à
                <strong> activer le compte</strong> dans le Portail.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-primary" onClick={copier}>
                <i className={`bx ${copie ? 'bx-check' : 'bx-copy'} me-1`}></i>
                {copie ? 'Copié' : 'Copier'}
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
