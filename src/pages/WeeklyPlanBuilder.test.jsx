import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setMockParams } from 'react-router-dom';
import WeeklyPlanBuilder from './WeeklyPlanBuilder';
import axiosClient from '../api/axiosClient';
import { renderWithQueryClient } from '../test-utils/queryTestUtils';

jest.mock('../api/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const samplePlan = {
  _id: 'plan-1',
  name: 'PPL Split',
  description: '3 day split',
  days: [
    {
      dayOfWeek: 0,
      dayName: 'Monday',
      isRestDay: false,
      workout: {
        name: 'Push Day',
        exercises: [
          {
            exerciseId: 'ex-1',
            exerciseName: 'Bench Press',
            category: 'Chest',
            sets: [{ setNumber: 1, targetReps: 10, targetWeight: 60 }],
          },
        ],
      },
    },
    {
      dayOfWeek: 1,
      dayName: 'Tuesday',
      isRestDay: true,
      workout: { name: 'Rest Day', exercises: [] },
    },
    {
      dayOfWeek: 2,
      dayName: 'Wednesday',
      isRestDay: false,
      workout: {
        name: 'Pull Day',
        exercises: [
          {
            exerciseId: 'ex-2',
            exerciseName: 'Barbell Row',
            category: 'Traps',
            sets: [{ setNumber: 1, targetReps: 8, targetWeight: 50 }],
          },
        ],
      },
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  setMockParams({ id: 'plan-1' });
  axiosClient.get.mockImplementation((url) => {
    if (url === '/muscle-groups') {
      return Promise.resolve({ data: [{ id: 'mg-1', slug: 'chest', name: 'Chest' }] });
    }
    if (url === '/weekly-plans/plan-1') {
      return Promise.resolve({ data: samplePlan });
    }
    return Promise.resolve({ data: [] });
  });
  axiosClient.put.mockResolvedValue({ data: { message: 'Updated' } });
});

test('allows swapping two days (including workout and rest day) in edit weekly plan and saves swapped order', async () => {
  renderWithQueryClient(<WeeklyPlanBuilder />);

  await waitFor(() => {
    expect(screen.getByDisplayValue('Push Day')).toBeInTheDocument();
  });
  expect(screen.getByDisplayValue('Pull Day')).toBeInTheDocument();

  // Select Monday (index 0: Push Day) to swap
  const mondaySwapBtn = document.getElementById('swap-day-0');
  userEvent.click(mondaySwapBtn);
  expect(mondaySwapBtn).toHaveTextContent('Selected');

  // Clicking the same day cancels selection
  userEvent.click(mondaySwapBtn);
  expect(mondaySwapBtn).toHaveTextContent('Swap Day');

  // Select Monday again, then swap with Tuesday (index 1: Rest Day)
  userEvent.click(mondaySwapBtn);
  const tuesdaySwapBtn = document.getElementById('swap-day-1');
  expect(tuesdaySwapBtn).toHaveTextContent('Swap Here');
  userEvent.click(tuesdaySwapBtn);

  // Monday is now Rest Day, Tuesday now has Push Day & Bench Press
  expect(document.getElementById('rest-toggle-0')).toBeChecked();
  expect(document.getElementById('rest-toggle-1')).not.toBeChecked();
  expect(screen.getByDisplayValue('Push Day')).toBeInTheDocument();
  expect(screen.getByText('Bench Press')).toBeInTheDocument();

  // Save updated plan and verify PUT payload has swapped days
  userEvent.click(document.getElementById('save-plan-btn'));

  await waitFor(() => {
    expect(axiosClient.put).toHaveBeenCalledWith(
      '/weekly-plans/plan-1',
      expect.objectContaining({
        name: 'PPL Split',
        days: expect.arrayContaining([
          expect.objectContaining({ dayOfWeek: 0, isRestDay: true }),
          expect.objectContaining({
            dayOfWeek: 1,
            isRestDay: false,
            workout: expect.objectContaining({ name: 'Push Day' }),
          }),
        ]),
      })
    );
  });
});
