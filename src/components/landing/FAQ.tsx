import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RevealOnScroll } from "./RevealOnScroll";

export const faqs = [
  { q: "Honestly — is this legit?", a: "Yes. Every withdrawal is a real on-chain BEP20 USDT transaction you can verify on BscScan. We've paid out 21,000+ USDT to verified users. We don't ask for deposits, and we never will." },
  { q: "Do I have to deposit any money to start?", a: "No. You never send us a cent. The whole platform is withdraw-only — you complete tasks, you get paid. That's it." },
  { q: "When do I actually get paid?", a: "The moment a task is approved, USDT lands in your in-app balance. As soon as you hit the minimum withdrawal threshold you can cash out to any BEP20 wallet — usually settles in under 30 seconds." },
  { q: "Why do I need to verify my face?", a: "Face verification (powered by GoodDollar) is what makes payouts possible. It blocks bots and fake accounts, so advertisers actually pay for real attention. We don't store your face video." },
  { q: "What's the minimum withdrawal?", a: "$1 USDT. Low on purpose — so you can test that payouts work before you put real effort in." },
  { q: "What network and token do I receive?", a: "BEP20 USDT on BNB Smart Chain (BSC). Compatible with Trust Wallet, MetaMask, Binance, Bybit, OKX and any wallet that supports BSC." },
];

export function FAQ() {
  return (
    <section id="faq" className="container mx-auto max-w-3xl px-4 py-20 md:py-28">
      <RevealOnScroll className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-success">
          You're going to ask anyway
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
          The "is this a scam?" questions
        </h2>
      </RevealOnScroll>
      <Accordion type="single" collapsible className="mt-10 space-y-2">
        {faqs.map((f, i) => (
          <AccordionItem
            key={i}
            value={`i${i}`}
            className="rounded-2xl border border-border bg-card px-5 transition-colors hover:border-success/30"
          >
            <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="leading-relaxed text-muted-foreground">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
