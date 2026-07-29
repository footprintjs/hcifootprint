/**
 * Hand-written declarations for scripts/check-doc-links.mjs so the repo test
 * suite can import `runLinkCheck`. Keep in lockstep with the .mjs.
 */
export interface BrokenLink {
  where: string;
  raw: string;
  note: string;
}

export interface LinkCheckResult {
  brokenPaths: BrokenLink[];
  brokenAnchors: BrokenLink[];
  docCount: number;
  idCount: number;
  routeCount: number;
  readmeLinks: number;
}

export declare function runLinkCheck(opts?: {
  docsRoot?: string;
  readmePath?: string;
}): LinkCheckResult;
