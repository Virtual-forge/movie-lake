import { HeroSlider } from "@/components/hero-slider";
import { NowWatching } from "@/components/now-watching";
import { GenreRow } from "@/components/genre-row";
import { PosterRail } from "@/components/poster-rail";
import {
  getHeroSlides,
  getNewRail,
  getNowWatching,
  getTrendingRail,
} from "@/lib/home-data";

/**
 * Homepage — every section resolves through `use cache` scopes around the
 * TMDB API (docs/PROJECT_PLAN.md M1), so the route prerenders into the
 * static shell and is refreshed by cache lifetimes, not per request.
 */
export default async function Home() {
  const heroSlides = await getHeroSlides();
  const nowWatching = await getNowWatching();
  const trending = await getTrendingRail();
  const newReleases = await getNewRail();

  return (
    <>
      <h1 className="sr-only">Movie Lake — discover films and series</h1>

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-5 py-6 md:gap-10 md:px-10 md:py-8 lg:px-14">
        {/* Split hero + compact side list (desktop) */}
        <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:gap-6">
          <div className="lg:w-[68%]">
            <HeroSlider slides={heroSlides} />
          </div>
          <div className="lg:w-[32%]">
            <NowWatching items={nowWatching} />
          </div>
        </div>

        <GenreRow />

        <PosterRail title="Trending" items={trending} />
        <PosterRail title="New" items={newReleases} />
      </div>
    </>
  );
}
