export function onboardingProtocolLines(): string[] {
  return [
    'This is **global context onboarding**, not repo-local onboarding.',
    'Ask **one question at a time** and keep using the saved workflow language all the way through.',
    'Wait for the user\'s first answer before you inspect docs, repos, directories, or files on your own.',
    'Start by asking the user to paste or share organized docs or reference material if they have any; otherwise ask what kind of work they mainly do.',
    'Do **not** start with a repo scan, a company guess, or a broad hypothesis built from directories like `~/sources`.',
    'Do **not** ask for a full information dump up front.',
    'If docs, reference material, or reference paths are provided, read those first, summarize your understanding back, ask whether that summary is correct before continuing, and skip any questions the docs already answered well.',
    'If no docs are available, continue from the user\'s own description first and ask for the most relevant repo, path, or file only when needed.',
    'Only inspect docs, repos, directories, or files after the user has pointed you at them or confirmed they matter.',
    'When you inspect, dig only through the user-provided material and the minimum related files needed for the next question.',
    'Do **not** scan broad directories or inspect every source file; prefer docs, READMEs, summaries, and a few pointed paths first.',
    'Then ask whether anything important is still missing or worth adding before you continue into deeper discovery.',
    'When you do present a hypothesis, offer structured numbered confirmations such as: 1. This is basically correct. 2. Part of it is wrong. I will explain what differs. 3. This is the wrong frame. I will explain what you should inspect or how this gc-branch should be approached.',
    'If the user picks 2 or 3, ask only for the delta, correction, or better pointer instead of restarting from scratch.',
    'Do **not** start by asking what one repository does.',
    'Only ask the user who they are, what kind of person they are in the organization, and what work they usually own or lead after the provided docs or description still leave real gaps.',
    'Ask next for one core recurring work type only when the provided docs or description still do not make the work types clear, then ask whether there are more work types to capture.',
    'For each work type, ask how that work shows up day to day.',
    'Only after the work types are clear should you ask which repositories are involved in each work type.',
    'For each repository, ask what role it plays in the work, what directories or files matter most, what the actual workflow is, and what hidden conventions, glossary terms, or boundaries matter.',
    'If a relevant repo, path, or doc is available locally and the user has pointed you to it, inspect it and present a lightweight hypothesis before asking what is correct or wrong about that frame.',
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
