import type { Metadata } from "next";

const TITLE = "Terms of Service | Framer → Next.js Optimizer";
const DESCRIPTION =
  "The terms governing your use of FramerToNextJS — authorized use, intellectual property, limitation of liability, and contact details.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: { type: "website", url: "/terms", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const LAST_UPDATED = "July 2026";
const CONTACT_EMAIL = "framertonextjs@gmail.com";

// A paragraph is a string; a bullet list is an array of strings.
type Block = string | string[];

// Figma: "Terms & Service" (node 5:760). The mock's headings run
// 1,2,3,4,6,7,8,9,10,11,12 — it skips 5. Renumbered sequentially here, since
// a published legal page that jumps from 4 to 6 reads as a missing clause.
const SECTIONS: { heading: string; body: Block[] }[] = [
  {
    heading: "About the Service",
    body: [
      "FramerToNextJS is an independent website migration tool that converts publicly accessible websites into downloadable project files.",
      "FramerToNextJS is an independent product and is not affiliated with, endorsed by, or sponsored by Framer.",
    ],
  },
  {
    heading: "Eligibility",
    body: [
      "You must be legally able to enter into this agreement and comply with all applicable laws when using the service.",
    ],
  },
  {
    heading: "Authorized Use",
    body: [
      "You may only convert websites that:",
      ["You own, or", "You have explicit permission or authorization to migrate."],
      "You are solely responsible for ensuring you have the necessary rights to use the website you submit.",
    ],
  },
  {
    heading: "Intellectual Property",
    body: [
      "FramerToNextJS does not claim ownership of your website or the generated output.",
      "You remain responsible for ensuring that your use of the generated files complies with applicable copyright, trademark, licensing, and intellectual property laws.",
    ],
  },
  {
    heading: "No Guarantee",
    body: [
      "While we strive to produce accurate conversions, we do not guarantee that every website will convert perfectly.",
      "Results may vary depending on the complexity of the original website and supported features.",
      "You are responsible for reviewing the generated output before using it in production.",
    ],
  },
  {
    heading: "Acceptable Use",
    body: [
      "You agree not to:",
      [
        "Convert websites without authorization.",
        "Violate applicable laws.",
        "Attempt to interfere with the service.",
        "Reverse engineer or abuse the platform.",
        "Use the service for fraudulent or malicious purposes.",
      ],
      "We reserve the right to suspend or terminate access for misuse.",
    ],
  },
  {
    heading: "Third-Party Services",
    body: [
      "Generated projects may be deployed using third-party platforms such as Vercel or Netlify.",
      "Your use of those services is governed by their own terms and policies.",
    ],
  },
  {
    heading: "Limitation of Liability",
    body: [
      "To the maximum extent permitted by law, FramerToNextJS shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.",
      "You use the service at your own risk.",
    ],
  },
  {
    heading: "Disclaimer",
    body: [
      "The service is provided “as is” and “as available” without warranties of any kind, whether express or implied.",
      "We do not guarantee uninterrupted availability, compatibility with every website, or error-free operation.",
    ],
  },
  {
    heading: "Changes to These Terms",
    body: [
      "We may update these Terms of Service from time to time.",
      "Continued use of the service after changes become effective constitutes acceptance of the updated terms.",
    ],
  },
];

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) =>
        Array.isArray(block) ? (
          <ul key={i} className="page-list">
            {block.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{block}</p>
        ),
      )}
    </>
  );
}

export default function TermsPage() {
  return (
    <main>
      {/* Page header band — full-bleed rules top and bottom, with the inner
          1200px box carrying the vertical rules. Its text is inset a further
          80px, which is why the title sits right of the body copy below. */}
      <section className="page-head">
        <div className="page-head-box">
          <div className="page-head-row">
            <h1 className="page-title">Terms of Service</h1>
            <p className="page-updated">Last updated: {LAST_UPDATED}</p>
          </div>
          <div className="page-head-row">
            <p className="page-intro">
              Welcome to FramerToNextJS. By accessing or using our website and services, you agree
              to these Terms of Service.
              <br />
              If you do not agree with these terms, please do not use the service.
            </p>
          </div>
        </div>
      </section>

      <div className="page-body">
        {SECTIONS.map((section, i) => (
          <section key={section.heading} className="page-section">
            <h2>
              {i + 1}. {section.heading}
            </h2>
            <div className="page-prose">
              <Blocks blocks={section.body} />
            </div>
          </section>
        ))}

        <section className="page-section">
          <h2>{SECTIONS.length + 1}. Contact</h2>
          <div className="page-prose">
            <p>If you have questions regarding these Terms of Service, please contact us at:</p>
            <p>
              Email:{" "}
              <a className="page-link" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </section>

        <div className="page-prose page-closing">
          <p>
            By converting a website, you confirm that you own it or have permission to migrate it.
            By continuing, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </main>
  );
}
