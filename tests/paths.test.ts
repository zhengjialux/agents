import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { resolveCompaniesRoot } from '../src/paths';

describe('resolveCompaniesRoot', () => {
  it('指向包根/src/companies', () => {
    const root = resolveCompaniesRoot();
    expect(root.endsWith(path.join('src', 'companies'))).toBe(true);
  });
});
