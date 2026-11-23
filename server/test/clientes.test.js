import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { criarApp } from '../src/app.js';
import { cpfValido } from '../src/validacao.js';
import { idade } from '../src/clientes.js';

let server;
let base;

before(async () => {
  server = criarApp(openDb(':memory:')).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const api = async (method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  return { status: res.status, body: txt ? JSON.parse(txt) : null };
};

test('valida CPF pelos dígitos verificadores', () => {
  assert.equal(cpfValido('529.982.247-25'), true);
  assert.equal(cpfValido('529.982.247-24'), false);
  assert.equal(cpfValido('111.111.111-11'), false);
});

test('calcula idade considerando o aniversário', () => {
  const hoje = new Date('2026-11-23T12:00:00Z');
  assert.equal(idade('2000-11-23', hoje), 26);
  assert.equal(idade('2000-11-24', hoje), 25);
  assert.equal(idade(null, hoje), null);
});

test('cria, busca, edita e lista cliente', async () => {
  const criado = await api('POST', '/clientes', {
    nome: '  Maria Silva ', cpf: '529.982.247-25', telefone: '(11) 98888-7777', sexo: 'F',
    dataNascimento: '1990-05-10', email: 'maria@exemplo.com', status: 'Ativo',
  });
  assert.equal(criado.status, 201);
  assert.equal(criado.body.nome, 'Maria Silva');
  assert.equal(criado.body.cpf, '52998224725');
  assert.equal(criado.body.telefone, '11988887777');

  const id = criado.body.id;
  const edit = await api('PUT', `/clientes/${id}`, { vip: true, objetivo: 'Hipertrofia' });
  assert.equal(edit.status, 200);
  assert.equal(edit.body.vip, true);
  assert.equal(edit.body.nome, 'Maria Silva', 'update parcial preserva campos');

  const busca = await api('GET', '/clientes?busca=52998');
  assert.equal(busca.body.total, 1);
  const porNome = await api('GET', '/clientes?busca=maria&status=Ativo&vip=true');
  assert.equal(porNome.body.items[0].id, id);
  const outroStatus = await api('GET', '/clientes?status=Inativo');
  assert.equal(outroStatus.body.total, 0);
});

test('rejeita dados inválidos e CPF duplicado', async () => {
  const inval = await api('POST', '/clientes', { nome: '', cpf: '123', email: 'x', status: 'Xpto' });
  assert.equal(inval.status, 422);
  assert.ok(inval.body.erros.nome && inval.body.erros.cpf && inval.body.erros.email && inval.body.erros.status);

  await api('POST', '/clientes', { nome: 'A', cpf: '168.995.350-09' });
  const dup = await api('POST', '/clientes', { nome: 'B', cpf: '16899535009' });
  assert.equal(dup.status, 409);
});

test('remove, restaura e anonimiza (LGPD)', async () => {
  const { body: c } = await api('POST', '/clientes', { nome: 'João Teste', email: 'joao@exemplo.com', telefone: '11977776666' });
  await api('POST', `/clientes/${c.id}/contatos`, { tipo: 'WhatsApp', descricao: '11977776666' });

  assert.equal((await api('DELETE', `/clientes/${c.id}`)).status, 204);
  assert.equal((await api('GET', '/clientes?busca=João Teste')).body.total, 0);
  assert.equal((await api('GET', '/clientes?busca=João Teste&removidos=true')).body.total, 1);

  const rest = await api('POST', `/clientes/${c.id}/restaurar`);
  assert.equal(rest.body.removido, false);

  const anon = await api('POST', `/clientes/${c.id}/anonimizar`);
  assert.equal(anon.body.anonimizado, true);
  assert.equal(anon.body.email, null);
  assert.match(anon.body.nome, /anonimizado/);
  const det = await api('GET', `/clientes/${c.id}`);
  assert.equal(det.body.contatos.length, 0);
  assert.equal((await api('PUT', `/clientes/${c.id}`, { nome: 'Volta' })).status, 409);
});

test('resumo aponta pendências de cadastro', async () => {
  const { body: c } = await api('POST', '/clientes', { nome: 'Sem Dados' });
  const r = await api('GET', `/clientes/${c.id}/resumo`);
  assert.equal(r.status, 200);
  assert.ok(r.body.pendencias.includes('CPF não informado'));
  assert.equal((await api('GET', '/clientes/99999')).status, 404);
});
