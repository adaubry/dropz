import { Link } from "@/components/ui/link";
import { getPlanets, getPlanetDetails } from "@/lib/queries";

import Image from "next/image";

export default async function Home() {
  const [planets, dropCount] = await Promise.all([
    getPlanets(),
    getPlanetDetails(),
  ]);
  let imageCount = 0;

  return (
    <div className="w-full p-4">
      <div className="mb-2 w-full flex-grow border-b-[1px] border-accent1 text-sm font-semibold text-black">
        Explore {dropCount.at(0)?.count.toLocaleString()} drops
      </div>
      {planets.map((planet) => (
        <div key={planet.name}>
          <h2 className="text-xl font-semibold">{planet.name}</h2>
          <div className="flex flex-row flex-wrap justify-center gap-2 border-b-2 py-4 sm:justify-start">
            {planet.categories.map((sea) => (
              <Link
                prefetch={true}
                key={sea.name}
                className="flex w-[125px] flex-col items-center text-center"
                href={`/drops/${sea.slug}`}
              >
                <Image
                  loading={imageCount++ < 15 ? "eager" : "lazy"}
                  decoding="sync"
                  src={sea.image_url ?? "/placeholder.svg"}
                  alt={`A small picture of ${sea.name}`}
                  className="mb-2 h-14 w-14 border hover:bg-accent2"
                  width={48}
                  height={48}
                  quality={65}
                />
                <span className="text-xs">{sea.name}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
