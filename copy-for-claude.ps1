$dest = "C:\Users\baldy\OneDrive\Desktop\BaldGuy&CompanyGames\Dont_Forget_Why\FilesForClaude"

# Clear old files so deleted/renamed files don't linger as stale uploads
if (Test-Path $dest) { Remove-Item "$dest\*" -Force }
else { New-Item -ItemType Directory -Path $dest -Force | Out-Null }

# Root files
$rootFiles = @(
    "App.tsx",
    "index.ts",
    "app.json",
    "package.json",
    "eas.json",
    "tsconfig.json",
    "firebase.json",
    "metro.config.js",
    "ROADMAP.md",
    "CLAUDE.md",
    "AGENTS.md",
    "GEMINI.md",
    "DFW-Architecture.md",
    "DFW-Bug-History.md",
    "DFW-Data-Models.md",
    "DFW-Decisions.md",
    "DFW-Features.md",
    "DFW-Project-Setup.md",
    "DFW-Close-Out.md"
)
foreach ($f in $rootFiles) {
    $src = "C:\DontForgetWhy\$f"
    if (Test-Path $src) { Copy-Item $src "$dest\$f" }
    else { Write-Warning "Missing: $f" }
}

# Rename collisions for flat copy
$renames = @{
    "metro.config.js" = "metro_config.js"
}
foreach ($old in $renames.Keys) {
    $path = "$dest\$old"
    if (Test-Path $path) { Rename-Item $path $renames[$old] }
}

# All src subfolders — copy flat
$srcRoot = "C:\DontForgetWhy\src"
Get-ChildItem -Path $srcRoot -Recurse -File | ForEach-Object {
    $name = $_.Name
    # Handle collision: navigation/types.ts -> navTypes.ts
    if ($_.FullName -like "*navigation\types.ts") {
        $name = "navTypes.ts"
    }
    Copy-Item $_.FullName "$dest\$name" -Force
}

# Plugins
$pluginsRoot = "C:\DontForgetWhy\plugins"
if (Test-Path $pluginsRoot) {
    Get-ChildItem -Path $pluginsRoot -File | ForEach-Object {
        Copy-Item $_.FullName "$dest\$($_.Name)" -Force
    }
}

# Test files
$testsRoot = "C:\DontForgetWhy\__tests__"
if (Test-Path $testsRoot) {
    Get-ChildItem -Path $testsRoot -File | ForEach-Object {
        # Rename .test.ts -> _test.ts to avoid flat copy collisions with src files
        $name = $_.Name -replace '\.test\.ts$', '_test.ts'
        Copy-Item $_.FullName "$dest\$name" -Force
    }
}

Write-Host "Copied $((Get-ChildItem $dest).Count) files to $dest"
