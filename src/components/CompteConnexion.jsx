import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import MotDePasseProvisoire from './MotDePasseProvisoire';

const date = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null);

// Carte « Compte de connexion » des profils : état du compte et réinitialisation du mot de passe.
const CompteConnexion = ({ compte, nom, onMisAJour }) => {
  const { notify, confirm } = useFeedback();
  const [enCours, setEnCours] = useState(false);
  const [identifiants, setIdentifiants] = useState(null);

  const reinitialiser = async () => {
    if (!(await confirm({
      title: 'Réinitialiser le mot de passe ?',
      message: `Un mot de passe provisoire sera créé pour ${nom}. L'ancien ne fonctionnera plus.`,
      confirmLabel: 'Réinitialiser',
      danger: true,
    }))) return;
    setEnCours(true);
    try {
      const res = await api.post(`/user-cessions/${compte.id}/reset-password`);
      setIdentifiants({ nom, email: res.data.email, mot_de_passe: res.data.mot_de_passe });
      onMisAJour?.({ ...compte, must_change_password: true });
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la réinitialisation du mot de passe.'));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="card h-100">
      <div className="card-header">
        <h5 className="card-title gstf-section-title mb-0">Compte de connexion</h5>
      </div>
      <div className="card-body">
        {!compte ? (
          <p className="text-muted mb-0">
            <i className="bx bx-user-x me-1"></i>
            Aucun compte de connexion n'est rattaché à cette fiche.
          </p>
        ) : (
          <>
            <dl className="gstf-fiche mb-4">
              <dt>Identifiant</dt>
              <dd className="text-break">{compte.email}</dd>
              <dt>Accès</dt>
              <dd>
                {compte.is_verified
                  ? <span className="badge bg-label-success">Actif</span>
                  : <span className="badge bg-label-warning">En attente d'activation</span>}
              </dd>
              <dt>Mot de passe</dt>
              <dd>
                {compte.must_change_password
                  ? <span className="badge bg-label-warning">Provisoire</span>
                  : <span className="badge bg-label-success">Personnel</span>}
                {!compte.must_change_password && compte.password_changed_at && (
                  <small className="text-muted d-block">changé le {date(compte.password_changed_at)}</small>
                )}
              </dd>
              <dt>Créé le</dt>
              <dd>{date(compte.created_at) || '—'}</dd>
            </dl>
            <div className="d-grid gap-2">
              <button type="button" className="btn btn-outline-primary" onClick={reinitialiser} disabled={enCours}>
                <i className="bx bx-key me-1"></i>
                {enCours ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
              </button>
              <Link to="/admin/portal" className="btn btn-link btn-sm">Gérer les accès dans « Comptes et accès »</Link>
            </div>
          </>
        )}
      </div>
      <MotDePasseProvisoire identifiants={identifiants} onClose={() => setIdentifiants(null)} />
    </div>
  );
};

export default CompteConnexion;
