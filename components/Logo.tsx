export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true">
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
          <path d="M4 15V9.8L7.2 7v10M20 15V9.8L16.8 7v10M8 17h8M9 7l3-3 3 3M12 4v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {!compact && <div><div className="brand-title">GYM<span>FIT</span></div><div className="brand-sub">FITNESS MANAGEMENT OS</div></div>}
    </div>
  );
}
