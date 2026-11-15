import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiCoachWidget from './AiCoachWidget';
import { useAuth } from '../hooks/useAuth';
import { aiAPI } from '../api';

jest.mock('../hooks/useAuth');
jest.mock('../api', () => ({
  aiAPI: {
    chat: jest.fn(),
    getConversations: jest.fn(),
    getConversation: jest.fn(),
    deleteConversation: jest.fn(),
    getMemories: jest.fn(),
    deleteMemory: jest.fn(),
    applyPlan: jest.fn(),
    getMcpKeyStatus: jest.fn(),
    generateMcpKey: jest.fn(),
    revokeMcpKey: jest.fn()
  }
}));

const mockNavigate = jest.fn();
jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate
  }),
  { virtual: true }
);

describe('AiCoachWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiAPI.getConversations.mockResolvedValue([]);
    aiAPI.getMemories.mockResolvedValue([]);
    aiAPI.getMcpKeyStatus.mockResolvedValue({ hasKey: false, keyPrefix: null });
  });

  test('renders nothing when user is unauthenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, user: null });
    const { container } = render(<AiCoachWidget />);
    expect(container.firstChild).toBeNull();
  });

  test('opens drawer, sends chat message, renders toolTrace & draftPlan card, and calls applyPlan', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'u1', name: 'Quang' }
    });

    aiAPI.chat.mockResolvedValue({
      conversationId: 'conv-1',
      userMessage: {
        id: 'm-user',
        role: 'user',
        text: 'Build a new weekly workout schedule'
      },
      assistantMessage: {
        id: 'm-ai',
        role: 'assistant',
        text: 'Here is your 4-day Upper/Lower schedule!',
        toolTrace: [
          { name: 'search_exercises', status: 'ok' },
          { name: 'propose_weekly_plan', status: 'ok' }
        ],
        draftPlan: {
          mode: 'create_schedule',
          plan: {
            name: 'Upper Lower 4-Day',
            description: 'Hypertrophy focus',
            days: [
              {
                dayOfWeek: 0,
                dayName: 'Monday',
                isRestDay: false,
                workout: {
                  name: 'Upper A',
                  exercises: [
                    {
                      exerciseId: 'ex1',
                      exerciseName: 'Bench Press',
                      category: 'Chest',
                      sets: [{ setNumber: 1, targetReps: 8, targetWeight: 60 }]
                    }
                  ]
                }
              },
              { dayOfWeek: 1, dayName: 'Tuesday', isRestDay: true, workout: null },
              { dayOfWeek: 2, dayName: 'Wednesday', isRestDay: true, workout: null },
              { dayOfWeek: 3, dayName: 'Thursday', isRestDay: true, workout: null },
              { dayOfWeek: 4, dayName: 'Friday', isRestDay: true, workout: null },
              { dayOfWeek: 5, dayName: 'Saturday', isRestDay: true, workout: null },
              { dayOfWeek: 6, dayName: 'Sunday', isRestDay: true, workout: null }
            ]
          },
          appliedAt: null
        }
      },
      memoriesUpdated: false
    });

    aiAPI.applyPlan.mockResolvedValue({
      message: 'New weekly plan and schedule started successfully',
      mode: 'create_schedule',
      planId: 'plan-123',
      scheduleId: 'sched-456'
    });

    render(<AiCoachWidget />);

    // Open floating widget
    const triggerBtn = screen.getByLabelText(/Open AI Coach/i);
    fireEvent.click(triggerBtn);

    // Click quick prompt or send input
    const input = screen.getByPlaceholderText(/Ask AI Coach/i);
    fireEvent.change(input, { target: { value: 'Build a new weekly workout schedule' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText('Upper Lower 4-Day')).toBeInTheDocument();
    });

    expect(screen.getByText('search_exercises')).toBeInTheDocument();
    expect(screen.getByText('propose_weekly_plan')).toBeInTheDocument();

    // Confirm and apply draft schedule
    expect(screen.getByRole('button', { name: /Save to Library/i })).toBeInTheDocument();
    const applyBtn = screen.getByRole('button', { name: /Apply New Schedule/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(aiAPI.applyPlan).toHaveBeenCalledWith('conv-1', 'm-ai', 'activate_schedule');
    });
  });

  test('MCP Access Key section generates, copies, and revokes key in memories tab', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'u1', name: 'Quang' }
    });

    aiAPI.getMcpKeyStatus.mockResolvedValue({ hasKey: false, keyPrefix: null });
    aiAPI.generateMcpKey.mockResolvedValue({
      apiKey: 'ftk_secret_1234567890abcdef',
      keyPrefix: 'ftk_secret_1',
      createdAt: new Date().toISOString()
    });
    aiAPI.revokeMcpKey.mockResolvedValue({
      message: 'MCP API key revoked successfully'
    });

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    });

    render(<AiCoachWidget />);
    fireEvent.click(screen.getByLabelText(/Open AI Coach/i));

    // Switch to memories tab
    const memoriesTabBtn = screen.getByTitle(/Saved Fitness Memories/i);
    fireEvent.click(memoriesTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/MCP Access Key/i)).toBeInTheDocument();
    });

    // Click generate key
    const generateBtn = screen.getByRole('button', { name: /Generate MCP Key/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(aiAPI.generateMcpKey).toHaveBeenCalled();
      expect(screen.getByText('ftk_secret_1234567890abcdef')).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /Copy MCP Key/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ftk_secret_1234567890abcdef');
  });

  test('displays existing active MCP key and allows revoking', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'u1', name: 'Quang' }
    });

    aiAPI.getMcpKeyStatus.mockResolvedValue({
      hasKey: true,
      keyPrefix: 'ftk_existing...'
    });
    aiAPI.revokeMcpKey.mockResolvedValue({
      message: 'MCP API key revoked successfully'
    });

    render(<AiCoachWidget />);
    fireEvent.click(screen.getByLabelText(/Open AI Coach/i));

    const memoriesTabBtn = screen.getByTitle(/Saved Fitness Memories/i);
    fireEvent.click(memoriesTabBtn);

    await waitFor(() => {
      expect(screen.getByText('ftk_existing...')).toBeInTheDocument();
    });

    const revokeBtn = screen.getByRole('button', { name: /Revoke/i });
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(aiAPI.revokeMcpKey).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Generate MCP Key/i })).toBeInTheDocument();
    });
  });

  test('handles conversation history and memory deletion', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'u1', name: 'Quang' }
    });

    aiAPI.getConversations.mockResolvedValue([
      { id: 'c1', title: 'Chest day optimization', messageCount: 4 }
    ]);
    aiAPI.getConversation.mockResolvedValue({
      id: 'c1',
      title: 'Chest day optimization',
      messages: [
        { id: 'm1', role: 'user', text: 'How is my bench progress?' },
        { id: 'm2', role: 'assistant', text: 'You hit 100kg last week!' }
      ]
    });
    aiAPI.deleteConversation.mockResolvedValue({ message: 'Deleted' });
    aiAPI.getMemories.mockResolvedValue([
      { id: 'mem1', category: 'injuries', key: 'Left shoulder impingement', value: 'Avoid behind-the-neck press' }
    ]);
    aiAPI.deleteMemory.mockResolvedValue({ message: 'Deleted' });

    render(<AiCoachWidget />);
    fireEvent.click(screen.getByLabelText(/Open AI Coach/i));

    // Open history tab
    fireEvent.click(screen.getByTitle(/Conversation History/i));

    await waitFor(() => {
      expect(screen.getByText('Chest day optimization')).toBeInTheDocument();
    });

    // Select conversation
    fireEvent.click(screen.getByText('Chest day optimization'));
    await waitFor(() => {
      expect(screen.getByText('How is my bench progress?')).toBeInTheDocument();
      expect(screen.getByText('You hit 100kg last week!')).toBeInTheDocument();
    });

    // Switch to memories and delete memory
    fireEvent.click(screen.getByTitle(/Saved Fitness Memories/i));
    await waitFor(() => {
      expect(screen.getByText(/Left shoulder impingement/i)).toBeInTheDocument();
    });

    const deleteMemBtn = screen.getByLabelText(/Delete memory Left shoulder impingement/i);
    fireEvent.click(deleteMemBtn);
    await waitFor(() => {
      expect(aiAPI.deleteMemory).toHaveBeenCalledWith('mem1');
    });
  });

  test('renders collapsible grounded citations with safe DOI links on assistant messages', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'u1', name: 'Quang' }
    });

    aiAPI.chat.mockResolvedValue({
      conversationId: 'conv-rag',
      userMessage: {
        id: 'm-u1',
        role: 'user',
        text: 'How much protein per day for hypertrophy?'
      },
      assistantMessage: {
        id: 'm-a1',
        role: 'assistant',
        text: 'Aim for 1.4 to 2.0 g/kg/day [1].',
        toolTrace: [{ name: 'search_fitness_knowledge', status: 'ok' }],
        citations: [
          {
            citationNumber: 1,
            chunkId: 'issn-protein#0',
            sourceId: 'issn-protein-and-exercise-2017',
            title: 'Protein and Macronutrient Guidelines',
            topic: 'nutrition',
            authors: 'Jager et al.',
            year: 2017,
            section: 'Daily Protein Targets',
            excerpt: 'Overall daily protein intake of 1.4 to 2.0 g/kg/day is sufficient.',
            references: [
              {
                label: 'ISSN Position Stand (2017)',
                doi: '10.1186/s12970-017-0177-8',
                url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8'
              }
            ]
          },
          {
            citationNumber: 2,
            chunkId: 'unsafe#0',
            sourceId: 'unsafe-src',
            title: 'Fallback Unlinked Study',
            topic: 'training',
            authors: 'ACSM',
            year: 2009,
            section: 'Volume',
            excerpt: 'Volume guideline snippet.',
            references: [
              {
                label: 'Blocked Bad Scheme',
                url: 'javascript:alert(1)'
              }
            ]
          }
        ]
      },
      memoriesUpdated: false
    });

    render(<AiCoachWidget />);
    fireEvent.click(screen.getByLabelText(/Open AI Coach/i));

    const input = screen.getByPlaceholderText(/Ask AI Coach/i);
    fireEvent.change(input, { target: { value: 'How much protein per day for hypertrophy?' } });
    fireEvent.submit(input.closest('form'));

    const toggleBtn = await screen.findByRole('button', { name: /Sources \(2\)/i });
    expect(screen.getByText('search_fitness_knowledge')).toBeInTheDocument();
    expect(screen.queryByText('Daily Protein Targets')).not.toBeInTheDocument();

    fireEvent.click(toggleBtn);

    expect(screen.getByText('Protein and Macronutrient Guidelines')).toBeInTheDocument();
    expect(screen.getByText('Daily Protein Targets')).toBeInTheDocument();
    expect(screen.getByText(/Jager et al\. \(2017\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.4 to 2\.0 g\/kg\/day is sufficient/i)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /ISSN Position Stand \(2017\)/i });
    expect(link).toHaveAttribute('href', 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8');
    expect(link).toHaveAttribute('target', '_blank');

    expect(screen.queryByRole('link', { name: /Blocked Bad Scheme/i })).not.toBeInTheDocument();
  });
});
