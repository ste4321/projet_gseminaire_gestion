import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const InfoContext = createContext();

export const useInfo = () => useContext(InfoContext);

export const InfoProvider = ({ children }) => {
  const [infos, setInfos] = useState([]);
  const [loading, setLoading] = useState(true); // renommé pour être cohérent avec les autres

  const fetchInfos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/infos');
      setInfos(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des infos :", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfos();
  }, []);

  return (
    <InfoContext.Provider value={{ infos, setInfos, fetchInfos, loading }}>
      {children}
    </InfoContext.Provider>
  );
};
