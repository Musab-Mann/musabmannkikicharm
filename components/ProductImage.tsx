"use client";

import { useState } from "react";
import Image from "next/image";
import PlaceholderArt from "./PlaceholderArt";

export default function ProductImage({
  src,
  alt,
  seed,
  className,
}: {
  src: string;
  alt: string;
  seed: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  // Guard against an empty/missing src BEFORE it ever reaches next/image:
  // passing "" to <Image src> triggers Next's "An empty string was passed
  // to the src attribute" warning immediately, before onError ever has a
  // chance to fire (onError only fires after a load attempt against a
  // real, non-empty URL fails).
  if (errored || !src) {
    return <PlaceholderArt seed={seed} className={className} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 50vw, 25vw"
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
