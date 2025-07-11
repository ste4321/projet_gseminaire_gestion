// src/contexts/InfoContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const InfoContext = createContext();

export const InfoProvider = ({ children }) => {
  const [infos, setInfos] = useState([]);
  const [loadingInfos, setLoadingInfos] = useState(true);

  const fetchInfos = async () => {
    setLoadingInfos(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/infos');
      setInfos(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des infos:', error);
    } finally {
      setLoadingInfos(false);
    }
  };

  useEffect(() => {
    fetchInfos();
  }, []);

  return (
    <InfoContext.Provider value={{ infos, setInfos, fetchInfos, loadingInfos }}>
      {children}
    </InfoContext.Provider>
  );
};

export const useInfo = () => useContext(InfoContext);
