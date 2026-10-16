export const dynamic = "force-static";

export async function GET() {
  const host = process.env.NEXT_PUBLIC_SITE_URL || "https://texthumanica.com";
  const items = [
    {
      title: "AI Humanizer — Rewrite AI Text Naturally",
      link: `${host}/`,
      description: "Humanize AI text and rewrite ChatGPT drafts into natural, polished writing.",
      pubDate: new Date("2026-10-01"),
    },
  ];

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Text Humanica</title>
    <link>${host}</link>
    <description>AI humanizer and detector guides, comparisons, and tutorials.</description>
    ${items
      .map(
        (item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
    </item>`,
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
