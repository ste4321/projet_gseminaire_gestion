// auth/RoleRoute.js
// Filtre de navigation uniquement : la vraie vérification du rôle est faite par l'API.
import { Navigate, Outlet } from 'react-router-dom';
import { getRole, HOME_BY_ROLE } from './session';

const RoleRoute = ({ allowedRoles }) => {
  const role = getRole();

  if (allowedRoles.includes(role)) return <Outlet />;

  // Connecté mais mauvais espace : retour vers son propre tableau de bord
  return <Navigate to={HOME_BY_ROLE[role] || '/'} replace />;
};

export default RoleRoute;
