import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MCPClientError } from './errors.js';

describe('MCPClientError', () => {
  it('sets name, code, and optional cause', () => {
    const inner = new Error('inner');
    const err = new MCPClientError('outer', 'CONNECTION_FAILED', { cause: inner });
    assert.equal(err.name, 'MCPClientError');
    assert.equal(err.message, 'outer');
    assert.equal(err.code, 'CONNECTION_FAILED');
    assert.equal(err.cause, inner);
  });

  it('is instanceof Error', () => {
    const err = new MCPClientError('x', 'SERVER_NOT_FOUND');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof MCPClientError);
  });
});
