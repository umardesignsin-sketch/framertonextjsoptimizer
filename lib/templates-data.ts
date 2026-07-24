// Shared template catalog — real, published Framer marketplace templates by
// Umar Mirza. Used by /templates (the full catalog) and by narrower,
// keyword-focused landing pages (e.g. /free-portfolio-website) that filter
// this same list down to a category rather than duplicating the data.
export interface Template {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  previewUrl: string;
  getUrl: string;
  categories: string[];
  features: string[];
}

export const TEMPLATES: Template[] = [
  {
    slug: "portfolie",
    name: "Portfolie",
    tagline: "Agency Portfolio Template",
    description:
      "A premium agency portfolio template for creative agencies, digital agencies, design studios, and web development teams — homepage, project galleries, case studies, team, and testimonials, all responsive.",
    image: "https://image.mux.com/5zZ02SsZ2Zt637H02sLmFlCwQffexpSxdhIXweWaVsOWE/thumbnail.jpg?time=2",
    previewUrl: "https://portfolie.framer.website/",
    getUrl: "https://framer.link/ggmluKZ",
    categories: ["Agency", "Portfolio", "Consulting", "Free"],
    features: ["Appear Effects", "Scroll Effects", "CMS", "Forms", "Code Components"],
  },
  {
    slug: "photograph",
    name: "Photograph",
    tagline: "Free Photography Portfolio Template",
    description:
      "A sleek, modern template built specifically for photographers, photography studios, videographers, and content creators who need a clean, easy-to-customize portfolio.",
    image: "https://image.mux.com/Uj6giFQ01VBRXxaZJNeo01jqGfSHdXk5LnouUI01iCSjQk/thumbnail.jpg?time=2",
    previewUrl: "https://photograph.framer.media/",
    getUrl: "https://framer.link/cyRXHVw",
    categories: ["Personal", "Photography", "Portfolio", "Art & Design"],
    features: ["Appear Effects", "Scroll Effects", "CMS", "Forms", "Code Components"],
  },
  {
    slug: "portfolioz",
    name: "PortfolioZ",
    tagline: "Portfolio Template for Designers, Developers & Freelancers",
    description:
      "A modern portfolio template crafted for designers, developers, and freelancers who want a professional personal site without starting from a blank canvas.",
    image: "https://image.mux.com/ESvjhdOfZ1G2G3ywT3PEMEA7Ird6Zlfwx1VODROlbEs/thumbnail.jpg?time=2",
    previewUrl: "https://portfolioz.framer.ai/",
    getUrl: "https://framer.link/DUF18Uz",
    categories: ["Resume", "Agency", "Personal", "Portfolio", "Free"],
    features: ["Appear Effects", "Scroll Effects", "CMS", "Layout Templates"],
  },
  {
    slug: "portfoliona",
    name: "Portfoliona",
    tagline: "Portfolio Website Template",
    description:
      "A clean portfolio website template for showcasing personal work, résumé-style project history, and a professional online presence.",
    image: "https://image.mux.com/IbR8LODgIyh00q00VFEAessfq01StnwBlBTHi016wVEFMCU/thumbnail.jpg?time=2",
    previewUrl: "https://portfoliona.framer.website/",
    getUrl: "https://framer.link/6uLAIxO",
    categories: ["Resume", "Personal", "Portfolio", "Free"],
    features: ["Appear Effects", "Scroll Effects", "CMS", "Forms", "Variable Fonts"],
  },
  {
    slug: "portfolioxo",
    name: "Portfolioxo",
    tagline: "Developer Portfolio Template",
    description:
      "A developer-focused portfolio template with a built-in blog layout — built for engineers and technical freelancers who want to showcase projects and writing together.",
    image: "https://image.mux.com/7yOmXqMPwRS9s01WKtzgEkTLYll2eIuHW4NtcN7xGnu4/thumbnail.jpg?time=2",
    previewUrl: "https://devfolio.framer.media/",
    getUrl: "https://framer.link/x52CtuV",
    categories: ["Resume", "Blog", "Portfolio", "Free"],
    features: ["Light & Dark Theme", "Scroll Effects", "CMS", "Custom Cursors"],
  },
  {
    slug: "furnitra",
    name: "Furnitra",
    tagline: "Free Business Website Template",
    description:
      "A clean, premium one-page template built for furniture, interior design, and professional service businesses that want a strong first impression without a long build.",
    image: "https://y4pdgnepgswqffpt.public.blob.vercel-storage.com/media/82da9c63-b526-4125-babc-4bfd13d6777c/qvbq61qx",
    previewUrl: "https://furnitra.framer.website/",
    getUrl: "https://framer.link/M2iOFKZ",
    categories: ["Landing Page", "Interior Design", "Professional Services"],
    features: ["Appear Effects", "Scroll Effects", "Rich Media", "Text Effects"],
  },
  {
    slug: "interiore",
    name: "Interiore",
    tagline: "Construction & Renovation Template",
    description:
      "A polished template for architecture, construction, and interior design businesses that need to present work and convert visitors into clients.",
    image: "https://y4pdgnepgswqffpt.public.blob.vercel-storage.com/media/82da9c63-b526-4125-babc-4bfd13d6777c/ksxj15z7",
    previewUrl: "https://interiore.framer.media/",
    getUrl: "https://framer.link/To5IjU6",
    categories: ["Architecture", "Construction", "Interior Design", "Free"],
    features: ["Appear Effects", "Sticky Scrolling", "CMS", "Custom Cursors", "Code Components"],
  },
  {
    slug: "saaset",
    name: "Saaset",
    tagline: "SaaS Landing Page Template",
    description:
      "A modern SaaS landing page template for startups, AI tools, and software products that want to launch fast with a conversion-focused web presence.",
    image: "https://y4pdgnepgswqffpt.public.blob.vercel-storage.com/templates/58486/saset-uyzs2E7dIOODOE5OQs8UOfk4SKZGlv",
    previewUrl: "https://saaset.framer.website/",
    getUrl: "https://framer.link/MK3qtf7",
    categories: ["SaaS", "Landing Page", "Free"],
    features: ["Appear Effects", "Scroll Effects", "Layout Templates", "Text Effects"],
  },
];
