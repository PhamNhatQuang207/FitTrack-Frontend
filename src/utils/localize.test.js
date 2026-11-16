import {
  getLocalizedField,
  getLocalizedExerciseName,
  getLocalizedMuscleGroupName,
  getApiErrorMessage,
} from './localize';

describe('localize utilities', () => {
  const catalogExercise = {
    id: 'ex-1',
    name: 'Bench Press',
    instructions: ['Lie down', 'Press up'],
    translations: { vi: { name: 'Đẩy ngực ngang', instructions: [] } },
  };

  test('getLocalizedField returns English field when lang=en and Vietnamese when lang=vi', () => {
    expect(getLocalizedField(catalogExercise, 'name', 'en')).toBe('Bench Press');
    expect(getLocalizedField(catalogExercise, 'name', 'vi')).toBe('Đẩy ngực ngang');
  });

  test('getLocalizedField falls back to English when Vietnamese translation is missing or empty', () => {
    expect(getLocalizedField(catalogExercise, 'instructions', 'vi')).toEqual(['Lie down', 'Press up']);
    expect(getLocalizedField({ name: 'Squat' }, 'name', 'vi')).toBe('Squat');
  });

  test('getLocalizedExerciseName resolves embedded workout snapshot against catalog', () => {
    const snapshot = { exerciseId: 'ex-1', exerciseName: 'Bench Press', category: 'Chest' };
    expect(getLocalizedExerciseName(snapshot, [catalogExercise], 'vi')).toBe('Đẩy ngực ngang');
    expect(getLocalizedExerciseName(snapshot, [], 'vi')).toBe('Bench Press');
  });

  test('getLocalizedMuscleGroupName resolves canonical English category via muscle groups catalog', () => {
    const groups = [{ name: 'Chest', translations: { vi: { name: 'Ngực' } } }];
    expect(getLocalizedMuscleGroupName('Chest', groups, 'vi')).toBe('Ngực');
    expect(getLocalizedMuscleGroupName('Chest', groups, 'en')).toBe('Chest');
  });

  test('getApiErrorMessage translates known error code and falls back to server message', () => {
    const t = (key, opts) =>
      key === 'errors:AUTH_INVALID_CREDENTIALS' ? 'Sai email hoặc mật khẩu' : opts?.defaultValue;
    expect(
      getApiErrorMessage({ response: { data: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' } } }, t)
    ).toBe('Sai email hoặc mật khẩu');
    expect(
      getApiErrorMessage({ response: { data: { message: 'Custom server error' } } }, t)
    ).toBe('Custom server error');
  });
});
