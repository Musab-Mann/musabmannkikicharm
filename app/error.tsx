"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <p className="font-display text-3xl">Something went wrong</p>
      <p className="mt-2 text-bronze text-sm">
        This wasn&rsquo;t your fault — please try again, or contact us on WhatsApp if it keeps happening.
      </p>
      <button onClick={reset} className="mt-7 inline-block rounded-full bg-gold px-7 py-3 text-sm font-semibold text-obsidian">
        TRY AGAIN
      </button>
    </div>
  );
}
