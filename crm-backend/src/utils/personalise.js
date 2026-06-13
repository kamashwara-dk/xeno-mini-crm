'use strict';

/**
 * personalise(template, customer)
 *
 * Replaces merge fields in a message template with real customer data.
 * Supported merge fields:
 *   {{name}}                 → customer's first name
 *   {{total_spend}}          → ₹X,XX,XXX (Indian locale)
 *   {{days_since_last_order}} → integer
 *   {{order_count}}          → integer
 *
 * @param {string} template
 * @param {object} customer  — row from the customers table
 * @returns {string}
 */
const personalise = (template, customer) =>
  template
    .replace(/\{\{name\}\}/g, customer.name.split(' ')[0])
    .replace(
      /\{\{total_spend\}\}/g,
      `₹${Number(customer.total_spend).toLocaleString('en-IN')}`
    )
    .replace(/\{\{days_since_last_order\}\}/g, customer.days_since_last_order)
    .replace(/\{\{order_count\}\}/g, customer.order_count);

module.exports = { personalise };
