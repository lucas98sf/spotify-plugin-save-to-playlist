[CmdletBinding(DefaultParameterSetName = 'Local')]
param(
    [Parameter(ParameterSetName = 'Local')][switch]$Local,
    [Parameter(Mandatory, ParameterSetName = 'Marketplace')][switch]$Marketplace,
    [Parameter(Mandatory, ParameterSetName = 'Uninstall')][switch]$Uninstall,
    [Parameter(Mandatory, ParameterSetName = 'Update')][switch]$Update,
    [switch]$NoRestart
)
$ErrorActionPreference = 'Stop'
$extensionName = 'pinned-playlist-plus.js'
$configPath = (& spicetify -c | Select-Object -Last 1).Trim()
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $configPath)) {
    throw 'Could not locate the Spicetify configuration.'
}
$extensionDirectory = Join-Path (Split-Path -Parent $configPath) 'Extensions'
$installedBundle = Join-Path $extensionDirectory $extensionName
if ($Uninstall -or $Marketplace) {
    & spicetify config extensions "$extensionName-"
    if ($LASTEXITCODE -ne 0) { throw 'Could not disable the local extension.' }
    if (Test-Path -LiteralPath $installedBundle) { Remove-Item -LiteralPath $installedBundle -Force }
    Write-Host 'Local copy removed. Plugin settings and Marketplace installation are preserved.'
    Write-Host 'If not installed already, install Save to Playlist from Marketplace once.'
} else {
    New-Item -ItemType Directory -Path $extensionDirectory -Force | Out-Null
    $bundlePath = Join-Path $PSScriptRoot "dist/$extensionName"
    # Release ZIPs have the compiled bundle next to this installer.
    if (-not (Test-Path -LiteralPath $bundlePath)) { $bundlePath = Join-Path $PSScriptRoot $extensionName }
    $downloadDirectory = $null
    if ($Update) {
        $release = Invoke-RestMethod 'https://api.github.com/repos/lucas98sf/spotify-plugin-save-to-playlist/releases/latest'
        if ($release.draft -or $release.prerelease -or $release.tag_name -notmatch '^v\d+\.\d+\.\d+$') {
            throw 'GitHub returned an unsupported release.'
        }
        $downloadDirectory = Join-Path ([IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $downloadDirectory | Out-Null
        $bundlePath = Join-Path $downloadDirectory $extensionName
        $baseURL = "https://github.com/lucas98sf/spotify-plugin-save-to-playlist/releases/download/$($release.tag_name)"
        Invoke-WebRequest "$baseURL/$extensionName" -OutFile $bundlePath
        $checksums = (Invoke-WebRequest "$baseURL/SHA256SUMS").Content
        if ($checksums -is [byte[]]) { $checksums = [Text.Encoding]::UTF8.GetString($checksums) }
        $expectedHash = ($checksums -split '\s+')[0]
        if ($expectedHash -notmatch '^[a-fA-F0-9]{64}$' -or (Get-FileHash -LiteralPath $bundlePath -Algorithm SHA256).Hash -ne $expectedHash) {
            throw 'The release checksum did not match. Your installation is unchanged.'
        }
        Write-Host "Installing Save to Playlist $($release.tag_name)"
    }
    if (-not (Test-Path -LiteralPath $bundlePath)) {
        throw 'The compiled extension was not found. Run npm run build first.'
    }
    # Select this explicit install once without overriding later UI switches.
    # Keep the compatibility banner as the first line of the installed script.
    $localInstallId = [guid]::NewGuid().ToString('N')
    $bundleContent = [IO.File]::ReadAllText($bundlePath)
    $bannerEnd = $bundleContent.IndexOf("`n") + 1
    $selection = "globalThis.SaveToPlaylistLocalInstallId = '$localInstallId';`n"
    $installedContent = $bundleContent.Insert($bannerEnd, $selection)
    [IO.File]::WriteAllText($installedBundle, $installedContent, [Text.UTF8Encoding]::new($false))
    if ($downloadDirectory) { Remove-Item -LiteralPath $bundlePath -Force; Remove-Item -LiteralPath $downloadDirectory }
    & spicetify config extensions $extensionName
    if ($LASTEXITCODE -ne 0) { throw 'Could not enable the local extension.' }
    Write-Host 'Local copy selected. It takes precedence over Marketplace; no Marketplace uninstall is needed.'
}
if ($NoRestart) { & spicetify -n apply } else { & spicetify apply }
if ($LASTEXITCODE -ne 0) { throw 'Spicetify apply failed. Read its output above.' }
if ($NoRestart) { Write-Host 'Restart Spotify to finish switching.' }
