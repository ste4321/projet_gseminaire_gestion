import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const MatiereContext = createContext();

export const useMatiere = () => useContext(MatiereContext);

export const MatiereProvider = ({ children }) => {
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMatieres = async () => {
    setLoading(true);
    try {
      const response = await api.get('/matieres');
      setMatieres(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des matières :", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatieres();
  }, []);

  return (
    <MatiereContext.Provider value={{ matieres, setMatieres, loading, fetchMatieres }}>
      {children}
    </MatiereContext.Provider>
  );
};
