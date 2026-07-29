/**
 * Hand-written declarations for lib/doc-ids.mjs so the repo's TypeScript test
 * suite (tsconfig.test.json, NodeNext resolution) can import the module. Keep in
 * lockstep with the .mjs — this file only mirrors the exported shapes.
 */
export declare const DOCS_ROOT: string;
export declare const BASE_URL: string;

export interface DocIdEntry {
  route: string;
  file: string;
  anchors: Set<string>;
}

export declare function walk(dir: string, out?: string[]): string[];
export declare function fileToRoute(file: string, root?: string): string;
export declare function fileToId(file: string, root?: string): string;
export declare function headingSlugs(content: string): Set<string>;
export declare function buildIdMap(root?: string): Map<string, DocIdEntry>;
export declare function buildRouteSet(root?: string): Set<string>;
