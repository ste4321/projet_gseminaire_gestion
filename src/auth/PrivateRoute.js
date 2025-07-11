// auth/PrivateRoute.js
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  const token = localStorage.getItem('token'); // ou n'importe quel mécanisme de session

  return token ? <Outlet /> : <Navigate to="/" />;
};

export default PrivateRoute;
