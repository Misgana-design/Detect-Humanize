import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { blogPosts } from "@/lib/seo-content";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "AI Detection & Humanization Blog",
    description:
      "Guides, comparisons, and tutorials on AI detection, AI humanization, bypassing GPTZero and Turnitin, and writing authentically in the age of AI.",
    path: "/blog",
    keywords: [
      "ai detector blog",
      "ai humanizer guide",
      "how to bypass gptzero",
      "ai detection tips",
    ],
  });
}

export default function BlogIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />

      <header className="mb-12 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
          Blog
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">
          AI Detection & Humanization Guides
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500">
          In-depth guides on AI detection accuracy, humanization techniques,
          bypassing GPTZero and Turnitin, and writing authentically in the age of AI.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
              <Clock size={12} />
              <span>{post.readingTime} min read</span>
              <span>·</span>
              <span>{new Date(post.updatedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
            </div>
            <h2 className="flex-1 text-base font-bold leading-snug text-slate-900 transition group-hover:text-indigo-600">
              {post.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 line-clamp-3">
              {post.description}
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600">
              Read article <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
