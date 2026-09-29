import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <p className="font-display text-5xl">404</p>
      <h1 className="font-display text-2xl mt-3">We couldn&rsquo;t find that page</h1>
      <p className="mt-2 text-bronze text-sm">
        The link may be broken, or the page may have moved. Let&rsquo;s get you back on track.
      </p>
      <Link href="/" className="mt-7 inline-block rounded-full bg-gold px-7 py-3 text-sm font-semibold text-obsidian">
        BACK TO HOME
      </Link>
    </div>
  );
}
