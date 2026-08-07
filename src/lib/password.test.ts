import { describe, expect, it } from 'vitest';
import { validatePassword, PASSWORD_HINT } from './password';

describe('validatePassword', () => {
  it('accepts anything 8 to 32 characters, with no character-class rule', () => {
    expect(validatePassword('password')).toBeNull();
    expect(validatePassword('12345678')).toBeNull();
    expect(validatePassword('a'.repeat(32))).toBeNull();
  });

  it('rejects shorter than 8 and longer than 32', () => {
    expect(validatePassword('short12')).toBe(`Password needs ${PASSWORD_HINT}.`);
    expect(validatePassword('a'.repeat(33))).not.toBeNull();
    expect(validatePassword('')).not.toBeNull();
  });

  it('counts a newline-containing password as one line, not two', () => {
    // `.` doesn't match \n, so an unanchored-per-line regex would let a
    // 40-character password through by matching only its first line.
    expect(validatePassword(`${'a'.repeat(20)}\n${'b'.repeat(20)}`)).not.toBeNull();
  });
});
