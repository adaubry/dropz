import { getPlanets, getUser } from "@/lib/queries";
import { Link } from "@/components/ui/link";
import { Globe } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getUser();
  const planets = await getPlanets();

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4">🌍 Dropz</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Knowledge management made simple
          </p>
          {user && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Welcome back, {user.username}!
            </p>
          )}
        </div>

        {planets.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-center">
              Explore Planets
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {planets.map((planet) => (
                <Link
                  key={planet.id}
                  href={`/${planet.slug}`}
                  className="block p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-shadow bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Globe className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg">{planet.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        /{planet.slug}
                      </p>
                    </div>
                  </div>
                  {planet.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {planet.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {planets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No planets yet. {user ? "Create your first one!" : "Be the first to create one!"}
            </p>
            {user && (
              <Link
                href="/profile"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Profile
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
