import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const EtudiantContext = createContext();

export const useEtudiant = () => useContext(EtudiantContext);

export const EtudiantProvider = ({ children }) => {
  const [etudiants, setEtudiants] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEtudiants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/etudiants');
      setEtudiants(res.data);
    } catch (error) {
      console.error('Erreur lors du chargement des étudiants', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEtudiants();
  }, [fetchEtudiants]);

  return (
    <EtudiantContext.Provider value={{ etudiants, setEtudiants, fetchEtudiants, loading }}>
      {children}
    </EtudiantContext.Provider>
  );
};
