export function onboardingProtocolLines(): string[] {
  return [
    'This is **global context onboarding**, not repo-local onboarding.',
    'Ask **one question at a time** and keep using the saved workflow language all the way through.',
    'Do **not** ask for a full information dump when you can inspect evidence first.',
    'Before the usual interview, inspect any relevant docs, repos, directories, or files that are already available in the current environment.',
    'If the user mentions a repository, path, file, or reference doc, inspect it before asking for corrections.',
    'Treat docs, repos, directories, and files as evidence to inspect, and infer likely role, work types, architecture boundaries, focus paths, and hidden conventions from what you can see.',
    'Present your hypothesis before asking the user to type more.',
    'Offer structured numbered confirmations such as: 1. This is basically correct. 2. Part of it is wrong. I will explain what differs. 3. This is the wrong frame. I will explain what you should inspect or how this gc-branch should be approached.',
    'If the user picks 2 or 3, ask only for the delta, correction, or better pointer instead of restarting from scratch.',
    'If organized docs, reference material, or reference paths exist, read those first, summarize your understanding back, ask whether that summary is correct before continuing, and skip any questions the docs already answered well.',
    'Then ask whether anything important is still missing or worth adding before you continue into deeper discovery.',
    'Do **not** start by asking what one repository does.',
    'Only ask the user who they are, what kind of person they are in the organization, and what work they usually own or lead after you have already inspected the available evidence and still need those gaps filled.',
    'Ask next for one core recurring work type only when the inspected evidence still does not make the work types clear, then ask whether there are more work types to capture.',
    'For each work type, ask how that work shows up day to day.',
    'Only after the work types are clear should you ask which repositories are involved in each work type.',
    'For each repository, ask what role it plays in the work, what directories or files matter most, what the actual workflow is, and what hidden conventions, glossary terms, or boundaries matter.',
    'If a repository is available in the current environment, inspect it and present a lightweight hypothesis before asking the user what is correct or wrong about that frame.',
    'Ask whether there are additional repositories for the current work type before moving on.',
    'After repository coverage, ask for company/domain glossary terms and acronyms that should become durable context.',
    'Then ask which verification commands should be treated as defaults for this kind of work.',
    'Synthesize the interview into durable docs such as a role/profile summary, work types, repository roles, glossary, and verification defaults.',
  ];
}

export function onboardingCompletionLines(): string[] {
  return [
    'After applying the onboarding docs, explicitly list which durable docs were saved.',
    'Then summarize what you now understand from the saved docs instead of stopping at the filenames alone.',
    'Ask whether that final summary matches the user\'s reality, and capture any corrections before you wrap up.',
    'Ask whether anything else should be saved while the context is still fresh.',
    'End with remaining risks, blind spots, or details that still need confirmation, then remind the user that future changes belong in `gctree update-global-context`.',
  ];
}
