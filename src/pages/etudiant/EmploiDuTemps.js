import React from 'react';
// import Chart from 'react-apexcharts';

const EmploiDuTemps = () => {
  // const chartOptions = {
  //   chart: {
  //     id: 'inscriptions-chart',
  //     toolbar: { show: false },
  //   },
  //   xaxis: {
  //     categories: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
  //   },
  //   title: {
  //     text: 'Inscriptions par mois',
  //     align: 'left',
  //   },
  //   colors: ['#696CFF'],
  // };

  // const chartSeries = [
  //   {
  //     name: 'Étudiants',
  //     data: [10, 25, 15, 40, 35, 50],
  //   },
  // ];
  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light">Etudiant /</span> Empoi du temps
      </h4>

      <div className="row">
        <div className="col-lg-6 col-md-12 mb-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title text-primary">Bienvenue !</h5>
              <p className="card-text">
                Ceci est un exemple de dashboard pour l'étudiant.
              </p>
            </div>
          </div>
        </div>

        {/* Carte exemple : statistiques */}
        <div className="col-lg-6 col-md-12 mb-4">
          <div className="card text-white bg-primary">
            <div className="card-body">
              <h5 className="card-title">Étudiants inscrits</h5>
              <p className="card-text display-6">153</p>
            </div>
          </div>
        </div>
      </div>

      {/* D’autres sections : graphiques, listes, stats, etc. */}
      {/* <div className="row">
        <div className="col-12 mb-4">
          <div className="card p-3">
            <Chart options={chartOptions} series={chartSeries} type="bar" height={300} />
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default EmploiDuTemps;
