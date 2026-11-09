param([string]$Installer, [string]$TestRoot, [string]$Mode, [switch]$FailConfig)

# Tests shadow the CLI and use only a disposable configuration directory.
$global:InstallerTestState = @{ Calls = [Collections.Generic.List[object]]::new(); Extensions = @('other.js', 'pinned-playlist-plus.js'); Root = $TestRoot; FailConfig = $FailConfig }
function global:spicetify {
    $taskArguments = @($args)
    $global:InstallerTestState.Calls.Add($taskArguments)
    $global:LASTEXITCODE = 0
    if ($taskArguments.Count -eq 1 -and $taskArguments[0] -eq '-c') {
        return (Join-Path $global:InstallerTestState.Root 'config.ini')
    }
    if ($taskArguments[0] -eq 'config') {
        if ($global:InstallerTestState.FailConfig) { $global:LASTEXITCODE = 41; return }
        if ($taskArguments[2] -eq 'pinned-playlist-plus.js-') {
            $global:InstallerTestState.Extensions = @($global:InstallerTestState.Extensions | Where-Object { $_ -ne 'pinned-playlist-plus.js' })
        } elseif ($taskArguments[2] -eq 'pinned-playlist-plus.js') {
            $global:InstallerTestState.Extensions = @($global:InstallerTestState.Extensions + 'pinned-playlist-plus.js' | Select-Object -Unique)
        } else { throw 'Unexpected extension mutation.' }
        return
    }
    if (($taskArguments -join ' ') -notin @('apply', '-n apply')) { throw 'Unexpected CLI command.' }
}
try {
    switch ($Mode) {
        'local' { & $Installer -Local -NoRestart }
        'default' { & $Installer -NoRestart }
        'marketplace' { & $Installer -Marketplace -NoRestart }
        'uninstall' { & $Installer -Uninstall -NoRestart }
        'conflict' { & $Installer -Local -Marketplace -NoRestart }
        default { throw 'Unknown test mode.' }
    }
    exit 0
} catch {
    Write-Error -Message $_ -ErrorAction Continue
    exit 1
} finally {
    @{ calls = @($global:InstallerTestState.Calls.ToArray()); extensions = @($global:InstallerTestState.Extensions) } |
        ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $TestRoot 'result.json')
}
