// src/contexts/EtudiantParcoursContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const EtudiantParcoursContext = createContext();

export const EtudiantParcoursProvider = ({ children }) => {
  const [etudiantParcours, setEtudiantParcours] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchParcours = async () => {
  //   try {
  //     setLoading(true); // Ajout pour indiquer le rechargement
  //     const res = await api.get('/etudiant_parcours');
  //     setEtudiantParcours(res.data);
  //   } catch (error) {
  //     console.error("Erreur chargement parcours:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  try {
    setLoading(true);
    const response = await api.get('/etudiant_parcours'); // Ajustez l'URL selon votre API
    setEtudiantParcours(response.data);
  } catch (error) {
    console.error('Erreur lors du rafraîchissement:', error);
  } finally {
    setLoading(false);
  }
};
  // Fonction pour recharger les données (exposée au composant)
  const refetchParcours = () => {
    return fetchParcours();
  };

  useEffect(() => {
    fetchParcours();
  }, []);

  return (
    <EtudiantParcoursContext.Provider value={{ 
      etudiantParcours, 
      setEtudiantParcours, 
      loading,
      refetchParcours // 🔹 Nouvelle fonction exposée
    }}>
      {children}
    </EtudiantParcoursContext.Provider>
  );
};

export const useEtudiantParcours = () => useContext(EtudiantParcoursContext);