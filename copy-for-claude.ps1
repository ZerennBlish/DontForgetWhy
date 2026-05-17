# copy-for-claude.ps1
# Stages DFW markdown documentation into a flat OneDrive folder
# for Claude.ai project knowledge upload. Run from anywhere — paths are absolute.
#
# Only .md files are included. Source code, config, and scripts are read
# live via Desktop Commander when needed — no need to upload them.
#
# Maintenance:
#   - When adding or removing a root .md file, update $rootMdFiles below.
#   - ai-docs/ is auto-discovered recursively (includes Sessions/).

$source = "C:\DontForgetWhy"
$dest   = "C:\Users\baldy\OneDrive\Desktop\BaldGuy&CompanyGames\Dont_Forget_Why\FilesForClaude"

# --- Setup ---

if (Test-Path $dest) {
    Remove-Item "$dest\*" -Force
} else {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

# --- Root markdown files (hand-maintained) ---

$rootMdFiles = @(
    "CLAUDE.md",
    "AGENTS.md",
    "GEMINI.md",
    "README.md",
    "ROADMAP.md"
)

foreach ($f in $rootMdFiles) {
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

# --- Summary ---

$count = (Get-ChildItem $dest -File).Count
Write-Host "Copied $count files to $dest"