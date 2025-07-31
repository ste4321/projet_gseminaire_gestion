import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const InfoContext = createContext();

export const useInfo = () => useContext(InfoContext);

export const InfoProvider = ({ children }) => {
  const [infos, setInfos] = useState([]);
  const [loading, setLoading] = useState(true); // renommé pour être cohérent avec les autres

  const fetchInfos = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/infos');
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
