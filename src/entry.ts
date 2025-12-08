// main.ts (or your main server entry point)
import { serve } from '@hono/node-server';
import app from './server'; 

const port = 3000;
console.log(`Hono server running on http://localhost:${port}`);

serve({
  fetch: app.fetch, 
  port,
});