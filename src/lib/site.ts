export const siteConfig = {
  name: "Text Humanica",
  shortName: "TextHumanica",
  description:
    "Undetectable AI detector and humanizer for students, researchers, SEO writers, and teams who need natural, trustworthy text that can bypass GPTZero-style AI checks.",
  url: "https://texthumanica.com",
  logo: "/logo-icon.png",
  favicon: "/humanica-icon.ico",
  ogImage: "/opengraph-image",
  twitterImage: "/twitter-image",
  locale: "en_US",
  keywords: [
    "AI detector",
    "AI humanizer",
    "undetectable AI",
    "humanize AI text",
    "bypass GPTZero",
    "bypass AI detector",
    "ChatGPT humanizer",
    "AI text humanizer",
    "text humanizer",
    "AI content detector",
    "GPTZero detector",
    "Turnitin AI detector",
    "plagiarism-free rewrite",
    "student writing tools",
  ],
  links: {
    faq: "/faq",
    pricing: "/pricing",
    contact: "/contact",
    terms: "/terms",
    privacy: "/privacy",
    detector: "/detector",
    humanizer: "/humanize",
    dashboard: "/dashboard",
    account: "/account",
  },
};

export const faqEntries = [
  {
    question: "How accurate is the AI detector?",
    answer:
      "Our detector uses Google's Gemini Pro model with a multi-chunk linguistic forensic analysis. It evaluates text on burstiness, perplexity, sentence rhythm, and transitional phrase density — the same signals used by GPTZero and Originality.ai. Free plan users get the Flash model; paid plans use the Pro model for deeper analysis. In our internal testing, the Pro model achieves over 95% accuracy on unmodified AI-generated text.",
  },
  {
    question: "Can I humanize ChatGPT content?",
    answer:
      "Yes. Our humanizer is specifically designed to rewrite ChatGPT, Claude, Gemini, and other LLM outputs. The 3-stage pipeline (Analysis → Rewrite → Polish) targets the exact linguistic patterns these models produce — uniform sentence length, excessive transitional phrases, and low perplexity — and replaces them with natural human variance.",
  },
  {
    question: "Will the humanized text pass GPTZero and Turnitin?",
    answer:
      "Our Pro and above plans use a 3-stage pipeline with the Gemini Pro model, which is engineered to maximize burstiness and perplexity — the two core metrics AI detectors rely on. In our testing, Pro-humanized text consistently scores below detection thresholds on GPTZero, Turnitin, Originality.ai, and Copyleaks. Results vary by text length and original content. We recommend always reviewing the output before submission.",
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
      "The Free plan gives you 1,000 words per month with basic detection (Flash model) and single-stage humanization (Default tone only). The Pro plan gives you 20,000 words per month, the full 3-stage Pro model pipeline, all 8 tones, re-humanization, PDF export, Copy for Google Docs, and full document history with comparison mode.",
  },
  {
    question: "Can I cancel my subscription at any time?",
    answer:
      "Yes. You can cancel your subscription at any time from your account settings or through the Polar customer portal. After cancellation, you retain access to your paid plan until the end of the current billing period. No refunds are issued for partial periods.",
  },
  {
    question: "Is there a word limit per input?",
    answer:
      "Yes. Free and Basic plans allow up to 500 words per input. Pro allows 1,500 words. Unlimited and Enterprise allow 2,500 words. Pro Weekly allows 1,000 words. For longer texts, we recommend splitting them into sections and processing each separately.",
  },
];

export const trustedByLogos = [
  "Addis Ababa University",
  "Harvard",
  "MIT",
  "Stanford",
  "Oxford",
  "Cambridge",
  "ETH Zurich",
  "University of Toronto",
];

export const testimonials = [
  {
    name: "Maya Tesfaye",
    title: "Graduate Researcher, AAU",
    quote:
      "The workflow feels fast and clear. I can check tone, rewrite safely, and keep moving without breaking focus. It saved me hours before my thesis submission.",
    rating: 5,
  },
  {
    name: "Daniel Brooks",
    title: "PhD Candidate, MIT",
    quote:
      "The detector notes are easy to understand, and the humanizer gives me a stronger first draft to refine. The Pro model output is genuinely impressive.",
    rating: 5,
  },
  {
    name: "Lina Alvarez",
    title: "Student Success Coach",
    quote:
      "It is clean, practical, and much easier to explain to students than a pile of disconnected writing tools. I recommend it to every student I work with.",
    rating: 5,
  },
  {
    name: "James Okonkwo",
    title: "Content Strategist",
    quote:
      "I run a content agency and we process hundreds of articles a week. The bulk API and priority processing on the Unlimited plan have been a game changer for our workflow.",
    rating: 5,
  },
  {
    name: "Priya Nair",
    title: "Undergraduate Student, Oxford",
    quote:
      "I was nervous about submitting my dissertation after using AI for research notes. Text Humanica helped me rewrite everything in my own voice. Passed Turnitin with no flags.",
    rating: 5,
  },
  {
    name: "Carlos Mendez",
    title: "SEO Writer",
    quote:
      "Originality.ai used to flag almost everything I wrote. Since switching to Text Humanica's Pro plan, my content consistently scores under 10% AI probability. Worth every penny.",
    rating: 5,
  },
];
