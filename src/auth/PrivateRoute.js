// auth/PrivateRoute.js
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isSessionValid, mustChangePassword, CHANGE_PASSWORD_PATH } from './session';

const PrivateRoute = () => {
  const location = useLocation();

  if (!isSessionValid()) {
    return <Navigate to="/?session=expiree" replace />;
  }

  // Mot de passe provisoire : aucune autre page tant qu'il n'est pas remplacé
  if (mustChangePassword() && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
