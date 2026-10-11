
pipeline {
    agent any

    environment {
        IIS_SERVER = '172.16.4.166'
        IIS_TARGET = 'C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI'
        UI_BUILD_PATH = 'Desktop/3.0 UI and API Docs/3.0 UI Build'
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
                        error("web.config not found: ${env.UI_BUILD_PATH}")
                    }

                    if (!fileExists("${env.UI_BUILD_PATH}/package.json")) {
                        error("package.json not found: ${env.UI_BUILD_PATH}")
                    }

                    if (!fileExists("${env.UI_BUILD_PATH}/.next")) {
                        error(".next build folder not found: ${env.UI_BUILD_PATH}")
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

result = session.run_ps(command)
stdout = result.std_out.decode("utf-8", errors="replace")
stderr = result.std_err.decode("utf-8", errors="replace")

if stdout.strip():
    print(stdout)
if stderr.strip():
    print(stderr)

if result.status_code != 0:
    raise RuntimeError("Backup of existing IIS UI failed")

if "BACKUP_PATH=" not in stdout and "TARGET_EMPTY_NO_BACKUP" not in stdout:
    raise RuntimeError("Backup stage did not confirm its result")

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
import tempfile
import zipfile
import winrm

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]
source = os.path.abspath(os.environ["UI_BUILD_PATH"])
username = os.environ["IIS_USER"]
password = os.environ["IIS_PASSWORD"]

remote_zip = (
    r"C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI_deploy.zip"
)
chunk_size = 7000

def ps_quote(value):
    return "'" + value.replace("'", "''") + "'"

def run_ps_checked(session, command, description):
    result = session.run_ps(command)
    stdout = result.std_out.decode("utf-8", errors="replace")
    stderr = result.std_err.decode("utf-8", errors="replace")

    if stdout.strip():
        print(stdout)

    if result.status_code != 0:
        if stderr.strip():
            print(stderr)
        raise RuntimeError(
            description + " failed with exit code " +
            str(result.status_code)
        )

if not os.path.isdir(source):
    raise RuntimeError("UI build folder not found: " + source)

for required in ["web.config", "package.json"]:
    if not os.path.isfile(os.path.join(source, required)):
        raise RuntimeError("Required file missing: " + required)

if not os.path.isdir(os.path.join(source, ".next")):
    raise RuntimeError(".next build folder is missing")

session = winrm.Session(
    f"http://{server}:5985/wsman",
    auth=(username, password),
    transport="ntlm"
)

zip_path = None

try:
    with tempfile.NamedTemporaryFile(
        prefix="PuffinUI_",
        suffix=".zip",
        delete=False
    ) as temporary:
        zip_path = temporary.name

    print("Creating deployment ZIP...")

    # Archive the contents of UI_BUILD_PATH, without adding its parent path.
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

    zip_size = os.path.getsize(zip_path)
    print("ZIP size: {:,} bytes".format(zip_size))

    prepare_command = "\\n".join([
        "$ErrorActionPreference = 'Stop'",
        f"$zipPath = {ps_quote(remote_zip)}",
        "$parent = Split-Path -Parent $zipPath",
        "New-Item -ItemType Directory -Path $parent -Force | Out-Null",
        "if (Test-Path -LiteralPath $zipPath) {",
        "    Remove-Item -LiteralPath $zipPath -Force",
        "}",
        "Write-Output 'ZIP_TARGET_READY'"
    ])

    run_ps_checked(
        session,
        prepare_command,
        "Prepare remote ZIP"
    )

    chunks = (zip_size + chunk_size - 1) // chunk_size
    print("Transferring ZIP in {} chunks...".format(chunks))

    with open(zip_path, "rb") as zip_file:
        for index in range(chunks):
            data = zip_file.read(chunk_size)
            encoded = base64.b64encode(data).decode("ascii")

            if index == 0:
                write_expression = (
                    "[System.IO.File]::WriteAllBytes($zipPath, $data)"
                )
            else:
                write_expression = (
                    "$stream = [System.IO.File]::Open("
                    "$zipPath, [System.IO.FileMode]::Append, "
                    "[System.IO.FileAccess]::Write); "
                    "try { $stream.Write($data, 0, $data.Length) } "
                    "finally { $stream.Dispose() }"
                )

            command = (
                "$ErrorActionPreference = 'Stop'; "
                f"$zipPath = {ps_quote(remote_zip)}; "
                f"$data = [Convert]::FromBase64String('{encoded}'); "
                + write_expression
            )

            run_ps_checked(
                session,
                command,
                "Transfer ZIP chunk {}".format(index + 1)
            )

            if (index + 1) % 100 == 0 or index + 1 == chunks:
                print(
                    "Transferred {}/{} chunks".format(
                        index + 1, chunks
                    )
                )

    extract_command = "\\n".join([
        "$ErrorActionPreference = 'Stop'",
        f"$zipPath = {ps_quote(remote_zip)}",
        f"$target = {ps_quote(target)}",
        f"$expectedSize = {zip_size}",
        "if (!(Test-Path -LiteralPath $zipPath -PathType Leaf)) {",
        "    throw 'Deployment ZIP was not found on IIS'",
        "}",
        "$actualSize = (Get-Item -LiteralPath $zipPath).Length",
        "if ($actualSize -ne $expectedSize) {",
        "    throw ('ZIP size mismatch. Expected ' + $expectedSize +",
        "           ', received ' + $actualSize)",
        "}",
        "New-Item -ItemType Directory -Path $target -Force | Out-Null",
        "Expand-Archive -LiteralPath $zipPath -DestinationPath $target -Force",
        "if (!(Test-Path -LiteralPath (Join-Path $target 'web.config') -PathType Leaf)) {",
        "    throw 'web.config missing after extraction'",
        "}",
        "if (!(Test-Path -LiteralPath (Join-Path $target '.next') -PathType Container)) {",
        "    throw '.next folder missing after extraction'",
        "}",
        "Remove-Item -LiteralPath $zipPath -Force",
        "Write-Output 'DEPLOYMENT_FILES_EXTRACTED'",
        "Write-Output ('TARGET=' + $target)"
    ])

    run_ps_checked(
        session,
        extract_command,
        "Extract deployment ZIP"
    )

    print("UI deployment files extracted successfully.")

finally:
    if zip_path and os.path.exists(zip_path):
        os.remove(zip_path)
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
    "    throw 'web.config is missing'",
    "}",
    "if (!(Test-Path -LiteralPath (Join-Path $target 'package.json') -PathType Leaf)) {",
    "    throw 'package.json is missing'",
    "}",
    "if (!(Test-Path -LiteralPath (Join-Path $target '.next') -PathType Container)) {",
    "    throw '.next folder is missing'",
    "}",
    "Write-Output 'DEPLOYMENT_VERIFIED'",
    "Write-Output ('TARGET=' + $target)"
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
                    echo 'Deployment verified. Triggering Cypress automation.'

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
            echo 'Pipeline failed. Check the failed stage and Jenkins console output.'
        }

        always {
            echo "Final deployment pipeline result: ${currentBuild.currentResult}"
        }
    }
}
