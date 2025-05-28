import React from 'react';
import AdminSidebar from './AdminSidebar';
import EtudiantSidebar from './EtudiantSidebar';
import ProfSidebar from './ProfSidebar';

const Sidebar = () => {
  const role = localStorage.getItem('role');

  if (role === 'admin') return <AdminSidebar />;
  if (role === 'etudiant') return <EtudiantSidebar />;
  if (role === 'prof') return <ProfSidebar />;

  return null; // ou un fallback
};

export default Sidebar;
