import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import React from "react";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { buildBreadcrumbJsonLd, buildMetadata, absoluteUrl, buildPersonJsonLd, buildFaqJsonLd as buildFaqJsonLdBase } from "@/lib/seo";
import { blogPosts } from "@/lib/seo-content";
import { StructuredData } from "@/components/seo/StructuredData";
import { siteConfig } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return {};
  return buildMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
    author: siteConfig.author,
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
  });
}

function renderInline(text: string): React.ReactNode {
  const linkRegex = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`t-${key++}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    const href = match[2];
    if (href.startsWith("/") || href.startsWith("https://texthumanica.com")) {
      const url = href.startsWith("/") ? href : href.replace("https://texthumanica.com", "");
      parts.push(
        <Link key={`l-${key++}`} href={url} className="text-indigo-600 hover:text-indigo-700 underline">
          {match[1]}
        </Link>
      );
    } else {
      parts.push(<a key={`a-${key++}`} href={href} className="text-indigo-600 hover:text-indigo-700 underline" target="_blank" rel="noopener noreferrer">{match[1]}</a>);
    }
    lastIndex = linkRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={`t-${key++}`}>{text.slice(lastIndex)}</span>);
  }
  return parts.length > 1 ? <>{parts}</> : parts[0] || text;
}

function buildArticleJsonLd(post: (typeof blogPosts)[0]) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt.includes("T") ? post.publishedAt : `${post.publishedAt}T00:00:00Z`,
    dateModified: post.updatedAt.includes("T") ? post.updatedAt : `${post.updatedAt}T00:00:00Z`,
    author: buildPersonJsonLd(siteConfig.author),
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: { "@type": "ImageObject", url: absoluteUrl(siteConfig.logo) },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/blog/${post.slug}`) },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
      <StructuredData data={buildArticleJsonLd(post)} />
      {post.faq.length > 0 && (
        <StructuredData
          data={buildFaqJsonLdBase(
            post.faq.map((f) => ({ question: f.q, answer: f.a })),
          )}
        />
      )}

      {/* Back link */}
      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft size={14} /> All articles
      </Link>

      {/* Header */}
      <header className="mb-10">
        <div className="mb-4 flex items-center gap-3 text-xs text-slate-400">
          <Clock size={12} />
          <span>{post.readingTime} min read</span>
          <span>·</span>
          <time dateTime={post.updatedAt}>
            Updated{" "}
            {new Date(post.updatedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-500">
          {post.description}
        </p>
      </header>

      {/* Article body */}
      <article className="space-y-8">
        {post.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-3 text-xl font-bold tracking-tight text-slate-900">
              {section.heading}
            </h2>
            <p className="text-base leading-8 text-slate-600">{renderInline(section.body)}</p>
            {section.bullets && section.bullets.length > 0 && (
              <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-8 text-slate-600">
                {section.bullets.map((b, i) => (
                  <li key={i}>{renderInline(b)}</li>
                ))}
              </ul>
            )}
            {section.table && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm text-slate-700 border border-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {section.table.headers.map((h, i) => (
                        <th key={i} className="border border-slate-200 px-3 py-2 text-left font-semibold">
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        {row.map((c, ci) => (
                          <td key={ci} className="border border-slate-200 px-3 py-2 align-top">
                            {renderInline(c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {section.table.caption && (
                  <p className="mt-2 text-xs text-slate-500">{renderInline(section.table.caption)}</p>
                )}
              </div>
            )}
          </section>
        ))}
      </article>

      {/* FAQ */}
      {post.faq.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {post.faq.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
              >
                <h3 className="font-bold text-slate-900">{item.q}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 rounded-3xl bg-linear-to-br from-indigo-600 to-sky-500 px-8 py-10 text-center shadow-xl shadow-indigo-100">
        <h2 className="text-xl font-extrabold text-white sm:text-2xl">
          Try Text Humanica free
        </h2>
        <p className="mt-2 text-sm text-indigo-100">
          1,000 words/month · No credit card required
        </p>
        <Link
          href="/auth/signup"
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
        >
          Get started free <ArrowRight size={14} />
        </Link>
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="mb-6 text-xl font-bold text-slate-900">
            Related articles
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm"
              >
                <p className="text-sm font-semibold leading-snug text-slate-900 group-hover:text-indigo-600">
                  {r.title}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {r.readingTime} min read
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
