import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockNavigate } from 'react-router-dom';
import WeeklyPlanLibrary from './WeeklyPlanLibrary';
import axiosClient from '../api/axiosClient';
import { renderWithQueryClient } from '../test-utils/queryTestUtils';

jest.mock('../api/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const samplePlans = [
  {
    id: 'plan-1',
    name: 'PPL Split',
    description: 'Push Pull Legs',
    days: [
      { dayOfWeek: 0, dayName: 'Monday', isRestDay: false, workout: { name: 'Push' } },
      { dayOfWeek: 1, dayName: 'Tuesday', isRestDay: true, workout: null },
      { dayOfWeek: 2, dayName: 'Wednesday', isRestDay: false, workout: { name: 'Pull' } },
      { dayOfWeek: 3, dayName: 'Thursday', isRestDay: true, workout: null },
      { dayOfWeek: 4, dayName: 'Friday', isRestDay: false, workout: { name: 'Legs' } },
      { dayOfWeek: 5, dayName: 'Saturday', isRestDay: true, workout: null },
      { dayOfWeek: 6, dayName: 'Sunday', isRestDay: true, workout: null },
    ],
  },
  {
    id: 'plan-2',
    name: 'Upper Lower',
    description: '4 day split',
    days: [
      { dayOfWeek: 0, dayName: 'Monday', isRestDay: false, workout: { name: 'Upper' } },
      { dayOfWeek: 1, dayName: 'Tuesday', isRestDay: false, workout: { name: 'Lower' } },
      { dayOfWeek: 2, dayName: 'Wednesday', isRestDay: true, workout: null },
      { dayOfWeek: 3, dayName: 'Thursday', isRestDay: false, workout: { name: 'Upper 2' } },
      { dayOfWeek: 4, dayName: 'Friday', isRestDay: false, workout: { name: 'Lower 2' } },
      { dayOfWeek: 5, dayName: 'Saturday', isRestDay: true, workout: null },
      { dayOfWeek: 6, dayName: 'Sunday', isRestDay: true, workout: null },
    ],
  },
];

const activeSchedule = {
  id: 'sched-1',
  weeklyPlanId: 'plan-1',
  weeklyPlanName: 'PPL Split',
  completedDays: 1,
  totalWorkoutDays: 3,
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('allows editing any plan while a schedule is active and disables starting non-active plans', async () => {
  axiosClient.get.mockImplementation((url) => {
    if (url === '/weekly-plans') {
      return Promise.resolve({ data: samplePlans });
    }
    if (url === '/weekly-schedules/current') {
      return Promise.resolve({ data: activeSchedule });
    }
    return Promise.resolve({ data: null });
  });

  renderWithQueryClient(<WeeklyPlanLibrary />);

  await waitFor(() => {
    expect(screen.getByText('PPL Split')).toBeInTheDocument();
  });

  expect(screen.getByText(/Active this week: "PPL Split" \(1\/3 sessions\)/i)).toBeInTheDocument();
  expect(screen.getByText('Active This Week')).toBeInTheDocument();

  const bannerBtn = document.getElementById('view-current-week-banner-btn');
  userEvent.click(bannerBtn);
  expect(mockNavigate).toHaveBeenCalledWith('/weekly-schedule');

  mockNavigate.mockClear();
  userEvent.click(document.getElementById('edit-plan-plan-1'));
  expect(mockNavigate).toHaveBeenCalledWith('/weekly-planning/plan-1');

  mockNavigate.mockClear();
  userEvent.click(document.getElementById('view-week-plan-1'));
  expect(mockNavigate).toHaveBeenCalledWith('/weekly-schedule');

  mockNavigate.mockClear();
  const editOtherBtn = document.getElementById('edit-plan-plan-2');
  expect(editOtherBtn).toBeEnabled();
  userEvent.click(editOtherBtn);
  expect(mockNavigate).toHaveBeenCalledWith('/weekly-planning/plan-2');

  const startOtherBtn = document.getElementById('start-plan-plan-2');
  expect(startOtherBtn).toBeDisabled();
  userEvent.click(startOtherBtn);
  expect(axiosClient.post).not.toHaveBeenCalled();
});

test('allows starting a plan when there is no active weekly schedule', async () => {
  axiosClient.get.mockImplementation((url) => {
    if (url === '/weekly-plans') {
      return Promise.resolve({ data: samplePlans });
    }
    if (url === '/weekly-schedules/current') {
      return Promise.resolve({ data: null });
    }
    return Promise.resolve({ data: null });
  });
  axiosClient.post.mockResolvedValue({ data: { scheduleId: 'sched-new' } });

  renderWithQueryClient(<WeeklyPlanLibrary />);

  await waitFor(() => {
    expect(screen.getByText('PPL Split')).toBeInTheDocument();
  });

  expect(document.getElementById('view-current-week-banner-btn')).not.toBeInTheDocument();

  const startBtn = document.getElementById('start-plan-plan-1');
  expect(startBtn).toBeEnabled();
  userEvent.click(startBtn);

  await waitFor(() => {
    expect(axiosClient.post).toHaveBeenCalledWith('/weekly-schedules/start', { weeklyPlanId: 'plan-1' });
  });
});
