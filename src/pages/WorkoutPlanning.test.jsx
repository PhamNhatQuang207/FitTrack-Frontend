import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkoutPlanning from './WorkoutPlanning';
import axiosClient from '../api/axiosClient';

jest.mock('../api/axiosClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  window.scrollTo = jest.fn();
  axiosClient.get.mockImplementation((url) => {
    if (url === '/muscle-groups') {
      return Promise.resolve({
        data: [
          { id: 'mg-1', slug: 'chest', name: 'Chest', iconUrl: '' },
          { id: 'mg-2', slug: 'biceps', name: 'Biceps', iconUrl: '' },
        ],
      });
    }
    if (url.startsWith('/exercises/category/')) {
      return Promise.resolve({
        data: [
          { id: 'ex-1', name: 'Bench Press', category: 'Chest', equipment: 'Barbell' },
        ],
      });
    }
    return Promise.resolve({ data: [] });
  });
});

test('warns when workout name is missing, keeps muscle selection, and advances on the first click once name is entered', async () => {
  render(<WorkoutPlanning />);

  const chestBtn = await screen.findByRole('button', { name: /chest/i });
  userEvent.click(chestBtn);
  expect(screen.getByText('1 selected')).toBeInTheDocument();

  const nextBtn = screen.getByRole('button', { name: /next: add exercises/i });
  userEvent.click(nextBtn);

  expect(screen.getByText(/please enter a workout name before continuing/i)).toBeInTheDocument();
  expect(screen.getByText('1 selected')).toBeInTheDocument();

  const nameInput = screen.getByLabelText(/workout name/i);
  userEvent.type(nameInput, 'Push Day');

  expect(screen.queryByText(/please enter a workout name before continuing/i)).not.toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: /next: add exercises/i }));

  await waitFor(() => {
    expect(screen.getByText('// Step 2 of 2')).toBeInTheDocument();
  });
  expect(screen.getByText('Bench Press')).toBeInTheDocument();
});

test('advances immediately when pressing Enter in workout name after selecting a muscle group', async () => {
  render(<WorkoutPlanning />);

  const chestBtn = await screen.findByRole('button', { name: /chest/i });
  userEvent.click(chestBtn);

  userEvent.click(screen.getByRole('button', { name: /next: add exercises/i }));
  expect(screen.getByText(/please enter a workout name before continuing/i)).toBeInTheDocument();

  const nameInput = screen.getByLabelText(/workout name/i);
  userEvent.type(nameInput, 'Chest Pump{enter}');

  await waitFor(() => {
    expect(screen.getByText('// Step 2 of 2')).toBeInTheDocument();
  });
});
