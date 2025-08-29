const STATUSES = ['Wishlist','Applied','OA','Phone','Onsite','Offer','Rejected'];

// Normalize/guard status values
export function sanitizeStatus(s) {
  return STATUSES.includes(s) ? s : 'Applied';
}
export { STATUSES };
