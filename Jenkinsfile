pipeline {
    agent any

    environment {
        IIS_SERVER = '172.16.4.166'
        IIS_TARGET = 'C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI'
        UI_BUILD_PATH = 'Desktop/3.0 UI and API Docs/3.0 UI Build'
    }

    options {
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
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
import sys
import winrm

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]
username = os.environ["IIS_USER"]
password = os.environ["IIS_PASSWORD"]

def ps_quote(value):
    return "'" + value.replace("'", "''") + "'"

def run_ps_checked(session, command, description):
    result = session.run_ps(command)

    stdout = result.std_out.decode("utf-8", errors="replace")
    stderr = result.std_err.decode("utf-8", errors="replace")

    if stdout.strip():
        print(stdout)

    if stderr.strip():
        print(stderr)

    if result.status_code != 0:
        raise RuntimeError(
            description + " failed with exit code " +
            str(result.status_code)
        )

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
    "    throw ('IIS target folder does not exist: ' + $target)",
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

run_ps_checked(session, command, "Backup existing IIS UI")
print("Existing UI backup stage completed.")
PY
                    '''
                }
            }
        }

        stage('Deploy UI to IIS') {
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
import base64
import winrm

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]
source = os.path.abspath(os.environ["UI_BUILD_PATH"])
username = os.environ["IIS_USER"]
password = os.environ["IIS_PASSWORD"]

def ps_quote(value):
    return "'" + value.replace("'", "''") + "'"

def run_ps_checked(session, command, description):
    result = session.run_ps(command)

    stdout = result.std_out.decode("utf-8", errors="replace")
    stderr = result.std_err.decode("utf-8", errors="replace")

    if stdout.strip():
        print(stdout)

    if stderr.strip():
        print(stderr)

    if result.status_code != 0:
        raise RuntimeError(
            description + " failed with exit code " +
            str(result.status_code)
        )

if not os.path.isdir(source):
    raise RuntimeError("UI build source folder not found: " + source)

if not os.path.isfile(os.path.join(source, "web.config")):
    raise RuntimeError("web.config not found in source folder")

session = winrm.Session(
    f"http://{server}:5985/wsman",
    auth=(username, password),
    transport="ntlm"
)

# Ensure the existing target directory is present.
mkdir_command = "\\n".join([
    "$ErrorActionPreference = 'Stop'",
    f"$target = {ps_quote(target)}",
    "New-Item -ItemType Directory -Path $target -Force | Out-Null",
    "Write-Output 'TARGET_READY'"
])

run_ps_checked(session, mkdir_command, "Prepare IIS target")

copied_files = 0

for root, dirs, files in os.walk(source):
    relative_dir = os.path.relpath(root, source)

    if relative_dir == ".":
        remote_dir = target
    else:
        remote_dir = target.rstrip("\\\\") + "\\\\" + relative_dir.replace("/", "\\\\")

    # Create each destination directory without deleting the application folder.
    mkdir_command = "\\n".join([
        "$ErrorActionPreference = 'Stop'",
        f"$directory = {ps_quote(remote_dir)}",
        "New-Item -ItemType Directory -Path $directory -Force | Out-Null"
    ])

    run_ps_checked(
        session,
        mkdir_command,
        "Create destination directory"
    )

    for filename in files:
        local_file = os.path.join(root, filename)
        relative_file = os.path.relpath(local_file, source)
        relative_file = relative_file.replace("/", "\\\\")
        remote_file = target.rstrip("\\\\") + "\\\\" + relative_file

        with open(local_file, "rb") as file_handle:
            encoded = base64.b64encode(file_handle.read()).decode("ascii")

        write_command = (
            "$ErrorActionPreference = 'Stop'; "
            f"$filePath = {ps_quote(remote_file)}; "
            f"$data = [Convert]::FromBase64String('{encoded}'); "
            "$parent = Split-Path -Parent $filePath; "
            "New-Item -ItemType Directory -Path $parent -Force | Out-Null; "
            "[System.IO.File]::WriteAllBytes($filePath, $data); "
            "Write-Output 'FILE_COPIED'"
        )

        run_ps_checked(
            session,
            write_command,
            "Copy file " + relative_file
        )

        copied_files += 1
        print("Copied: " + relative_file)

print("Total files copied: " + str(copied_files))
print("UI files copied to IIS successfully.")
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
    "if (!(Test-Path -LiteralPath (Join-Path $target 'web.config') -PathType Leaf)) {",
    "    throw 'Deployment verification failed: web.config is missing'",
    "}",
    "if (!(Test-Path -LiteralPath (Join-Path $target 'package.json') -PathType Leaf)) {",
    "    throw 'Deployment verification failed: package.json is missing'",
    "}",
    "if (!(Test-Path -LiteralPath (Join-Path $target '.next') -PathType Container)) {",
    "    throw 'Deployment verification failed: .next directory is missing'",
    "}",
    "Write-Output 'DEPLOYMENT_VERIFIED'",
    "Write-Output ('Verified target: ' + $target)"
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
                    echo 'IIS deployment verified. Starting Cypress smoke tests.'

                    def smokeBuild = build(
                        job: '3,0 UI Automation',
                        wait: true,
                        propagate: false
                    )

                    echo "Cypress smoke-test job result: ${smokeBuild.result}"

                    if (smokeBuild.result != 'SUCCESS') {
                        error(
                            "Deployment completed, but Cypress smoke tests did not pass. " +
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
            echo 'Deployment and Cypress smoke tests completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Check the Jenkins console output to identify the failed stage.'
        }

        always {
            echo "Final deployment pipeline result: ${currentBuild.currentResult}"
        }
    }
}
