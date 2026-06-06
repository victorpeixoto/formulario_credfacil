import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chamarComRetry, GeminiQuotaError } from '@/lib/ai/gemini';

test('chamarComRetry esgota 429 em tres tentativas e lanca GeminiQuotaError', async () => {
  let chamadas = 0;

  await assert.rejects(
    chamarComRetry(async () => {
      chamadas += 1;
      throw new Error('429 RESOURCE_EXHAUSTED: credits are depleted');
    }, 0, 1),
    GeminiQuotaError
  );

  assert.equal(chamadas, 3);
});

