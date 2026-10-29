import React, { useState } from 'react';
import api from './api/client';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { saveSession, isSessionValid, getRole, HOME_BY_ROLE, mustChangePassword, CHANGE_PASSWORD_PATH } from './auth/session';
import ChoixTheme from './components/ChoixTheme';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpiree = searchParams.get('session') === 'expiree';

  // Validation des champs
  const validateForm = (email, password) => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    return newErrors;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const email = e.target.email.value.trim();
    const password = e.target.password.value;

    // Validation côté client
    const validationErrors = validateForm(email, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/login', { email, password }, { timeout: 10000 });

      const route = HOME_BY_ROLE[res.data.user?.role];
      if (route) {
        saveSession(res.data);
        navigate(res.data.user.must_change_password ? CHANGE_PASSWORD_PATH : route, { replace: true });
      } else {
        setErrors({ general: 'Rôle utilisateur non reconnu' });
        setLoading(false);
      }

    } catch (err) {
      let errorMessage = 'Une erreur est survenue';

      if (err.response) {
        // Erreur de réponse du serveur
        switch (err.response.status) {
          case 401:
            errorMessage = 'Identifiants incorrects';
            break;
          case 403:
            // Nouveau cas pour compte non vérifié
            errorMessage = err.response.data?.message || 'Votre compte n\'est pas encore vérifié. Veuillez contacter l\'administrateur.';
            break;
          case 422:
            errorMessage = 'Données invalides';
            break;
          case 429:
            errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard';
            break;
          case 500:
            errorMessage = 'Erreur serveur. Veuillez réessayer';
            break;
          default:
            errorMessage = err.response.data?.message || 'Erreur de connexion';
        }
      } else if (err.request) {
        // Aucune réponse : soit l'appareil est hors ligne, soit le serveur est arrêté ou injoignable
        errorMessage = navigator.onLine === false
          ? 'Vous êtes hors ligne. Vérifiez votre connexion internet.'
          : 'Le serveur ne répond pas. Réessayez dans un instant.';
      }

      setErrors({ general: errorMessage });
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Déjà connecté : on renvoie directement vers son espace
  if (isSessionValid() && HOME_BY_ROLE[getRole()]) {
    return <Navigate to={mustChangePassword() ? CHANGE_PASSWORD_PATH : HOME_BY_ROLE[getRole()]} replace />;
  }

  return (
    <div className="container-xxl">
      {/* Thème choisi avant même de se connecter */}
      <ChoixTheme className="position-fixed top-0 end-0 m-3" />
      <div className="authentication-wrapper authentication-basic container-p-y">
        <div className="authentication-inner gstf-login">
          <div className="card gstf-login__card">
            <aside className="gstf-login__visuel">
              <img
                src="/images/Sainte.jpg"
                alt="Sainte Thérèse de l'Enfant Jésus"
                className="gstf-login__sainte"
                width="218"
                height="218"
              />
              <p className="gstf-login__legende">
                Sous la protection de<br />
                <strong>Sainte Thérèse de l'Enfant Jésus</strong>
              </p>
            </aside>
            <div className="card-body gstf-login__form">
              <div className="app-brand justify-content-center">
                <img
                  src="/images/logo-GS.jpg"
                  alt="Logo du Grand Séminaire de Théologie Faliarivo"
                  width="90"
                  height="90"
                />
              </div>
              <h4 className="mb-1 text-center">Espace de gestion GSTF</h4>
              <p className="mb-4 text-center text-muted">Grand Séminaire de Théologie Faliarivo</p>

              {/* Affichage des erreurs générales */}
              {sessionExpiree && !errors.general && (
                <div className="alert alert-warning" role="alert">
                  Votre session a expiré. Veuillez vous reconnecter.
                </div>
              )}

              {errors.general && (
                <div className="alert alert-danger" role="alert">
                  {errors.general}
                </div>
              )}

              <form
                id="formAuthentication"
                className="mb-3"
                onSubmit={handleLogin}
              >
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    id="email"
                    name="email"
                    placeholder="Entrer votre email"
                    autoFocus
                    autoComplete="username"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    disabled={loading}
                  />
                  {errors.email && (
                    <div className="invalid-feedback">
                      {errors.email}
                    </div>
                  )}
                </div>

                <div className="mb-3 form-password-toggle">
                  <label className="form-label" htmlFor="password">Mot de passe</label>
                  <div className="input-group input-group-merge">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                      name="password"
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="input-group-text cursor-pointer"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      <i className={`bx ${showPassword ? 'bx-show' : 'bx-hide'}`}></i>
                    </button>
                  </div>
                  {errors.password && (
                    <div className="invalid-feedback d-block">
                      {errors.password}
                    </div>
                  )}
                </div>

                <p className="small text-muted mb-3">
                  Mot de passe oublié ? Adressez-vous à l'administration du séminaire,
                  qui vous remettra un mot de passe provisoire.
                </p>

                <div className="mb-3">
                  <button
                    className="btn btn-primary d-grid w-100 d-flex justify-content-center align-items-center"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Connexion' : 'Se connecter'}
                    {loading && (
                      <span
                        className="spinner-border spinner-border-sm ms-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                    )}
                  </button>
                </div>
              </form>

              <p className="text-center">
                <span>Voir notre site </span>
                <a href="https://www.gstf-faliarivo.ovh/" target="_blank" rel="noopener noreferrer">
                  <span>web</span>
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;