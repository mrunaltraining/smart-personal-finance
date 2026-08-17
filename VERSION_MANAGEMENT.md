# Version Management

## Source of Truth

The `APP_VERSION` constant in `assets/js/app.js` is the **single source of truth** for the application version:

```javascript
const APP_VERSION = { major: 5, minor: 3, build: 0 };
function getAppVersion() {
    return `v${APP_VERSION.major}.${APP_VERSION.minor}.${APP_VERSION.build}`;
}
```

## Version Bumping Methods

### 1. GitHub Actions (Automatic)

When you push to the `main` branch, the GitHub Actions workflow `.github/workflows/bump-version.yml` will:

1. Read the current version from `assets/js/app.js`
2. Increment the build number by 1
3. Update `assets/js/app.js` with the new build number
4. Automatically update all documentation files:
   - USER_MANUAL.md
   - README.md
   - APP_SPEC.md
   - DEVELOPMENT.md
   - TO-DO.txt
   - tests/test-utils.html
   - tests/test.html
   - CHANGE_LOG.md
5. Commit the changes with `[skip ci]` to prevent infinite loop
6. Push to the repository

**Note:** This only bumps the build number. For major/minor version changes, use the manual scripts below.

### 2. Manual Script (Linux/Mac)

Use the `bump-version.sh` script:

```bash
# Bump build number (default)
./bump-version.sh

# Bump minor version
./bump-version.sh minor

# Bump major version
./bump-version.sh major
```

The script will:
1. Read the current version from `assets/js/app.js`
2. Update the version based on the bump type
3. Update all documentation files automatically
4. Add a changelog entry for build bumps
5. Provide git commit instructions

### 3. Manual Script (Windows)

Use the `bump-version.bat` script:

```cmd
REM Bump build number (default)
bump-version.bat

REM Bump minor version
bump-version.bat minor

REM Bump major version
bump-version.bat major
```

## Version Bump Guidelines

### Build Number (Patch)
- Use for: Bug fixes, minor improvements, documentation updates
- Example: v5.3.0 → v5.3.1

### Minor Version
- Use for: New features, enhancements, non-breaking changes
- Example: v5.3.0 → v5.4.0

### Major Version
- Use for: Breaking changes, major architectural changes
- Example: v5.3.0 → v6.0.0

## Files Auto-Updated

When version is bumped, these files are automatically updated:

1. **Source Code:**
   - `assets/js/app.js` (APP_VERSION constant)

2. **Documentation:**
   - `USER_MANUAL.md` (title and changelog)
   - `README.md` (version references)
   - `APP_SPEC.md` (version references)
   - `DEVELOPMENT.md` (title)
   - `TO-DO.txt` (version and date)
   - `CHANGE_LOG.md` (new entry for build bumps)

3. **Test Files:**
   - `tests/test-utils.html` (title)
   - `tests/test.html` (title)

## Manual Version Update (Not Recommended)

If you need to manually update the version without using the scripts:

1. Update `APP_VERSION` in `assets/js/app.js`
2. Manually update all documentation files listed above
3. Add changelog entry in `CHANGE_LOG.md`
4. Commit and push

**Warning:** Manual updates are error-prone. Use the scripts or GitHub Actions instead.

## Preventing Infinite Loop

The GitHub Actions workflow includes a check to prevent infinite loops:

```yaml
if: "!contains(github.event.head_commit.message, '[skip ci]')"
```

Any commit with `[skip ci]` in the message will not trigger the workflow again. The auto-bump commit always includes `[skip ci]`.

## Version Display in App

The version is displayed in multiple places:

1. **Settings Panel:** Shows current version
2. **Export Files:** Includes version in exported JSON
3. **PDF Export:** Includes version in footer
4. **Console:** Logs version on app load
5. **Backup Files:** Includes version in backup JSON

All these use `getAppVersion()` which reads from the `APP_VERSION` constant.
