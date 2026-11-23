// Popula o banco com clientes fictícios para desenvolvimento.
import { openDb } from './db.js';

const db = openDb();
const nomes = ['Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Rocha', 'Elisa Prado', 'Felipe Nunes', 'Gabriela Torres',
  'Henrique Alves', 'Isabela Castro', 'João Pedro Martins', 'Karina Duarte', 'Lucas Ferreira', 'Mariana Costa',
  'Nicolas Ribeiro', 'Olívia Barros', 'Paulo Henrique Dias', 'Queila Moraes', 'Rafael Gomes', 'Sofia Andrade', 'Thiago Freitas',
  'Úrsula Pires', 'Vitor Cardoso', 'Wesley Teixeira', 'Yasmin Lopes', 'Zeca Monteiro', 'Beatriz Ramos', 'Caio Vieira', 'Daniela Moura'];
const femininos = new Set(['Ana Souza','Carla Mendes','Elisa Prado','Gabriela Torres','Isabela Castro','Karina Duarte','Mariana Costa','Olívia Barros','Queila Moraes','Sofia Andrade','Úrsula Pires','Yasmin Lopes','Beatriz Ramos','Daniela Moura']);
const status = ['Ativo', 'Ativo', 'Ativo', 'Ativo', 'Inativo', 'Suspenso', 'Bloqueado', 'Novo'];
const origem = ['Balcao', 'Balcao', 'Site', 'Indicacao', 'Wellhub', 'TotalPass'];
const objetivos = ['Hipertrofia', 'Emagrecimento', 'Condicionamento', 'Saúde', 'Performance'];

const ins = db.prepare(`INSERT INTO cliente (nome, sexo, data_nascimento, email, telefone, status, origem, vip, objetivo, cidade, uf, wellhub_id, criado_em, ultimo_acesso)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'São Paulo', 'SP', ?, datetime('now', ?), datetime('now', ?))`);
db.exec('DELETE FROM cliente_contato; DELETE FROM cliente;');
nomes.forEach((nome, i) => {
  const o = origem[i % origem.length];
  const ano = 1970 + ((i * 7) % 38);
  const mes = String((i % 12) + 1).padStart(2, '0');
  const dia = String((i % 27) + 1).padStart(2, '0');
  const email = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ /g, '.') + '@exemplo.com';
  ins.run(nome, femininos.has(nome) ? 'F' : 'M', `${ano}-${mes}-${dia}`, email, `119${String(80000000 + i * 1371).slice(0, 8)}`,
    status[i % status.length], o, i % 9 === 0 ? 1 : 0, objetivos[i % objetivos.length],
    o === 'Wellhub' ? `WH${String(1000000 + i * 37)}` : null, `-${i * 13} days`, `-${i % 10} days`);
});
console.log(`${nomes.length} clientes criados.`);
