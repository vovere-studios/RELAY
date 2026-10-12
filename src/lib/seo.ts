export const PUBLIC_ORIGIN = "https://relay.vovere-studios.com";

const landing = {
  title: "Relay — Supplier information, connected",
  description: "One workspace for supplier information, company documents and requirements. Collect, review and share evidence with your team and business partners. A product of VOVERE.",
};

const privateTitles: Record<string, string> = {
  "/login": "Sign in — Relay",
  "/signup": "Create your company workspace — Relay",
  "/submit": "Share your documents — Relay",
  "/join": "Join your company workspace — Relay",
  "/account": "Your account — Relay",
  "/account-security": "Account security — Relay",
  "/reset-password": "Account recovery — Relay",
  "/admin": "Administration — Relay",
};

export function routeSeo(pathname: string) {
  const isLanding = pathname === "/";
  const isPricing = pathname === '/pricing';
  return {
    title: isLanding ? landing.title : isPricing ? 'Plans for your company — Relay' : privateTitles[pathname] || "Workspace — Relay",
    description: isLanding ? landing.description : isPricing ? 'Compare Free, Core and Pro. One Relay subscription per company, with space for your documents, suppliers and team.' : "Access your private Relay workspace and share information with chosen companies.",
    canonical: `${PUBLIC_ORIGIN}${isLanding ? "/" : pathname}`,
    robots: isLanding || isPricing ? "index, follow" : "noindex, nofollow",
    isLanding,
  };
}

export const landingStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${PUBLIC_ORIGIN}/#website`, name: "Relay", url: `${PUBLIC_ORIGIN}/`, inLanguage: "en" },
    { "@type": "WebApplication", "@id": `${PUBLIC_ORIGIN}/#application`, name: "Relay", url: `${PUBLIC_ORIGIN}/`, applicationCategory: "BusinessApplication", operatingSystem: "Web", description: landing.description },
  ],
};

export function seoHead(pathname: string) {
  const seo = routeSeo(pathname);
  return {
    meta: [
      { title: seo.title },
      { name: "description", content: seo.description },
      { name: "robots", content: seo.robots },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Relay" },
      { property: "og:title", content: seo.title },
      { property: "og:description", content: seo.description },
      { property: "og:url", content: seo.canonical },
      { property: "og:image", content: `${PUBLIC_ORIGIN}/brand/relay-social-card.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Relay — Less chasing. More knowing. A product of VOVERE." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${PUBLIC_ORIGIN}/brand/relay-social-card.png` },
      { name: "twitter:title", content: seo.title },
      { name: "twitter:description", content: seo.description },
    ],
    links: [{ rel: "canonical", href: seo.canonical }],
    scripts: seo.isLanding ? [{ type: "application/ld+json", id: "relay-structured-data", children: JSON.stringify(landingStructuredData) }] : [],
  };
}

/** The nested workspace router changes independently of the server router. */
export function syncPageSeo(pathname: string) {
  const head = seoHead(pathname);
  document.title = routeSeo(pathname).title;
  for (const meta of head.meta) {
    if (!("content" in meta)) continue;
    const attribute = "property" in meta ? "property" : "name";
    const key = "property" in meta ? meta.property : meta.name;
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attribute, key!);
      document.head.append(element);
    }
    element.content = meta.content!;
    if (key === "robots" && window.location.origin !== PUBLIC_ORIGIN) element.content = "noindex, nofollow";
  }
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.append(canonical);
  }
  canonical.href = routeSeo(pathname).canonical;
  let structuredData = document.getElementById("relay-structured-data");
  if (pathname !== "/") structuredData?.remove();
  else {
    if (!structuredData) {
      structuredData = document.createElement("script");
      structuredData.id = "relay-structured-data";
      structuredData.setAttribute("type", "application/ld+json");
      document.head.append(structuredData);
    }
    structuredData.textContent = JSON.stringify(landingStructuredData);
  }
}
