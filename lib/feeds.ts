// Public RSS feeds. Free, no keys, no rate limits.
// `section` is only a hint — the AI re-files every article.
export type Feed = { source: string; url: string; region: "pk" | "global"; section: string };

export const FEEDS: Feed[] = [
  // ── Pakistan
  { source: "Dawn", url: "https://www.dawn.com/feeds/home", region: "pk", section: "Pakistan" },
  { source: "Dawn", url: "https://www.dawn.com/feeds/business", region: "pk", section: "Business" },
  { source: "Dawn", url: "https://www.dawn.com/feeds/sport", region: "pk", section: "Sport" },
  { source: "Dawn", url: "https://www.dawn.com/feeds/world", region: "pk", section: "World" },
  { source: "Express Tribune", url: "https://tribune.com.pk/feed/home", region: "pk", section: "Pakistan" },
  { source: "Express Tribune", url: "https://tribune.com.pk/feed/business", region: "pk", section: "Business" },
  { source: "Geo News", url: "https://www.geo.tv/rss/1/1", region: "pk", section: "Pakistan" },
  { source: "The News", url: "https://www.thenews.com.pk/rss/1/1", region: "pk", section: "Pakistan" },
  { source: "Business Recorder", url: "https://www.brecorder.com/feeds/latest-news", region: "pk", section: "Markets" },
  // ── World
  { source: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml", region: "global", section: "World" },
  { source: "BBC", url: "https://feeds.bbci.co.uk/news/business/rss.xml", region: "global", section: "Business" },
  { source: "BBC", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", region: "global", section: "Technology" },
  { source: "BBC", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", region: "global", section: "Science" },
  { source: "BBC", url: "https://feeds.bbci.co.uk/news/health/rss.xml", region: "global", section: "Health" },
  { source: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", region: "global", section: "World" },
  { source: "The Guardian", url: "https://www.theguardian.com/world/rss", region: "global", section: "World" },
  { source: "The Guardian", url: "https://www.theguardian.com/business/rss", region: "global", section: "Business" },
  { source: "The Guardian", url: "https://www.theguardian.com/environment/climate-crisis/rss", region: "global", section: "Climate" },
  { source: "The Guardian", url: "https://www.theguardian.com/culture/rss", region: "global", section: "Culture" },
  { source: "The Guardian", url: "https://www.theguardian.com/commentisfree/rss", region: "global", section: "Ideas" },
  { source: "NPR", url: "https://feeds.npr.org/1001/rss.xml", region: "global", section: "World" },
  { source: "NPR Politics", url: "https://feeds.npr.org/1014/rss.xml", region: "global", section: "Politics" },
  { source: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", region: "global", section: "Markets" },
  // ── Technology & AI
  { source: "The Verge", url: "https://www.theverge.com/rss/index.xml", region: "global", section: "Technology" },
  { source: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", region: "global", section: "Technology" },
  { source: "TechCrunch", url: "https://techcrunch.com/feed/", region: "global", section: "Technology" },
  { source: "Wired", url: "https://www.wired.com/feed/rss", region: "global", section: "Technology" },
  { source: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", region: "global", section: "AI" },
  { source: "Hacker News", url: "https://hnrss.org/frontpage?points=150", region: "global", section: "Technology" },
  // ── Science
  { source: "Nature", url: "https://www.nature.com/nature.rss", region: "global", section: "Science" },
  { source: "NASA", url: "https://www.nasa.gov/news-release/feed/", region: "global", section: "Science" },
  { source: "Quanta", url: "https://api.quantamagazine.org/feed/", region: "global", section: "Science" },
  // ── Sport
  { source: "ESPNcricinfo", url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml", region: "global", section: "Cricket" },
  { source: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", region: "global", section: "Sport" },
  { source: "The Guardian", url: "https://www.theguardian.com/football/rss", region: "global", section: "Sport" },
];
