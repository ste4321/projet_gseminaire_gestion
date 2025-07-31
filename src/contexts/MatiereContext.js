import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const MatiereContext = createContext();

export const useMatiere = () => useContext(MatiereContext);

export const MatiereProvider = ({ children }) => {
  const [matieres, setMatieres] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMatieres = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/matieres');
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
