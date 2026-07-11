export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = s.includes('active') || s.includes('paid') || s.includes('allowed') || s.includes('enrolled') ? 'badge-green' : s.includes('overdue') || s.includes('blocked') || s.includes('denied') || s.includes('lost') ? 'badge-red' : s.includes('pending') || s.includes('trial') ? 'badge-yellow' : 'badge-blue';
  const label: Record<string,string> = { active:'Ativo', inactive:'Inativo', pending:'Pendente', blocked:'Bloqueado', cancelled:'Cancelado', paid:'Pago', overdue:'Atrasado', allowed:'Liberado', denied:'Negado', enrolled:'Matriculado', lead:'Lead', contacted:'Contato', visit_scheduled:'Visita', trial:'Experimental', proposal:'Proposta', lost:'Perdido' };
  return <span className={`badge ${cls}`}><span className="dot" />{label[s] || status}</span>;
}
