// src/contexts/UserCessionContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const UserCessionContext = createContext();

export const useUserCession = () => useContext(UserCessionContext);


export const UserCessionProvider = ({ children }) => {
  const [usersByRole, setUsersByRole] = useState({});
  const [loadingByRole, setLoadingByRole] = useState({});

  // Fetch users from API if not already loaded
  const fetchUsers = useCallback(async (role) => {
    // Si les données existent déjà, on ne refait pas l'appel
    if (usersByRole[role]?.length) {
      return usersByRole[role];
    }

    setLoadingByRole(prev => ({ ...prev, [role]: true }));
    try {
      const res = await api.get('/user-cessions', { params: { role } });
      setUsersByRole(prev => ({ ...prev, [role]: res.data }));
      return res.data;
    } catch (err) {
      console.error('fetchUsers error', err);
      return [];
    } finally {
      setLoadingByRole(prev => ({ ...prev, [role]: false }));
    }
  }, [usersByRole]);

  // Chargement initial au montage du provider
  useEffect(() => {
    ["admin", "prof", "etudiant"].forEach(role => {
      fetchUsers(role);
    });
  }, [fetchUsers]);

  // Mise à jour locale (modification utilisateur)
  const updateUserLocal = useCallback((role, id, patch) => {
    setUsersByRole(prev => {
      if (!prev[role]) return prev;
      return {
        ...prev,
        [role]: prev[role].map(u => (u.id === id ? { ...u, ...patch } : u))
      };
    });
  }, []);

  // Ajout local d'un utilisateur
  const addUserLocal = useCallback((role, newUser) => {
    setUsersByRole(prev => ({
      ...prev,
      [role]: prev[role] ? [...prev[role], newUser] : [newUser]
    }));
  }, []);

  // Suppression locale d'un utilisateur
  const deleteUserLocal = useCallback((role, id) => {
    setUsersByRole(prev => ({
      ...prev,
      [role]: prev[role]?.filter(u => u.id !== id) || []
    }));
  }, []);

  const value = {
    usersByRole,
    loadingByRole,
    fetchUsers,       // recharge manuelle si besoin
    updateUserLocal,
    addUserLocal,
    deleteUserLocal,
  };

  return (
    <UserCessionContext.Provider value={value}>
      {children}
    </UserCessionContext.Provider>
  );
};
