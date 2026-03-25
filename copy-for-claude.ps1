notepad C:\DontForgetWhy\copy-for-claude.ps1
```

Paste this:
```
$dest = "C:\Users\baldy\OneDrive\Desktop\DFW\FilesForClaude"

# Clear old files
if (Test-Path $dest) { Remove-Item "$dest\*" -Force }
else { New-Item -ItemType Directory -Path $dest -Force }

# Root files
$rootFiles = @("App.tsx", "index.ts", "app.json", "package.json", "eas.json", "tsconfig.json", "ROADMAP.md", "DFW-Complete-Technical-Handoff.md")
foreach ($f in $rootFiles) {
    $src = "C:\DontForgetWhy\$f"
    if (Test-Path $src) { Copy-Item $src "$dest\$f" }
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

Write-Host "Copied $(( Get-ChildItem $dest | Measure-Object).Count) files to $dest"