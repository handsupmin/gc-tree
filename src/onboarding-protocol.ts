export function onboardingProtocolLines(): string[] {
  return [
    'This is **global context onboarding**, not repo-local onboarding.',
    'Ask **one question at a time** and keep using the saved workflow language all the way through.',
    'Wait for the user\'s first answer before you inspect docs, repos, directories, or files on your own.',
    'Start by asking the user to paste or share organized docs or reference material if they have any; otherwise ask what kind of work they mainly do.',
    'Do **not** start with a repo scan, a company guess, or a broad hypothesis built from directories like `~/sources`.',
    'Do **not** ask for a full information dump up front.',
    'If docs, reference material, or reference paths are provided, read those first, summarize your understanding back, ask whether that summary is correct before continuing, and skip any questions the docs already answered well.',
    'If no docs are available, continue from the user\'s own description first, then after the user\'s first answer, proactively inspect related repos, docs, paths, and workflows that appear materially connected.',
    'Use bounded local inspection to confirm or challenge the user\'s description instead of waiting for the user to enumerate every related repo manually.',
    'Do **not** scan broad directories or inspect every source file; prefer docs, READMEs, summaries, and a few pointed paths first.',
    'Then ask whether anything important is still missing or worth adding before you continue into deeper discovery.',
    'When you do present a hypothesis, offer only these structured numbered confirmations: 1. This is mostly correct. 2. Some parts are wrong. Please explain what differs. 3. Most of this is wrong. Please explain the right frame.',
    'If the user picks 2 or 3, ask only for the delta, correction, or right frame instead of restarting from scratch.',
    'Do **not** start by asking what one repository does.',
    'Only ask the user who they are, what kind of person they are in the organization, and what work they usually own or lead after the provided docs or description still leave real gaps.',
    'Ask next for one core recurring work type only when the provided docs or description still do not make the work types clear, then ask whether there are more work types to capture.',
    'For each work type, ask how that work shows up day to day.',
    'Only after the work types are clear should you ask which repositories are involved in each work type.',
    'For each repository, ask what role it plays in the work, what directories or files matter most, what the actual workflow is, and what hidden conventions, glossary terms, or boundaries matter.',
    'After the user\'s first answer, proactively inspect relevant local repos, docs, paths, and workflows whenever the connection is strong enough to test your current frame.',
    'Ask whether there are additional repositories for the current work type before moving on.',
    'After repository coverage, ask for company/domain glossary terms and acronyms that should become durable context.',
    'Then ask which verification commands should be treated as defaults for this kind of work.',
    'Synthesize the interview into durable docs such as a role/profile summary, work types, repository roles, glossary, and verification defaults.',
  ];
}

export function onboardingCompletionLines(): string[] {
  return [
    'Before you claim onboarding is complete, run `gctree verify-onboarding --branch <current-gc-branch>` and inspect the real gc-tree files.',
    'Do not claim onboarding is complete unless verification returns `status: "complete"`.',
    'After applying the onboarding docs, explicitly list which durable docs were saved.',
    'Then summarize what you now understand from the saved docs instead of stopping at the filenames alone.',
    'Ask whether that final summary matches the user\'s reality, and capture any corrections before you wrap up.',
    'Ask whether anything else should be saved while the context is still fresh.',
    'Do not finish onboarding while material related repos, workflows, or domain terms remain uninspected when recoverable local evidence is still available.',
    'Only after the related repos, workflows, glossary, and default verification commands are either captured or explicitly unavailable should you wrap up, then remind the user that future changes belong in `gctree update-global-context`.',
  ];
}
