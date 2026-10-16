import Script from "next/script";

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const gtagId = process.env.NEXT_PUBLIC_GTAG_ID;

  return (
    <>
      {gtagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gtagId}', { page_path: window.location.pathname });
            `}
          </Script>
        </>
      )}
      {gaId && !gtagId && (
        <>
          <Script src={`https://www.google-analytics.com/analytics.js`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
              ga('create', '${gaId}', 'auto');
              ga('send', 'pageview');
            `}
          </Script>
        </>
      )}
    </>
  );
}
