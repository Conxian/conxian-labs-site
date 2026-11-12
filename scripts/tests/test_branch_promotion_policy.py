from __future__ import annotations

import re
import unittest
from pathlib import Path

from scripts.branch_promotion_policy import (
    BOOTSTRAP_EXCEPTION,
    BootstrapException,
    PullRequestContext,
    validate_pull_request,
)


REPO = "Conxian/conxian-labs-site"
SOURCE_SHA = "a" * 40
TARGET_SHA = "b" * 40
ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_PATH = ROOT / ".github/workflows/branch-promotion-policy.yml"

FEATURE_BODY = """<!-- PROMOTION:FEATURE->DEV -->
### Feature -> dev promotion checklist
- [x] scoped
"""
STAGED_BODY = """<!-- PROMOTION:DEV->STAGED -->
### Dev -> staged promotion checklist
- [x] wallet boundary
- [x] signer boundary
- [x] treasury boundary
- [x] deployment boundary
"""
MAIN_BODY = """### Mainnet acceptance evidence pack
#### Promotion metadata
- Source: staged
- Promotion source SHA: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`

#### Mainnet-only production scope
- Conxian Labs public site production artifact

#### Contamination and residue proof
- Residue scan result: PASS

#### Successful production validation
- CI run: https://github.com/Conxian/conxian-gateway/actions/runs/123456789
- Required checks: green
"""

EMPTY_MAIN_BODY = """### Mainnet acceptance evidence pack
#### Promotion metadata
#### Mainnet-only production scope
#### Contamination and residue proof
#### Successful production validation
"""

PLACEHOLDER_MAIN_BODY = """### Mainnet acceptance evidence pack
#### Promotion metadata
Complete all fields required by `openspec/specs/mainnet-acceptance-evidence-pack/spec.md`.

#### Mainnet-only production scope
Complete before review.

#### Contamination and residue proof
Complete before review.

#### Successful production validation
Complete before review.
"""

# System-gated pack whose evidence tokens are missing/incomplete.
NO_TOKENS_MAIN_BODY = """### Mainnet acceptance evidence pack
#### Promotion metadata
- Source: staged
- Promotion source SHA: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`

#### Mainnet-only production scope
- Gateway release v0.1.5

#### Contamination and residue proof
- No testnet residue found

#### Successful production validation
- Smoke tests green
"""
GENERATED_EVIDENCE = f"""
- Promotion source SHA: `{SOURCE_SHA}`
- Promotion target-base SHA: `{TARGET_SHA}`
- Promotion commit window: `{TARGET_SHA}..{SOURCE_SHA}`
"""


def context(
    head: str,
    base: str,
    body: str,
    *,
    number: int = 100,
    head_repo: str | None = REPO,
    actor: str = "contributor",
    head_sha: str = SOURCE_SHA,
    base_sha: str = TARGET_SHA,
) -> PullRequestContext:
    return PullRequestContext(
        number=number,
        base_ref=base,
        head_ref=head,
        base_sha=base_sha,
        head_sha=head_sha,
        base_repo=REPO,
        head_repo=head_repo,
        body=body,
        actor=actor,
    )


class BranchPromotionPolicyTests(unittest.TestCase):
    def test_agent_named_branches_cannot_bypass_promotion_chain(self) -> None:
        for head in ("jules-1234", "jules/discovery-report", "dev-unreviewed"):
            with self.subTest(head=head, base="dev"):
                self.assertRejected(context(head, "dev", FEATURE_BODY))
            with self.subTest(head=head, base="staged"):
                self.assertRejected(context(head, "staged", STAGED_BODY))
            with self.subTest(head=head, base="main"):
                self.assertRejected(context(head, "main", MAIN_BODY))

    def assertAccepted(self, ctx: PullRequestContext, exception: BootstrapException | None = None) -> None:
        errors = validate_pull_request(ctx, exception or BootstrapException(0))
        self.assertEqual([], errors)

    def assertRejected(self, ctx: PullRequestContext, exception: BootstrapException | None = None) -> None:
        errors = validate_pull_request(ctx, exception or BootstrapException(0))
        self.assertTrue(errors)

    def test_ordinary_work_routes_to_dev(self) -> None:
        for head in (
            "feature/governance",
            "feat/governance",
            "fix/governance",
            "docs/governance",
            "chore/governance",
            "hotfix/governance",
            "dependabot/pip/pyyaml-7",
            "infra/governance",
            "ops/governance",
            "ci/governance",
            "security/governance",
        ):
            with self.subTest(head=head):
                self.assertAccepted(context(head, "dev", FEATURE_BODY))

    def test_fork_ordinary_pr_routes_to_dev(self) -> None:
        self.assertAccepted(context("docs/governance", "dev", FEATURE_BODY, head_repo="fork/repo"))

    def test_dev_routes_to_staged(self) -> None:
        self.assertAccepted(context("dev", "staged", STAGED_BODY))

    def test_exact_generated_dev_candidate_routes_to_staged(self) -> None:
        self.assertAccepted(
            context(f"promotion/dev-to-staged-{SOURCE_SHA}", "staged", STAGED_BODY + GENERATED_EVIDENCE)
        )
        # Updating an immutable candidate requires a new branch and evidence.
        self.assertRejected(
            context(
                f"promotion/dev-to-staged-{SOURCE_SHA}",
                "staged",
                STAGED_BODY + GENERATED_EVIDENCE,
                head_sha="c" * 40,
            )
        )

    def test_dependabot_prs_to_dev_accepted_without_checklist(self) -> None:
        self.assertAccepted(
            context("dependabot/cargo/dev/reqwest-0.13.5", "dev", "", actor="dependabot[bot]")
        )

    def test_backmerge_branches_accepted_without_checklist(self) -> None:
        self.assertAccepted(context("backmerge/main-to-staged", "staged", ""))
        self.assertAccepted(context("backmerge/staged-to-dev", "dev", ""))

    def test_staged_routes_to_main(self) -> None:
        self.assertAccepted(context("staged", "main", MAIN_BODY))

    def test_exact_generated_staged_candidate_routes_to_main(self) -> None:
        self.assertAccepted(
            context(f"promotion/staged-to-main-{SOURCE_SHA}", "main", MAIN_BODY + GENERATED_EVIDENCE)
        )

    def test_forked_promotion_is_rejected(self) -> None:
        self.assertRejected(context("dev", "staged", STAGED_BODY, head_repo="fork/repo"))

    def test_malformed_or_wildcard_promotion_is_rejected(self) -> None:
        for head, base, body in (
            ("promotion/dev-to-staged", "staged", STAGED_BODY),
            ("promotion/anything", "main", MAIN_BODY),
            (f"promotion/dev-to-staged-{'A' * 40}", "staged", STAGED_BODY),
        ):
            with self.subTest(head=head):
                self.assertRejected(context(head, base, body))

    def test_direct_dev_to_main_is_rejected(self) -> None:
        self.assertRejected(context("dev", "main", MAIN_BODY))

    def test_dependabot_to_main_is_rejected(self) -> None:
        self.assertRejected(
            context("dependabot/pip/pyyaml-7", "main", MAIN_BODY, actor="dependabot[bot]")
        )

    def test_direct_work_branch_to_main_is_rejected(self) -> None:
        for head in (
            "fix/governance",
            "feature/governance",
            "feat/governance",
            "docs/governance",
            "chore/governance",
        ):
            with self.subTest(head=head):
                self.assertRejected(context(head, "main", MAIN_BODY))

    def test_direct_work_branch_to_staged_is_rejected(self) -> None:
        for head in ("feature/governance", "fix/governance"):
            with self.subTest(head=head):
                self.assertRejected(context(head, "staged", STAGED_BODY))

    def test_missing_checklist_or_evidence_is_rejected(self) -> None:
        self.assertRejected(context("fix/no-checklist", "dev", ""))
        self.assertRejected(context("dev", "staged", ""))
        self.assertRejected(context("staged", "main", ""))

    def test_empty_or_placeholder_evidence_pack_is_rejected(self) -> None:
        self.assertRejected(context("staged", "main", EMPTY_MAIN_BODY))
        self.assertRejected(context("staged", "main", PLACEHOLDER_MAIN_BODY))

    def test_system_gated_evidence_tokens_are_required(self) -> None:
        # Complete headings but no machine-checkable evidence tokens -> rejected.
        errors = validate_pull_request(
            context("staged", "main", NO_TOKENS_MAIN_BODY), BootstrapException(0)
        )
        joined = " ".join(errors)
        self.assertIn("CI run URL", joined)
        self.assertIn("Required checks: green", joined)
        self.assertIn("Residue scan result: PASS", joined)

    def test_system_gated_evidence_with_all_tokens_is_accepted(self) -> None:
        self.assertAccepted(context("staged", "main", MAIN_BODY))

    def test_system_gated_residue_token_must_be_pass(self) -> None:
        body = MAIN_BODY.replace("Residue scan result: PASS", "Residue scan result: FAIL")
        self.assertRejected(context("staged", "main", body))

    def test_system_gated_source_sha_must_match_head(self) -> None:
        # A generated candidate whose recorded source SHA does not match its head.
        body = MAIN_BODY + GENERATED_EVIDENCE
        self.assertRejected(
            context(f"promotion/staged-to-main-{SOURCE_SHA}", "main", body, head_sha="c" * 40)
        )

    def test_sha_body_mismatch_is_rejected(self) -> None:
        bad = GENERATED_EVIDENCE.replace(SOURCE_SHA, "c" * 40)
        self.assertRejected(
            context(f"promotion/dev-to-staged-{SOURCE_SHA}", "staged", STAGED_BODY + bad)
        )
        bad_target = GENERATED_EVIDENCE.replace(TARGET_SHA, "d" * 40)
        self.assertRejected(
            context(f"promotion/staged-to-main-{SOURCE_SHA}", "main", MAIN_BODY + bad_target)
        )

    def test_bootstrap_exception_accepts_only_exact_pr_head_base_and_repo(self) -> None:
        exception = BootstrapException(1234)
        exact = context(
            "promotion/con-1571-governance-bootstrap", "main", "", number=1234
        )
        self.assertAccepted(exact, exception)

        near_matches = (
            context("promotion/con-1571-governance-bootstrap", "main", "", number=1235),
            context("promotion/con-1571-governance-bootstrap-2", "main", "", number=1234),
            context("promotion/con-1571-governance-bootstrap", "staged", "", number=1234),
            context(
                "promotion/con-1571-governance-bootstrap",
                "main",
                "",
                number=1234,
                head_repo="fork/repo",
            ),
        )
        for candidate in near_matches:
            with self.subTest(candidate=candidate):
                self.assertRejected(candidate, exception)

    def test_configured_bootstrap_exception_is_disabled_for_this_repository(self) -> None:
        self.assertEqual(0, BOOTSTRAP_EXCEPTION.pr_number)
        self.assertRejected(
            context("promotion/con-1571-governance-bootstrap", "main", "", number=971),
            BOOTSTRAP_EXCEPTION,
        )


class BranchPromotionWorkflowTrustBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.workflow = WORKFLOW_PATH.read_text(encoding="utf-8")

    def test_uses_pull_request_target_not_pull_request(self) -> None:
        self.assertIn("pull_request_target:", self.workflow)
        self.assertIsNone(re.search(r"^\s+pull_request:\s*$", self.workflow, re.MULTILINE))

    def test_retains_explicit_read_only_permissions(self) -> None:
        self.assertRegex(self.workflow, r"(?m)^permissions:\n  contents: read\n  pull-requests: read$")

    def test_checks_out_only_the_default_branch_shallowly(self) -> None:
        self.assertIn("ref: ${{ github.event.repository.default_branch }}", self.workflow)
        self.assertIn("fetch-depth: 1", self.workflow)
        self.assertIn("persist-credentials: false", self.workflow)
        for forbidden in (
            "merge_commit_sha",
            "github.event.pull_request.head.sha",
            "github.event.pull_request.head.ref",
            "github.head_ref",
        ):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, self.workflow)

    def test_does_not_interpolate_pr_controlled_data_into_commands(self) -> None:
        self.assertNotIn("${{ github.event.pull_request", self.workflow)
        self.assertEqual(
            ['python3 scripts/branch_promotion_policy.py --event-path "$GITHUB_EVENT_PATH"'],
            re.findall(r"^\s+run:\s*(.+)$", self.workflow, re.MULTILINE),
        )

    def test_enforcement_uses_no_pr_controlled_code(self) -> None:
        uses = re.findall(r"^\s+uses:\s*(\S+)", self.workflow, re.MULTILINE)
        self.assertEqual(1, len(uses))
        self.assertTrue(uses[0].startswith("actions/checkout@"))
        self.assertNotIn("path:", self.workflow)



if __name__ == "__main__":
    unittest.main()
