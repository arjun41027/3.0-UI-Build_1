pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        IIS_SERVER = '172.16.4.166'
        IIS_TARGET = 'C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI'
        UI_SOURCE = 'Desktop/3.0 UI and API Docs/3.0 UI Build'
        DEPLOY_ZIP = 'PuffinUI_Deployment.zip'

        // Remote deployment location
        REMOTE_TEMP = 'C:\\Windows\\Temp\\PuffinUI_Deployment'
        REMOTE_ZIP = 'C:\\Windows\\Temp\\PuffinUI_Deployment\\PuffinUI_Deployment.zip'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '=========================================='
                echo 'CHECKOUT SOURCE CODE'
                echo '=========================================='

                checkout scm

                sh '''
                    set -e

                    echo "Workspace:"
                    pwd

                    echo ""
                    echo "Git branch:"
                    git branch --show-current || true

                    echo ""
                    echo "Latest commit:"
                    git log -1 --oneline

                    echo ""
                    echo "Repository:"
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

                    if [ ! -d "$UI_SOURCE" ]; then
                        echo "ERROR: UI source directory not found:"
                        echo "$UI_SOURCE"
                        exit 1
                    fi

                    echo "UI source found:"
                    echo "$UI_SOURCE"

                    echo ""
                    echo "Top-level files:"
                    find "$UI_SOURCE" -maxdepth 1 -type f -printf '%f\\n' | sort

                    echo ""
                    echo "Checking package.json..."
                    test -f "$UI_SOURCE/package.json"

                    echo "Checking web.config..."
                    test -f "$UI_SOURCE/web.config"

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
                    echo "ZIP contents:"
                    unzip -l "$DEPLOY_ZIP" | head -40

                    echo ""
                    echo "Checking required files..."

                    unzip -l "$DEPLOY_ZIP" | grep -q "package.json"
                    unzip -l "$DEPLOY_ZIP" | grep -q "web.config"

                    echo ""
                    echo "Required files found:"
                    echo "- package.json"
                    echo "- web.config"

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

                        echo "Testing SSH connection..."
                        echo "Server : $IIS_SERVER"
                        echo "User   : $SSH_USER"

                        export SSHPASS="$SSH_PASSWORD"

                        if ! command -v sshpass >/dev/null 2>&1; then
                            echo "ERROR: sshpass is not installed on Jenkins."
                            echo ""
                            echo "Install it on Jenkins using:"
                            echo "sudo apt-get update"
                            echo "sudo apt-get install -y sshpass"
                            exit 1
                        fi

                        sshpass -e ssh \
                            -o StrictHostKeyChecking=no \
                            -o UserKnownHostsFile=/dev/null \
                            -o ConnectTimeout=15 \
                            "$SSH_USER@$IIS_SERVER" \
                            "whoami"

                        echo ""
                        echo "SSH CONNECTION SUCCESS"
                    '''
                }
            }
        }

        stage('Prepare Remote Directory') {
            steps {
                echo '=========================================='
                echo 'PREPARE REMOTE DEPLOYMENT DIRECTORY'
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

                        echo "Creating remote temporary directory..."

                        sshpass -e ssh \
                            -o StrictHostKeyChecking=no \
                            -o UserKnownHostsFile=/dev/null \
                            -o ConnectTimeout=15 \
                            "$SSH_USER@$IIS_SERVER" \
                            "powershell.exe -NoProfile -NonInteractive -Command \\"New-Item -ItemType Directory -Path '$REMOTE_TEMP' -Force | Out-Null; Write-Output 'REMOTE_TEMP_READY'\\""

                        echo ""
                        echo "REMOTE DIRECTORY READY"
                    '''
                }
            }
        }

        stage('Upload ZIP via SCP') {
            steps {
                echo '=========================================='
                echo 'UPLOAD ZIP TO IIS VIA SCP'
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

                        echo "Uploading:"
                        echo "$DEPLOY_ZIP"

                        ls -lh "$DEPLOY_ZIP"

                        echo ""
                        echo "Destination:"
                        echo "$SSH_USER@$IIS_SERVER:$REMOTE_TEMP"

                        sshpass -e scp \
                            -o StrictHostKeyChecking=no \
                            -o UserKnownHostsFile=/dev/null \
                            -o ConnectTimeout=15 \
                            "$DEPLOY_ZIP" \
                            "$SSH_USER@$IIS_SERVER:$REMOTE_TEMP/PuffinUI_Deployment.zip"

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

                        echo "Executing deployment on IIS..."

                        sshpass -e ssh \
                            -o StrictHostKeyChecking=no \
                            -o UserKnownHostsFile=/dev/null \
                            -o ConnectTimeout=15 \
                            "$SSH_USER@$IIS_SERVER" \
                            "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command \\"
                                `$ErrorActionPreference = 'Stop';

                                `$target = '$IIS_TARGET';
                                `$zip = '$REMOTE_ZIP';
                                `$backupRoot = 'C:\\inetpub\\wwwroot\\PuffinMT_Demo\\Backup';
                                `$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss';
                                `$backup = Join-Path `$backupRoot ('PuffinUI_' + `$timestamp);

                                Write-Output '==========================================';
                                Write-Output 'IIS DEPLOYMENT START';
                                Write-Output '==========================================';

                                Write-Output ('Target: ' + `$target);
                                Write-Output ('ZIP   : ' + `$zip);

                                if (!(Test-Path `$zip)) {
                                    throw 'Deployment ZIP not found on IIS server.';
                                }

                                Write-Output '';
                                Write-Output 'ZIP found successfully.';

                                Write-Output '';
                                Write-Output 'Creating backup directory...';

                                New-Item -ItemType Directory -Path `$backupRoot -Force | Out-Null;

                                if (Test-Path `$target) {
                                    Write-Output ('Creating backup: ' + `$backup);

                                    New-Item -ItemType Directory -Path `$backup -Force | Out-Null;

                                    Get-ChildItem -LiteralPath `$target -Force |
                                        Copy-Item -Destination `$backup -Recurse -Force;

                                    Write-Output 'BACKUP_SUCCESS';
                                }
                                else {
                                    Write-Output 'Target directory does not exist. Creating it...';

                                    New-Item -ItemType Directory -Path `$target -Force | Out-Null;
                                }

                                Write-Output '';
                                Write-Output 'Removing existing deployment files...';

                                Get-ChildItem -LiteralPath `$target -Force |
                                    Remove-Item -Recurse -Force;

                                Write-Output 'Existing files removed.';

                                Write-Output '';
                                Write-Output 'Extracting new deployment...';

                                Expand-Archive `
                                    -LiteralPath `$zip `
                                    -DestinationPath `$target `
                                    -Force;

                                Write-Output 'DEPLOYMENT_EXTRACT_SUCCESS';

                                Write-Output '';
                                Write-Output 'Checking required files...';

                                if (!(Test-Path (Join-Path `$target 'package.json'))) {
                                    throw 'package.json not found after deployment.';
                                }

                                if (!(Test-Path (Join-Path `$target 'web.config'))) {
                                    throw 'web.config not found after deployment.';
                                }

                                Write-Output 'package.json : FOUND';
                                Write-Output 'web.config   : FOUND';

                                Write-Output '';
                                Write-Output 'Deployment file count:';

                                `$fileCount = (Get-ChildItem -LiteralPath `$target -Recurse -File).Count;

                                Write-Output ('Files deployed: ' + `$fileCount);

                                if (`$fileCount -le 0) {
                                    throw 'No files found after deployment.';
                                }

                                Write-Output '';
                                Write-Output 'Cleaning remote temporary files...';

                                Remove-Item -LiteralPath '$REMOTE_TEMP' -Recurse -Force;

                                Write-Output 'REMOTE_TEMP_CLEANED';

                                Write-Output '';
                                Write-Output '==========================================';
                                Write-Output 'IIS DEPLOYMENT SUCCESS';
                                Write-Output '==========================================';
                            \\""

                        echo ""
                        echo "IIS DEPLOYMENT COMMAND COMPLETED"
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

                        sshpass -e ssh \
                            -o StrictHostKeyChecking=no \
                            -o UserKnownHostsFile=/dev/null \
                            -o ConnectTimeout=15 \
                            "$SSH_USER@$IIS_SERVER" \
                            "powershell.exe -NoProfile -NonInteractive -Command \\"
                                `$ErrorActionPreference = 'Stop';

                                `$target = '$IIS_TARGET';

                                Write-Output '==========================================';
                                Write-Output 'DEPLOYMENT VERIFICATION';
                                Write-Output '==========================================';

                                Write-Output ('Target: ' + `$target);

                                if (!(Test-Path `$target)) {
                                    throw 'IIS target directory does not exist.';
                                }

                                if (!(Test-Path (Join-Path `$target 'package.json'))) {
                                    throw 'package.json missing.';
                                }

                                if (!(Test-Path (Join-Path `$target 'web.config'))) {
                                    throw 'web.config missing.';
                                }

                                `$fileCount = (Get-ChildItem -LiteralPath `$target -Recurse -File).Count;

                                Write-Output ('Total deployed files: ' + `$fileCount);

                                Write-Output '';
                                Write-Output 'Top-level files/directories:';

                                Get-ChildItem -LiteralPath `$target -Force |
                                    Select-Object Name,Length,LastWriteTime |
                                    Format-Table -AutoSize;

                                Write-Output '';
                                Write-Output 'package.json : VERIFIED';
                                Write-Output 'web.config   : VERIFIED';

                                Write-Output '';
                                Write-Output 'DEPLOYMENT_VERIFICATION_SUCCESS';
                            \\""

                        echo ""
                        echo "=========================================="
                        echo "DEPLOYMENT VERIFIED SUCCESSFULLY"
                        echo "=========================================="
                    '''
                }
            }
        }
    }

    post {
        success {
            echo '=========================================='
            echo 'PUFFIN UI DEPLOYMENT SUCCESS'
            echo '=========================================='
            echo 'GitHub → Jenkins → SCP → IIS deployment completed successfully.'
        }

        failure {
            echo '=========================================='
            echo 'PUFFIN UI DEPLOYMENT FAILED'
            echo '=========================================='
            echo 'Please check the Jenkins console log for the failed stage.'
        }

        always {
            echo '=========================================='
            echo 'LOCAL CLEANUP'
            echo '=========================================='

            sh '''
                rm -f "$DEPLOY_ZIP" || true
                rm -rf deployment_chunks || true
                echo "Local deployment files cleaned."
            '''
        }
    }
}
