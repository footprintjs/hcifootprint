/** Test-facing declarations for the documentation helper, not package exports. */
interface PackageImports {
  name: string;
  exports: Record<string, unknown>;
}
export declare function publicImports(pkg: PackageImports): string[];
export declare function checkDocumentedImports(guide: string, pkg: PackageImports): void;
export declare function withPackageMetadata(guide: string, pkg: PackageImports & {
  version: string;
  engines: { node: string };
}): string;
