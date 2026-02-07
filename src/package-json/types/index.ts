export type DependencySection = 'dependencies' | 'devDependencies';

export interface ParsedDependency {
  name: string;
  wantedRange: string;
  section: DependencySection;
  sourceLabel?: string;
}

export interface ParseOptions {
  sourceLabel?: string;
}
