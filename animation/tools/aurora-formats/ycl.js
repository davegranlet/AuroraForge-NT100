'use strict';

// YCL is intentionally fail-closed until a lawful fixture and oracle
// round-trip establish its section layout. This adapter still gives callers a
// stable, machine-readable result and rejects empty input.
function inspect(buffer, filename = '') {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer || []);
  if (buffer.length === 0) throw new Error('YCL input is empty');
  return {
    format: 'ycl',
    filename,
    bytes: buffer.length,
    status: 'unsupported-no-oracle',
    callable: true,
    writable: false,
    reason: 'No lawful YCL fixture/oracle round-trip is available; section layout is not claimed.',
  };
}

module.exports = { inspect };
