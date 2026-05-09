# copy-for-claude.ps1
# Stages all DFW project-knowledge files into a flat OneDrive folder
# for Claude.ai project knowledge upload. Run from anywhere — paths are absolute.
#
# Maintenance:
#   - When adding, removing, or renaming a TOP-LEVEL config/doc file, update
#     the $rootFiles list below.
#   - Folders (ai-docs/, plugins/, src/, __tests__/) are auto-discovered.
#     Adding new files inside those folders does NOT require updating this script.

$source = "C:\DontForgetWhy"
$dest   = "C:\Users\baldy\OneDrive\Desktop\DFW\FilesForClaude"

# --- Setup ---

# Wipe destination so deleted/renamed files don't linger as stale uploads.
if (Test-Path $dest) {
    Remove-Item "$dest\*" -Force
} else {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

# --- Root config files (hand-maintained) ---

$rootFiles = @(
    "CLAUDE.md",
    "AGENTS.md",
    "GEMINI.md",
    "README.md",
    "ROADMAP.md",
    "app.json",
    "package.json",
    "eas.json",
    "tsconfig.json",
    "metro.config.js",
    "firebase.json",
    "firestore.rules",
    "firestore.indexes.json",
    "App.tsx",
    "index.ts"
)

foreach ($f in $rootFiles) {
    $src = Join-Path $source $f
    if (Test-Path $src) {
        Copy-Item $src "$dest\$f" -Force
    } else {
        Write-Warning "Missing root file: $f"
    }
}

# --- AI documentation (auto-discovered: all .md in ai-docs/, recursive) ---

$aiDocs = Join-Path $source "ai-docs"
if (Test-Path $aiDocs) {
    Get-ChildItem -Path $aiDocs -Filter "*.md" -File -Recurse | ForEach-Object {
        Copy-Item $_.FullName "$dest\$($_.Name)" -Force
    }
}

# --- Expo config plugins (auto-discovered: all .js in plugins/) ---

$plugins = Join-Path $source "plugins"
if (Test-Path $plugins) {
    Get-ChildItem -Path $plugins -Filter "*.js" -File | ForEach-Object {
        Copy-Item $_.FullName "$dest\$($_.Name)" -Force
    }
}

# --- Source tree (recursive, flattened) ---

$srcRoot = Join-Path $source "src"
Get-ChildItem -Path $srcRoot -Recurse -File | ForEach-Object {
    $name = $_.Name
    # Collision handling: src/navigation/types.ts -> navTypes.ts
    if ($_.FullName -like "*navigation\types.ts") {
        $name = "navTypes.ts"
    }
    Copy-Item $_.FullName "$dest\$name" -Force
}

# --- Jest test files (recursive, flattened) ---

$testsRoot = Join-Path $source "__tests__"
if (Test-Path $testsRoot) {
    Get-ChildItem -Path $testsRoot -Recurse -File | ForEach-Object {
        Copy-Item $_.FullName "$dest\$($_.Name)" -Force
    }
}

# --- Summary ---

$count = (Get-ChildItem $dest -File).Count
Write-Host "Copied $count files to $dest"
