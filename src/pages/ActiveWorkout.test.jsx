import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// react-router-dom is mapped to a test double (see package.json moduleNameMapper).
import { setMockParams } from 'react-router-dom';
import ActiveWorkout from './ActiveWorkout';
import axiosClient from '../api/axiosClient';

jest.mock('../api/axiosClient', () => ({
    __esModule: true,
    default: { get: jest.fn(), put: jest.fn(), patch: jest.fn(), post: jest.fn() },
}));

// GET /api/exercises maps _id -> id and explicitly blanks _id, so the catalogue
// the modal renders has no _id at all. Mirrored here exactly: reading _id was
// the bug.
const catalogue = [
    { id: 'cat-squat', name: 'Squat', category: 'Legs' },
    { id: 'cat-curl', name: 'Bicep Curl', category: 'Biceps' },
];

// Three per-set targets from the plan AND targetSets: 3, with two sets logged.
// This is the shape that rendered "2/3" and kept saying 3 after a cut to 2.
const buildSession = () => ({
    _id: 'sess-1',
    name: 'Push Day',
    status: 'in_progress',
    exercises: [{
        exerciseId: 'ex-bench',
        exerciseName: 'Bench Press',
        category: 'Chest',
        targetSets: 3,
        targetReps: 10,
        targetWeight: 60,
        sets: [
            { setNumber: 1, targetReps: 10, targetWeight: 60 },
            { setNumber: 2, targetReps: 10, targetWeight: 60 },
            { setNumber: 3, targetReps: 10, targetWeight: 60 },
        ],
        actualSets: [
            { setNumber: 1, reps: 10, weight: 60, completed: true },
            { setNumber: 2, reps: 10, weight: 60, completed: true },
        ],
    }],
});

const renderWorkout = async (session = buildSession()) => {
    axiosClient.get.mockImplementation((url) =>
        url === '/exercises'
            ? Promise.resolve({ data: catalogue })
            : Promise.resolve({ data: session }));
    axiosClient.put.mockResolvedValue({ data: {} });
    axiosClient.patch.mockResolvedValue({ data: {} });

    render(<ActiveWorkout />);
    // The session title, not the exercise name -- "Bench Press" renders both in
    // the current-exercise card and in the exercise list beneath it.
    await screen.findByText('Push Day');
};

// "2/3" also appears in the exercise list under the card, so read the card's
// counter through the "sets done" caption it sits next to.
const setsDone = () => screen.getByText('sets done').previousElementSibling.textContent;

// The set-count spinner in the Manage modal, read off the "+" button beside it.
const modalSetCount = (name = /add a set to bench press/i) =>
    screen.getByRole('button', { name }).previousElementSibling.textContent;

// Opens the Manage Exercises modal.
const openManageModal = async () => {
    userEvent.click(screen.getByRole('button', { name: /manage/i }));
    await screen.findByText('Manage Exercises');
};

beforeEach(() => {
    jest.clearAllMocks();
    setMockParams({ id: 'sess-1' });
    jest.spyOn(window, 'alert').mockImplementation(() => { });
});

afterEach(() => {
    window.alert.mockRestore();
});

describe('editing the set count', () => {
    test('lowering sets from 3 to 2 moves the denominator, not just the checklist', async () => {
        await renderWorkout();

        expect(setsDone()).toBe('2/3');

        await openManageModal();
        userEvent.click(screen.getByRole('button', { name: /remove a set from bench press/i }));

        // Was "2/3": the counter read exercise.sets.length while the checklist
        // read targetSets, so only the checklist shrank.
        await waitFor(() => expect(setsDone()).toBe('2/2'));
    });

    test('an exercise cut to its completed set count now counts as complete', async () => {
        await renderWorkout();

        expect(screen.getByText('0/1 exercises done')).toBeInTheDocument();

        await openManageModal();
        userEvent.click(screen.getByRole('button', { name: /remove a set from bench press/i }));

        await waitFor(() =>
            expect(screen.getByText('1/1 exercises done')).toBeInTheDocument());
    });

    test('lowering past a logged set discards it rather than reading "3/2"', async () => {
        const session = buildSession();
        session.exercises[0].actualSets.push({ setNumber: 3, reps: 10, weight: 60, completed: true });

        await renderWorkout(session);
        expect(setsDone()).toBe('3/3');

        await openManageModal();
        userEvent.click(screen.getByRole('button', { name: /remove a set from bench press/i }));

        // The third logged set is discarded with the third set, so this reads
        // "2/2" rather than the nonsensical "3/2".
        await waitFor(() => expect(setsDone()).toBe('2/2'));
    });

    test('the set count shown in the modal tracks the edits', async () => {
        await renderWorkout();
        await openManageModal();

        expect(modalSetCount()).toBe('3');

        userEvent.click(screen.getByRole('button', { name: /add a set to bench press/i }));
        await waitFor(() => expect(modalSetCount()).toBe('4'));
        expect(setsDone()).toBe('2/4');

        userEvent.click(screen.getByRole('button', { name: /remove a set from bench press/i }));
        await waitFor(() => expect(modalSetCount()).toBe('3'));
    });
});

describe('adding exercises', () => {
    test('a second exercise can be added (ids are read from `id`, not `_id`)', async () => {
        await renderWorkout();
        await openManageModal();

        const addButtons = screen.getAllByRole('button', { name: /^add$/i });
        userEvent.click(addButtons[0]); // Squat
        userEvent.click(addButtons[1]); // Bicep Curl

        // Every added exercise used to be stored with exerciseId: undefined, and
        // the duplicate check compared undefined === undefined -- true -- so the
        // first add made every later one report "Exercise already added".
        expect(window.alert).not.toHaveBeenCalled();

        const current = screen.getByText('// Current Exercises').closest('div').parentElement;
        expect(within(current).getByText('Squat')).toBeInTheDocument();
        expect(within(current).getByText('Bicep Curl')).toBeInTheDocument();
    });

    test('added exercises carry a real exerciseId through to the save', async () => {
        await renderWorkout();
        await openManageModal();

        userEvent.click(screen.getAllByRole('button', { name: /^add$/i })[0]);
        userEvent.click(screen.getByRole('button', { name: /save changes/i }));

        await waitFor(() => expect(axiosClient.put).toHaveBeenCalled());
        const { exercises } = axiosClient.put.mock.calls.at(-1)[1];
        expect(exercises.find(e => e.exerciseName === 'Squat').exerciseId).toBe('cat-squat');
    });

    test('a genuine duplicate is still rejected', async () => {
        await renderWorkout();
        await openManageModal();

        const addSquat = screen.getAllByRole('button', { name: /^add$/i })[0];
        userEvent.click(addSquat);
        userEvent.click(addSquat);

        expect(window.alert).toHaveBeenCalledWith('Exercise already added');
    });
});
