import { Link } from "@/components/ui/link";
import { getPlanets, getOceans } from "@/lib/queries";
import Image from "next/image";

export const revalidate = 0;

export default async function Home() {
  const planets = await getPlanets();

  // Fetch oceans (root-level folders) for all planets
  const planetsWithOceans = await Promise.all(
    planets.map(async (planet) => ({
      planet,
      oceans: await getOceans(planet.id),
    }))
  );

  let imageCount = 0;

  return (
    <>

      <main
        className="min-h-[calc(100vh-113px)] flex-1 overflow-y-auto p-4 pt-0 md:pl-64"
        id="main-content"
      >
        <div className="w-full p-4">
      {planetsWithOceans.map(({ planet, oceans }) => (
        <div key={planet.name}>
          <h2 className="text-xl font-semibold">{planet.name}</h2>
          <div className="flex flex-row flex-wrap justify-center gap-2 border-b-2 py-4 sm:justify-start">
            {oceans.map((ocean) => (
              <Link
                prefetch={true}
                key={ocean.slug}
                className="flex w-[125px] flex-col items-center text-center"
                href={`/${planet.slug}/${ocean.slug}`}
              >
                <Image
                  loading={imageCount++ < 15 ? "eager" : "lazy"}
                  decoding="sync"
                  src={ocean.metadata?.image_url ?? "/placeholder.svg"}
                  alt={`A small picture of ${ocean.title}`}
                  className="mb-2 h-14 w-14 border hover:bg-accent2"
                  width={48}
                  height={48}
                  quality={65}
                />
                <span className="text-xs">{ocean.title}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
      </div>
      </main>
    </>
  );
}
