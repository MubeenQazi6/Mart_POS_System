import assert from 'node:assert/strict';
import { sanitizeNonNegativeInput, isValidNonNegativeNumber } from '../src/shared/utils/validation';

assert.equal(sanitizeNonNegativeInput('-1'), '');
assert.equal(sanitizeNonNegativeInput('-100.50'), '');
assert.equal(sanitizeNonNegativeInput('0.25'), '0.25');
assert.equal(sanitizeNonNegativeInput('100'), '100');
assert.equal(isValidNonNegativeNumber('-1'), false);
assert.equal(isValidNonNegativeNumber('0'), true);
assert.equal(isValidNonNegativeNumber('12.5'), true);

console.log('negative-input validation checks passed');
