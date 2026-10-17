// src/contexts/UserCessionContext.jsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import api from '../api/client';

const UserCessionContext = createContext();

export const useUserCession = () => useContext(UserCessionContext);


export const UserCessionProvider = ({ children }) => {
  const [usersByRole, setUsersByRole] = useState({});
  const [loadingByRole, setLoadingByRole] = useState({});
  // Requête en cours ou terminée par rôle : un seul appel par rôle,
  // même si la liste est vide ou si plusieurs composants la demandent en même temps.
  const requestsRef = useRef({});

  // Chargement à la demande (page Portail) ; { force: true } pour recharger
  const fetchUsers = useCallback((role, { force = false } = {}) => {
    if (!force && requestsRef.current[role]) {
      return requestsRef.current[role];
    }

    setLoadingByRole(prev => ({ ...prev, [role]: true }));
    const request = api.get('/user-cessions', { params: { role } })
      .then(res => {
        setUsersByRole(prev => ({ ...prev, [role]: res.data }));
        return res.data;
      })
      .catch(err => {
        console.error('fetchUsers error', err);
        delete requestsRef.current[role]; // autorise un nouvel essai
        return [];
      })
      .finally(() => {
        setLoadingByRole(prev => ({ ...prev, [role]: false }));
      });

    requestsRef.current[role] = request;
    return request;
  }, []);

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
