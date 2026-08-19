export const isTeacherReviewed = (submission = {}) => {
  if (!submission || typeof submission !== 'object') return false;

  const hasPoints = submission.points !== null && submission.points !== undefined && submission.points !== '';
  const hasTeacherComment = typeof submission.teacher_comment === 'string'
    ? submission.teacher_comment.trim().length > 0
    : Boolean(submission.teacher_comment);

  return hasPoints || hasTeacherComment;
};
