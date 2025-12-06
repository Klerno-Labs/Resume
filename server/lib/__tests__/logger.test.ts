import { describe, it, expect } from '@jest/globals';
import { logger } from '../logger';

describe('Logger', () => {
  it('should have required logging methods', () => {
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('should log info messages without errors', () => {
    expect(() => {
      logger.info('Test info message');
    }).not.toThrow();
  });

  it('should log error messages with metadata', () => {
    expect(() => {
      logger.error('Test error message', {
        error: 'Test error',
        status: 500
      });
    }).not.toThrow();
  });
});
