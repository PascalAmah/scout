import type {
  QuickSaveFounder,
  QuickSaveJob,
  QuickSaveStartup,
} from "@scout/types";
import type { DetectedPayload } from "../background/state";
import { isRemoteLocation } from "./job-meta";

export const config = {
  // Whole-site match: workatastartup is an Inertia SPA, so users often reach a
  // company/job page via client-side navigation from the home/search/directory
  // pages. Injecting everywhere (and re-detecting on path changes below) means
  // a company page is detected regardless of how the user got there.
  matches: ["https://www.workatastartup.com/*"],
};

/** The Inertia page payload: all company data is serialized into data-page. */
interface WaasCompany {
  name?: string;
  slug?: string;
  description?: string;
  url?: string | null;
  location?: string | null;
  teamSize?: number | null;
  industry?: string | null;
  founders?: { name?: string; bio?: string | null; linkedin?: string | null }[];
  jobs?: {
    id?: number;
    title?: string;
    location?: string | null;
    jobType?: string | null;
    salaryRange?: string | null;
  }[];
}

/** The job detail page (props.job) carries richer fields than the listing cards. */
interface WaasJob {
  id?: number;
  title?: string;
  location?: string | null;
  jobType?: string | null;
  salaryRange?: string | null;
  minExperience?: string | null;
  descriptionHtml?: string | null;
}

interface WaasPage {
  component?: string;
  url?: string;
  props?: { company?: WaasCompany; job?: WaasJob };
}

function parseDataPageFrom(el: Element | null): WaasPage | null {
  const raw = el?.getAttribute("data-page");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WaasPage;
  } catch {
    return null;
  }
}

/** Read the live DOM's data-page (fresh only on the initial server render). */
function parseDataPage(): WaasPage | null {
  return parseDataPageFrom(
    document.querySelector<HTMLElement>("div[data-page]"),
  );
}

/**
 * Inertia only writes data-page on the initial SSR render; after a client-side
 * navigation the DOM is re-rendered but the attribute keeps the previous page's
 * payload. The payload's `url` field identifies which route it belongs to, so a
 * mismatch means the attribute is stale and must not be trusted.
 */
function isFresh(page: WaasPage): boolean {
  if (page.url) return page.url === location.pathname;
  const slug = page.props?.company?.slug;
  if (slug) return location.pathname === `/companies/${slug}`;
  return true;
}

let cachedPath: string | null = null;
let cachedPage: WaasPage | null = null;

/** Re-fetch the current URL to get the fresh SSR payload (cached per route). */
async function fetchFreshDataPage(): Promise<WaasPage | null> {
  try {
    const resp = await fetch(location.href, { credentials: "same-origin" });
    if (!resp.ok) return null;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    return parseDataPageFrom(doc.querySelector("div[data-page]"));
  } catch {
    return null;
  }
}

async function getPage(): Promise<WaasPage | null> {
  const dom = parseDataPage();
  if (dom && isFresh(dom)) return dom;
  if (cachedPath === location.pathname && cachedPage) return cachedPage;
  const fresh = await fetchFreshDataPage();
  if (fresh) {
    cachedPath = location.pathname;
    cachedPage = fresh;
    return fresh;
  }
  return dom;
}

/** Resolve each job's canonical URL from the DOM anchors (which carry the full slug). */
function jobUrlByTitle(slug: string): Map<string, string> {
  const map = new Map<string, string>();
  const prefix = `/companies/${slug}/jobs/`;
  for (const a of Array.from(
    document.querySelectorAll<HTMLAnchorElement>(`a[href^="${prefix}"]`),
  )) {
    const title = a.textContent?.replace(/\s+/g, " ").trim();
    if (title) map.set(title, a.href);
  }
  return map;
}

/** Strip HTML from the job description for storage. */
function plainText(html?: string | null): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > 4000 ? `${text.slice(0, 4000)}…` : text;
}

function slugToName(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Company name from the page <title>/og:title (updated by Inertia's head
 * manager on every navigation, so it's a reliable last-resort signal). */
function companyNameFromTitle(): string | null {
  const og =
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
      ?.content ??
    document.querySelector<HTMLMetaElement>('meta[name="og:title"]')?.content;
  const raw = (og ?? document.title).split("|")[0]?.trim();
  if (!raw) return null;
  let name = raw.replace(/^jobs?\s+at\s+/i, "").trim();
  const at = name.split(/\s+at\s+/i);
  if (at.length > 1) name = at[at.length - 1].trim();
  name = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return name || null;
}

/**
 * Last-resort detection that reads the rendered page instead of data-page —
 * used only when the structured payload is unavailable. The rendered DOM
 * always reflects the current page (even after client-side navigation), so
 * this guarantees we surface *something* on a company/job page.
 */
function fallbackDetect(): DetectedPayload | null {
  const companyPath = location.pathname.match(/^\/companies\/([^/]+)\/?$/);
  const jobPath = location.pathname.match(/^\/jobs\/(\d+)\/?$/);
  if (!companyPath && !jobPath) return null;

  const name =
    companyNameFromTitle() ?? (companyPath ? slugToName(companyPath[1]) : null);
  if (!name) return null;

  const startup: QuickSaveStartup = {
    name,
    website: `https://www.workatastartup.com${
      companyPath ? `/companies/${companyPath[1]}` : ""
    }`,
  };

  if (jobPath) {
    const title = document.querySelector("h1")?.textContent?.trim() || null;
    return {
      source: "workatastartup",
      source_url: location.href,
      startup,
      job: { title: title ?? "Open role", url: location.href },
    };
  }

  const jobs: QuickSaveJob[] = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/"]'),
  )
    .filter((a) => {
      // Skip links inside the page footer / nav — those are category pages,
      // not individual job postings.
      if (a.closest('footer, nav, [role="navigation"]')) return false;
      const href = a.getAttribute('href') ?? '';
      // Only keep links that look like an individual job detail page
      // (numeric id or a deep slug under /jobs/), not category pages like
      // /jobs/software-engineer or /jobs/in/san-francisco.
      if (/\/jobs\/\d+/.test(href)) return true;
      if (/\/companies\/[^/]+\/jobs\//.test(href)) return true;
      return false;
    })
    .map((a) => a.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .filter(
      (t) =>
        t.length >= 3 &&
        t.length <= 80 &&
        !/view job|apply|interview process/i.test(t),
    )
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .map((title) => ({ title, url: null }));

  return { source: "workatastartup", source_url: location.href, startup, jobs };
}

async function detect(): Promise<DetectedPayload | null> {
  const page = await getPage();
  const props = page?.props;
  const company = props?.company;
  if (!company?.name) return fallbackDetect();

  const startup: QuickSaveStartup = {
    name: company.name,
    website:
      company.url ??
      `https://www.workatastartup.com/companies/${company.slug ?? ""}`,
  };

  const founders: QuickSaveFounder[] = (company.founders ?? [])
    .filter((f) => f.name?.trim())
    .map((f) => ({
      name: f.name,
      title: "Founder",
      bio: f.bio || null,
      linkedin_url: f.linkedin || null,
      twitter_url: null,
    }));

  // Job detail page: /jobs/<id> — save the startup plus exactly this job.
  const jobMatch = location.pathname.match(/^\/jobs\/(\d+)\/?$/);
  const job = props?.job;
  if (jobMatch && job?.title) {
    return {
      source: "workatastartup",
      source_url: location.href,
      startup,
      founders,
      job: {
        title: job.title,
        url:
          job.id != null ? `${location.origin}/jobs/${job.id}` : location.href,
        location: job.location || null,
        employment_type: job.jobType || null,
        seniority: job.minExperience || null,
        remote: job.location?.toLowerCase().includes("remote") ? true : null,
        description: plainText(job.descriptionHtml),
      },
    };
  }

  // Company page: /companies/<slug> — save the startup plus every listed job.
  const pathMatch = location.pathname.match(/^\/companies\/([^/]+)\/?$/);
  if (!pathMatch) return null;
  const slug = pathMatch[1];

  const urls = jobUrlByTitle(slug);
  const jobs: QuickSaveJob[] = (company.jobs ?? [])
    .filter((j) => j.title?.trim())
    .map((j) => ({
      title: j.title as string,
      url:
        urls.get(j.title as string) ??
        (j.id != null
          ? `${location.origin}/companies/${slug}/jobs/${j.id}`
          : null),
      location: j.location || null,
      employment_type: j.jobType || null,
      remote: isRemoteLocation(j.location),
    }));

  return {
    source: "workatastartup",
    source_url: location.href,
    startup,
    founders,
    jobs,
  };
}

const KEY = "scout_detected_waas";

async function run(force = false): Promise<void> {
  const payload = await detect();
  console.log("[scout] workatastartup detect", {
    path: location.pathname,
    detected: payload
      ? {
          name: payload.startup?.name,
          jobs: payload.jobs?.length ?? (payload.job ? 1 : 0),
        }
      : null,
  });
  if (!payload) return;
  if (!force && sessionStorage.getItem(KEY) === location.pathname) return;
  sessionStorage.setItem(KEY, location.pathname);
  void chrome.runtime
    .sendMessage({ type: "scout:detected", payload })
    .catch(() => {});
}

// The background asks the active tab to re-detect on popup open and expects
// the fresh payload back, so the popup never shows stale detection from
// another tab or an earlier navigation.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if ((message as { type?: string } | null)?.type === "scout:re-detect") {
    void detect().then((payload) => sendResponse({ payload }));
    return true;
  }
});

run();

// workatastartup navigates client-side between companies without a full page
// load, so re-detect on path changes.
let lastPath = location.pathname;
setInterval(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    void run();
  }
}, 1000);
