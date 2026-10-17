import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const NiveauContext = createContext();

export const useNiveau = () => useContext(NiveauContext);

export const NiveauProvider = ({ children }) => {
  const [niveaux, setNiveaux] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNiveaux = async () => {
    setLoading(true);
    const res = await api.get('/niveaux');
    setNiveaux(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNiveaux();
  }, []);

  return (
    <NiveauContext.Provider value={{ niveaux, setNiveaux, loading, fetchNiveaux }}>
      {children}
    </NiveauContext.Provider>
  );
};
