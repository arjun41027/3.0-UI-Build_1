pipeline {
agent any

```
options {
    skipDefaultCheckout(true)
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
}

environment {
    IIS_SERVER  = '172.16.4.166'
    IIS_TARGET  = 'C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI'
    UI_SOURCE   = 'Desktop/3.0 UI and API Docs/3.0 UI Build'
    DEPLOY_ZIP  = 'PuffinUI_Deployment.zip'
    REMOTE_TEMP = 'C:\\Windows\\Temp\\PuffinUI_Deployment'
    REMOTE_ZIP  = 'C:\\Windows\\Temp\\PuffinUI_Deployment\\PuffinUI_Deployment.zip'
}

stages {

    // ============================================================
    // 1. CHECKOUT FROM GITHUB
    // ============================================================
    stage('Checkout') {
        steps {
            echo '=========================================='
            echo 'CHECKOUT FROM GITHUB'
            echo '=========================================='

            checkout scm

            sh '''
                set -e

                echo "Workspace : $WORKSPACE"

                echo ""
                echo "Current branch:"
                git branch --show-current || true

                echo ""
                echo "Current commit:"
                git rev-parse --short HEAD

                echo ""
                echo "Git remote:"
                git remote -v
            '''
        }
    }

    // ============================================================
    // 2. VERIFY UI SOURCE
    // ============================================================
    stage('Verify UI Source') {
        steps {
            echo '=========================================='
            echo 'VERIFY UI SOURCE'
            echo '=========================================='

            sh '''
                set -e

                echo "UI Source:"
                echo "$UI_SOURCE"

                if [ ! -d "$UI_SOURCE" ]; then
                    echo "ERROR: UI source directory not found."
                    exit 1
                fi

                echo ""
                echo "Checking package.json..."

                if [ ! -f "$UI_SOURCE/package.json" ]; then
                    echo "ERROR: package.json not found."
                    exit 1
                fi

                echo "package.json found."

                echo ""
                echo "Checking web.config..."

                if [ ! -f "$UI_SOURCE/web.config" ]; then
                    echo "ERROR: web.config not found."
                    exit 1
                fi

                echo "web.config found."

                echo ""
                echo "Top-level UI files:"
                find "$UI_SOURCE" -maxdepth 1 -type f -printf '%f\\n' | sort

                echo ""
                echo "UI SOURCE VALIDATION SUCCESS"
            '''
        }
    }

    // ============================================================
    // 3. CREATE DEPLOYMENT ZIP
    // ============================================================
    stage('Create Deployment ZIP') {
        steps {
            echo '=========================================='
            echo 'CREATE DEPLOYMENT ZIP'
            echo '=========================================='

            sh '''
                set -e

                rm -f "$DEPLOY_ZIP"

                echo "Creating deployment ZIP..."
                echo "Source: $UI_SOURCE"
                echo "ZIP   : $DEPLOY_ZIP"

                cd "$UI_SOURCE"

                zip -r "$WORKSPACE/$DEPLOY_ZIP" . \
                    -x "Jenkinsfile" \
                    -x "iisnode/*"

                cd "$WORKSPACE"

                echo ""
                echo "ZIP created successfully."

                ls -lh "$DEPLOY_ZIP"

                echo ""
                echo "Checking ZIP contents..."

                unzip -l "$DEPLOY_ZIP" | head -50

                echo ""
                echo "Checking required files..."

                if ! unzip -l "$DEPLOY_ZIP" | grep -q "package.json"; then
                    echo "ERROR: package.json missing from ZIP."
                    exit 1
                fi

                if ! unzip -l "$DEPLOY_ZIP" | grep -q "web.config"; then
                    echo "ERROR: web.config missing from ZIP."
                    exit 1
                fi

                echo ""
                echo "Required files found:"
                echo "- package.json"
                echo "- web.config"

                echo ""
                echo "DEPLOYMENT ZIP CREATION SUCCESS"
            '''
        }
    }

    // ============================================================
    // 4. TEST SSH CONNECTION
    // ============================================================
    stage('Test SSH') {
        steps {
            echo '=========================================='
            echo 'TEST SSH CONNECTION'
            echo '=========================================='

            withCredentials([
                usernamePassword(
                    credentialsId: 'puffin-iis-winrm',
                    usernameVariable: 'SSH_USER',
                    passwordVariable: 'SSH_PASSWORD'
                )
            ]) {
                sh '''
                    set -e

                    echo "Testing SSH connection..."
                    echo "Server : $IIS_SERVER"
                    echo "User   : $SSH_USER"

                    export SSHPASS="$SSH_PASSWORD"

                    if ! command -v sshpass >/dev/null 2>&1; then
                        echo "ERROR: sshpass is not installed on Jenkins."
                        echo ""
                        echo "Install it using:"
                        echo "sudo apt-get update"
                        echo "sudo apt-get install -y sshpass"
                        exit 1
                    fi

                    echo ""
                    echo "sshpass found."

                    SSH_RESULT=$(sshpass -e ssh \
                        -o StrictHostKeyChecking=no \
                        -o UserKnownHostsFile=/dev/null \
                        -o ConnectTimeout=15 \
                        "$SSH_USER@$IIS_SERVER" \
                        "whoami")

                    echo ""
                    echo "Remote Windows user:"
                    echo "$SSH_RESULT"

                    echo ""
                    echo "SSH CONNECTION SUCCESS"
                '''
            }
        }
    }

    // ============================================================
    // 5. PREPARE REMOTE DIRECTORY
    // ============================================================
    stage('Prepare Remote Directory') {
        steps {
            echo '=========================================='
            echo 'PREPARE REMOTE DIRECTORY'
            echo '=========================================='

            withCredentials([
                usernamePassword(
                    credentialsId: 'puffin-iis-winrm',
                    usernameVariable: 'SSH_USER',
                    passwordVariable: 'SSH_PASSWORD'
                )
            ]) {
                sh '''
                    set -e

                    export SSHPASS="$SSH_PASSWORD"

                    echo "Creating remote deployment directory..."

                    sshpass -e ssh \
                        -o StrictHostKeyChecking=no \
                        -o UserKnownHostsFile=/dev/null \
                        "$SSH_USER@$IIS_SERVER" \
                        "powershell.exe -NoProfile -Command \"New-Item -ItemType Directory -Path 'C:\\\\Windows\\\\Temp\\\\PuffinUI_Deployment' -Force | Out-Null; Write-Host 'Remote directory ready.'\""

                    echo ""
                    echo "REMOTE DIRECTORY READY"
                '''
            }
        }
    }

    // ============================================================
    // 6. UPLOAD ZIP VIA SCP
    // ============================================================
    stage('Upload ZIP via SCP') {
        steps {
            echo '=========================================='
            echo 'UPLOAD ZIP VIA SCP'
            echo '=========================================='

            withCredentials([
                usernamePassword(
                    credentialsId: 'puffin-iis-winrm',
                    usernameVariable: 'SSH_USER',
                    passwordVariable: 'SSH_PASSWORD'
                )
            ]) {
                sh '''
                    set -e

                    export SSHPASS="$SSH_PASSWORD"

                    echo "Uploading deployment ZIP..."
                    echo "Local ZIP : $WORKSPACE/$DEPLOY_ZIP"
                    echo "Server    : $IIS_SERVER"

                    if [ ! -f "$DEPLOY_ZIP" ]; then
                        echo "ERROR: Deployment ZIP not found."
                        exit 1
                    fi

                    ls -lh "$DEPLOY_ZIP"

                    sshpass -e scp \
                        -o StrictHostKeyChecking=no \
                        -o UserKnownHostsFile=/dev/null \
                        "$DEPLOY_ZIP" \
                        "$SSH_USER@$IIS_SERVER:/C:/Windows/Temp/PuffinUI_Deployment/PuffinUI_Deployment.zip"

                    echo ""
                    echo "Verifying remote ZIP..."

                    sshpass -e ssh \
                        -o StrictHostKeyChecking=no \
                        -o UserKnownHostsFile=/dev/null \
                        "$SSH_USER@$IIS_SERVER" \
                        "powershell.exe -NoProfile -Command \"if (!(Test-Path -LiteralPath 'C:\\\\Windows\\\\Temp\\\\PuffinUI_Deployment\\\\PuffinUI_Deployment.zip')) { throw 'Remote ZIP not found' }; Get-Item 'C:\\\\Windows\\\\Temp\\\\PuffinUI_Deployment\\\\PuffinUI_Deployment.zip' | Select-Object FullName,Length\""

                    echo ""
                    echo "SCP UPLOAD SUCCESS"
                '''
            }
        }
    }

    // ============================================================
    // 7. DEPLOY TO IIS
    // ============================================================
    stage('Deploy to IIS') {
        steps {
            echo '=========================================='
            echo 'DEPLOY TO IIS'
            echo '=========================================='

            withCredentials([
                usernamePassword(
                    credentialsId: 'puffin-iis-winrm',
                    usernameVariable: 'SSH_USER',
                    passwordVariable: 'SSH_PASSWORD'
                )
            ]) {
                sh '''
                    set -e

                    export SSHPASS="$SSH_PASSWORD"

                    echo "Creating PowerShell deployment script..."

                    cat > deploy_puffin_ui.ps1 <<'POWERSHELL'
```

$ErrorActionPreference = "Stop"

$target = "C:\inetpub\wwwroot\PuffinMT_Demo\PuffinUI"
$zip = "C:\Windows\Temp\PuffinUI_Deployment\PuffinUI_Deployment.zip"
$backupRoot = "C:\inetpub\wwwroot\PuffinMT_Demo\Backup"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = Join-Path $backupRoot "PuffinUI_$timestamp"

Write-Host "=========================================="
Write-Host "PUFFIN UI IIS DEPLOYMENT"
Write-Host "=========================================="

Write-Host "ZIP      : $zip"
Write-Host "TARGET   : $target"
Write-Host "BACKUP   : $backup"
Write-Host ""

# --------------------------------------------------

# Verify ZIP

# --------------------------------------------------

Write-Host "Checking deployment ZIP..."

if (!(Test-Path -LiteralPath $zip)) {
throw "Deployment ZIP not found: $zip"
}

$zipInfo = Get-Item -LiteralPath $zip

Write-Host "ZIP found."
Write-Host "ZIP size : $($zipInfo.Length) bytes"
Write-Host ""

# --------------------------------------------------

# Create required directories

# --------------------------------------------------

Write-Host "Checking target directory..."

if (!(Test-Path -LiteralPath $target)) {
Write-Host "Target directory does not exist. Creating it..."
New-Item -ItemType Directory -Path $target -Force | Out-Null
}

if (!(Test-Path -LiteralPath $backupRoot)) {
Write-Host "Creating backup root..."
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
}

Write-Host "Required directories ready."
Write-Host ""

# --------------------------------------------------

# Backup existing deployment

# --------------------------------------------------

Write-Host "Checking existing deployment..."

$existingFiles = @(Get-ChildItem -LiteralPath $target -Force -ErrorAction SilentlyContinue)

if ($existingFiles.Count -gt 0) {

```
Write-Host "Existing deployment found."
Write-Host "Creating backup:"
Write-Host "$backup"

New-Item -ItemType Directory -Path $backup -Force | Out-Null

Copy-Item `
    -LiteralPath "$target\\*" `
    -Destination $backup `
    -Recurse `
    -Force

Write-Host "Backup completed."
```

}
else {
Write-Host "No existing files found."
}

Write-Host ""

# --------------------------------------------------

# Remove existing deployment

# --------------------------------------------------

Write-Host "Cleaning existing IIS deployment..."

Get-ChildItem `    -LiteralPath $target`
-Force `    -ErrorAction SilentlyContinue |
    Remove-Item`
-Recurse `
-Force

Write-Host "Existing deployment cleaned."
Write-Host ""

# --------------------------------------------------

# Extract new deployment

# --------------------------------------------------

Write-Host "Extracting deployment ZIP..."

Expand-Archive `    -LiteralPath $zip`
-DestinationPath $target `
-Force

Write-Host "ZIP extraction completed."
Write-Host ""

# --------------------------------------------------

# Verify deployment

# --------------------------------------------------

Write-Host "Verifying deployment..."

$packageJson = Join-Path $target "package.json"
$webConfig = Join-Path $target "web.config"

if (!(Test-Path -LiteralPath $packageJson)) {
throw "package.json not found after deployment."
}

if (!(Test-Path -LiteralPath $webConfig)) {
throw "web.config not found after deployment."
}

$fileCount = @(Get-ChildItem -LiteralPath $target -Recurse -File).Count

if ($fileCount -eq 0) {
throw "Deployment directory is empty."
}

Write-Host "package.json : FOUND"
Write-Host "web.config   : FOUND"
Write-Host "File count   : $fileCount"
Write-Host ""

# --------------------------------------------------

# Show deployment contents

# --------------------------------------------------

Write-Host "Top-level deployment contents:"
Write-Host ""

Get-ChildItem -LiteralPath $target -Force |
Select-Object Mode, Length, Name |
Format-Table -AutoSize

Write-Host ""

# --------------------------------------------------

# Cleanup remote ZIP

# --------------------------------------------------

Write-Host "Cleaning temporary deployment files..."

$remoteTemp = Split-Path -Parent $zip

if (Test-Path -LiteralPath $remoteTemp) {
Remove-Item `        -LiteralPath $remoteTemp`
-Recurse `
-Force
}

Write-Host "Remote temporary files cleaned."
Write-Host ""

# --------------------------------------------------

# Deployment success

# --------------------------------------------------

Write-Host "=========================================="
Write-Host "PUFFIN UI DEPLOYMENT SUCCESS"
Write-Host "=========================================="
Write-Host "Target : $target"
Write-Host "Files  : $fileCount"
Write-Host "Backup : $backup"
Write-Host "=========================================="
POWERSHELL

```
                    echo "PowerShell script created."

                    echo ""
                    echo "Uploading PowerShell deployment script..."

                    sshpass -e scp \
                        -o StrictHostKeyChecking=no \
                        -o UserKnownHostsFile=/dev/null \
                        deploy_puffin_ui.ps1 \
                        "$SSH_USER@$IIS_SERVER:/C:/Windows/Temp/deploy_puffin_ui.ps1"

                    echo "PowerShell script uploaded."

                    echo ""
                    echo "Executing deployment on IIS..."

                    sshpass -e ssh \
                        -o StrictHostKeyChecking=no \
                        -o UserKnownHostsFile=/dev/null \
                        "$SSH_USER@$IIS_SERVER" \
                        "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\\Windows\\Temp\\deploy_puffin_ui.ps1"

                    echo ""
                    echo "=========================================="
                    echo "IIS DEPLOYMENT COMMAND COMPLETED"
                    echo "=========================================="

                    rm -f deploy_puffin_ui.ps1
                '''
            }
        }
    }

    // ============================================================
    // 8. VERIFY DEPLOYMENT
    // ============================================================
    stage('Verify Deployment') {
        steps {
            echo '=========================================='
            echo 'VERIFY IIS DEPLOYMENT'
            echo '=========================================='

            withCredentials([
                usernamePassword(
                    credentialsId: 'puffin-iis-winrm',
                    usernameVariable: 'SSH_USER',
                    passwordVariable: 'SSH_PASSWORD'
                )
            ]) {
                sh '''
                    set -e

                    export SSHPASS="$SSH_PASSWORD"

                    echo "Checking deployed files on IIS..."

                    sshpass -e ssh \
                        -o StrictHostKeyChecking=no \
                        -o UserKnownHostsFile=/dev/null \
                        "$SSH_USER@$IIS_SERVER" \
                        "powershell.exe -NoProfile -Command \"\\$target='C:\\\\inetpub\\\\wwwroot\\\\PuffinMT_Demo\\\\PuffinUI'; if (!(Test-Path -LiteralPath \\$target)) { throw 'IIS target directory does not exist' }; if (!(Test-Path -LiteralPath (Join-Path \\$target 'package.json'))) { throw 'package.json missing' }; if (!(Test-Path -LiteralPath (Join-Path \\$target 'web.config'))) { throw 'web.config missing' }; \\$count=@(Get-ChildItem -LiteralPath \\$target -Recurse -File).Count; Write-Host 'Target:' \\$target; Write-Host 'File count:' \\$count; Write-Host 'package.json: FOUND'; Write-Host 'web.config: FOUND'; Write-Host ''; Write-Host 'Deployment verification successful.'\""

                    echo ""
                    echo "=========================================="
                    echo "PUFFIN UI DEPLOYMENT VERIFIED"
                    echo "=========================================="
                '''
            }
        }
    }
}

// ================================================================
// POST ACTIONS
// ================================================================
post {

    success {
        echo '=========================================='
        echo 'PUFFIN UI DEPLOYMENT SUCCESSFUL'
        echo '=========================================='
        echo 'GitHub → Jenkins → SCP → IIS deployment completed.'
        echo '=========================================='
    }

    failure {
        echo '=========================================='
        echo 'PUFFIN UI DEPLOYMENT FAILED'
        echo '=========================================='
        echo 'Please check the Jenkins console log for the failed stage.'
        echo '=========================================='
    }

    always {
        echo '=========================================='
        echo 'LOCAL CLEANUP'
        echo '=========================================='

        sh '''
            rm -f "$DEPLOY_ZIP"
            rm -f deploy_puffin_ui.ps1
            rm -rf deployment_chunks

            echo "Local deployment files cleaned."
        ''' || true
    }
}
```

}
