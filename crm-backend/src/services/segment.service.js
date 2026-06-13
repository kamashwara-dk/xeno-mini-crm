'use strict';

const supabase = require('../config/supabase');

// executes the AI-generated SQL WHERE clause via the filter_customers RPC
async function resolveSegment(whereClause) {
  try {
    const { data, error } = await supabase.rpc('filter_customers', {
      where_clause: whereClause,
    });

    if (error) throw error;

    const customers = data || [];
    return { customers, count: customers.length };
  } catch (err) {
    const e = new Error(`Segment query failed: ${err.message}`);
    e.code = 'SEGMENT_QUERY_ERROR';
    throw e;
  }
}

// same as resolveSegment but returns only the count + first 5 customers for preview
async function previewSegment(whereClause) {
  const { customers, count } = await resolveSegment(whereClause);
  return {
    count,
    sampleCustomers: customers.slice(0, 5),
  };
}

module.exports = { resolveSegment, previewSegment };
