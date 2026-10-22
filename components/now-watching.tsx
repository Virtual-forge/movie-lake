import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { formatRuntime } from "@/lib/format";
import type { Listing } from "@/types/listing";
import { MetaRow } from "@/components/meta-row";

export function NowWatching({ items }: { items: Listing[] }) {
  return (
    <aside aria-label="Popular series" className="flex flex-col gap-3.5">
      <h2 className="text-lg font-semibold tracking-tight text-content">
        Popular series
      </h2>
      {items.map((item) => {
        const runtime = formatRuntime(item.runtimeMin);
        return (
          <Link
            key={item.route}
            href={item.route}
            className="group flex min-w-0 flex-1 items-center gap-3.5"
          >
            <div className="relative aspect-video w-[52%] max-w-[185px] shrink-0 overflow-hidden rounded-lg bg-surface">
              <Image
                src={item.thumb ?? item.backdrop ?? item.poster}
                alt=""
                fill
                sizes="(min-width: 1024px) 185px, 52vw"
                className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
              {runtime !== undefined && (
                <span className="absolute right-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums leading-none text-white">
                  {runtime}
                </span>
              )}
              <span
                aria-hidden
                className="absolute inset-0 grid place-items-center"
              >
                <span className="grid size-8 place-items-center rounded-full bg-black/60 opacity-80 ring-1 ring-white/25 transition-opacity group-hover:opacity-100">
                  <Play className="ml-0.5 size-3 fill-white text-white" />
                </span>
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-medium text-content transition-colors group-hover:text-white">
                {item.title}
              </h3>
              <MetaRow item={item} className="mt-1.5" />
            </div>
          </Link>
        );
      })}
    </aside>
  );
}
