import { ArrowRight, Construction } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PlannedPage({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: number;
}) {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE</div>
          <h1>
            {title}
            <span className="heading-period">.</span>
          </h1>
          <p>{description}</p>
        </div>
      </div>
      <section className="panel planned-panel">
        <span className="planned-icon">
          <Construction size={28} />
        </span>
        <div className="eyebrow">PLANNED · PHASE {phase}</div>
        <h2>{title} is coming next</h2>
        <p>
          This section will use verified backend data and permissions. No sample records are shown.
        </p>
        <Link className="text-link" to="/admin/dashboard">
          Back to overview <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
