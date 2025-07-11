import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const NiveauContext = createContext();

export const useNiveau = () => useContext(NiveauContext);

export const NiveauProvider = ({ children }) => {
  const [niveaux, setNiveaux] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNiveaux = async () => {
    setLoading(true);
    const res = await axios.get('http://127.0.0.1:8000/api/niveaux');
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
