// MVP Order Status Management
// Only these statuses are allowed: CREATED, ACCEPTED, PREPARING, READY, ASSIGNED, PICKED_UP, DELIVERED, CANCELLED

const MVP_STATUSES = {
  CREATED: 'CREATED',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

// Valid status transitions
const VALID_TRANSITIONS = {
  CREATED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['DELIVERED'],
  DELIVERED: [], // Terminal state
  CANCELLED: [] // Terminal state
};

/**
 * Validate status transition
 * @param {string} currentStatus - Current order status
 * @param {string} newStatus - Desired new status
 * @returns {Object} { valid: boolean, message: string }
 */
function validateStatusTransition(currentStatus, newStatus) {
  // Normalize statuses to uppercase
  const current = (currentStatus || '').toUpperCase();
  const next = (newStatus || '').toUpperCase();

  // Check if statuses are valid MVP statuses
  if (!Object.values(MVP_STATUSES).includes(current)) {
    return { valid: false, message: `Invalid current status: ${currentStatus}` };
  }
  if (!Object.values(MVP_STATUSES).includes(next)) {
    return { valid: false, message: `Invalid new status: ${newStatus}` };
  }

  // Check if transition is allowed
  const allowedTransitions = VALID_TRANSITIONS[current] || [];
  if (!allowedTransitions.includes(next)) {
    return {
      valid: false,
      message: `Invalid transition from ${current} to ${next}. Allowed: ${allowedTransitions.join(', ') || 'none'}`
    };
  }

  return { valid: true, message: 'Valid transition' };
}

/**
 * Map old statuses to new MVP statuses
 * @param {string} oldStatus - Old status value
 * @returns {string} MVP status
 */
function mapToMVPStatus(oldStatus) {
  if (!oldStatus) return MVP_STATUSES.CREATED;

  const status = oldStatus.toUpperCase();
  const mapping = {
    'PENDING_PAYMENT': MVP_STATUSES.CREATED,
    'PENDING': MVP_STATUSES.CREATED,
    'PAID': MVP_STATUSES.CREATED,
    'STORE_ACCEPTED': MVP_STATUSES.ACCEPTED,
    'PREPARING': MVP_STATUSES.PREPARING,
    'READY': MVP_STATUSES.READY,
    'DRIVER_ASSIGNED': MVP_STATUSES.ASSIGNED,
    'ASSIGNED': MVP_STATUSES.ASSIGNED,
    'PICKED_UP': MVP_STATUSES.PICKED_UP,
    'OUT_FOR_DELIVERY': MVP_STATUSES.PICKED_UP,
    'DELIVERED': MVP_STATUSES.DELIVERED,
    'COMPLETED': MVP_STATUSES.DELIVERED,
    'CANCELLED': MVP_STATUSES.CANCELLED,
    'REFUNDED': MVP_STATUSES.CANCELLED
  };

  return mapping[status] || MVP_STATUSES.CREATED;
}

module.exports = {
  MVP_STATUSES,
  VALID_TRANSITIONS,
  validateStatusTransition,
  mapToMVPStatus
};
