import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import WorkoutPlanning from './WorkoutPlanning';
import axiosClient from '../api/axiosClient';
import { renderWithQueryClient } from '../test-utils/queryTestUtils';

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
  renderWithQueryClient(<WorkoutPlanning />);

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
  renderWithQueryClient(<WorkoutPlanning />);

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

test('cancels browser IME scroll jump when workout name input commits offscreen before Next click', async () => {
  renderWithQueryClient(<WorkoutPlanning />);

  const chestBtn = await screen.findByRole('button', { name: /chest/i });
  userEvent.click(chestBtn);

  const nameInput = screen.getByLabelText(/workout name/i);
  userEvent.type(nameInput, 'Test');

  nameInput.getBoundingClientRect = () => ({ top: -150, bottom: -100, left: 0, right: 200, width: 200, height: 50 });
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 500 });

  fireEvent.compositionEnd(nameInput);
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 234 });
  fireEvent.scroll(window);

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'instant' });

  userEvent.click(screen.getByRole('button', { name: /next: add exercises/i }));
  await waitFor(() => {
    expect(screen.getByText('// Step 2 of 2')).toBeInTheDocument();
  });
});

test('reuses cached muscle groups across two mounts sharing the same QueryClient', async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: false,
      },
    },
  });

  const { unmount } = renderWithQueryClient(<WorkoutPlanning />, { client });
  await screen.findByRole('button', { name: /chest/i });
  unmount();

  renderWithQueryClient(<WorkoutPlanning />, { client });
  await screen.findByRole('button', { name: /chest/i });

  const muscleGroupCalls = axiosClient.get.mock.calls.filter(([url]) => url === '/muscle-groups');
  expect(muscleGroupCalls).toHaveLength(1);
});
