import { describe, expect, it } from 'vitest';
import { humanizeCallbackError } from './auth-errors';

describe('humanizeCallbackError', () => {
  it('explains an invalid or expired reset link', () => {
    expect(humanizeCallbackError('reset_link_invalid')).toMatch(/expired|already used/);
  });

  it('returns null for unrecognized or missing codes', () => {
    expect(humanizeCallbackError(null)).toBeNull();
    expect(humanizeCallbackError('something_else')).toBeNull();
  });
});
