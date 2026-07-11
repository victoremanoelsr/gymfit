import type { LucideIcon } from 'lucide-react';
export function StatCard({ label, value, foot, icon: Icon, tone='positive' }: { label:string; value:string; foot:string; icon:LucideIcon; tone?:'positive'|'negative'|'neutral' }) {
  return <div className="card stat"><div className="stat-top"><span className="stat-label">{label}</span><span className="stat-icon"><Icon size={18}/></span></div><div className="stat-value">{value}</div><div className={`stat-foot ${tone === 'positive' ? 'positive' : tone === 'negative' ? 'negative' : ''}`}>{foot}</div></div>;
}
