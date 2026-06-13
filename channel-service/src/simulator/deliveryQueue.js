'use strict';

const { resolve }       = require('./outcomeEngine');
const { sendCallback }  = require('../utils/callbackSender');

// schedules async delivery simulation for a batch — returns immediately
function enqueue(communications, crmCallbackUrl) {
  for (const comm of communications) {
    const channel  = comm.channel || 'whatsapp';
    const outcomes = resolve(channel);

    for (const { status, delayMs } of outcomes) {
      // Each outcome fires independently at its cumulative delay
      setTimeout(() => {
        sendCallback(crmCallbackUrl, {
          commId:    comm.commId,
          status,
          timestamp: new Date().toISOString(),
        }).catch((err) => {
          // sendCallback never throws, but guard anyway
          console.error(`[deliveryQueue] Unhandled error for ${comm.commId}: ${err.message}`);
        });
      }, delayMs);
    }
  }

  console.log(`[deliveryQueue] Enqueued ${communications.length} communications`);
}

module.exports = { enqueue };
