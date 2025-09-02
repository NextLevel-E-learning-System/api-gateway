// Import ESM precisa da extensão .js após transpilação
import { createServer } from './server.js';
import { config } from 'dotenv';
config();

const port = Number(process.env.PORT || 3333);
const app = createServer();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api-gateway] listening on port ${port}`);
});