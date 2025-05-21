// Status constants for tracking test progress
export const STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Utility function to normalize scores exactly as the backend does
export const normalizeScore = (score) => {
  if (score === undefined || score === null) return null;
  
  // Convert to number if it's a string
  const numScore = typeof score === 'number' ? score : parseFloat(score);
  
  // Ensure score is within valid range (0-10)
  const clampedScore = Math.max(0, Math.min(10, numScore));
  
  // Round to one decimal place using the same algorithm as backend
  // This is equivalent to Python's round(score * 10) / 10
  return Math.round(clampedScore * 10) / 10;
};

// Utility function to format score for display
export const formatScore = (score) => {
  if (score === undefined || score === null) return 'N/A';
  return normalizeScore(score).toFixed(1);
};

// Get the appropriate CSS class for a score
export const getScoreClass = (score) => {
  if (score === undefined || score === null) return 'text-secondary-400';
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
}; 