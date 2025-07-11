import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AnneeContext = createContext();

export const useAnnee = () => useContext(AnneeContext);

export const AnneeProvider = ({ children }) => {
  const [annees, setAnnees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnees = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/annee_aca');
      setAnnees(res.data);
    } catch (error) {
      console.error("Erreur lors du chargement des années :", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnees();
  }, []);

  return (
    <AnneeContext.Provider value={{ annees, setAnnees, loading, fetchAnnees }}>
      {children}
    </AnneeContext.Provider>
  );
};
