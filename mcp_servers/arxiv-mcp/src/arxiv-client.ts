import { XMLParser } from "fast-xml-parser";
import type { Paper, SearchResult } from "./types.js";

const BASE_URL = "http://export.arxiv.org/api/query";
const MIN_REQUEST_INTERVAL = 3000; // 3 seconds per arXiv rate limit

let lastRequestTime = 0;

async function throttledFetch(url: string): Promise<string> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`arXiv API error: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["entry", "author", "link", "category"].includes(name),
});

function parsePaper(entry: Record<string, unknown>): Paper {
  const links = (entry.link ?? []) as Array<Record<string, string>>;
  const categories = (entry.category ?? []) as Array<Record<string, string>>;
  const authors = (entry.author ?? []) as Array<Record<string, unknown>>;

  const pdfLink = links.find((l) => l["@_title"] === "pdf");
  const abstractLink = links.find((l) => l["@_rel"] === "alternate");

  const rawId = String(entry.id ?? "");
  // Extract just the arXiv ID from the full URL
  const id = rawId.replace("http://arxiv.org/abs/", "");

  return {
    id,
    title: String(entry.title ?? "").replace(/\s+/g, " ").trim(),
    authors: authors.map((a) => String(a.name ?? "")),
    abstract: String(entry.summary ?? "").replace(/\s+/g, " ").trim(),
    categories: categories.map((c) => String(c["@_term"] ?? "")),
    primaryCategory: String(
      (entry.primary_category as Record<string, string>)?.["@_term"] ?? categories[0]?.["@_term"] ?? "",
    ),
    published: String(entry.published ?? ""),
    updated: String(entry.updated ?? ""),
    pdfUrl: pdfLink?.["@_href"] ?? "",
    abstractUrl: abstractLink?.["@_href"] ?? rawId,
    comment: entry.comment ? String(entry.comment) : undefined,
    journalRef: entry.journal_ref ? String(entry.journal_ref) : undefined,
    doi: entry.doi ? String(entry.doi) : undefined,
  };
}

export async function searchPapers(params: {
  query: string;
  start?: number;
  maxResults?: number;
  sortBy?: "relevance" | "lastUpdatedDate" | "submittedDate";
  sortOrder?: "ascending" | "descending";
  categories?: string[];
}): Promise<SearchResult> {
  const {
    query,
    start = 0,
    maxResults = 10,
    sortBy = "relevance",
    sortOrder = "descending",
    categories,
  } = params;

  // Build search query with optional category filter
  let searchQuery = query;
  if (categories?.length) {
    const catFilter = categories.map((c) => `cat:${c}`).join("+OR+");
    searchQuery = `(${query})+AND+(${catFilter})`;
  }

  const url = new URL(BASE_URL);
  url.searchParams.set("search_query", searchQuery);
  url.searchParams.set("start", String(start));
  url.searchParams.set("max_results", String(Math.min(maxResults, 100)));
  url.searchParams.set("sortBy", sortBy);
  url.searchParams.set("sortOrder", sortOrder);

  const xml = await throttledFetch(url.toString());
  const parsed = parser.parse(xml);
  const feed = parsed.feed ?? parsed;

  const totalResults = parseInt(String(feed.totalResults ?? "0"), 10);
  const startIndex = parseInt(String(feed.startIndex ?? "0"), 10);
  const itemsPerPage = parseInt(String(feed.itemsPerPage ?? "0"), 10);

  const entries = feed.entry ?? [];
  const papers = Array.isArray(entries)
    ? entries.map(parsePaper)
    : entries.id
      ? [parsePaper(entries)]
      : [];

  return { totalResults, startIndex, itemsPerPage, papers };
}

export async function getPaperById(ids: string[]): Promise<Paper[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set("id_list", ids.join(","));
  url.searchParams.set("max_results", String(ids.length));

  const xml = await throttledFetch(url.toString());
  const parsed = parser.parse(xml);
  const feed = parsed.feed ?? parsed;

  const entries = feed.entry ?? [];
  if (!Array.isArray(entries)) {
    return entries.id ? [parsePaper(entries)] : [];
  }
  return entries.map(parsePaper);
}
