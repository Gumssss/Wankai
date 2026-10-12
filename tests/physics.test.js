import { test } from 'node:test';
import { cases } from './physics-cases.js';

for (const [name, run] of cases) test(name, run);
