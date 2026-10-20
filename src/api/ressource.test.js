import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import api from './client';
import { creerRessource } from './ressource';
import { FeedbackProvider } from '../contexts/FeedbackContext';

jest.mock('./client', () => ({
  __esModule: true,
  default: { get: jest.fn() },
  errorMessage: (err, defaut) => err?.response?.data?.message || defaut,
}));

const { Provider, useRessource } = creerRessource({ url: '/annonces', nom: 'les annonces' });

const Liste = ({ id }) => {
  const { data, loading } = useRessource();
  return <p data-testid={id}>{loading ? 'chargement' : data.join(',')}</p>;
};

const espace = (enfants) => render(<FeedbackProvider><Provider>{enfants}</Provider></FeedbackProvider>);

beforeEach(() => api.get.mockReset());

test("rien n'est chargé tant qu'aucune page n'utilise la donnée", () => {
  espace(<p>accueil</p>);
  expect(api.get).not.toHaveBeenCalled();
});

test('une seule requête pour plusieurs composants', async () => {
  api.get.mockResolvedValue({ data: ['a', 'b'] });
  espace(<><Liste id="un" /><Liste id="deux" /></>);

  await waitFor(() => expect(screen.getByTestId('un')).toHaveTextContent('a,b'));
  expect(screen.getByTestId('deux')).toHaveTextContent('a,b');
  expect(api.get).toHaveBeenCalledTimes(1);
});

test('une réponse dépassée par un rechargement est ignorée', async () => {
  let resoudreAncienne;
  api.get
    .mockReturnValueOnce(new Promise((r) => { resoudreAncienne = r; }))
    .mockResolvedValueOnce({ data: ['récente'] });

  let recharger;
  const Bouton = () => {
    recharger = useRessource().recharger;
    return null;
  };
  espace(<><Liste id="liste" /><Bouton /></>);

  await act(async () => { await recharger(); });
  await act(async () => { resoudreAncienne({ data: ['ancienne'] }); });

  expect(screen.getByTestId('liste')).toHaveTextContent('récente');
});

test("une erreur est notifiée et ne bloque pas l'écran en chargement", async () => {
  api.get.mockRejectedValue({ response: { data: { message: 'Serveur indisponible' } } });
  espace(<Liste id="liste" />);

  expect(await screen.findByText('Serveur indisponible')).toBeInTheDocument();
  expect(screen.getByTestId('liste')).not.toHaveTextContent('chargement');
});
