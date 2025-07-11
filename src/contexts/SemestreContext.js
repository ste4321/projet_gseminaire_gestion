import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const SemestreContext = createContext();

export const useSemestre = () => useContext(SemestreContext);

export const SemestreProvider = ({ children }) => {
  const [semestres, setSemestres] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSemestres = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/semestres');
      setSemestres(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSemestres();
  }, []);

  return (
    <SemestreContext.Provider value={{ semestres, fetchSemestres, loading }}>
      {children}
    </SemestreContext.Provider>
  );
};
