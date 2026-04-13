export interface GcTreeDocInput {
  title: string;
  slug?: string;
  summary: string;
  body: string;
  tags?: string[];
}

export interface GcTreeOnboardingInput {
  branch?: string;
  branchSummary?: string;
  docs: GcTreeDocInput[];
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
  title: string;
  path: string;
  score: number;
  summary: string;
  excerpt: string;
}
