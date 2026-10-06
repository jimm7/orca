# Orca Windows Quick Setup

For a Windows 10/11 PC: download the small **Orca-Windows-Quick-Setup** ZIP,
right-click it and choose **Extract All**, then double-click **Start-Orca-Setup.cmd**.
Keep `download-orca.mjs` beside the launcher. No repository clone or source build is needed.
The computer needs internet access and Windows App Installer (WinGet).

Setup installs missing Git, Node.js LTS and GitHub CLI, offers the official stable
Orca installer, then offers Codex CLI and Ollama separately. Say **N** to options
you do not need. Node.js is used for the downloader and npm-based agents; pnpm,
Visual Studio and Orca's development dependencies are not installed.

The desktop installer is from **stablyai/orca**, not a custom build of this fork.
It retains Orca's official updates. Changes to this fork's app source will only
appear in a separately built fork installer. The downloader checks the installer's
SHA-256 against GitHub's release metadata before the launcher runs it. If metadata,
the download or verification fails, setup stops. Windows installer prompts remain visible.

## Finish setup once

1. Close and reopen Orca after installation so it sees the new programs.
2. If you selected Codex, open a new terminal, run `codex login`, and follow the
   sign-in instructions. Select **Codex** in Orca's onboarding. Use your own account.
3. For GitHub repositories, run `gh auth login` in a new terminal and follow its
   browser sign-in. This step is unnecessary for local folders or other git providers.
4. Add your project in Orca. You can use an existing local folder or repository;
   you do not need to clone Orca itself. Try a small task to confirm the agent works.
5. For remote work, add the SSH host in Orca. Local setup does not install anything
   on the remote host; the host needs its own Git and agent configuration.

Account access and billing depend on the chosen provider. The setup package does
not configure agent permissions, write API keys, modify your repositories or
download AI models. If you choose Ollama, it still needs a model and a coding agent
that supports that provider (for example, your existing Hermes configuration).

## Checks and recovery

Run the launcher again after a failed step; it reuses tools it can find on PATH.
Already-installed older Node.js versions must be updated to 22 or newer. Installers
may require administrator approval. If a company policy blocks installation, use
your administrator's approved process. No execution-policy changes are made.

The last screen checks Git, Node.js and GitHub CLI. For optional tools, use
`codex --version` or `ollama --version` in a new terminal. A successful installer
exit does not prove Orca or an agent can connect: complete the first-project task
above to verify that. Read errors in the setup window before closing it.

If WinGet is missing, install [Microsoft App Installer](https://apps.microsoft.com/detail/9nblggh4nns1).
Manual alternatives: [Orca desktop](https://github.com/stablyai/orca/releases/latest),
[Git](https://git-scm.com/downloads/win), [Node.js LTS](https://nodejs.org/en/download),
[GitHub CLI](https://cli.github.com/), and [Ollama](https://ollama.com/download/windows).

## Maintainer validation and packaging

Run `node --test config/quick-setup/download-orca.test.mjs` without installing the
app's dependencies. The **Windows Quick Setup Bundle** GitHub Action runs those
tests on Windows and uploads the three user-facing files as a ZIP artifact. In
Actions, select the workflow, choose the setup branch and click **Run workflow**.
Download its artifact after it finishes. The workflow does not publish a release.

Before distributing widely, test the extracted ZIP on a fresh Windows PC, including
missing WinGet, paths with spaces, declined optional installs, rerunning after a
failed install, and provider sign-in. The automated tests mock network requests;
they do not install software or exercise Windows installer dialogs.
