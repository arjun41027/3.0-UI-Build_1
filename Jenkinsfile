
pipeline {
    agent any

    environment {
        IIS_SERVER = '172.16.4.166'
        IIS_TARGET = 'C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI'
        UI_BUILD_PATH = 'Desktop/3.0 UI and API Docs/3.0 UI Build'
        DEPLOY_ZIP_NAME = 'PuffinUI_deploy.zip'
    }

    options {
        skipDefaultCheckout(true)
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages {
        stage('Checkout UI Build') {
            steps {
                checkout scm
            }
        }

        stage('Verify UI Build') {
            steps {
                script {
                    if (!fileExists("${env.UI_BUILD_PATH}/web.config")) {
                        error("web.config not found in ${env.UI_BUILD_PATH}")
                    }

                    if (!fileExists("${env.UI_BUILD_PATH}/package.json")) {
                        error("package.json not found in ${env.UI_BUILD_PATH}")
                    }

                    if (!fileExists("${env.UI_BUILD_PATH}/.next")) {
                        error(".next build folder not found in ${env.UI_BUILD_PATH}")
                    }

                    echo 'UI build verification passed.'
                }
            }
        }

        stage('Backup Existing IIS UI') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'puffin-iis-winrm',
                        usernameVariable: 'IIS_USER',
                        passwordVariable: 'IIS_PASSWORD'
                    )
                ]) {
                    sh '''
                        python3 - <<'PY'
import os
import winrm

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]
username = os.environ["IIS_USER"]
password = os.environ["IIS_PASSWORD"]

def ps_quote(value):
    return "'" + value.replace("'", "''") + "'"

session = winrm.Session(
    f"http://{server}:5985/wsman",
    auth=(username, password),
    transport="ntlm"
)

backup_base = r"C:\\inetpub\\wwwroot\\PuffinMT_Demo\\Backup"

command = "\\n".join([
    "$ErrorActionPreference = 'Stop'",
    f"$target = {ps_quote(target)}",
    f"$backupBase = {ps_quote(backup_base)}",
    "if (!(Test-Path -LiteralPath $target -PathType Container)) {",
    "    throw ('IIS target does not exist: ' + $target)",
    "}",
    "$items = @(Get-ChildItem -LiteralPath $target -Force)",
    "if ($items.Count -gt 0) {",
    "    New-Item -ItemType Directory -Path $backupBase -Force | Out-Null",
    "    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'",
    "    $backup = Join-Path $backupBase ('PuffinUI_' + $stamp)",
    "    New-Item -ItemType Directory -Path $backup -Force | Out-Null",
    "    Copy-Item -Path (Join-Path $target '*') -Destination $backup -Recurse -Force",
    "    Write-Output ('BACKUP_PATH=' + $backup)",
    "} else {",
    "    Write-Output 'TARGET_EMPTY_NO_BACKUP'",
    "}"
])

result = session.run_ps(command)
stdout = result.std_out.decode("utf-8", errors="replace")
stderr = result.std_err.decode("utf-8", errors="replace")

if stdout.strip():
    print(stdout)
if stderr.strip():
    print(stderr)

if result.status_code != 0:
    raise RuntimeError("IIS backup failed")

if (
    "BACKUP_PATH=" not in stdout
    and "TARGET_EMPTY_NO_BACKUP" not in stdout
):
    raise RuntimeError("Backup stage did not confirm completion")

print("IIS backup completed.")
PY
                    '''
                }
            }
        }

        stage('Create Deployment ZIP') {
            steps {
                sh '''
                    python3 - <<'PY'
import os
import zipfile

source = os.path.abspath(os.environ["UI_BUILD_PATH"])
zip_path = os.path.join(
    os.environ["WORKSPACE"],
    os.environ["DEPLOY_ZIP_NAME"]
)

if not os.path.isdir(source):
    raise RuntimeError("UI build folder not found: " + source)

for required in ["web.config", "package.json"]:
    if not os.path.isfile(os.path.join(source, required)):
        raise RuntimeError("Required file missing: " + required)

if not os.path.isdir(os.path.join(source, ".next")):
    raise RuntimeError(".next build folder is missing")

if os.path.exists(zip_path):
    os.remove(zip_path)

file_count = 0

with zipfile.ZipFile(
    zip_path,
    "w",
    compression=zipfile.ZIP_DEFLATED
) as archive:
    for root, dirs, files in os.walk(source):
        for filename in files:
            local_file = os.path.join(root, filename)
            relative_file = os.path.relpath(local_file, source)
            archive.write(local_file, arcname=relative_file)
            file_count += 1

print("ZIP_PATH=" + zip_path)
print("FILES_ARCHIVED=" + str(file_count))
print("ZIP_SIZE_BYTES=" + str(os.path.getsize(zip_path)))
print("Deployment ZIP created successfully.")
PY
                '''
            }
        }

        stage('Transfer ZIP via SFTP') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'puffin-iis-winrm',
                        usernameVariable: 'IIS_USER',
                        passwordVariable: 'IIS_PASSWORD'
                    )
                ]) {
                    sh '''
                        set +x
                        set -eu

                        ZIP_PATH="$WORKSPACE/$DEPLOY_ZIP_NAME"

                        if [ ! -f "$ZIP_PATH" ]; then
                            echo "Deployment ZIP not found: $ZIP_PATH"
                            exit 1
                        fi

                        if ! command -v sshpass >/dev/null 2>&1; then
                            echo "sshpass is not installed on the Jenkins agent."
                            exit 1
                        fi

                        if ! command -v sftp >/dev/null 2>&1; then
                            echo "SFTP client is not installed on the Jenkins agent."
                            exit 1
                        fi

                        echo "Starting SFTP transfer to $IIS_SERVER..."

                        printf 'put "%s" "%s"\\n' \
                            "$ZIP_PATH" "$DEPLOY_ZIP_NAME" |
                            SSHPASS="$IIS_PASSWORD" sshpass -e sftp \
                                -oBatchMode=no \
                                -oStrictHostKeyChecking=accept-new \
                                -oConnectTimeout=20 \
                                "$IIS_USER@$IIS_SERVER"

                        echo "SFTP transfer completed."
                    '''
                }
            }
        }

        stage('Extract ZIP and Deploy to IIS') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'puffin-iis-winrm',
                        usernameVariable: 'IIS_USER',
                        passwordVariable: 'IIS_PASSWORD'
                    )
                ]) {
                    sh '''
                        python3 - <<'PY'
import os
import winrm

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]
username = os.environ["IIS_USER"]
password = os.environ["IIS_PASSWORD"]
zip_name = os.environ["DEPLOY_ZIP_NAME"]

def ps_quote(value):
    return "'" + value.replace("'", "''") + "'"

session = winrm.Session(
    f"http://{server}:5985/wsman",
    auth=(username, password),
    transport="ntlm"
)

# OpenSSH SFTP normally places relative uploads in the user's
# configured SFTP starting directory. This assumes that directory
# is the same Windows user's profile used by WinRM.
command = "\\n".join([
    "$ErrorActionPreference = 'Stop'",
    f"$zipName = {ps_quote(zip_name)}",
    "$zipPath = Join-Path $env:USERPROFILE $zipName",
    f"$target = {ps_quote(target)}",
    "if (!(Test-Path -LiteralPath $zipPath -PathType Leaf)) {",
    "    throw ('Uploaded ZIP not found at expected path: ' + $zipPath)",
    "}",
    "$zipFile = Get-Item -LiteralPath $zipPath",
    "if ($zipFile.Length -le 0) {",
    "    throw 'Uploaded ZIP is empty'",
    "}",
    "Write-Output ('REMOTE_ZIP=' + $zipPath)",
    "Write-Output ('REMOTE_ZIP_SIZE=' + $zipFile.Length)",
    "New-Item -ItemType Directory -Path $target -Force | Out-Null",
    "Expand-Archive -LiteralPath $zipPath -DestinationPath $target -Force",
    "if (!(Test-Path -LiteralPath (Join-Path $target 'web.config') -PathType Leaf)) {",
    "    throw 'web.config missing after extraction'",
    "}",
    "if (!(Test-Path -LiteralPath (Join-Path $target 'package.json') -PathType Leaf)) {",
    "    throw 'package.json missing after extraction'",
    "}",
    "if (!(Test-Path -LiteralPath (Join-Path $target '.next') -PathType Container)) {",
    "    throw '.next folder missing after extraction'",
    "}",
    "Remove-Item -LiteralPath $zipPath -Force",
    "Write-Output 'DEPLOYMENT_FILES_EXTRACTED'",
    "Write-Output ('DEPLOYMENT_TARGET=' + $target)"
])

result = session.run_ps(command)
stdout = result.std_out.decode("utf-8", errors="replace")
stderr = result.std_err.decode("utf-8", errors="replace")

if stdout.strip():
    print(stdout)
if stderr.strip():
    print(stderr)

if result.status_code != 0:
    raise RuntimeError("ZIP extraction or IIS deployment failed")

if "DEPLOYMENT_FILES_EXTRACTED" not in stdout:
    raise RuntimeError("Deployment extraction was not confirmed")

print("ZIP extracted successfully into the IIS application folder.")
PY
                    '''
                }
            }
        }

        stage('Verify IIS Deployment') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'puffin-iis-winrm',
                        usernameVariable: 'IIS_USER',
                        passwordVariable: 'IIS_PASSWORD'
                    )
                ]) {
                    sh '''
                        python3 - <<'PY'
import os
import winrm

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]
username = os.environ["IIS_USER"]
password = os.environ["IIS_PASSWORD"]

def ps_quote(value):
    return "'" + value.replace("'", "''") + "'"

session = winrm.Session(
    f"http://{server}:5985/wsman",
    auth=(username, password),
    transport="ntlm"
)

command = "\\n".join([
    "$ErrorActionPreference = 'Stop'",
    f"$target = {ps_quote(target)}",
    "foreach ($name in @('web.config', 'package.json')) {",
    "    $path = Join-Path $target $name",
    "    if (!(Test-Path -LiteralPath $path -PathType Leaf)) {",
    "        throw ('Required deployment file missing: ' + $path)",
    "    }",
    "}",
    "if (!(Test-Path -LiteralPath (Join-Path $target '.next') -PathType Container)) {",
    "    throw '.next directory missing'",
    "}",
    "Write-Output 'DEPLOYMENT_VERIFIED'",
    "Write-Output ('VERIFIED_TARGET=' + $target)"
])

result = session.run_ps(command)
stdout = result.std_out.decode("utf-8", errors="replace")
stderr = result.std_err.decode("utf-8", errors="replace")

if stdout.strip():
    print(stdout)
if stderr.strip():
    print(stderr)

if result.status_code != 0 or "DEPLOYMENT_VERIFIED" not in stdout:
    raise RuntimeError("IIS deployment verification failed")

print("IIS deployment verification passed.")
PY
                    '''
                }
            }
        }

        stage('Run Cypress Smoke Tests') {
            steps {
                script {
                    echo 'Deployment verified. Triggering Cypress automation job.'

                    def smokeBuild = build(
                        job: '3,0 UI Automation',
                        wait: true,
                        propagate: false
                    )

                    echo "Cypress smoke-test result: ${smokeBuild.result}"

                    if (smokeBuild.result != 'SUCCESS') {
                        error(
                            "Cypress smoke tests did not pass. " +
                            "Automation job result: ${smokeBuild.result}"
                        )
                    }

                    echo 'Cypress smoke tests passed.'
                }
            }
        }
    }

    post {
        success {
            echo 'UI deployment and Cypress smoke tests completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Check the failed stage in the Jenkins console.'
        }

        always {
            echo "Final pipeline result: ${currentBuild.currentResult}"
        }
    }
}
