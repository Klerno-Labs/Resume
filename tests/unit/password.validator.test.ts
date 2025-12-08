import { describe, it, expect } from 'vitest';
import { passwordSchema } from '../../shared/validators';

describe('Password Validation', () => {
  it('should accept strong passwords', () => {
    const validPasswords = [
      'SecurePass123!',
      'MyP@ssw0rd2024',
      'C0mplex!Pass',
      'Tr0ng_P@ssw0rd',
    ];

    validPasswords.forEach(password => {
      expect(() => passwordSchema.parse(password)).not.toThrow();
    });
  });

  it('should reject passwords shorter than 12 characters', () => {
    expect(() => passwordSchema.parse('Short1!')).toThrow('at least 12 characters');
  });

  it('should reject passwords without uppercase', () => {
    expect(() => passwordSchema.parse('lowercase123!')).toThrow('uppercase letter');
  });

  it('should reject passwords without lowercase', () => {
    expect(() => passwordSchema.parse('UPPERCASE123!')).toThrow('lowercase letter');
  });

  it('should reject passwords without numbers', () => {
    expect(() => passwordSchema.parse('NoNumbers!!')).toThrow('number');
  });

  it('should reject passwords without special characters', () => {
    expect(() => passwordSchema.parse('NoSpecial123')).toThrow('special character');
  });

  it('should reject common weak passwords', () => {
    expect(() => passwordSchema.parse('Password123!')).toThrow('weak patterns');
    expect(() => passwordSchema.parse('Qwerty123456!')).toThrow('weak patterns');
  });
});
