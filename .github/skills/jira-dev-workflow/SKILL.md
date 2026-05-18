---
name: jira-dev-workflow
description: Automatically complete the full development workflow from a Jira ticket number: read ticket content, create a git branch, implement code changes, commit, and create a PR. Use this skill when the user says "work on ticket QTDQ-XXX", "start developing QTDQ-XXX", "handle Jira ticket XXX", "do ticket XXX", "start working on QTDQ-XXX", or any statement containing a Jira ticket number with development intent. Trigger this skill even if the user only says "QTDQ-1100".
---

# Jira Dev Workflow Skill

Automates the complete development workflow from a Jira ticket to a Pull Request.

## Prerequisites Check

Before starting, silently verify the following (no need to ask the user):
- Current directory is a git repository (`git status`)
- A GitHub remote exists (`git remote -v`)
- Jira MCP tool (`jira_mcp`) is available

If the git repository or remote does not exist, inform the user and stop.

---

## Step 1 — Collect Ticket Number

If the user's message already contains a Jira ticket number (e.g., `QTDQ-1100`, `PROJ-123`), extract and use it directly — **no need to ask again**.

If no ticket number is found, use `ask_user` to prompt:
> Please enter a Jira ticket number (e.g., QTDQ-1100)

---

## Step 2 — Read Jira Ticket

Use `jira_mcp-getAccessibleAtlassianResources` to get the cloudId, then call `jira_mcp-getJiraIssue` to retrieve ticket details:

```
jira_mcp-getJiraIssue(cloudId, issueIdOrKey: "<ticket>", responseContentFormat: "markdown")
```

Extract the following from the response:
- **summary** (title)
- **description** (requirements/details)
- **issuetype.name** (type: Bug, Story, Task, Sub-task, etc.)
- **priority.name** (priority)
- **assignee**

Infer the git type from the issue type:

| Jira Type | git type |
|-----------|----------|
| Bug | `fix` |
| Story / New Feature | `feat` |
| Task / Sub-task | `chore` or infer from summary |
| Improvement | `feat` |
| Documentation | `docs` |
| Test | `test` |
| Refactoring | `refactor` |

Display a summary to the user in this format:

```
📋 Jira Ticket: QTDQ-1100
Title: <summary>
Type: <issuetype> → git type: <inferred type>
Priority: <priority>
Description: <first 200 chars of description>
```

---

## Step 3 — Confirm Development Plan

Use `ask_user` (allow_freeform: true):
> Based on the Jira ticket, I will create branch `zshen/<type>/QTDQ-1100_<short-desc>` and start development.
> Any additional notes or adjustments?

choices:
- `Proceed with Jira ticket as-is (Recommended)`
- `I have additional notes`

If the user chooses to add notes, record the input as extra context.

---

## Step 4 — Create Git Branch

Branch naming rules:
- Format: `zshen/<type>/<TICKET-NUMBER>_<short-description>`
- `short-description` is derived from the Jira summary, lowercased with underscores, 3–5 words max
- Example: `zshen/fix/QTDQ-1100_null_pointer_login`

**Before creating the branch, check if one already exists for this ticket** (local or remote):

```bash
git branch --list "*<TICKET-NUMBER>*"
git branch -r --list "*<TICKET-NUMBER>*"
```

**If a matching branch exists**, use `ask_user` to ask:
> A branch `<existing-branch-name>` already exists — likely from a previous session. How would you like to proceed?

choices:
- `Reuse existing branch (continue development on it) (Recommended)`
- `Create a new branch (start fresh from latest main)`

- If the user chooses **reuse**: run `git checkout <existing-branch-name>` and skip to Step 5.
- If the user chooses **new branch**: create a new branch from main (append `_v2` suffix to avoid conflicts if needed).

**If no matching branch exists**, proceed normally:

```bash
git checkout main
git pull origin main
git checkout -b <branch-name>
```

> This ensures development is based on the latest code, reducing future merge conflicts.

Inform the user which branch they are now on.

---

## Step 5 — Analyze Code and Implement Changes

Analyze the code to modify based on:
1. The Jira ticket's summary and description
2. Any additional context provided by the user in Step 3
3. The current codebase structure

Follow the normal development workflow to complete the changes. Ask the user if genuinely uncertain, but minimize interruptions.

---

## Step 6 — Commit Changes

After completing the changes, commit following the project's Conventional Commits convention:

```
<type>(QTDQ-1100): <short description from Jira summary>

<optional body: brief explanation of what was changed and why>
```

Run:
```bash
git add .
git commit -m "<commit message>"
```

The commit type and scope must match the branch name.

---

## Step 7 — Create Pull Request

Use `/pr create` to open a PR, with the following guidance for a high-quality description:

```
/pr create
- PR title: <type>(QTDQ-1100): <Jira summary>
- Include in description:
  - Jira ticket link: https://...atlassian.net/browse/QTDQ-1100
  - What was changed and why (from Jira description)
  - Testing notes if applicable
```

---

## Completion Summary

Display a summary to the user when done:

```
✅ Workflow complete!

📋 Jira Ticket: QTDQ-1100 - <summary>
🌿 Branch: zshen/<type>/QTDQ-1100_<desc>
💾 Commit: <type>(QTDQ-1100): <description>
🔗 PR: <PR URL>
```

---

## Notes

- If any step encounters an error (branch already exists, git push fails, etc.), explain the cause and provide a solution
- If the Jira ticket description is unclear, proactively confirm requirements with the user in Step 3 before writing any code
- After code changes are done, Step 6 and Step 7 run consecutively without asking the user again
