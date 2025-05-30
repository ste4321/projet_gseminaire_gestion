import React, { useState } from 'react';
import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
const Login = () => {
  const [loading, setLoading] = useState(false);
  // const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); // 🔹 Déclenche le spinner dès le clic

    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const res = await axios.post('http://10.3.232.66:8000/api/login', {
        email,
        password,
      });

      const { role } = res.data;
      localStorage.setItem('role', role);
      localStorage.setItem('email', email);

      // Redirection par rôle
      if (role === 'admin') {
        setTimeout(() => {
          window.location.href = '/admin/dashboard';}, 1500);
      } else if (role === 'prof') {
        setTimeout(() => {
          window.location.href = '/prof/dashboard';}, 1500);      
      } else if (role === 'etudiant') {
        setTimeout(() => {
          window.location.href = '/etudiant/dashboard';}, 1500);
      } else {
        alert('Rôle inconnu');
        setLoading(false);
      }
    } catch (err) {
      alert('Erreur de connexion : identifiants incorrects');
      setLoading(false); // 🔹 Réactive le bouton en cas d'erreur
    }
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

              <form id="formAuthentication" className="mb-3" onSubmit={handleLogin}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email or Username</label>
                  <input
                    type="text"
                    className="form-control"
                    id="email"
                    name="email"
                    placeholder="Enter your email or username"
                    autoFocus
                    required
                  />
                </div>
                <div className="mb-3 form-password-toggle">
                  <div className="d-flex justify-content-between">
                    <label className="form-label" htmlFor="password">Password</label>
                    <Link to="/">
                      <small>Forgot Password?</small>
                    </Link>
                  </div>
                  <div className="input-group input-group-merge">
                    <input
                      type="password"
                      id="password"
                      className="form-control"
                      name="password"
                      placeholder="••••••••••••"
                      required
                    />
                    <span className="input-group-text cursor-pointer">
                      <i className="bx bx-hide"></i>
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="remember-me" />
                    <label className="form-check-label" htmlFor="remember-me"> Remember Me </label>
                  </div>
                </div>

                <div className="mb-3">
                  <button
                    className="btn btn-primary d-grid w-100 d-flex justify-content-center align-items-center"
                    type="submit"
                    disabled={loading}
                  >
                    Sign in
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
                <span>New on our platform? </span>
                <a href="#">
                  <span>Create an account</span>
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
