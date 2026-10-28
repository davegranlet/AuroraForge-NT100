param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string]$OutputPath = 'animation\workflows\victory-6100-2k19\complete-tool-capability-catalog-20261023.csv'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$OutputPath = Join-Path $RepoRoot $OutputPath
$rows = [System.Collections.Generic.List[object]]::new()

function Add-Row([string]$Path, [string]$Kind, [string]$Purpose, [string]$Status, [string]$Basis, [string]$Origin = 'Canonical repo', [string]$Interface = '') {
    $absolute = Join-Path $RepoRoot $Path
    if (-not (Test-Path -LiteralPath $absolute -PathType Leaf)) { return }
    $item = Get-Item -LiteralPath $absolute
    $rows.Add([pscustomobject]@{
        Path = $Path.Replace('\','/')
        Kind = $Kind
        Purpose = $Purpose
        Lifecycle = $Status
        PurposeBasis = $Basis
        InvocationOrAPI = $Interface
        Bytes = $item.Length
        Origin = $Origin
    })
}

function Purpose-FromName([string]$Path) {
    $leaf = [IO.Path]::GetFileNameWithoutExtension($Path)
    $name = $leaf -replace '([a-z])([A-Z])','$1 $2' -replace '[_-]+',' '
    if ($leaf -match '\.test$' -or $Path -match '\.test\.') { return "Tests the $name behavior or format." }
    $verb = @{
        build='Builds'; make='Creates'; generate='Generates'; append='Appends'; patch='Patches'; fix='Repairs'; convert='Converts'; decode='Decodes'; encode='Encodes'; extract='Extracts'; inspect='Inspects'; parse='Parses'; read='Reads'; write='Writes'; verify='Verifies'; validate='Validates'; audit='Audits'; compare='Compares'; scan='Scans'; analyze='Analyzes'; export='Exports'; locate='Locates'; find='Finds'; probe='Probes'; trace='Traces'; dump='Dumps'; refresh='Refreshes'; rebase='Rebases'; classify='Classifies'; correlate='Correlates'; summarize='Summarizes'; report='Reports'; test='Tests'; stage='Stages'; bake='Bakes'; unpack='Unpacks'; install='Installs'; remove='Removes'; list='Lists'; query='Queries'; capture='Captures'; load='Loads'; clean='Cleans'; restore='Restores'; rename='Renames'; rescale='Rescales'; normalize='Normalizes'
    }
    $first = ($name -split ' ')[0].ToLowerInvariant()
    if ($verb.ContainsKey($first)) { return "$($verb[$first]) $($name.Substring($first.Length).Trim()) for the named game-data or workflow task." }
    return "Provides the $name operation; purpose inferred from its filename and location."
}

function Get-OpeningPurpose([string]$Path) {
    $full = Join-Path $RepoRoot $Path
    try {
        $lines = Get-Content -LiteralPath $full -TotalCount 32
        $picked = [System.Collections.Generic.List[string]]::new()
        foreach ($line in $lines) {
            $s = $line.Trim() -replace '^(//+|\*+|#|<!--|\*\/|"""|\x27\x27\x27)\s*','' -replace '\s*(-->|\*/|"""|\x27\x27\x27)\s*$',''
            if ($s -match '^(import |require\(|const |let |var |using |namespace |package |public |private |export |function |class |#!/)') { if ($picked.Count -gt 0) { break }; continue }
            if ($s.Length -gt 0) { $picked.Add($s) }
            if ($picked.Count -ge 3) { break }
        }
        if ($picked.Count) { return (($picked -join ' ') -replace '\s+',' ').Substring(0,[Math]::Min(500,(($picked -join ' ') -replace '\s+',' ').Length)) }
    } catch { }
    return $null
}

# Prior catalog's authored source/test rows, excluding known generated obj output.
$previous = Join-Path $RepoRoot 'animation\workflows\victory-6100-2k19\tool-source-catalog-20261023.csv'
foreach ($r in (Import-Csv -LiteralPath $previous)) {
    if ($r.Path -match '(^|[/\\])obj[/\\]') { continue }
    $path = $r.Path -replace '\\','/'
    $purpose = $r.OpeningComment
    $basis = 'Source comment and exported API'
    if ([string]::IsNullOrWhiteSpace($purpose)) {
        $purpose = Purpose-FromName $path
        $basis = 'Filename/location inference; source must be consulted for edge semantics'
    }
    Add-Row $path $r.Kind $purpose 'Current source or test' $basis 'Canonical repo' $r.InvocationOrAPI
}

# The original census omitted the Pac19Tree project descriptor and compiled runtime tracer.
Add-Row 'animation/tools/Pac19Tree/Pac19Tree.csproj' 'Project descriptor' 'Builds Aurora’s PAC19 native helper from the C# source project.' 'Current build input' 'Project metadata'

# Workflow one-offs are deliverables too; omit generated decompilation trees and bulk CLR output.
$workflowSpecs = @(
    @{ Root='animation/workflows/dolph-ziggler-1-2k19'; Exclude=@('**/node_modules/**','**/obj/**','**/bin/**','**/decompiled/**','**/generated/**') },
    @{ Root='animation/workflows/victory-6100-2k19'; Exclude=@('**/node_modules/**','**/obj/**','**/bin/**','**/decompiled/**','**/generated/**','**/tribute-source-audit-20261023/**','**/tribute-source-analysis-20261023/**') }
)
foreach ($spec in $workflowSpecs) {
    $patterns = @('--files', $spec.Root, '-g', '*.js', '-g', '*.py', '-g', '*.java', '-g', '*.cs', '-g', '*.ps1')
    foreach ($ex in $spec.Exclude) { $patterns += @('-g', "!$ex") }
    $files = & rg @patterns 2>$null
    foreach ($f in $files) {
        $p = $f.Replace('\','/')
        $leaf = [IO.Path]::GetFileName($p)
        $kind = if ($leaf -match '\.test\.') { 'Workflow test/verification' } elseif ($leaf -match '\.(java|cs)$') { 'Workflow reverse-analysis helper' } else { 'Workflow one-off' }
        $purpose = Get-OpeningPurpose $p
        $basis = 'Authored opening comment'
        if ([string]::IsNullOrWhiteSpace($purpose)) { $purpose = Purpose-FromName $p; $basis = 'Filename/location inference; one-off evidence script' }
        Add-Row $p $kind $purpose 'Workflow-specific; retain with its evidence' $basis
    }
}

# UI page modules, including dormant/unwired pages, are distinct from backend scripts.
$uiFiles = @(& rg --files 'umbrella-app/app/assets/js' 'cak-foundry/app/assets/js' -g '*.js' 2>$null)
foreach ($p0 in $uiFiles) {
    $p = $p0.Replace('\','/')
    $purpose = Get-OpeningPurpose $p
    $basis = 'Authored opening comment'
    if ([string]::IsNullOrWhiteSpace($purpose)) { $purpose = Purpose-FromName $p; $basis = 'Filename/location inference; page integration status noted in report' }
    Add-Row $p 'App page/UI module' $purpose 'Integrated or dormant; see wiring audit in report' $basis
}

# App-packaged public tool copies are cataloged independently so stale/divergent copies stay visible.
$publicFiles = @(& rg --files 'animation/app/public-tools' -g '*.js' -g '*.py' 2>$null)
foreach ($p0 in $publicFiles) {
    $p = $p0.Replace('\','/')
    $leaf = [IO.Path]::GetFileName($p)
    $srcs = @(Get-ChildItem -LiteralPath (Join-Path $RepoRoot 'animation/tools') -Recurse -File -Filter $leaf -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '[\\/](obj|bin|node_modules)[\\/]' })
    $copyState = 'No same-named canonical source found'
    if ($srcs.Count) {
        $a = (Get-FileHash -LiteralPath (Join-Path $RepoRoot $p) -Algorithm SHA256).Hash
        $same = @($srcs | Where-Object { (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash -eq $a })
        $copyState = if ($same.Count) { 'Byte-identical packaged copy' } else { 'Divergent packaged copy; review/version label needed' }
    }
    $purpose = Get-OpeningPurpose $p
    $basis = 'Packaged source comment'
    if ([string]::IsNullOrWhiteSpace($purpose)) { $purpose = Purpose-FromName $p; $basis = 'Filename/location inference' }
    Add-Row $p 'Packaged Aurora tool copy' $purpose $copyState $basis
}

# Recovered tools missing from the live source tree during the archive comparison.
$recovered = @(
    @('scripts/repo-knowledge/aurora-knowledge-audit.js','Builds a local-only path/hash knowledge index under .local/repo-knowledge; traversal is confined to this repo.','Recovered and adapted'),
    @('scripts/repo-knowledge/aurora-knowledge-query.js','Queries the local Aurora file-audit index for matching paths and metadata.','Recovered and adapted'),
    @('research/ghidra-nativeaot/scripts/DumpFunctionNeighborhood.java','Exports disassembly/decompilation around a selected Ghidra function for targeted review.','Recovered byte-identically'),
    @('research/ghidra-nativeaot/scripts/DumpNamedBakeryCryptoFunctions.java','Dumps selected named Bakery crypto functions from the active Ghidra program.','Recovered byte-identically'),
    @('research/ghidra-nativeaot/scripts/DumpV99HashConstants.java','Finds and reports v9.9 hash constants in a Ghidra program.','Recovered byte-identically'),
    @('research/ghidra-nativeaot/scripts/FindBakeryCryptoMethods.java','Searches Ghidra symbols and functions for Bakery crypto routines.','Recovered byte-identically'),
    @('research/ghidra-nativeaot/scripts/FindRuntimeStringCallers.java','Finds runtime callers associated with selected strings in Ghidra.','Recovered byte-identically'),
    @('research/ghidra-nativeaot/scripts/RunNativeAotAnalyzer.java','Runs the NativeAOT analysis workflow against the current Ghidra program.','Recovered byte-identically'),
    @('research/ghidra-nativeaot/ghidra_scripts/AuditReport.java','Builds a focused Ghidra audit report for the current program.','Recovered byte-identically'),
    @('research/ghidra-nativeaot/ghidra_scripts/BakerAudit.java','Audits Baker-related symbols and code locations in Ghidra.','Recovered byte-identically'),
    @('research/ghidra-nativeaot/ghidra_scripts/ExportAllDecompiled.java','Exports the current program’s decompiled functions for offline research.','Recovered byte-identically'),
    @('research/ghidra-nativeaot/ghidra_scripts/FocusedDecompile.java','Decompiles a configured subset of functions for focused inspection.','Recovered byte-identically'),
    @('research/ghidra-nativeaot/ghidra_scripts/TargetAudit.java','Audits configured target functions and records Ghidra findings.','Recovered byte-identically'),
    @('research/ghidra-nativeaot/capture_bakery_v99.py','Captures a version-specific Bakery v9.9 runtime probe; requires controlled Frida setup and exact build matching.','Recovered; historical offsets require review'),
    @('examples/MyGM-StartingCash-50M/tools/extract_named_cak_entry.js','Extracts a named CAK member for the MyGM example workflow.','Recovered byte-identically'),
    @('examples/MyGM-StartingCash-50M/tools/inspect_flatbuffer.py','Inspects FlatBuffer records used by the MyGM example.','Recovered byte-identically'),
    @('examples/MyGM-StartingCash-50M/tools/make_50m_params.py','Creates the sample 50-million starting-cash parameter payload.','Recovered byte-identically')
)
foreach ($entry in $recovered) { Add-Row $entry[0] 'Recovered archive tool' $entry[1] $entry[2] 'Direct source inspection and archive recovery receipt' 'C:\AuroraForge-Aug26' }

# Executable/compiled utilities and bundled third-party dependencies are included, not mistaken for Aurora source.
$binaryRoots = @('animation/third_party','umbrella-app/tools','cak-foundry/tools','animation/tools','100-not-tribute','umbrella-app/app/tools','cak-foundry/app/tools')
foreach ($br in $binaryRoots) {
    $abs = Join-Path $RepoRoot $br
    if (-not (Test-Path -LiteralPath $abs)) { continue }
    Get-ChildItem -LiteralPath $abs -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -match '^\.(exe|dll|jar)$' -and $_.FullName -notmatch '[\\/](node_modules|obj)[\\/]' } |
        ForEach-Object {
            $p = $_.FullName.Substring($RepoRoot.Length + 1).Replace('\','/')
            if ($p -match '^animation/third_party/') {
                $purpose = 'Third-party reference utility or dependency; not Aurora-authored. See notices/package provenance.'
                $kind = 'Third-party bundled utility/dependency'
                $status = 'Reference/redistributed binary; inspect license and version before use'
            } elseif ($_.Extension -eq '.exe') {
                $purpose = Purpose-FromName $p
                if ($_.Name -eq 'Aurora-Forge-2.0.k-Preview.exe') { $purpose = 'Legacy compiled animation-converter application for the historical 2K19-to-2K25/26 workflow; no matching source project is present in this repo.' }
                elseif ($_.Name -eq 'FTribTool.exe') { $purpose = 'Third-party FTrib/Bakery CLI used by Aurora’s version-specific 2K25 v9.3 CAK operations.' }
                elseif ($_.Name -eq 'AuroraCakHelper.exe') { $purpose = 'Aurora native helper used by the containing CAK workflow for archive operations not implemented by its JS catalog parser.' }
                elseif ($_.Name -eq 'AuroraPac19Helper.exe') { $purpose = 'Aurora native helper for supported WWE 2K19 PAC archive operations.' }
                elseif ($_.Name -eq 'wwe2k26-camera-trace.exe') { $purpose = 'Aurora diagnostic that captures selected WWE 2K26 camera state; matching C++ source is adjacent.' }
                elseif ($_.Name -eq 'Pac19Tree.exe') { $purpose = 'PAC19 helper executable built from Aurora’s Pac19Tree project; inspect CLI help/source for supported operations.' }
                elseif ($_.Name -eq 'texconv.exe') { $purpose = 'Microsoft DirectXTex command-line utility used for DDS texture conversion.' }
                elseif ($_.Name -eq 'createdump.exe' -or $_.Name -eq 'singlefilehost.exe') { $purpose = '.NET runtime support executable; not an Aurora user-facing tool.' }
                $kind = 'Compiled executable tool/helper'
                $status = 'Compiled binary; source/project pairing and version status are in the report'
            } else {
                $purpose = 'Runtime library/dependency for the containing tool; not a standalone user-invoked tool.'
                $kind = 'Compiled runtime dependency'
                $status = 'Package component; source and license provenance must be checked at the containing project'
            }
            Add-Row $p $kind $purpose $status 'Binary location and package role'
        }
}

$rows | Sort-Object Path,Kind -Unique | Export-Csv -LiteralPath $OutputPath -NoTypeInformation -Encoding utf8
$final = Import-Csv -LiteralPath $OutputPath
Write-Output "Wrote $($final.Count) catalog rows to $OutputPath"
$final | Group-Object Kind | Sort-Object Count -Descending | Select-Object Name,Count | Format-Table -AutoSize
