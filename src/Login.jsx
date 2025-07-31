import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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
      const res = await axios.post('http://127.0.0.1:8000/api/login', {
        email,
        password,
      }, {
        timeout: 10000, // Timeout de 10 secondes
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });

      const { access_token, user } = res.data;

      // Stockage sécurisé dans localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', user.role);
      localStorage.setItem('nom_prenom', user.nom_prenom);
      localStorage.setItem('loginTime', new Date().toISOString());

      // Redirection par rôle avec React Router
      const routes = {
        admin: '/admin/dashboard',
        prof: '/prof/dashboard',
        etudiant: '/etudiant/dashboard'
      };

      const route = routes[user.role];
      if (route) {
        // Petit délai pour l'UX
        setTimeout(() => {
          navigate(route, { replace: true });
        }, 500);
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
        // Erreur de réseau
        errorMessage = 'Problème de connexion. Vérifiez votre réseau';
      }

      setErrors({ general: errorMessage });
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="container-xxl">
      <div className="authentication-wrapper authentication-basic container-p-y">
        <div className="authentication-inner">
          <div className="card">
            <div className="card-body">
              <div className="app-brand justify-content-center">
                <img
                  src="images/sainte.jpg"
                  alt="Logo de G.S.T.F"
                  width="70"
                />
              </div>
              <h4 className="mb-2">G . S . T . F </h4>
              <p className="mb-4">Grand Séminaire de Théologie Faliarivo</p>

              {/* Affichage des erreurs générales */}
              {errors.general && (
                <div className="alert alert-danger" role="alert">
                  {errors.general}
                </div>
              )}

              <form 
                id="formAuthentication" 
                className="mb-3" 
                onSubmit={handleLogin}
                autoComplete="off"
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
                    autoComplete="new-email"
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
                  <div className="d-flex justify-content-between">
                    <label className="form-label" htmlFor="password">Mot de passe</label>
                    <Link to="/forgot-password">
                      <small>Mot de passe oublié ?</small>
                    </Link>
                  </div>
                  <div className="input-group input-group-merge">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                      name="password"
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      disabled={loading}
                    />
                    <span 
                      className="input-group-text cursor-pointer" 
                      onClick={togglePasswordVisibility}
                    >
                      <i className={`bx ${showPassword ? 'bx-show' : 'bx-hide'}`}></i>
                    </span>
                  </div>
                  {errors.password && (
                    <div className="invalid-feedback d-block">
                      {errors.password}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="remember-me" 
                      disabled={loading}
                    />
                    <label className="form-check-label" htmlFor="remember-me">
                      Se souvenir de moi
                    </label>
                  </div>
                </div>

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