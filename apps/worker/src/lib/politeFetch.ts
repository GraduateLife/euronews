const USER_AGENT = "euronews-pt-reading-lab/0.1 (personal language-learning project; one fetch per day)";
// Some CDNs reject unknown agents outright; we retry once with a browser UA.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/**
 * Fetch with the honest User-Agent first; if the server rejects it with a
 * 4xx (bot filtering), retry once as a regular browser. Network-level
 * failures are wrapped with the URL so the /refresh error is diagnosable.
 */
export async function politeFetch(url: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xml;q=0.9,*/*;q=0.8" },
    });
  } catch (error) {
    throw new Error(`network error fetching ${url}: ${String(error)} (is this machine able to reach euronews?)`);
  }
  if (response.ok || response.status < 400 || response.status >= 500) return response;

  try {
    return await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.7",
      },
    });
  } catch (error) {
    throw new Error(`network error fetching ${url}: ${String(error)}`);
  }
}
