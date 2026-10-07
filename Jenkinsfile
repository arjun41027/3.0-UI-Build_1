pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        IIS_SERVER = '172.16.4.166'
        UI_SOURCE  = 'Desktop/3.0 UI and API Docs/3.0 UI Build'
        DEPLOY_ZIP = 'PuffinUI_Deployment.zip'
        SSH_OPTS   = '-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=15'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'CHECKOUT FROM GITHUB'
                checkout scm
                sh '''
                    set -e
                    echo "Workspace: $WORKSPACE"
                    echo "Branch:"; git branch --show-current || true
                    echo "Commit:"; git rev-parse --short HEAD
                    echo "Remote:"; git remote -v
                '''
            }
        }

        stage('Verify UI Source') {
            steps {
                echo 'VERIFY UI SOURCE'
                sh '''
                    set -e
                    echo "UI Source: $UI_SOURCE"

                    [ -d "$UI_SOURCE" ] || { echo "ERROR: UI source directory not found."; exit 1; }
                    [ -f "$UI_SOURCE/package.json" ] || { echo "ERROR: package.json not found."; exit 1; }
                    [ -f "$UI_SOURCE/web.config" ] || { echo "ERROR: web.config not found."; exit 1; }

                    echo "package.json: FOUND"
                    echo "web.config: FOUND"
                    echo "Top-level files:"
                    find "$UI_SOURCE" -maxdepth 1 -type f -printf '%f\\n' | sort
                '''
            }
        }

        stage('Create Deployment ZIP') {
            steps {
                echo 'CREATE DEPLOYMENT ZIP'
                sh '''
                    set -e
                    rm -f "$DEPLOY_ZIP"

                    cd "$UI_SOURCE"
                    zip -r "$WORKSPACE/$DEPLOY_ZIP" . -x "Jenkinsfile" -x "iisnode/*"
                    cd "$WORKSPACE"

                    ls -lh "$DEPLOY_ZIP"

                    unzip -l "$DEPLOY_ZIP" | grep -q "package.json"
                    unzip -l "$DEPLOY_ZIP" | grep -q "web.config"
                    echo "ZIP validation OK"
                '''
            }
        }

        stage('Test SSH') {
            steps {
                echo 'TEST SSH CONNECTION'
                withCredentials([usernamePassword(credentialsId: 'puffin-iis-winrm',
                                                  usernameVariable: 'SSH_USER',
                                                  passwordVariable: 'SSH_PASSWORD')]) {
                    sh '''
                        set -e
                        export SSHPASS="$SSH_PASSWORD"

                        if ! command -v sshpass >/dev/null 2>&1; then
                            echo "ERROR: sshpass is not installed."
                            echo "Run: sudo apt-get update && sudo apt-get install -y sshpass"
                            exit 1
                        fi

                        echo "Remote user:"
                        sshpass -e ssh $SSH_OPTS "$SSH_USER@$IIS_SERVER" "whoami"
                        echo "SSH CONNECTION SUCCESS"
                    '''
                }
            }
        }

        stage('Prepare Remote Directory') {
            steps {
                echo 'PREPARE REMOTE DIRECTORY'
                withCredentials([usernamePassword(credentialsId: 'puffin-iis-winrm',
                                                  usernameVariable: 'SSH_USER',
                                                  passwordVariable: 'SSH_PASSWORD')]) {
                    sh '''
                        set -e
                        export SSHPASS="$SSH_PASSWORD"

                        sshpass -e ssh $SSH_OPTS "$SSH_USER@$IIS_SERVER" \
                            "powershell.exe -NoProfile -Command New-Item -ItemType Directory -Path C:/Windows/Temp/PuffinUI_Deployment -Force"

                        echo "REMOTE DIRECTORY READY"
                    '''
                }
            }
        }

        stage('Upload ZIP via SCP') {
            steps {
                echo 'UPLOAD ZIP VIA SCP'
                withCredentials([usernamePassword(credentialsId: 'puffin-iis-winrm',
                                                  usernameVariable: 'SSH_USER',
                                                  passwordVariable: 'SSH_PASSWORD')]) {
                    sh '''
                        set -e
                        export SSHPASS="$SSH_PASSWORD"

                        [ -f "$DEPLOY_ZIP" ] || { echo "ERROR: Deployment ZIP not found."; exit 1; }
                        ls -lh "$DEPLOY_ZIP"

                        sshpass -e scp $SSH_OPTS "$DEPLOY_ZIP" \
                            "$SSH_USER@$IIS_SERVER:/C:/Windows/Temp/PuffinUI_Deployment/PuffinUI_Deployment.zip"

                        echo "SCP UPLOAD SUCCESS"
                    '''
                }
            }
        }

        stage('Deploy to IIS') {
            steps {
                echo 'DEPLOY TO IIS (OVERWRITE MODE)'

                // Forward slashes only: PowerShell accepts them and Groovy won't treat them as escapes
                writeFile file: 'deploy_puffin_ui.ps1', text: '''
$ErrorActionPreference = "Stop"

$target     = "C:/inetpub/wwwroot/PuffinMT_Demo/PuffinUI"
$zip        = "C:/Windows/Temp/PuffinUI_Deployment/PuffinUI_Deployment.zip"
$backupRoot = "C:/inetpub/wwwroot/PuffinMT_Demo/Backup"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup    = "$backupRoot/PuffinUI_$timestamp"

Write-Host "=========================================="
Write-Host "PUFFIN UI IIS DEPLOYMENT (OVERWRITE MODE)"
Write-Host "=========================================="
Write-Host "ZIP    : $zip"
Write-Host "TARGET : $target"
Write-Host "BACKUP : $backup"

if (!(Test-Path -LiteralPath $zip)) { throw "Deployment ZIP not found: $zip" }
Write-Host "ZIP size: $((Get-Item -LiteralPath $zip).Length) bytes"

if (!(Test-Path -LiteralPath $backupRoot)) { New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null }
if (!(Test-Path -LiteralPath $target))     { New-Item -ItemType Directory -Path $target -Force | Out-Null }

$existing = @(Get-ChildItem -LiteralPath $target -Force -ErrorAction SilentlyContinue)

if ($existing.Count -gt 0) {
    Write-Host "Creating backup..."
    New-Item -ItemType Directory -Path $backup -Force | Out-Null
    Copy-Item -Path "$target/*" -Destination $backup -Recurse -Force
    Write-Host "Backup completed."
} else {
    Write-Host "No existing files found, skipping backup."
}

# No cleanup: existing files not in the ZIP stay as they are.
Write-Host "Extracting ZIP over existing deployment (replace same files only)..."
Expand-Archive -LiteralPath $zip -DestinationPath $target -Force
Write-Host "Extraction completed."

if (!(Test-Path -LiteralPath "$target/package.json")) { throw "package.json not found after deployment." }
if (!(Test-Path -LiteralPath "$target/web.config"))   { throw "web.config not found after deployment." }

$fileCount = @(Get-ChildItem -LiteralPath $target -Recurse -File).Count
Write-Host "package.json : FOUND"
Write-Host "web.config   : FOUND"
Write-Host "File count   : $fileCount"

Remove-Item -LiteralPath (Split-Path -Parent $zip) -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "=========================================="
Write-Host "PUFFIN UI DEPLOYMENT SUCCESS"
Write-Host "=========================================="
'''

                withCredentials([usernamePassword(credentialsId: 'puffin-iis-winrm',
                                                  usernameVariable: 'SSH_USER',
                                                  passwordVariable: 'SSH_PASSWORD')]) {
                    sh '''
                        set -e
                        export SSHPASS="$SSH_PASSWORD"

                        sshpass -e scp $SSH_OPTS deploy_puffin_ui.ps1 \
                            "$SSH_USER@$IIS_SERVER:/C:/Windows/Temp/deploy_puffin_ui.ps1"

                        sshpass -e ssh $SSH_OPTS "$SSH_USER@$IIS_SERVER" \
                            "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:/Windows/Temp/deploy_puffin_ui.ps1"

                        rm -f deploy_puffin_ui.ps1
                    '''
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                echo 'VERIFY IIS DEPLOYMENT'

                writeFile file: 'verify_puffin_ui.ps1', text: '''
$ErrorActionPreference = "Stop"
$target = "C:/inetpub/wwwroot/PuffinMT_Demo/PuffinUI"

if (!(Test-Path -LiteralPath $target))                      { throw "IIS target directory does not exist" }
if (!(Test-Path -LiteralPath "$target/package.json"))       { throw "package.json missing" }
if (!(Test-Path -LiteralPath "$target/web.config"))         { throw "web.config missing" }

$count = @(Get-ChildItem -LiteralPath $target -Recurse -File).Count
Write-Host "Target     : $target"
Write-Host "File count : $count"
Write-Host "Deployment verification successful."
'''

                withCredentials([usernamePassword(credentialsId: 'puffin-iis-winrm',
                                                  usernameVariable: 'SSH_USER',
                                                  passwordVariable: 'SSH_PASSWORD')]) {
                    sh '''
                        set -e
                        export SSHPASS="$SSH_PASSWORD"

                        sshpass -e scp $SSH_OPTS verify_puffin_ui.ps1 \
                            "$SSH_USER@$IIS_SERVER:/C:/Windows/Temp/verify_puffin_ui.ps1"

                        sshpass -e ssh $SSH_OPTS "$SSH_USER@$IIS_SERVER" \
                            "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:/Windows/Temp/verify_puffin_ui.ps1"

                        sshpass -e ssh $SSH_OPTS "$SSH_USER@$IIS_SERVER" \
                            "powershell.exe -NoProfile -Command Remove-Item C:/Windows/Temp/deploy_puffin_ui.ps1,C:/Windows/Temp/verify_puffin_ui.ps1 -Force -ErrorAction SilentlyContinue" || true

                        rm -f verify_puffin_ui.ps1
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'PUFFIN UI DEPLOYMENT SUCCESSFUL: GitHub -> Jenkins -> SCP -> IIS'
        }
        failure {
            echo 'PUFFIN UI DEPLOYMENT FAILED. Please check the Jenkins console log.'
        }
        always {
            sh '''
                rm -f "$DEPLOY_ZIP" deploy_puffin_ui.ps1 verify_puffin_ui.ps1
                echo "Local deployment files cleaned."
            '''
        }
    }
}
