export const siteConfig = {
  name: "Text Humanica",
  shortName: "TextHumanica",
  description:
    "AI humanizer for students, researchers, SEO writers, and teams who need natural, trustworthy text that bypasses GPTZero-style AI checks.",
  url: "https://texthumanica.com",
  logo: "/logo-icon.png",
  favicon: "/humanica-icon.ico",
  ogImage: "/opengraph-image",
  twitterImage: "/twitter-image",
  locale: "en_US",
  keywords: [
    "AI humanizer",
    "undetectable AI",
    "humanize AI text",
    "bypass GPTZero",
    "bypass AI detector",
    "ChatGPT humanizer",
    "AI text humanizer",
    "text humanizer",
    "AI detector bypass",
    "GPTZero bypass",
    "Turnitin AI detector bypass",
    "plagiarism-free rewrite",
    "student writing tools",
  ],
  links: {
    faq: "/faq",
    pricing: "/pricing",
    contact: "/contact",
    terms: "/terms",
    privacy: "/privacy",
    humanizer: "/#humanizer",
    dashboard: "/dashboard",
    account: "/account",
  },
};

export const faqEntries = [
  {
    question: "Can I humanize ChatGPT content?",
    answer:
      "Yes. Our humanizer is specifically designed to rewrite ChatGPT, Claude, Gemini, and other LLM outputs. The 3-stage pipeline (Analysis → Rewrite → Polish) targets the exact linguistic patterns these models produce — uniform sentence length, excessive transitional phrases, and low perplexity — and replaces them with natural human variance.",
  },
  {
    question: "Will the humanized text pass GPTZero and Turnitin?",
    answer:
      "Our Pro and above plans use a 3-pass pipeline with the Gemini Pro model, engineered to maximize burstiness and perplexity — the two core metrics AI detectors rely on. In our testing, Pro-humanized text consistently scores below detection thresholds on GPTZero, Turnitin, Originality.ai, and Copyleaks. Results vary by text length and original content. We recommend always reviewing the output before submission.",
  },
  {
    question: "What file types can I upload?",
    answer:
      "TXT, MD, RTF, DOCX, and PDF files up to 10MB are supported. Text is extracted automatically and pre-filled into the editor. For PDFs, we extract text from all pages. For DOCX files, we extract raw text content. Formatting is not preserved — only the text content is used.",
  },
  {
    question: "Do you store my uploaded documents?",
    answer:
      "Your documents are stored securely in your private account and are never shared with third parties or used to train AI models. Each document is tied to your user ID and protected by row-level security. You can delete any document from your history at any time, and deletion is permanent.",
  },
  {
    question: "What is the difference between the Free and Pro plans?",
    answer:
      "The Free plan gives you 1,000 words per month with single-pass humanization (Casual tone only). The Pro plan gives you 20,000 words per month, the full 3-pass Pro model pipeline, all tones, re-humanization, PDF export, Copy for Google Docs, and full document history with comparison mode.",
  },
  {
    question: "Can I cancel my subscription at any time?",
    answer:
      "Yes. You can cancel your subscription at any time from your account settings or through the Polar customer portal. After cancellation, you retain access to your paid plan until the end of the current billing period. No refunds are issued for partial periods.",
  },
  {
    question: "Is there a word limit per input?",
    answer:
      "Yes. Free and Basic plans allow up to 500 words per input. Pro allows 1,500 words. Ultra allows 2,500 words. Pro Weekly allows 1,000 words. For longer texts, we recommend splitting them into sections and processing each separately.",
  },
];

export const trustedByLogos = [
  { name: "Addis Ababa University", src: "/Addis Ababa.jpg"           },
  { name: "Harvard University",     src: "/Harvard.png"               },
  { name: "MIT",                    src: "/MIT.png"                   },
  { name: "Stanford University",    src: "/Stanford.png"              },
  { name: "University of Oxford",   src: "/Oxford.png"                },
  { name: "University of Cambridge",src: "/Cambridge.png"             },
  { name: "ETH Zurich",             src: "/ETH zurich.png"            },
  { name: "University of Toronto",  src: "/University Of Toronto.png" },
];

export const testimonials = [
  {
    name: "Maya Tesfaye",
    title: "Graduate Researcher, AAU",
    category: "Academic",
    quote:
      "The workflow feels fast and clear. I can check tone, rewrite safely, and keep moving without breaking focus. It saved me hours before my thesis submission.",
    rating: 5,
  },
  {
    name: "Daniel Brooks",
    title: "PhD Candidate, MIT",
    category: "Academic",
    quote:
      "The humanizer gives me a stronger first draft to refine. The 3-pass Pro pipeline output is genuinely impressive — my writing sounds natural and varied.",
    rating: 5,
  },
  {
    name: "Priya Nair",
    title: "Undergraduate Student, Oxford",
    category: "Academic",
    quote:
      "I was nervous about submitting my dissertation after using AI for research notes. Text Humanica helped me rewrite everything in my own voice. Passed Turnitin with no flags.",
    rating: 5,
  },
  {
    name: "Carlos Mendez",
    title: "SEO Writer",
    category: "SEO",
    quote:
      "Originality.ai used to flag almost everything I wrote. Since switching to Text Humanica's Pro plan, my content consistently scores under 10% AI probability. Worth every penny.",
    rating: 5,
  },
  {
    name: "James Okonkwo",
    title: "Content Agency Owner",
    category: "Agency",
    quote:
      "We process hundreds of articles a week. The bulk API and priority processing on the Ultra plan cut our review time in half. It pays for itself every single month.",
    rating: 5,
  },
  {
    name: "Lina Alvarez",
    title: "Student Success Coach",
    category: "Education",
    quote:
      "It is clean, practical, and much easier to explain to students than a pile of disconnected writing tools. I recommend it to every student I work with.",
    rating: 5,
  },
  {
    name: "Tariq Hassan",
    title: "Freelance Copywriter",
    category: "Freelance",
    quote:
      "My clients started asking for AI-free content. Text Humanica lets me deliver that without slowing down my workflow. The Professional tone is exactly what I needed.",
    rating: 5,
  },
  {
    name: "Sophie Renard",
    title: "Marketing Manager, Paris",
    category: "Marketing",
    quote:
      "We use AI to draft campaign copy and Text Humanica to make it sound like us. The brand voice stays consistent and nothing gets flagged. Exactly what our team needed.",
    rating: 5,
  },
  {
    name: "Amir Patel",
    title: "Startup Founder",
    category: "Business",
    quote:
      "I write all our investor updates and blog posts with AI assistance. Text Humanica makes sure they read as genuinely mine. The humanizer gives me confidence before I hit send.",
    rating: 5,
  },
];
