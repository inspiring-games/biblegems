import test from 'node:test';
import assert from 'node:assert/strict';
import { insertReport } from '../src/api/reporting.js';

test('returns successful insert result without retry', async () => {
  let attempts = 0;
  const reportsTable = {
    insert: async (payload) => {
      attempts += 1;
      return { data: [{ id: '1' }], error: null, payload };
    },
  };

  const result = await insertReport(reportsTable, { target_id: 'gem-1', reason: 'spam' });

  assert.equal(attempts, 1);
  assert.equal(result.payload.reason, 'spam');
});

test('retries without reporter_id when the schema rejects it', async () => {
  let attempts = 0;
  const reportsTable = {
    insert: async (payload) => {
      attempts += 1;
      if (attempts === 1) {
        return {
          error: { message: 'Could not find the reporter_id column of reports in the schema cache' },
        };
      }

      return { data: [{ id: '2' }], error: null, payload };
    },
  };

  const result = await insertReport(reportsTable, {
    target_id: 'gem-1',
    target_type: 'gem',
    reporter_id: 'user-1',
    reason: 'spam',
  });

  assert.equal(attempts, 2);
  assert.equal(result.payload.reporter_id, undefined);
  assert.equal(result.payload.reason, 'spam');
});
