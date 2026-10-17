// contexts/AnnonceContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AnnonceContext = createContext();

export const AnnonceProvider = ({ children }) => {
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAnnonces = async () => {
    setLoading(true);
    try {
      const res = await api.get('/annonces');
      setAnnonces(res.data);
    } catch (err) {
      console.error('Erreur fetch annonces:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAnnonces();
  }, []);

  return (
    <AnnonceContext.Provider value={{ annonces, loading, fetchAnnonces }}>
      {children}
    </AnnonceContext.Provider>
  );
};

export const useAnnonce = () => useContext(AnnonceContext);
