// src/contexts/EtudiantParcoursContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const EtudiantParcoursContext = createContext();

export const EtudiantParcoursProvider = ({ children }) => {
  const [etudiantParcours, setEtudiantParcours] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchParcours = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/etudiant_parcours');
      setEtudiantParcours(res.data);
    } catch (error) {
      console.error("Erreur chargement parcours:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParcours();
  }, []);

  return (
    <EtudiantParcoursContext.Provider value={{ etudiantParcours, setEtudiantParcours, loading }}>
      {children}
    </EtudiantParcoursContext.Provider>
  );
};

export const useEtudiantParcours = () => useContext(EtudiantParcoursContext);
