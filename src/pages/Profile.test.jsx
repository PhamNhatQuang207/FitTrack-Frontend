import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Profile from './Profile';
import { useAuth } from '../hooks/useAuth';
import axiosClient from '../api/axiosClient';
import { renderWithQueryClient } from '../test-utils/queryTestUtils';

jest.mock('../hooks/useAuth');
jest.mock('../api/axiosClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockProgress = {
  name: 'Test Athlete',
  age: 25,
  sex: 'Male',
  height: 175,
  weightHistory: [{ value: 70 }],
  bodyFatHistory: [{ value: 15 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({
    user: { name: 'Test Athlete', email: 'test@example.com' },
    logout: jest.fn(),
    updateUser: jest.fn(),
  });
  axiosClient.get.mockResolvedValue({ data: mockProgress });
});

afterEach(() => {
  jest.useRealTimers();
});

test('opens feedback modal with accessibility attributes, char counter, AI Coach option, and closes on Escape', async () => {
  renderWithQueryClient(<Profile />);

  const feedbackBtn = await screen.findByRole('button', { name: /developer feedback/i });
  userEvent.click(feedbackBtn);

  const dialog = screen.getByRole('dialog');
  expect(dialog).toBeInTheDocument();
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(screen.getByText('0 / 1000 chars')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'AI Coach' })).toBeInTheDocument();

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('shows validation error and skips API when submitting fewer than 3 non-whitespace characters', async () => {
  renderWithQueryClient(<Profile />);

  userEvent.click(await screen.findByRole('button', { name: /developer feedback/i }));

  const textarea = screen.getByLabelText(/feedback message/i);
  userEvent.type(textarea, 'hi');
  userEvent.click(screen.getByRole('button', { name: /send feedback/i }));

  expect(screen.getByText(/please enter feedback content \(at least 3 characters\)/i)).toBeInTheDocument();
  expect(axiosClient.post).not.toHaveBeenCalled();
});

test('submits valid feedback with selected screen and trimmed content', async () => {
  axiosClient.post.mockResolvedValue({
    data: { message: 'Feedback submitted successfully', feedbackId: 'fb-1' },
  });

  renderWithQueryClient(<Profile />);

  userEvent.click(await screen.findByRole('button', { name: /developer feedback/i }));

  const screenSelect = screen.getByLabelText(/select screen/i);
  userEvent.selectOptions(screenSelect, 'AI Coach');

  const textarea = screen.getByLabelText(/feedback message/i);
  userEvent.type(textarea, '  Great AI workout suggestions!  ');
  expect(screen.getByText('33 / 1000 chars')).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: /send feedback/i }));

  await waitFor(() => {
    expect(axiosClient.post).toHaveBeenCalledWith('/feedbacks', {
      screen: 'AI Coach',
      content: 'Great AI workout suggestions!',
    });
  });

  expect(await screen.findByText(/thank you! your feedback has been sent/i)).toBeInTheDocument();
});

test('cancels pending auto-close timer when modal is closed and reopened before 1800ms', async () => {
  axiosClient.post.mockResolvedValue({
    data: { message: 'Feedback submitted successfully', feedbackId: 'fb-2' },
  });

  renderWithQueryClient(<Profile />);

  const feedbackBtn = await screen.findByRole('button', { name: /developer feedback/i });
  jest.useFakeTimers();

  fireEvent.click(feedbackBtn);
  fireEvent.change(screen.getByLabelText(/feedback message/i), {
    target: { value: 'Helpful progress charts!' },
  });
  fireEvent.click(screen.getByRole('button', { name: /send feedback/i }));

  await waitFor(() => {
    expect(screen.getByText(/thank you! your feedback has been sent/i)).toBeInTheDocument();
  });

  // Close and quickly reopen before the 1800ms auto-close timer fires.
  fireEvent.click(screen.getByRole('button', { name: /close feedback dialog/i }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  fireEvent.click(feedbackBtn);
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  act(() => {
    jest.advanceTimersByTime(2000);
  });

  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('displays errorFailed fallback when API error lacks code and message', async () => {
  axiosClient.post.mockRejectedValue({});

  renderWithQueryClient(<Profile />);

  userEvent.click(await screen.findByRole('button', { name: /developer feedback/i }));

  const textarea = screen.getByLabelText(/feedback message/i);
  userEvent.type(textarea, 'Valid feedback content');
  userEvent.click(screen.getByRole('button', { name: /send feedback/i }));

  expect(await screen.findByText(/failed to send feedback\. please try again\./i)).toBeInTheDocument();
  expect(screen.queryByText(/at least 3 characters/i)).not.toBeInTheDocument();
});
