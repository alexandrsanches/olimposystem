import { useEffect, useRef, type ReactNode } from 'react';
import type { Status } from '../types';
import { iniciais } from '../format';

const COR_STATUS: Record<Status, string> = {
  Ativo: 'ok', Novo: 'info', Suspenso: 'warn', Bloqueado: 'err', Inativo: 'muted',
};

export function StatusChip({ status }: { status: Status }) {
  return <span className={`chip chip-${COR_STATUS[status]}`}>{status}</span>;
}

export function Avatar({ nome, tamanho = 36 }: { nome: string; tamanho?: number }) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className="avatar" style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.38, background: `hsl(${h} 45% 88%)`, color: `hsl(${h} 45% 28%)` }} aria-hidden>
      {iniciais(nome)}
    </span>
  );
}

export function Modal({ aberto, titulo, children, onFechar, acoes }: {
  aberto: boolean; titulo: string; children: ReactNode; onFechar: () => void; acoes?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  return (
    <dialog ref={ref} className="modal" onClose={onFechar} onCancel={onFechar}>
      <h3>{titulo}</h3>
      <div className="modal-corpo">{children}</div>
      <div className="modal-acoes">{acoes}</div>
    </dialog>
  );
}

export function Campo({ rotulo, erro, children, largura }: { rotulo: string; erro?: string; children: ReactNode; largura?: 1 | 2 | 3 | 4 }) {
  return (
    <label className={`campo span-${largura ?? 1} ${erro ? 'com-erro' : ''}`}>
      <span className="campo-rotulo">{rotulo}</span>
      {children}
      {erro && <span className="campo-erro">{erro}</span>}
    </label>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="vazio">
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
