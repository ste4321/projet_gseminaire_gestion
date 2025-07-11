// auth/RoleRoute.js
import { Navigate, Outlet } from 'react-router-dom';

const RoleRoute = ({ allowedRoles }) => {
  const role = localStorage.getItem('role'); // 'admin', 'prof', 'etudiant'

  return allowedRoles.includes(role) ? <Outlet /> : <Navigate to="/" />;
};

export default RoleRoute;
