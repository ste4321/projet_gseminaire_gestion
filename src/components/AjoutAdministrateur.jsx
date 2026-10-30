import React, { useState } from 'react';
import api, { errorMessage } from '../api/client';

const FORMULAIRE_VIDE = { nom_prenom: '', email: '', telephone: '', current_password: '' };

/**
 * Fenêtre d'ajout d'un administrateur (onglet Administrateurs de « Comptes et accès »).
 * Le mot de passe de l'administrateur connecté est vérifié par le serveur.
 * Elle n'existe à l'écran que lorsqu'elle est ouverte : le mot de passe saisi disparaît à la fermeture.
 *
 * Props : onCree(reponse du serveur), onClose
 */
const AjoutAdministrateur = ({ onCree, onClose }) => {
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [erreurs, setErreurs] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [visible, setVisible] = useState(false);

  const changer = (champ) => (e) => {
    const valeur = e.target.value;
    setForm((avant) => ({ ...avant, [champ]: valeur }));
    setErreurs((avant) => ({ ...avant, [champ]: undefined }));
  };

  const envoyer = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    setErreurs({});
    setErreurGenerale(null);
    try {
      const res = await api.post('/user-cessions/admins', form);
      onCree(res.data);
    } catch (err) {
      const champs = err.response?.data?.errors;
      if (champs) setErreurs(champs);
      else setErreurGenerale(errorMessage(err, "Erreur lors de l'ajout de l'administrateur."));
      setForm((avant) => ({ ...avant, current_password: '' }));
      setEnvoi(false);
    }
  };

  const champ = (nom, libelle, props = {}) => (
    <div className="mb-3">
      <label className="form-label" htmlFor={`ajout-admin-${nom}`}>
        {libelle}{props.required ? '' : <span className="text-muted fw-normal"> (facultatif)</span>}
      </label>
      <input id={`ajout-admin-${nom}`} className={`form-control ${erreurs[nom] ? 'is-invalid' : ''}`}
        value={form[nom]} onChange={changer(nom)} autoComplete="off" {...props} />
      {erreurs[nom] && <div className="invalid-feedback">{erreurs[nom][0]}</div>}
    </div>
  );

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="ajout-admin-titre">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <form className="modal-content" onSubmit={envoyer}>
            <div className="modal-header">
              <h5 className="modal-title" id="ajout-admin-titre">Nouvel administrateur</h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={envoi} aria-label="Fermer"></button>
            </div>
            <div className="modal-body">
              {erreurGenerale && <div className="alert alert-danger" role="alert">{erreurGenerale}</div>}

              {champ('nom_prenom', 'Nom et prénom', { required: true, autoFocus: true, maxLength: 255, placeholder: 'ex. Père Jean Rakoto' })}
              {champ('email', 'Email', { required: true, type: 'email', maxLength: 255, placeholder: 'ex. jean.rakoto@exemple.mg' })}
              {champ('telephone', 'Téléphone', { maxLength: 20, placeholder: 'ex. 034 12 345 67' })}

              <hr />

              <label className="form-label" htmlFor="ajout-admin-confirmation">Votre mot de passe</label>
              <div className={`input-group ${erreurs.current_password ? 'has-validation' : ''}`}>
                {/* new-password : évite que le navigateur remplisse aussi l'email avec vos identifiants */}
                <input id="ajout-admin-confirmation" type={visible ? 'text' : 'password'} required
                  className={`form-control ${erreurs.current_password ? 'is-invalid' : ''}`}
                  value={form.current_password} onChange={changer('current_password')} autoComplete="new-password" />
                <button type="button" className="btn btn-outline-secondary" onClick={() => setVisible(!visible)}
                  aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  <i className={`bx ${visible ? 'bx-show' : 'bx-hide'}`}></i>
                </button>
                {erreurs.current_password && <div className="invalid-feedback">{erreurs.current_password[0]}</div>}
              </div>
              <div className="form-text">
                Pour confirmer : cette personne aura les mêmes droits que vous, et son accès sera actif tout de suite.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={envoi}>Annuler</button>
              <button type="submit" className="btn btn-primary d-flex align-items-center" disabled={envoi}>
                Ajouter
                {envoi && <span className="spinner-border spinner-border-sm ms-2" />}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
};

export default AjoutAdministrateur;
