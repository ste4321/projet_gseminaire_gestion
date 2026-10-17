// auth/PrivateRoute.js
import { Navigate, Outlet } from 'react-router-dom';
import { isSessionValid } from './session';

const PrivateRoute = () => {
  return isSessionValid() ? <Outlet /> : <Navigate to="/?session=expiree" replace />;
};

export default PrivateRoute;
