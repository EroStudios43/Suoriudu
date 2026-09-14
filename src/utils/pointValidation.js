export const normalizeTeacherPoints = (value, maxPoints = 0) => {
  const safeMax = Number.isFinite(Number(maxPoints)) ? Number(maxPoints) : 0;
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  const clamped = Math.min(Math.max(0, numericValue), safeMax);
  const rounded = Math.round((clamped / 0.5)) * 0.5;

  return Number(Math.min(Math.max(0, rounded), safeMax).toFixed(2));
};

export const clampTeacherPoints = (value, maxPoints = 0) => {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '';
  }

  const normalized = normalizeTeacherPoints(numericValue, maxPoints);
  return Number.isFinite(normalized) ? normalized : '';
};
