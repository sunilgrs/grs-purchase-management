import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const testDb = path.resolve(here, 'test-e2e.db').replace(/\\/g, '/');

process.env.DATABASE_URL = `file:${testDb}`;
process.env.NODE_ENV = 'test';
