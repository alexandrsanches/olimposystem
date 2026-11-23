import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { clientesRouter, tratarErros } from './clientes.js';

export function criarApp(db) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/saude', (_req, res) => res.json({ ok: true }));
  app.use('/api/clientes', clientesRouter(db));
  app.use('/api', (_req, res) => res.status(404).json({ mensagem: 'Rota não encontrada.' }));

  // Em produção, serve o front-end já compilado (web/dist).
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use(tratarErros);
  return app;
}
