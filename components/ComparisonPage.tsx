import type { ReactNode } from "react";
import Link from "next/link";
import { UrlFunnelForm } from "@/components/UrlFunnelForm";

// The four /vs/* pages are the same page with different content, so the
// skeleton lives here once. Anything that needs inline links or emphasis is
// typed as ReactNode so callers keep their own markup.
export type ComparisonPageProps = {
  /** Trailing crumb after "Home · Comparisons". */
  crumb: string;
  title: string;
  lede: ReactNode;
  /** Column headers for the comparison table. */
  columns: [string, string, string];
  rows: [string, string, string][];
  /** Caveat printed under the table. */
  note?: ReactNode;
  chooseUs: { heading: string; items: ReactNode[] };
  chooseThem: { heading: string; items: ReactNode[] };
  faq: { q: string; a: string }[];
  cta: { heading: string; body: ReactNode; label?: string };
  /** The platform comparisons put the CTA above the FAQ; the tool ones below. */
  ctaPlacement?: "beforeFaq" | "afterFaq";
};

export function ComparisonPage({
  crumb,
  title,
  lede,
  columns,
  rows,
  note,
  chooseUs,
  chooseThem,
  faq,
  cta,
  ctaPlacement = "afterFaq",
}: ComparisonPageProps) {
  const faqSection = (
    <section className="page-section is-compact">
      <h2>FAQ</h2>
      <div className="page-faq">
        {faq.map((f, i) => (
          <details key={f.q} open={i === 0}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );

  const ctaSection = (
    <section className="page-cta">
      <h2>{cta.heading}</h2>
      <p>{cta.body}</p>
      <div className="page-cta-form">
        <UrlFunnelForm cta={cta.label ?? "Convert free →"} />
      </div>
    </section>
  );

  return (
    <main>
      <section className="page-head">
        <div className="page-head-box">
          <div className="page-head-row">
            <div className="page-head-stack">
              <nav className="page-breadcrumb">
                <Link href="/">Home</Link> · Comparisons · {crumb}
              </nav>
              <h1 className="page-title">{title}</h1>
            </div>
          </div>
          <div className="page-head-row">
            <p className="page-intro is-wide">{lede}</p>
          </div>
        </div>
      </section>

      <div className="page-body is-narrow is-compact">
        <section className="page-section is-compact">
          <h2>Side by side</h2>
          <div className="page-table-wrap">
            <table className="page-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([dim, us, them]) => (
                  <tr key={dim}>
                    <td>{dim}</td>
                    <td>{us}</td>
                    <td>{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {note && <p className="page-note">{note}</p>}
        </section>

        <section className="page-section is-compact">
          <h2>When to choose which</h2>
          <div className="page-grid-2">
            {[chooseUs, chooseThem].map((col) => (
              <div key={col.heading} className="page-card">
                <h3>{col.heading}</h3>
                <ul>
                  {col.items.map((item, i) => (
                    <li key={i}>· {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {ctaPlacement === "beforeFaq" ? (
          <>
            {ctaSection}
            {faqSection}
          </>
        ) : (
          <>
            {faqSection}
            {ctaSection}
          </>
        )}
      </div>
    </main>
  );
}
