import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/landing/Hero";
import { PayoutTicker } from "@/components/landing/PayoutTicker";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TrustBento } from "@/components/landing/TrustBento";
import { Testimonials } from "@/components/landing/Testimonials";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { FAQ, faqs } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

const BASE_URL = "https://task-aura-vault.lovable.app";

const title = "Veritask — Earn USDT for Verified Social Tasks";
const description =
  "Earn real USDT by completing verified social tasks. Instant BEP20 payouts, bot-proof verification, 21k+ USDT paid out. No deposits.";
const ogDescription = description;

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
    },
  })),
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Veritask",
  url: BASE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/tasks?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Veritask",
  url: BASE_URL,
  logo: `${BASE_URL}/favicon.ico`,
  sameAs: [],
};

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "keywords", content: "earn USDT, crypto tasks, Web3 rewards, verified tasks, BEP20 payouts, social tasks, make money online, USDT withdrawal, task platform" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: title },
      { property: "og:description", content: ogDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: BASE_URL },
      { property: "og:site_name", content: "Veritask" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: ogDescription },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: BASE_URL },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(faqSchema),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(websiteSchema),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(orgSchema),
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <PayoutTicker />
        <HowItWorks />
        <TrustBento />
        <Testimonials />
        <TrustBadges />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
