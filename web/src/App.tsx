import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import ClientesLista from './pages/ClientesLista';
import ClienteForm from './pages/ClienteForm';
import ClientePerfil from './pages/ClientePerfil';

const MENU = [
  { to: '/clientes', rotulo: 'Clientes', ativo: true },
  { to: '#', rotulo: 'Agenda' },
  { to: '#', rotulo: 'Vendas' },
  { to: '#', rotulo: 'Financeiro' },
  { to: '#', rotulo: 'Treinos' },
  { to: '#', rotulo: 'Relatórios' },
];

export default function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="marca">
          <span className="marca-logo">Ω</span>
          <span>Olimpo<small>System</small></span>
        </div>
        <nav>
          {MENU.map((m) =>
            m.ativo ? (
              <NavLink key={m.rotulo} to={m.to} className="nav-item">{m.rotulo}</NavLink>
            ) : (
              <span key={m.rotulo} className="nav-item desabilitado" title="Em breve">{m.rotulo}</span>
            ),
          )}
        </nav>
      </aside>
      <main className="conteudo">
        <Routes>
          <Route path="/" element={<Navigate to="/clientes" replace />} />
          <Route path="/clientes" element={<ClientesLista />} />
          <Route path="/clientes/novo" element={<ClienteForm />} />
          <Route path="/clientes/:id/editar" element={<ClienteForm />} />
          <Route path="/clientes/:id/*" element={<ClientePerfil />} />
          <Route path="*" element={<Navigate to="/clientes" replace />} />
        </Routes>
      </main>
    </div>
  );
}
