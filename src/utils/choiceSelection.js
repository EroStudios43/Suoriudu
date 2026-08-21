export const normalizeChoiceSelection = (rawValue) => {
  if (rawValue === null || rawValue === undefined || rawValue === "") return [];

  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
  }

  if (typeof rawValue === "number") {
    return [rawValue];
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
      }
      if (typeof parsed === "number") {
        return [parsed];
      }
      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.selectedAnswers)) {
          return parsed.selectedAnswers.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
        }
        if (Array.isArray(parsed.selectedAnswer)) {
          return parsed.selectedAnswer.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
        }
        if (parsed.selectedAnswer !== undefined && parsed.selectedAnswer !== null && parsed.selectedAnswer !== "") {
          const selection = Number(parsed.selectedAnswer);
          return Number.isNaN(selection) ? [] : [selection];
        }
      }
    } catch (error) {
      // Fall through to legacy string parsing below.
    }

    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => !Number.isNaN(item));
    }

    const number = Number(trimmed);
    return Number.isNaN(number) ? [] : [number];
  }

  if (typeof rawValue === "object") {
    if (Array.isArray(rawValue.selectedAnswers)) {
      return rawValue.selectedAnswers.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
    }
    if (Array.isArray(rawValue.selectedAnswer)) {
      return rawValue.selectedAnswer.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
    }
    if (rawValue.selectedAnswer !== undefined && rawValue.selectedAnswer !== null && rawValue.selectedAnswer !== "") {
      const selection = Number(rawValue.selectedAnswer);
      return Number.isNaN(selection) ? [] : [selection];
    }
  }

  return [];
};
