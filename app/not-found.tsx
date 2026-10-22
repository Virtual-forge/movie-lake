import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col items-start justify-center gap-4 px-5 py-24 md:px-10 lg:px-14">
      <h1 className="text-[clamp(1.5rem,2.6vw,2.2rem)] font-semibold tracking-tight text-content">
        Nothing here yet
      </h1>
      <p className="max-w-[60ch] text-[15px] leading-relaxed text-content-secondary">
        The page you were looking for is not part of the demo catalog. Head back
        to the discovery board and keep browsing.
      </p>
      <Link
        href="/"
        className="mt-2 flex h-10 items-center rounded-full bg-content px-5 text-[13px] font-medium text-accent-contrast transition-colors hover:bg-white"
      >
        Back to Discover
      </Link>
    </div>
  );
}
