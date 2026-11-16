/**
 * Return a localized field from an item with `translations.<lang>.<field>`,
 * falling back to the English base field when missing or empty.
 */
export function getLocalizedField(item, field, lang = 'en') {
  if (!item) return '';
  const normalizedLang = String(lang || 'en').startsWith('vi') ? 'vi' : 'en';
  if (normalizedLang === 'en') return item[field] ?? '';
  const translated = item.translations?.[normalizedLang]?.[field];
  if (Array.isArray(translated)) {
    return translated.length > 0 ? translated : (item[field] ?? []);
  }
  return translated && String(translated).trim() !== '' ? translated : (item[field] ?? '');
}

/**
 * Resolve an exercise or embedded workout snapshot against the exercises catalog
 * to return the localized exercise name.
 */
export function getLocalizedExerciseName(exerciseOrSnapshot, exercisesCatalog = [], lang = 'en') {
  if (!exerciseOrSnapshot) return '';
  if (exerciseOrSnapshot.translations) {
    return getLocalizedField(exerciseOrSnapshot, 'name', lang) || exerciseOrSnapshot.exerciseName || '';
  }
  const targetId = exerciseOrSnapshot.exerciseId || exerciseOrSnapshot.id;
  const targetName = exerciseOrSnapshot.exerciseName || exerciseOrSnapshot.name || '';
  const match = Array.isArray(exercisesCatalog)
    ? exercisesCatalog.find(
        (ex) =>
          (targetId && String(ex.id || ex._id) === String(targetId)) ||
          (targetName && ex.name?.toLowerCase() === targetName.toLowerCase())
      )
    : null;
  if (match) {
    return getLocalizedField(match, 'name', lang);
  }
  return targetName;
}

/**
 * Resolve a canonical English muscle group category name against the muscle groups catalog.
 */
export function getLocalizedMuscleGroupName(categoryName, muscleGroupsCatalog = [], lang = 'en') {
  if (!categoryName) return '';
  const normalizedLang = String(lang || 'en').startsWith('vi') ? 'vi' : 'en';
  if (normalizedLang === 'en') return categoryName;
  const match = Array.isArray(muscleGroupsCatalog)
    ? muscleGroupsCatalog.find((g) => g.name?.toLowerCase() === String(categoryName).toLowerCase())
    : null;
  return match ? getLocalizedField(match, 'name', normalizedLang) : categoryName;
}

/**
 * Translate an API error response using `error.response.data.code` via `t('errors:CODE')`,
 * falling back to the server message or `fallbackMessage`.
 */
export function getApiErrorMessage(error, t, fallbackMessage = '') {
  const code = error?.response?.data?.code;
  const serverMsg = error?.response?.data?.message || error?.message || fallbackMessage;
  if (code && typeof t === 'function') {
    const translated = t(`errors:${code}`, { defaultValue: serverMsg || code });
    if (translated && translated !== `errors:${code}`) return translated;
  }
  return serverMsg;
}
