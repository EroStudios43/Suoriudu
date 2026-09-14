export const getReviewDisplayName = ({ studentData, studentName, isAnonymous = false }) => {
  if (isAnonymous) {
    return 'Anonyymi oppilas';
  }

  if (studentData?.firstname || studentData?.lastname) {
    return `${studentData.firstname || ''} ${studentData.lastname || ''}`.trim();
  }

  return studentName || 'Oppilas';
};

export const pickRandomUnreviewedSubmission = (submissions = []) => {
  if (!Array.isArray(submissions) || submissions.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * submissions.length);
  return submissions[randomIndex];
};
