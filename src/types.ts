export type GcTreeProvider = 'codex' | 'claude-code';
export type GcTreeProviderMode = GcTreeProvider | 'both';

export interface GcTreeDocInput {
  title: string;
  slug?: string;
  summary: string;
  body: string;
  tags?: string[];
  category?: string;
  indexLabel?: string;
  indexEntries?: string[];
}

export interface GcTreeOnboardingInput {
  branch?: string;
  branchSummary?: string;
  docs: GcTreeDocInput[];
}

export interface GcTreeContextUpdateInput {
  branch?: string;
  branchSummary?: string;
  docs: GcTreeDocInput[];
}

export interface GcTreeSettings {
  version: 1;
  provider_mode: GcTreeProviderMode;
  preferred_provider: GcTreeProvider;
  preferred_language: string;
  updated_at: string;
}

export interface GcTreeProviderLaunchPlan {
  provider: GcTreeProvider;
  provider_mode: GcTreeProviderMode;
  preferred_language: string;
  binary: string;
  args: string[];
  target_dir: string;
  gc_branch: string;
  provider_command: string;
  launched: boolean;
}

export interface GcTreeProposalInput {
  branch?: string;
  title: string;
  summary: string;
  docs: GcTreeDocInput[];
}

export interface GcTreeProposalChange {
  path: string;
  title: string;
  summary: string;
  body: string;
  tags?: string[];
}

export interface GcTreeProposal {
  version: 1;
  id: string;
  status: 'proposed' | 'applied';
  branch: string;
  title: string;
  summary: string;
  created_at: string;
  applied_at?: string;
  changes: GcTreeProposalChange[];
}

export interface GcTreeBranchMeta {
  version: 1;
  branch: string;
  created_at: string;
  updated_at: string;
  summary: string;
}

export interface GcTreeResolveMatch {
  id: string;
  label: string;
  category: string;
  title: string;
  path: string;
  score: number;
  summary: string;
  excerpt: string;
}

export type GcTreeResolveStatus =
  | 'matched'
  | 'no_match'
  | 'empty_branch'
  | 'excluded'
  | 'doc_not_found'
  | 'no_related_docs';

export interface GcTreeDocRecord {
  id: string;
  title: string;
  label: string;
  category: string;
  path: string;
  summary: string;
  content: string;
}
