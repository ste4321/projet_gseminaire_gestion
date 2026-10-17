// src/contexts/StatsContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const StatsContext = createContext();
export const useStats = () => useContext(StatsContext);

export const StatsProvider = ({ children }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(response => {
        setStats(response.data);
      })
      .catch(err => {
        console.error('Erreur stats :', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <StatsContext.Provider value={{ stats, loading }}>
      {children}
    </StatsContext.Provider>
  );
};
