import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Automatically cleanup rendered components after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
});
