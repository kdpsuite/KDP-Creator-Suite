# GitHub Actions CI/CD Pipeline

## Overview

This document describes the automated CI/CD pipeline that runs on every push and pull request to the KDP Creator Suite repository. The pipeline ensures code quality, prevents regressions, and protects production deployments.

## Workflows

### 1. Frontend CI (`.github/workflows/frontend-ci.yml`)

**Triggers**: Push to `main`/`develop`, Pull Request to `main`/`develop`, changes to `web-dashboard/**`

**Jobs**:

#### Lint and Type Check
- **Node.js**: v22
- **Tools**: ESLint, TypeScript
- **Purpose**: Catch syntax errors, style violations, and type mismatches before tests run
- **Failure**: Non-blocking (runs but doesn't fail the workflow)

#### Playwright E2E Tests
- **Browsers**: Chromium
- **Purpose**: Run end-to-end tests to verify critical user flows (login, dashboard load, etc.)
- **Artifacts**: Playwright report uploaded for 30 days
- **Failure**: Blocks deployment if tests fail

#### Build Check
- **Purpose**: Verify the frontend builds successfully
- **Dependencies**: Requires Lint and Test jobs to complete
- **Artifacts**: Build output uploaded for 7 days
- **Failure**: Blocks deployment if build fails

### 2. Backend CI (`.github/workflows/backend-ci.yml`)

**Triggers**: Push to `main`/`develop`, Pull Request to `main`/`develop`, changes to `backend-api/**`

**Jobs**:

#### Lint and Type Check
- **Python**: 3.11
- **Tools**: Black, isort, Flake8, Pylint
- **Purpose**: Enforce code style, import ordering, and catch common issues
- **Failure**: Non-blocking (runs but doesn't fail the workflow)

#### Security Checks
- **Tools**: Bandit (security linter), Safety (dependency vulnerability scanner)
- **Purpose**: Detect security vulnerabilities in code and dependencies
- **Failure**: Non-blocking (runs but doesn't fail the workflow)

#### Build Check
- **Purpose**: Verify all imports resolve and syntax is valid
- **Dependencies**: Requires Lint and Security jobs to complete
- **Failure**: Blocks deployment if build fails

### 3. Deployment Protection (`.github/workflows/deployment-protection.yml`)

**Triggers**: Push to `main`, Pull Request to `main`

**Purpose**: Ensures all CI checks pass before allowing Vercel to deploy to production

**Behavior**:
- Waits for all Frontend CI and Backend CI checks to complete
- Fails if any check fails
- Blocks Vercel deployment via GitHub status checks
- Skips checks for draft PRs

## How It Works

### On Every Push to `main` or `develop`

1. GitHub Actions automatically triggers the Frontend CI and Backend CI workflows
2. Both workflows run in parallel
3. Each workflow runs Lint → Test → Build (with dependencies)
4. If any job fails, the workflow is marked as failed
5. Vercel sees the failed status and does NOT deploy

### On Every Pull Request

1. Same as above, but also runs Deployment Protection
2. Deployment Protection waits for all checks to pass
3. If all checks pass, the PR is marked as "ready to merge"
4. If any check fails, the PR is marked as "needs fixes"

### On Merge to `main`

1. All CI workflows run
2. Deployment Protection verifies all checks pass
3. Vercel receives a "success" status and proceeds with deployment
4. If any check fails, Vercel does NOT deploy

## Viewing Results

### GitHub UI

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select a workflow to see details
4. Click a job to see logs

### Playwright Reports

1. Go to a failed Frontend CI workflow
2. Click **Artifacts** section
3. Download `playwright-report` ZIP
4. Extract and open `index.html` in a browser to see test results with screenshots

### Build Artifacts

1. Go to a successful Frontend CI workflow
2. Click **Artifacts** section
3. Download `frontend-build` to inspect the compiled output

## Troubleshooting

### "Frontend CI failed: ESLint errors"

**Solution**: Run locally and fix:
```bash
cd web-dashboard/kdp-creator-dashboard
pnpm lint --fix
```

### "Backend CI failed: Flake8 errors"

**Solution**: Run locally and fix:
```bash
cd backend-api/kdp-creator-api
black src/
isort src/
```

### "Playwright tests failed"

**Solution**: 
1. Download the Playwright report from the workflow artifacts
2. Open `index.html` to see which tests failed and why
3. Fix the code or update tests if needed
4. Push again to re-run

### "Build failed: Module not found"

**Solution**: 
1. Check if a new dependency was added but not committed to `pnpm-lock.yaml` or `requirements.txt`
2. Run `pnpm install` or `pip install -r requirements.txt` locally
3. Commit the lock files
4. Push again

## Customization

### Adjusting Lint Rules

**Frontend**: Edit `.eslintrc` in `web-dashboard/kdp-creator-dashboard/`

**Backend**: Edit `.flake8` or `.pylintrc` in `backend-api/kdp-creator-api/`

### Adding New Tests

1. Add test files to `tests/` directory
2. Update the workflow to run your test command
3. Push to trigger the workflow

### Disabling a Check

Edit the workflow YAML file and comment out or remove the job.

**⚠️ Warning**: Disabling checks reduces code quality protection. Only do this if you have a good reason.

## Performance

- **Frontend CI**: ~3-5 minutes (depends on test count)
- **Backend CI**: ~2-3 minutes (depends on file count)
- **Total**: ~5-8 minutes per push

To speed up:
- Use `cache: 'pnpm'` and `cache: 'pip'` (already configured)
- Reduce test count or split into multiple jobs
- Use matrix builds to parallelize across Node/Python versions

## Next Steps

1. **Slack Integration**: Add notifications to Slack when CI fails
2. **Code Coverage**: Add coverage reports to track test coverage
3. **Performance Monitoring**: Add Lighthouse CI to track frontend performance
4. **Automated Fixes**: Use `auto-fix` workflows to automatically fix linting issues

---

**For more information on GitHub Actions, see the [official documentation](https://docs.github.com/en/actions).**
