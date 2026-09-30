import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  searchChannels,
  getLiveStreams,
  type Channel,
  type LiveStream,
} from "@/lib/youtube.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LiveOnly — Watch YouTube Channels Live" },
      {
        name: "description",
        content:
          "Search any YouTube channel and watch only what is streaming live right now. Nothing loads until you open a profile.",
      },
      { property: "og:title", content: "LiveOnly — Watch YouTube Channels Live" },
      {
        property: "og:description",
        content: "Search a channel, open its profile, and watch its live streams only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Channel | null>(null);
  const [watching, setWatching] = useState<LiveStream | null>(null);

  const doSearch = useServerFn(searchChannels);
  const doLive = useServerFn(getLiveStreams);

  const search = useMutation({
    mutationFn: (query: string) => doSearch({ data: { q: query } }),
  });
  const live = useMutation({
    mutationFn: (channelId: string) => doLive({ data: { channelId } }),
  });

  const openProfile = (c: Channel) => {
    setActive(c);
    setWatching(null);
    live.mutate(c.id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <h1 className="text-3xl font-black tracking-tight">
            LIVE<span className="text-primary">ONLY</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Search a channel, open its profile, watch what's live. Nothing else.
          </p>

          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setActive(null);
              setWatching(null);
              if (q.trim()) search.mutate(q.trim());
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search YouTube channels…"
              className="flex-1 rounded-md border border-input bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="submit"
              disabled={search.isPending}
              className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {search.isPending ? "…" : "Search"}
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        {search.isError && (
          <p className="text-sm text-destructive">
            Channel search failed. {(search.error as Error).message}
          </p>
        )}

        {!active && search.data && search.data.length === 0 && (
          <p className="text-sm text-muted-foreground">No channels found.</p>
        )}

        {!active && search.data && search.data.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {search.data.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => openProfile(c)}
                  className="flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary"
                >
                  <img
                    src={c.thumbnail}
                    alt={c.title}
                    className="size-14 shrink-0 rounded-full object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{c.title}</span>
                    <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                      {c.description}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {active && (
          <section>
            <button
              onClick={() => {
                setActive(null);
                setWatching(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to results
            </button>

            <div className="mt-5 flex items-center gap-4">
              <img
                src={active.thumbnail}
                alt={active.title}
                className="size-16 rounded-full object-cover"
              />
              <div>
                <h2 className="text-xl font-bold">{active.title}</h2>
                <p className="text-xs text-muted-foreground">Live streams only</p>
              </div>
            </div>

            {watching && (
              <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
                <div className="aspect-video w-full">
                  <iframe
                    key={watching.videoId}
                    src={`https://www.youtube.com/embed/${watching.videoId}?autoplay=1`}
                    title={watching.title}
                    allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="size-full"
                  />
                </div>
                <p className="p-4 font-medium">{watching.title}</p>
              </div>
            )}

            <div className="mt-6">
              {live.isPending && (
                <p className="text-sm text-muted-foreground">Checking for live streams…</p>
              )}
              {live.isError && (
                <p className="text-sm text-destructive">
                  Couldn't load live streams. {(live.error as Error).message}
                </p>
              )}
              {live.data && live.data.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  This channel isn't live right now.
                </p>
              )}
              {live.data && live.data.length > 0 && (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {live.data.map((s) => (
                    <li key={s.videoId}>
                      <button
                        onClick={() => setWatching(s)}
                        className="w-full overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-primary"
                      >
                        <span className="relative block">
                          <img
                            src={s.thumbnail}
                            alt={s.title}
                            className="aspect-video w-full object-cover"
                          />
                          <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-[11px] font-bold uppercase text-primary-foreground">
                            Live
                          </span>
                        </span>
                        <span className="block p-3 text-sm font-medium">{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
