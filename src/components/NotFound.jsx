import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 px-5 pb-16 pt-36 text-white sm:px-8 md:pt-44">
      <section className="qa-container-narrow mx-auto">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-500">
          OneSmarter
        </p>
        <h1 className="mt-4 break-words text-4xl font-bold sm:text-5xl">
          Page Not Found
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-gray-300 sm:text-lg">
          The page you requested could not be found. It may have moved, or the
          address may be incomplete.
        </p>

        <nav className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link
            to="/"
            className="rounded border border-white/15 bg-white/[0.04] px-5 py-4 font-semibold text-white transition hover:border-red-500 hover:text-red-100"
          >
            Home
          </Link>
          <Link
            to="/platforms"
            className="rounded border border-white/15 bg-white/[0.04] px-5 py-4 font-semibold text-white transition hover:border-red-500 hover:text-red-100"
          >
            Platforms
          </Link>
          <Link
            to="/trust-center"
            className="rounded border border-white/15 bg-white/[0.04] px-5 py-4 font-semibold text-white transition hover:border-red-500 hover:text-red-100"
          >
            Trust Center
          </Link>
          <Link
            to="/contact"
            className="rounded border border-white/15 bg-white/[0.04] px-5 py-4 font-semibold text-white transition hover:border-red-500 hover:text-red-100"
          >
            Contact
          </Link>
        </nav>
      </section>
    </main>
  );
};

export default NotFound;
