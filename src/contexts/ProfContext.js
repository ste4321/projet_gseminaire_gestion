import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const ProfContext = createContext();

export const useProf = () => useContext(ProfContext);

export const ProfProvider = ({ children }) => {
  const [profs, setProfs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/enseignants');
      setProfs(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des enseignants :", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfs();
  }, []);

  return (
    <ProfContext.Provider value={{ profs, setProfs, loading, fetchProfs }}>
      {children}
    </ProfContext.Provider>
  );
};
