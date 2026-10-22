import Image from "next/image";
import type { CastMemberView } from "@/lib/listing-data";
import { DragScroller } from "@/components/drag-scroller";

/** Horizontal portraits row for the detail page (top billed cast). */
export function CastRail({ cast }: { cast: CastMemberView[] }) {
  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-semibold tracking-tight text-content">
        Top billed cast
      </h2>
      <DragScroller className="contain-paint -mx-1 mt-4 flex gap-4 overflow-x-auto px-1 pb-2 scrollbar-none">
        {cast.map((member) => (
          <li key={member.id} className="w-28 shrink-0">
            <div className="relative aspect-square w-full overflow-hidden rounded-full bg-surface ring-1 ring-border/50">
              {member.profileUrl ? (
                <Image
                  src={member.profileUrl}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <p className="mt-2 truncate text-[13px] font-medium text-content">
              {member.name}
            </p>
            {member.character && (
              <p className="truncate text-[12px] text-content-muted">
                {member.character}
              </p>
            )}
          </li>
        ))}
      </DragScroller>
    </div>
  );
}
