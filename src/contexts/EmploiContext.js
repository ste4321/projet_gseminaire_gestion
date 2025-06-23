import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const EmploiContext = createContext();

export const useEmploi = () => useContext(EmploiContext);

export const EmploiProvider = ({ children }) => {
  const [emploiSemestre1, setEmploiSemestre1] = useState([]);
  const [emploiSemestre2, setEmploiSemestre2] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEmplois = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/emplois');
      const data = res.data;
      setEmploiSemestre1(data.filter(item => item.semestre === 1));
      setEmploiSemestre2(data.filter(item => item.semestre === 2));
    } catch (error) {
      console.error('Erreur lors du chargement des emplois :', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmplois();
  }, []);

  return (
    <EmploiContext.Provider value={{
      emploiSemestre1,
      emploiSemestre2,
      setEmploiSemestre1,
      setEmploiSemestre2,
      loading
    }}>
      {children}
    </EmploiContext.Provider>
  );
};
