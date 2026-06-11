# Security policy

## What askfirst is — and is not

`askfirst` is a **UX layer, not a security boundary**. Its risk classifications
and intent screens are pattern-based heuristics designed to make approval
prompts understandable to humans. They do not sandbox, isolate, or enforce
anything, and a crafted command can evade them. If your product relies on
`askfirst` alone to contain an agent, that is a design flaw in the product,
not a vulnerability in this library.

Pair this library with real isolation — containers, OS permission systems,
allowlists, model-side refusals — for actual containment.

## Reporting

That said, we want to know about:

- Classifier results that are **confidently wrong in a dangerous direction**
  (e.g. an obviously destructive command explained as routine work).
- Bugs that make the library misrepresent an action to the person approving it.
- Anything in the published package that should not be there.

Please open a [GitHub issue](https://github.com/iomoth/askfirst/issues) for
classifier gaps — they are heuristic-quality discussions, not exploitable
secrets, and public reports help everyone. For anything you believe is
genuinely sensitive, use GitHub's private vulnerability reporting on this
repository.

## Supported versions

Only the latest published version receives fixes.
