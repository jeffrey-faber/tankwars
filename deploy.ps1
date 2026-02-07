# Deploy Script for Tank Wars
# Usage: .\deploy.ps1

$RemoteHost = "fabers.co"
$RemotePath = "/var/www/html/tankwars"

# Ask for username if not hardcoded
$RemoteUser = Read-Host "Enter SSH Username for $RemoteHost"

# Files/Folders to exclude
$ExcludeList = @(
    "node_modules",
    ".git",
    ".idea",
    "conductor",
    "deploy.tar.gz",
    ".DS_Store"
)

Write-Host "Packing files..."

# Construct arguments for tar
# Using --exclude pattern syntax. 
# Note: Windows tar (bsdtar) handles patterns.
$TarArgs = @("-czf", "deploy.tar.gz")
foreach ($item in $ExcludeList) {
    $TarArgs += "--exclude"
    $TarArgs += $item
}
$TarArgs += "."

# Execute tar directly to see output/errors easily
& tar.exe $TarArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create archive. Exit code: $LASTEXITCODE"
    exit 1
}

if (!(Test-Path "deploy.tar.gz")) {
    Write-Error "Archive file was not created."
    exit 1
}

# Check size to ensure it's not massive (implying node_modules was included)
$Size = (Get-Item "deploy.tar.gz").Length / 1MB
Write-Host "Archive created. Size: $([math]::Round($Size, 2)) MB"

if ($Size -gt 50) {
    Write-Warning "Archive is large (>50MB). You might be including node_modules by accident."
    $continue = Read-Host "Continue upload? (y/n)"
    if ($continue -ne 'y') { exit }
}

Write-Host "Ensuring remote directory exists..."
ssh "$($RemoteUser)@$($RemoteHost)" "mkdir -p $RemotePath"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create remote directory. Check permissions."
    Remove-Item "deploy.tar.gz" -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Uploading to $RemoteHost..."
scp deploy.tar.gz "$($RemoteUser)@$($RemoteHost):$($RemotePath)/deploy.tar.gz"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Upload failed. Check your SSH credentials/keys."
    Remove-Item "deploy.tar.gz" -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Extracting on remote server..."
ssh "$($RemoteUser)@$($RemoteHost)" "cd $RemotePath && tar -xzf deploy.tar.gz && rm deploy.tar.gz"

Write-Host "Cleaning up local archive..."
Remove-Item "deploy.tar.gz" -ErrorAction SilentlyContinue

Write-Host "Deployment complete!"
