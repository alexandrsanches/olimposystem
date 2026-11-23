import { openDb } from './db.js';
import { criarApp } from './app.js';

const port = Number(process.env.PORT) || 3333;
criarApp(openDb()).listen(port, () => console.log(`Olimpo API em http://localhost:${port}`));
