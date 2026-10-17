import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { clearSession, getRole, HOME_BY_ROLE, mustChangePassword, setMustChangePassword } from '../auth/session';

// Mêmes règles que le serveur (Password::defaults dans AppServiceProvider)
const REGLES = [
  { id: 'longueur', label: 'Au moins 12 caractères', test: (v) => v.length >= 12 },
  { id: 'lettre', label: 'Au moins une lettre', test: (v) => /[A-Za-z]/.test(v) },
  { id: 'chiffre', label: 'Au moins un chiffre', test: (v) => /[0-9]/.test(v) },
];

const ChangerMotDePasse = () => {
  const navigate = useNavigate();
  const obligatoire = mustChangePassword();
  const accueil = HOME_BY_ROLE[getRole()] || '/';

  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [succes, setSucces] = useState(false);

  const reglesOk = REGLES.every((r) => r.test(form.password));
  const confirmationOk = form.password !== '' && form.password === form.password_confirmation;

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (e) {
      // session déjà expirée : on déconnecte quand même
    } finally {
      clearSession();
      window.location.href = '/';
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reglesOk || !confirmationOk) return;

    setLoading(true);
    setErrors({});
    try {
      await api.post('/password/change', form);
      setMustChangePassword(false);
      setSucces(true);
      setTimeout(() => navigate(accueil, { replace: true }), 1500);
    } catch (err) {
      const fieldErrors = err.response?.data?.errors || {};
      setErrors({
        general: errorMessage(err, 'Impossible de modifier le mot de passe.'),
        current_password: fieldErrors.current_password?.[0],
        password: fieldErrors.password?.[0],
      });
    } finally {
      setLoading(false);
    }
  };

  const champ = (name, label, autoComplete) => (
    <div className="mb-3">
      <label className="form-label" htmlFor={name}>{label}</label>
      <div className="input-group input-group-merge">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
          value={form[name]}
          onChange={handleChange}
          autoComplete={autoComplete}
          disabled={loading || succes}
          required
        />
        <button
          type="button"
          className="input-group-text cursor-pointer"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
        >
          <i className={`bx ${visible ? 'bx-show' : 'bx-hide'}`}></i>
        </button>
      </div>
      {errors[name] && <div className="invalid-feedback d-block">{errors[name]}</div>}
    </div>
  );

  return (
    <div className="container-xxl">
      <div className="authentication-wrapper authentication-basic container-p-y">
        <div className="authentication-inner">
          <div className="card">
            <div className="card-body">
              <div className="app-brand justify-content-center">
                <img src="/images/Sainte.jpg" alt="Logo de G.S.T.F" width="70" />
              </div>
              <h4 className="mb-2">Changer mon mot de passe</h4>

              {obligatoire ? (
                <div className="alert alert-warning" role="alert">
                  Vous utilisez un <strong>mot de passe provisoire</strong>. Choisissez votre mot de passe
                  personnel pour accéder à votre espace.
                </div>
              ) : (
                <p className="mb-4 text-muted">Les autres appareils connectés à votre compte seront déconnectés.</p>
              )}

              {succes && (
                <div className="alert alert-success" role="alert">
                  Mot de passe modifié. Redirection vers votre espace…
                </div>
              )}
              {errors.general && !errors.current_password && !errors.password && (
                <div className="alert alert-danger" role="alert">{errors.general}</div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {champ('current_password', obligatoire ? 'Mot de passe provisoire' : 'Mot de passe actuel', 'current-password')}
                {champ('password', 'Nouveau mot de passe', 'new-password')}

                <ul className="list-unstyled small mb-3" aria-live="polite">
                  {REGLES.map((r) => {
                    const ok = r.test(form.password);
                    return (
                      <li key={r.id} className={ok ? 'text-success' : 'text-muted'}>
                        <i className={`bx ${ok ? 'bx-check-circle' : 'bx-circle'} me-1`}></i>
                        {r.label}
                      </li>
                    );
                  })}
                </ul>

                {champ('password_confirmation', 'Confirmer le nouveau mot de passe', 'new-password')}
                {form.password_confirmation && !confirmationOk && (
                  <div className="text-danger small mb-3">Les deux mots de passe ne correspondent pas.</div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary d-grid w-100"
                  disabled={loading || succes || !reglesOk || !confirmationOk || !form.current_password}
                >
                  {loading ? 'Enregistrement…' : 'Enregistrer mon mot de passe'}
                </button>
              </form>

              <p className="text-center mt-3 mb-0">
                {obligatoire ? (
                  <button type="button" className="btn btn-link p-0" onClick={handleLogout}>Se déconnecter</button>
                ) : (
                  <Link to={accueil}>Retour à mon espace</Link>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangerMotDePasse;
