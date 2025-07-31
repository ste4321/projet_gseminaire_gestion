import React from 'react';
import CountUp from 'react-countup';

const AdminDashboard = () => {
  // Données statiques basées sur les informations fournies
  const stats = {
    total_etudiants: 276,
    total_seminaristes: 178,
    total_scolastiques: 98,
    total_dioceses: 9,
    total_congregations: 12,
    total_profs: 45 // Valeur exemple
  };

  const loading = false;

  // Données par année
  const repartitionAnnee = [
    { annee: '1ère Année', nombre: 86, pourcentage: 31.2 },
    { annee: '2e Année', nombre: 88, pourcentage: 31.9 },
    { annee: '3e Année', nombre: 102, pourcentage: 37.0 }
  ];

  // Top 5 des diocèses
  const topDioceses = [
    { nom: 'Antsirabe', nombre: 55, type: 'diocèse' },
    { nom: 'Antananarivo', nombre: 47, type: 'diocèse' },
    { nom: 'Antsiranana', nombre: 21, type: 'diocèse' },
    { nom: 'Miarinarivo', nombre: 21, type: 'diocèse' },
    { nom: 'Mahajanga', nombre: 13, type: 'diocèse' }
  ];

  // Top 5 des congrégations
  const topCongregations = [
    { nom: 'Trinitaires', nombre: 26, type: 'congrégation' },
    { nom: 'Sainte Famille', nombre: 16, type: 'congrégation' },
    { nom: 'Franciscains', nombre: 15, type: 'congrégation' },
    { nom: 'Carmes', nombre: 11, type: 'congrégation' },
    { nom: 'Montfortains', nombre: 8, type: 'congrégation' }
  ];

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light">Admin /</span> Tableau de bord - Année académique 2025-2026
      </h4>

      {/* Statistiques principales */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-4">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title text-black mb-1">Total Étudiants</h5>
                  <p className="text-primary display-6 mb-0">
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
                <div className="text-white opacity-75">
                  <i className="fas fa-users fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-4">
          <div className="card text-success">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title text-black mb-1">Séminaristes</h5>
                  <p className="card-text display-6 mb-0">
                    {!loading && stats ? (
                      <CountUp
                        end={stats.total_seminaristes}
                        duration={3}
                        key={stats.total_seminaristes}
                      />
                    ) : (
                      '...'
                    )}
                  </p>
                  <small className="text-white opacity-75">
                    {((stats.total_seminaristes / stats.total_etudiants) * 100).toFixed(1)}%
                  </small>
                </div>
                <div className="text-white opacity-75">
                  <i className="fas fa-graduation-cap fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-4">
          <div className="card text-info">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title text-black mb-1">Scolastiques</h5>
                  <p className="card-text display-6 mb-0">
                    {!loading && stats ? (
                      <CountUp
                        end={stats.total_scolastiques}
                        duration={3}
                        key={stats.total_scolastiques}
                      />
                    ) : (
                      '...'
                    )}
                  </p>
                  <small className="text-white opacity-75">
                    {((stats.total_scolastiques / stats.total_etudiants) * 100).toFixed(1)}%
                  </small>
                </div>
                <div className="text-white opacity-75">
                  <i className="fas fa-book fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-4">
          <div className="card text-warning">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title text-black">Enseignants</h5>
                  <p className="card-text display-6 mb-0">
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
                <div className="text-white opacity-75">
                  <i className="fas fa-chalkboard-teacher fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Répartition par année */}
      <div className="row mb-4">
        <div className="col-lg-4 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">Répartition par année</h5>
            </div>
            <div className="card-body">
              {repartitionAnnee.map((annee, index) => (
                <div key={index} className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-bold">{annee.annee}</span>
                    <span className="badge bg-primary">{annee.nombre}</span>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className="progress-bar"
                      style={{ width: `${annee.pourcentage}%` }}
                    ></div>
                  </div>
                  <small className="text-muted">{annee.pourcentage}%</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top diocèses */}
        <div className="col-lg-4 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">Top 5 Diocèses</h5>
              <small className="text-muted">{stats.total_dioceses} diocèses au total</small>
            </div>
            <div className="card-body">
              {topDioceses.map((diocese, index) => (
                <div key={index} className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <span className="fw-bold">{diocese.nom}</span>
                    <br />
                    <small className="text-muted">
                      {((diocese.nombre / stats.total_seminaristes) * 100).toFixed(1)}% des séminaristes
                    </small>
                  </div>
                  <span className="badge bg-success fs-6">{diocese.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top congrégations */}
        <div className="col-lg-4 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">Top 5 Congrégations</h5>
              <small className="text-muted">{stats.total_congregations} congrégations au total</small>
            </div>
            <div className="card-body">
              {topCongregations.map((congregation, index) => (
                <div key={index} className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <span className="fw-bold">{congregation.nom}</span>
                    <br />
                    <small className="text-muted">
                      {((congregation.nombre / stats.total_scolastiques) * 100).toFixed(1)}% des scolastiques
                    </small>
                  </div>
                  <span className="badge bg-info fs-6">{congregation.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques détaillées */}
      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Statistiques par diocèse</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <div className="text-center">
                    <h3 className="text-primary mb-1">{stats.total_dioceses}</h3>
                    <p className="text-muted mb-0">Diocèses</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center">
                    <h3 className="text-success mb-1">{stats.total_seminaristes}</h3>
                    <p className="text-muted mb-0">Séminaristes</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center">
                    <h3 className="text-info mb-1">
                      {Math.round(stats.total_seminaristes / stats.total_dioceses)}
                    </h3>
                    <p className="text-muted mb-0">Moyenne/diocèse</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Statistiques par congrégation</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <div className="text-center">
                    <h3 className="text-primary mb-1">{stats.total_congregations}</h3>
                    <p className="text-muted mb-0">Congrégations</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center">
                    <h3 className="text-info mb-1">{stats.total_scolastiques}</h3>
                    <p className="text-muted mb-0">Scolastiques</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center">
                    <h3 className="text-warning mb-1">
                      {Math.round(stats.total_scolastiques / stats.total_congregations)}
                    </h3>
                    <p className="text-muted mb-0">Moyenne/congrégation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;