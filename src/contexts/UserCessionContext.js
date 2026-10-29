// Comptes de connexion (page « Comptes et accès »), par rôle, gardés en mémoire tant que l'espace admin est ouvert.
// - un seul appel par rôle, même si plusieurs composants le demandent en même temps ;
// - erreur exposée (`erreurByRole`) au lieu d'une liste vide silencieuse, nouvel essai possible ;
// - compteurs par rôle (actifs / désactivés) pour les onglets, rafraîchis après chaque modification.
import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import api, { errorMessage } from '../api/client';

const UserCessionContext = createContext();

export const useUserCession = () => useContext(UserCessionContext);

export const UserCessionProvider = ({ children }) => {
  const [usersByRole, setUsersByRole] = useState({});
  const [loadingByRole, setLoadingByRole] = useState({});
  const [erreurByRole, setErreurByRole] = useState({});
  const [stats, setStats] = useState(null);
  const requestsRef = useRef({});

  // Chargement à la demande ; { force: true } pour recharger
  const fetchUsers = useCallback((role, { force = false } = {}) => {
    if (!force && requestsRef.current[role]) {
      return requestsRef.current[role];
    }

    setLoadingByRole((prev) => ({ ...prev, [role]: true }));
    setErreurByRole((prev) => ({ ...prev, [role]: null }));
    const request = api.get('/user-cessions', { params: { role } })
      .then((res) => {
        setUsersByRole((prev) => ({ ...prev, [role]: res.data }));
        return res.data;
      })
      .catch((err) => {
        delete requestsRef.current[role]; // autorise un nouvel essai
        setErreurByRole((prev) => ({ ...prev, [role]: errorMessage(err, 'Impossible de charger les comptes.') }));
        return [];
      })
      .finally(() => {
        setLoadingByRole((prev) => ({ ...prev, [role]: false }));
      });

    requestsRef.current[role] = request;
    return request;
  }, []);

  // Compteurs par rôle (onglets) : une requête légère, relancée après chaque modification
  const fetchStats = useCallback(() => {
    api.get('/user-cessions/stats').then((res) => setStats(res.data)).catch(() => {});
  }, []);

  // Mise à jour locale (activation, mot de passe réinitialisé)
  const updateUserLocal = useCallback((role, id, patch) => {
    setUsersByRole((prev) => {
      if (!prev[role]) return prev;
      return { ...prev, [role]: prev[role].map((u) => (u.id === id ? { ...u, ...patch } : u)) };
    });
  }, []);

  const addUserLocal = useCallback((role, newUser) => {
    setUsersByRole((prev) => ({ ...prev, [role]: prev[role] ? [...prev[role], newUser] : [newUser] }));
  }, []);

  const deleteUserLocal = useCallback((role, id) => {
    setUsersByRole((prev) => ({ ...prev, [role]: prev[role]?.filter((u) => u.id !== id) || [] }));
  }, []);

  const value = useMemo(() => ({
    usersByRole,
    loadingByRole,
    erreurByRole,
    stats,
    fetchUsers,
    fetchStats,
    updateUserLocal,
    addUserLocal,
    deleteUserLocal,
  }), [usersByRole, loadingByRole, erreurByRole, stats, fetchUsers, fetchStats, updateUserLocal, addUserLocal, deleteUserLocal]);

  return <UserCessionContext.Provider value={value}>{children}</UserCessionContext.Provider>;
};
