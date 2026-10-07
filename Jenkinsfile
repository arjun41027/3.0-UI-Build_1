pipeline {
agent any


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

    stage('Checkout') {
        steps {
            echo '=========================================='
            echo 'CHECKOUT FROM GITHUB'
            echo '=========================================='

            checkout scm

            sh '''
                set -e

                echo "Workspace: $WORKSPACE"

                echo ""
                echo "Branch:"
                git branch --show-current || true

                echo ""
                echo "Commit:"
                git rev-parse --short HEAD

                echo ""
                echo "Remote:"
                git remote -v
            '''
        }
    }

    stage('Verify UI Source') {
        steps {
            echo '=========================================='
            echo 'VERIFY UI SOURCE'
            echo '=========================================='

            sh '''
                set -e

                echo "UI Source: $UI_SOURCE"

                if [ ! -d "$UI_SOURCE" ]; then
                    echo "ERROR: UI source directory not found."
                    exit 1
                fi

                if [ ! -f "$UI_SOURCE/package.json" ]; then
                    echo "ERROR: package.json not found."
                    exit 1
                fi

                if [ ! -f "$UI_SOURCE/web.config" ]; then
                    echo "ERROR: web.config not found."
                    exit 1
                fi

                echo ""
                echo "package.json: FOUND"
                echo "web.config: FOUND"

                echo ""
                echo "Top-level files:"
                find "$UI_SOURCE" -maxdepth 1 -type f -printf '%f\\n' | sort

                echo ""
                echo "UI SOURCE VALIDATION SUCCESS"
            '''
        }
    }

    stage('Create Deployment ZIP') {
        steps {
            echo '=========================================='
            echo 'CREATE DEPLOYMENT ZIP'
            echo '=========================================='

            sh '''
                set -e

                rm -f "$DEPLOY_ZIP"

                echo "Creating deployment ZIP..."

                cd "$UI_SOURCE"

                zip -r "$WORKSPACE/$DEPLOY_ZIP" . \
                    -x "Jenkinsfile" \
                    -x "iisnode/*"

                cd "$WORKSPACE"

                echo ""
                echo "ZIP created:"
                ls -lh "$DEPLOY_ZIP"

                echo ""
                echo "Checking required files..."

                unzip -l "$DEPLOY_ZIP" | grep -q "package.json"
                unzip -l "$DEPLOY_ZIP" | grep -q "web.config"

                echo "package.json: FOUND"
                echo "web.config: FOUND"

                echo ""
                echo "DEPLOYMENT ZIP CREATION SUCCESS"
            '''
        }
    }

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

                    export SSHPASS="$SSH_PASSWORD"

                    echo "Testing SSH connection..."
                    echo "Server: $IIS_SERVER"
                    echo "User: $SSH_USER"

                    if ! command -v sshpass >/dev/null 2>&1; then
                        echo "ERROR: sshpass is not installed."
                        echo "Install using:"
                        echo "sudo apt-get update"
                        echo "sudo apt-get install -y sshpass"
                        exit 1
                    fi

                    SSH_RESULT=$(sshpass -e ssh \
                        -o StrictHostKeyChecking=no \
                        -o UserKnownHostsFile=/dev/null \
                        -o ConnectTimeout=15 \
                        "$SSH_USER@$IIS_SERVER" \
                        "whoami")

                    echo ""
                    echo "Remote user:"
                    echo "$SSH_RESULT"

                    echo ""
                    echo "SSH CONNECTION SUCCESS"
                '''
            }
        }
    }

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

                    if [ ! -f "$DEPLOY_ZIP" ]; then
                        echo "ERROR: Deployment ZIP not found."
                        exit 1
                    fi

                    echo "Uploading:"
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

Write-Host "ZIP    : $zip"
Write-Host "TARGET : $target"
Write-Host "BACKUP : $backup"
Write-Host ""

if (!(Test-Path -LiteralPath $zip)) {
throw "Deployment ZIP not found: $zip"
}

$zipInfo = Get-Item -LiteralPath $zip

Write-Host "ZIP found."
Write-Host "ZIP size: $($zipInfo.Length) bytes"
Write-Host ""

if (!(Test-Path -LiteralPath $backupRoot)) {
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
}

if (!(Test-Path -LiteralPath $target)) {
Write-Host "Target directory does not exist. Creating..."
New-Item -ItemType Directory -Path $target -Force | Out-Null
}

Write-Host "Checking existing deployment..."

$existingFiles = @(Get-ChildItem -LiteralPath $target -Force -ErrorAction SilentlyContinue)

if ($existingFiles.Count -gt 0) {


Write-Host "Existing deployment found."
Write-Host "Creating backup..."

New-Item -ItemType Directory -Path $backup -Force | Out-Null

Copy-Item `
    -LiteralPath "$target\\*" `
    -Destination $backup `
    -Recurse `
    -Force

Write-Host "Backup completed."


}
else {
Write-Host "No existing files found."
}

Write-Host ""

Write-Host "Cleaning existing IIS deployment..."

Get-ChildItem `    -LiteralPath $target`
-Force `    -ErrorAction SilentlyContinue |
    Remove-Item`
-Recurse `
-Force

Write-Host "Existing deployment cleaned."
Write-Host ""

Write-Host "Extracting deployment ZIP..."

Expand-Archive `    -LiteralPath $zip`
-DestinationPath $target `
-Force

Write-Host "ZIP extraction completed."
Write-Host ""

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

Write-Host "Top-level deployment contents:"

Get-ChildItem -LiteralPath $target -Force |
Select-Object Mode, Length, Name |
Format-Table -AutoSize

Write-Host ""

Write-Host "Cleaning remote temporary files..."

$remoteTemp = Split-Path -Parent $zip

if (Test-Path -LiteralPath $remoteTemp) {
Remove-Item `        -LiteralPath $remoteTemp`
-Recurse `
-Force
}

Write-Host "Remote temporary files cleaned."
Write-Host ""

Write-Host "=========================================="
Write-Host "PUFFIN UI DEPLOYMENT SUCCESS"
Write-Host "=========================================="
Write-Host "Target : $target"
Write-Host "Files  : $fileCount"
Write-Host "Backup : $backup"
Write-Host "=========================================="
POWERSHELL


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
                    echo "IIS deployment command completed."

                    rm -f deploy_puffin_ui.ps1
                '''
            }
        }
    }

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

                    echo "Checking deployed files..."

                    sshpass -e ssh \
                        -o StrictHostKeyChecking=no \
                        -o UserKnownHostsFile=/dev/null \
                        "$SSH_USER@$IIS_SERVER" \
                        "powershell.exe -NoProfile -Command \"\\$target='C:\\\\inetpub\\\\wwwroot\\\\PuffinMT_Demo\\\\PuffinUI'; if (!(Test-Path -LiteralPath \\$target)) { throw 'IIS target directory does not exist' }; if (!(Test-Path -LiteralPath (Join-Path \\$target 'package.json'))) { throw 'package.json missing' }; if (!(Test-Path -LiteralPath (Join-Path \\$target 'web.config'))) { throw 'web.config missing' }; \\$count=@(Get-ChildItem -LiteralPath \\$target -Recurse -File).Count; Write-Host 'Target:' \\$target; Write-Host 'File count:' \\$count; Write-Host 'package.json: FOUND'; Write-Host 'web.config: FOUND'; Write-Host 'Deployment verification successful.'\""

                    echo ""
                    echo "=========================================="
                    echo "PUFFIN UI DEPLOYMENT VERIFIED"
                    echo "=========================================="
                '''
            }
        }
    }
}

post {

    success {
        echo '=========================================='
        echo 'PUFFIN UI DEPLOYMENT SUCCESSFUL'
        echo '=========================================='
        echo 'GitHub -> Jenkins -> SCP -> IIS completed.'
        echo '=========================================='
    }

    failure {
        echo '=========================================='
        echo 'PUFFIN UI DEPLOYMENT FAILED'
        echo '=========================================='
        echo 'Please check the Jenkins console log.'
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


}
