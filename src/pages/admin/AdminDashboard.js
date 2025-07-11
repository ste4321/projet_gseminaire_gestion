import React from 'react';
import CountUp from 'react-countup';
import { useStats } from '../../contexts/StatsContext';

const AdminDashboard = () => {
  const { stats, loading } = useStats();

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light">Admin /</span> Tableau de bord
      </h4>

      <div className="row">
        {/* Étudiants inscrits */}
        <div className="col-lg-6 col-md-12 mb-4">
          <div className="card text-white bg-primary">
            <div className="card-body">
              <h5 className="card-title text-white">Étudiants inscrits</h5>
              <p className="card-text display-6">
                {!loading && stats ? (
                  <CountUp
                    end={stats.total_etudiants}
                    duration={3}
                    key={stats.total_etudiants}
                  />
                ) : (
                  '...'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Enseignants */}
        <div className="col-lg-6 col-md-12 mb-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Enseignants actuels</h5>
              <p className="card-text display-6">
                {!loading && stats ? (
                  <CountUp
                    end={stats.total_profs}
                    duration={3}
                    key={stats.total_profs}
                  />
                ) : (
                  '...'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
