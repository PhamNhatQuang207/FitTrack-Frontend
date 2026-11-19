import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setMockParams, mockNavigate } from 'react-router-dom';
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
  window.scrollTo = jest.fn();
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

test('navigates back to plan library and warns when editing or deleting the active week template', async () => {
  axiosClient.get.mockImplementation((url) => {
    if (url === '/muscle-groups') {
      return Promise.resolve({ data: [{ id: 'mg-1', slug: 'chest', name: 'Chest' }] });
    }
    if (url === '/weekly-plans/plan-1') {
      return Promise.resolve({ data: samplePlan });
    }
    if (url === '/weekly-schedules/current') {
      return Promise.resolve({
        data: { id: 'sched-1', weeklyPlanId: 'plan-1', weeklyPlanName: 'PPL Split' },
      });
    }
    return Promise.resolve({ data: [] });
  });
  axiosClient.delete.mockResolvedValue({ data: { message: 'Deleted' } });

  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

  renderWithQueryClient(<WeeklyPlanBuilder />);

  await waitFor(() => {
    expect(screen.getByDisplayValue('Push Day')).toBeInTheDocument();
  });

  const statusBanner = screen.getByRole('status');
  expect(statusBanner).toHaveTextContent(
    "This plan is active for the current week. Changes here apply to future weeks and won't affect this week's progress."
  );

  userEvent.click(document.getElementById('back-btn'));
  expect(mockNavigate).toHaveBeenCalledWith('/weekly-plan-library');

  userEvent.click(document.getElementById('delete-plan-btn'));
  expect(confirmSpy).toHaveBeenCalledWith(
    expect.stringContaining('current week\'s schedule stays intact')
  );
  confirmSpy.mockRestore();
});

test('preserves rest days when backend returns workout: null', async () => {
  const planWithNullRestDay = {
    ...samplePlan,
    days: [
      ...samplePlan.days,
      {
        dayOfWeek: 3,
        dayName: 'Thursday',
        isRestDay: true,
        workout: null,
      },
    ],
  };

  axiosClient.get.mockImplementation((url) => {
    if (url === '/muscle-groups') {
      return Promise.resolve({ data: [{ id: 'mg-1', slug: 'chest', name: 'Chest' }] });
    }
    if (url === '/weekly-plans/plan-1') {
      return Promise.resolve({ data: planWithNullRestDay });
    }
    return Promise.resolve({ data: [] });
  });

  renderWithQueryClient(<WeeklyPlanBuilder />);

  await waitFor(() => {
    expect(screen.getByDisplayValue('Push Day')).toBeInTheDocument();
  });

  expect(document.getElementById('rest-toggle-3')).toBeChecked();
});

test('cancels Chromium IME scroll jump when Thursday workout name is filled and Update Plan is clicked while offscreen below', async () => {
  const planWithUnnamedThursday = {
    ...samplePlan,
    days: [
      ...samplePlan.days,
      {
        dayOfWeek: 3,
        dayName: 'Thursday',
        isRestDay: false,
        workout: {
          name: '',
          exercises: [
            {
              exerciseId: 'ex-3',
              exerciseName: 'Squat',
              category: 'Quadriceps',
              sets: [{ setNumber: 1, targetReps: 8, targetWeight: 80 }],
            },
          ],
        },
      },
    ],
  };

  axiosClient.get.mockImplementation((url) => {
    if (url === '/muscle-groups') {
      return Promise.resolve({ data: [{ id: 'mg-1', slug: 'chest', name: 'Chest' }] });
    }
    if (url === '/weekly-plans/plan-1') {
      return Promise.resolve({ data: planWithUnnamedThursday });
    }
    return Promise.resolve({ data: [] });
  });

  renderWithQueryClient(<WeeklyPlanBuilder />);

  await waitFor(() => {
    expect(screen.getByDisplayValue('Push Day')).toBeInTheDocument();
  });

  const saveBtn = document.getElementById('save-plan-btn');
  userEvent.click(saveBtn);

  expect(screen.getByRole('alert')).toHaveTextContent('Please enter a workout name for Thursday.');

  const thursdayInput = document.getElementById('day-workout-name-3');
  thursdayInput.focus();
  userEvent.type(thursdayInput, 'Leg Day');

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();

  thursdayInput.getBoundingClientRect = () => ({
    top: 950,
    bottom: 1000,
    left: 0,
    right: 200,
    width: 200,
    height: 50,
  });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 800 });
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 });

  fireEvent.pointerDown(saveBtn);
  fireEvent.compositionEnd(thursdayInput);
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 520 });
  fireEvent.scroll(window);

  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });

  userEvent.click(saveBtn);

  await waitFor(() => {
    expect(axiosClient.put).toHaveBeenCalledWith(
      '/weekly-plans/plan-1',
      expect.objectContaining({
        name: 'PPL Split',
        days: expect.arrayContaining([
          expect.objectContaining({
            dayOfWeek: 3,
            isRestDay: false,
            workout: expect.objectContaining({ name: 'Leg Day' }),
          }),
        ]),
      })
    );
  });
});
