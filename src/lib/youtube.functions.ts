import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const API = "https://www.googleapis.com/youtube/v3";

function key() {
  // Cloudflare Workers expose bindings on globalThis.__env__ (set by the hosting runtime).
  const cfEnv = (globalThis as { __env__?: Record<string, unknown> }).__env__;
  const fromCf = cfEnv?.["YOUTUBE_API_KEY"];
  const k =
    (typeof fromCf === "string" && fromCf) ||
    (typeof process !== "undefined" ? process.env["YOUTUBE_API_KEY"] : undefined);
  if (!k) throw new Error("YOUTUBE_API_KEY is not configured");
  return k;
}

async function yt(path: string, params: Record<string, string>) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key());
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube request failed [${res.status}]: ${body}`);
  }
  return res.json();
}

export type Channel = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
};

export type LiveStream = {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
};

export const searchChannels = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ q: z.string().min(1).max(100) }).parse(data))
  .handler(async ({ data }): Promise<Channel[]> => {
    const json = await yt("search", {
      part: "snippet",
      type: "channel",
      maxResults: "12",
      q: data.q,
    });
    return (json.items ?? []).map((i: any) => ({
      id: i.snippet?.channelId ?? i.id?.channelId,
      title: i.snippet?.title ?? "",
      description: i.snippet?.description ?? "",
      thumbnail:
        i.snippet?.thumbnails?.high?.url ?? i.snippet?.thumbnails?.default?.url ?? "",
    }));
  });

export const getLiveStreams = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ channelId: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<LiveStream[]> => {
    const json = await yt("search", {
      part: "snippet",
      channelId: data.channelId,
      eventType: "live",
      type: "video",
      maxResults: "10",
      order: "date",
    });
    return (json.items ?? [])
      .filter((i: any) => i.id?.videoId)
      .map((i: any) => ({
        videoId: i.id.videoId,
        title: i.snippet?.title ?? "",
        thumbnail:
          i.snippet?.thumbnails?.high?.url ?? i.snippet?.thumbnails?.default?.url ?? "",
        publishedAt: i.snippet?.publishedAt ?? "",
      }));
  });
