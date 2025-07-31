import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const ProfContext = createContext();

export const useProf = () => useContext(ProfContext);

export const ProfProvider = ({ children }) => {
  const [profs, setProfs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/enseignants');
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
