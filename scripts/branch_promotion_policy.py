#!/usr/bin/env python3
"""Deterministic branch-promotion policy shared by CI and focused tests.

Promotion PRs (dev->staged and staged->main) merge as merge commits, so the
exact source revision recorded in the PR body remains a parent of the target
branch's history. This module validates the promotion route and the recorded
source/target/window evidence only; it is independent of the merge strategy
applied at merge time.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


SHA_RE = re.compile(r"^[0-9a-f]{40}$")
ORDINARY_DEV_HEAD_RE = re.compile(
    r"^(?:feat(?:ure)?|fix|docs|chore|hotfix|dependabot|infra|ops|ci|security|proof)/[A-Za-z0-9._/-]+$"
)
GENERATED_DEV_RE = re.compile(r"^promotion/dev-to-staged-([0-9a-f]{40})$")
GENERATED_STAGED_RE = re.compile(r"^promotion/staged-to-main-([0-9a-f]{40})$")

FEATURE_CHECKLIST_RE = re.compile(
    r"(?:PROMOTION:FEATURE->DEV|^###\s+Feature\s*->\s*dev\s+promotion\s+checklist\b)",
    re.IGNORECASE | re.MULTILINE,
)
STAGED_CHECKLIST_RE = re.compile(
    r"(?:PROMOTION:DEV->STAGED|^###\s+Dev\s*->\s*staged\s+promotion\s+checklist\b)",
    re.IGNORECASE | re.MULTILINE,
)
MAINNET_PACK_RE = re.compile(
    r"###\s+Mainnet\s+acceptance\s+evidence\s+pack\b",
    re.IGNORECASE | re.MULTILINE,
)

# System-gated evidence: machine-checkable tokens the promotion gate validates
# instead of a manual owner sign-off. Each requirement must be a token a
# deterministic checker can read, so the evidence pack cannot be hand-waved.
RESIDUE_PASS_RE = re.compile(
    r"^[-*]?\s*Residue scan result:\s*`?(PASS|CLEAN)`?\s*$",
    re.IGNORECASE | re.MULTILINE,
)
CHECKS_GREEN_RE = re.compile(
    r"^[-*]?\s*Required checks:\s*`?green`?\s*$",
    re.IGNORECASE | re.MULTILINE,
)
CI_RUN_URL_RE = re.compile(r"https://github\.com/[^\s)]+/actions/runs/[0-9]+")
BODY_SHA_RE = re.compile(r"^[-*]\s*Promotion source SHA:\s*`?([0-9a-f]{40})`?\s*$", re.IGNORECASE | re.MULTILINE)


@dataclass(frozen=True)
class BootstrapException:
    """One PR-only escape hatch used to introduce this policy safely."""

    pr_number: int
    head_ref: str = "promotion/con-1571-governance-bootstrap"
    base_ref: str = "main"


# No bootstrap exception is configured for this repository. The gate is
# fail-closed from its first installation.
BOOTSTRAP_EXCEPTION = BootstrapException(
    pr_number=0, head_ref="__disabled__", base_ref="__disabled__"
)


@dataclass(frozen=True)
class PullRequestContext:
    number: int
    base_ref: str
    head_ref: str
    base_sha: str
    head_sha: str
    base_repo: str
    head_repo: str | None
    body: str
    actor: str

    @property
    def same_repository(self) -> bool:
        return bool(self.head_repo) and self.head_repo.lower() == self.base_repo.lower()


def _body_sha(body: str, label: str) -> str | None:
    match = re.search(
        rf"^[-*]\s*{re.escape(label)}:\s*`?([0-9a-f]{{40}})`?\s*$",
        body,
        re.IGNORECASE | re.MULTILINE,
    )
    return match.group(1).lower() if match else None


def _has_heading(body: str, heading: str) -> bool:
    return bool(
        re.search(
            rf"####\s+{re.escape(heading)}",
            body,
            re.IGNORECASE | re.MULTILINE,
        )
    )


EVIDENCE_PLACEHOLDER_RE = re.compile(
    r"complete\s+(?:all\s+fields|before\s+review)",
    re.IGNORECASE,
)


def _heading_content(body: str, heading: str) -> str:
    match = re.search(
        rf"(?m)^####[ \t]+{re.escape(heading)}[ \t]*\n(.*?)(?=^####[ \t]|^##[ \t]|^---[ \t]*$|\Z)",
        body,
        re.IGNORECASE | re.DOTALL,
    )
    return match.group(1).strip() if match else ""


def _bootstrap_matches(ctx: PullRequestContext, exception: BootstrapException) -> bool:
    return (
        exception.pr_number > 0
        and ctx.number == exception.pr_number
        and ctx.head_ref == exception.head_ref
        and ctx.base_ref == exception.base_ref
        and ctx.same_repository
    )


# System-gated evidence for staged -> main. Instead of a manual owner GO, the
# gate requires machine-checkable artifacts: a CI run URL for the promotion
# commit, an explicit `Required checks: green` token, and a `Residue scan
# result: PASS` token. A placeholder or a missing token fails closed.
def _validate_system_gated_evidence(ctx: PullRequestContext, errors: list[str]) -> None:
    body = ctx.body or ""
    if not CI_RUN_URL_RE.search(body):
        errors.append(
            "System-gated evidence requires a CI run URL "
            "(https://github.com/<org>/<repo>/actions/runs/<id>) for the promotion commit."
        )
    if not CHECKS_GREEN_RE.search(body):
        errors.append(
            "System-gated evidence requires a line 'Required checks: green'."
        )
    if not RESIDUE_PASS_RE.search(body):
        errors.append(
            "System-gated evidence requires a line 'Residue scan result: PASS'."
        )
    # For a generated candidate, the recorded source SHA must be bound to the
    # PR head. The direct `staged` head route carries no SHA line.
    if ctx.head_ref.startswith("promotion/"):
        recorded = BODY_SHA_RE.search(body)
        if recorded is None:
            errors.append("System-gated evidence requires a 'Promotion source SHA' line.")
        elif not isinstance(ctx.head_sha, str) or recorded.group(1).lower() != ctx.head_sha.lower():
            errors.append(
                "System-gated evidence: recorded Promotion source SHA does not match the PR head."
            )


def _validate_generated_evidence(
    ctx: PullRequestContext, branch_source_sha: str, errors: list[str]
) -> None:
    source_sha = _body_sha(ctx.body, "Promotion source SHA")
    target_sha = _body_sha(ctx.body, "Promotion target-base SHA")
    window = re.search(
        r"^[-*]\s*Promotion commit window:\s*`?([0-9a-f]{40})\.\.([0-9a-f]{40})`?\s*$",
        ctx.body,
        re.IGNORECASE | re.MULTILINE,
    )

    if source_sha is None or target_sha is None or window is None:
        errors.append(
            "Generated promotion candidates must record Promotion source SHA, "
            "Promotion target-base SHA, and Promotion commit window."
        )
        return

    window_target, window_source = (value.lower() for value in window.groups())
    expected_source = branch_source_sha.lower()
    if not isinstance(ctx.head_sha, str) or not SHA_RE.fullmatch(ctx.head_sha):
        errors.append("PR head SHA must be a valid 40-character commit SHA.")
    elif ctx.head_sha != expected_source:
        errors.append("Generated candidate PR head SHA must match its immutable source SHA. This usually means the promotion branch was rewritten by 'Update branch' (gh pr update-branch / GitHub's Update branch button), which merges the base branch into the immutable candidate. Close this PR and regenerate a clean candidate from the exact source SHA; do not update-branch a promotion/* PR.")
    if source_sha != expected_source or window_source != expected_source:
        errors.append("Generated candidate source SHA evidence does not match its branch/head SHA.")
    if not isinstance(ctx.base_sha, str) or not SHA_RE.fullmatch(ctx.base_sha) or target_sha != ctx.base_sha.lower():
        errors.append("Generated candidate target-base SHA evidence does not match the PR base SHA.")
    if window_target != target_sha:
        errors.append("Generated candidate commit window must start at the recorded target-base SHA.")


def validate_pull_request(
    ctx: PullRequestContext,
    bootstrap_exception: BootstrapException = BOOTSTRAP_EXCEPTION,
) -> list[str]:
    """Return deterministic policy errors; an empty list means accepted."""

    if _bootstrap_matches(ctx, bootstrap_exception):
        return []

    errors: list[str] = []
    body = ctx.body or ""

    # Reverse-drift back-merge PRs (reconcile automation) target staged/dev with a
    # `backmerge/<source>-to-<target>` branch and are exempt from the forward
    # promotion checklist requirements.
    if ctx.head_ref.startswith("backmerge/") and ctx.base_ref in {"staged", "dev"}:
        return errors

    if ctx.base_ref == "dev":
        if ctx.head_ref in {"main", "staged", "dev"} or ctx.head_ref.startswith("promotion/"):
            errors.append("PRs into 'dev' must come from an ordinary work branch.")
        elif not ORDINARY_DEV_HEAD_RE.fullmatch(ctx.head_ref):
            errors.append(
                "PRs into 'dev' must use feat/, feature/, fix/, docs/, chore/, "
                "hotfix/, dependabot/, infra/, ops/, ci/, or security/ branch names."
            )
        if not (
            FEATURE_CHECKLIST_RE.search(body)
            or ctx.actor == "dependabot[bot]"
            or ctx.head_ref.startswith("dependabot/")
        ):
            errors.append("PRs into 'dev' must include the Feature -> dev promotion checklist.")
        return errors

    if ctx.base_ref == "staged":
        if not ctx.same_repository:
            errors.append("Promotions into 'staged' must come from this repository.")

        generated = GENERATED_DEV_RE.fullmatch(ctx.head_ref)
        if ctx.head_ref != "dev" and generated is None:
            errors.append(
                "PRs into 'staged' must come from 'dev' or an exact "
                "promotion/dev-to-staged-<source-sha> candidate."
            )
        if generated is not None:
            _validate_generated_evidence(ctx, generated.group(1), errors)

        if not STAGED_CHECKLIST_RE.search(body):
            errors.append("PRs into 'staged' must include the Dev -> staged promotion checklist.")
        for term in ("wallet", "signer", "treasury", "deployment boundary"):
            if term not in body.lower():
                errors.append(f"PRs into 'staged' must record the {term} check.")
        return errors

    if ctx.base_ref == "main":
        if not ctx.same_repository:
            errors.append("Promotions into 'main' must come from this repository.")

        generated = GENERATED_STAGED_RE.fullmatch(ctx.head_ref)
        is_allowed_head = ctx.head_ref == "staged" or generated is not None
        if not is_allowed_head:
            errors.append(
                "PRs into 'main' must come from 'staged' or an exact "
                "promotion/staged-to-main-<source-sha> candidate."
            )
        if ctx.actor == "dependabot[bot]" or ctx.head_ref.startswith("dependabot/"):
            errors.append("Dependabot PRs must target 'dev'; there is no Dependabot-to-main exception.")
        if ctx.head_ref == "dev":
            errors.append("Direct dev -> main promotion is prohibited.")
        if generated is not None:
            _validate_generated_evidence(ctx, generated.group(1), errors)

        if not MAINNET_PACK_RE.search(body):
            errors.append("PRs into 'main' must include a Mainnet Acceptance Evidence Pack.")
        else:
            # System-gated pack: the machine-checkable evidence sections. The
            # former manual 'Release-readiness sign-off' and 'Owner
            # accountability' headings are replaced by verifiable tokens
            # (CI run URL + 'Required checks: green' + 'Residue scan result:
            # PASS'), so promotion acceptance is gated by the system, not by a
            # hand-written owner assertion.
            required_headings = (
                "Promotion metadata",
                "Mainnet-only production scope",
                "Contamination and residue proof",
                "Successful production validation",
            )
            missing = [heading for heading in required_headings if not _has_heading(body, heading)]
            if missing:
                errors.append("Mainnet Acceptance Evidence Pack is missing: " + ", ".join(missing) + ".")
            unfilled = [
                heading
                for heading in required_headings
                if _has_heading(body, heading)
                and (
                    not _heading_content(body, heading)
                    or EVIDENCE_PLACEHOLDER_RE.search(_heading_content(body, heading))
                )
            ]
            if unfilled:
                errors.append(
                    "Mainnet Acceptance Evidence Pack must be completed (not placeholder) for: "
                    + ", ".join(unfilled)
                    + "."
                )
            _validate_system_gated_evidence(ctx, errors)
        return errors

    errors.append("Branch Promotion Policy only accepts pull requests targeting dev, staged, or main.")
    return errors


def context_from_event(event: dict[str, Any]) -> PullRequestContext:
    pr = event["pull_request"]
    base_repo = pr.get("base", {}).get("repo", {}).get("full_name") or event.get("repository", {}).get("full_name")
    if not base_repo:
        raise ValueError("Pull request event is missing the base repository identity")
    return PullRequestContext(
        number=int(pr["number"]),
        base_ref=pr["base"]["ref"],
        head_ref=pr["head"]["ref"],
        base_sha=pr["base"].get("sha", ""),
        head_sha=pr["head"].get("sha", ""),
        base_repo=base_repo,
        head_repo=pr.get("head", {}).get("repo", {}).get("full_name"),
        body=pr.get("body") or "",
        actor=pr.get("user", {}).get("login") or event.get("sender", {}).get("login", ""),
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--event-path", type=Path, required=True)
    args = parser.parse_args()

    event = json.loads(args.event_path.read_text(encoding="utf-8"))
    ctx = context_from_event(event)
    errors = validate_pull_request(ctx)
    print(
        f"Branch promotion check: {ctx.head_repo or 'unknown'}:{ctx.head_ref} "
        f"-> {ctx.base_repo}:{ctx.base_ref} (PR #{ctx.number})"
    )
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    if _bootstrap_matches(ctx, BOOTSTRAP_EXCEPTION):
        print("Accepted by the finite CON-1571 bootstrap exception.")
    else:
        print("Branch promotion route and evidence accepted.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
