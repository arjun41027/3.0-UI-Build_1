pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
    }

    environment {
        IIS_SERVER = '172.16.4.166'
        IIS_TARGET = 'C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI'
        UI_SOURCE = 'Desktop/3.0 UI and API Docs/3.0 UI Build'
        DEPLOY_ZIP = 'PuffinUI_Deployment.zip'
        CHUNK_SIZE = '25000'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '=========================================='
                echo 'CHECKOUT SOURCE CODE'
                echo '=========================================='

                checkout scm

                sh '''
                    echo "Current directory:"
                    pwd

                    echo "Git branch:"
                    git branch --show-current

                    echo "Latest commit:"
                    git log -1 --oneline
                '''
            }
        }

        stage('Verify UI Source') {
            steps {
                echo '=========================================='
                echo 'VERIFY UI SOURCE'
                echo '=========================================='

                sh '''
                    if [ ! -d "$UI_SOURCE" ]; then
                        echo "ERROR: UI source directory not found:"
                        echo "$UI_SOURCE"
                        exit 1
                    fi

                    echo "UI source found:"
                    ls -la "$UI_SOURCE"

                    echo ""
                    echo "UI files:"
                    find "$UI_SOURCE" -maxdepth 2 -type f | head -100
                '''
            }
        }

        stage('Create Deployment ZIP') {
            steps {
                echo '=========================================='
                echo 'CREATE DEPLOYMENT ZIP'
                echo '=========================================='

                sh '''
                    rm -f "$DEPLOY_ZIP"
                    rm -rf deployment_s
                    mkdir -p deployment_s

                    cd "$UI_SOURCE"

                    zip -r "$WORKSPACE/$DEPLOY_ZIP" . \
                        -x "Jenkinsfile" \
                        -x "iisnode/*"

                    cd "$WORKSPACE"

                    echo ""
                    echo "ZIP created successfully:"
                    ls -lh "$DEPLOY_ZIP"

                    echo ""
                    echo "ZIP content:"
                    unzip -l "$DEPLOY_ZIP" | head -100
                '''
            }
        }

        stage('Split ZIP into s') {
            steps {
                echo '=========================================='
                echo 'SPLIT ZIP INTO SMALL S'
                echo '=========================================='

                sh '''
                    rm -rf deployment_s
                    mkdir -p deployment_s

                    split -b "$_SIZE" -d -a 5 \
                        "$DEPLOY_ZIP" \
                        "deployment_s/chunk_"

                    echo "Chunks created:"
                    ls -lh deployment_chunks

                    echo ""
                    echo "Number of chunks:"
                    find deployment_chunks -type f | wc -l
                '''
            }
        }

        stage('Deploy to IIS') {
            steps {
                echo '=========================================='
                echo 'DEPLOY TO IIS SERVER'
                echo '=========================================='

                withCredentials([
                    usernamePassword(
                        credentialsId: 'puffin-iis-winrm',
                        usernameVariable: 'WINRM_USER',
                        passwordVariable: 'WINRM_PASSWORD'
                    )
                ]) {

                    sh '''
                        python3 - <<'PYTHON'
import os
import base64
import winrm
import glob
import sys

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]
username = os.environ["WINRM_USER"]
password = os.environ["WINRM_PASSWORD"]

remote_temp = r"C:\\Windows\\Temp\\PuffinUI_Deployment"
remote_zip = remote_temp + r"\\PuffinUI_Deployment.zip"

print("Connecting to IIS server:", server)

try:
    session = winrm.Session(
        f"http://{server}:5985/wsman",
        auth=(username, password),
        transport="ntlm"
    )

    result = session.run_ps(
        'Write-Output "WINRM_CONNECTION_SUCCESS"'
    )

    if result.status_code != 0:
        print(result.std_err.decode(errors="ignore"))
        sys.exit(1)

    print(result.std_out.decode(errors="ignore"))

except Exception as e:
    print("ERROR: WinRM connection failed")
    print(str(e))
    sys.exit(1)


print("Preparing remote deployment directory...")

prepare_script = f"""
$ErrorActionPreference = "Stop"

$remoteTemp = "{remote_temp}"
$remoteZip = "{remote_zip}"
$target = "{target}"

if (Test-Path $remoteTemp) {{
    Remove-Item $remoteTemp -Recurse -Force
}}

New-Item -ItemType Directory -Path $remoteTemp -Force | Out-Null

Write-Output "REMOTE_TEMP_READY"
"""

result = session.run_ps(prepare_script)

if result.status_code != 0:
    print(result.std_err.decode(errors="ignore"))
    sys.exit(1)

print(result.std_out.decode(errors="ignore"))


chunk_files = sorted(
    glob.glob("deployment_chunks/chunk_*")
)

if not chunk_files:
    print("ERROR: No deployment chunks found")
    sys.exit(1)

print("Total chunks:", len(chunk_files))


for index, chunk_file in enumerate(chunk_files, start=1):

    print(
        f"Uploading chunk {index}/{len(chunk_files)}: "
        f"{os.path.basename(chunk_file)}"
    )

    with open(chunk_file, "rb") as f:
        data = f.read()

    encoded = base64.b64encode(data).decode("ascii")

    remote_chunk = (
        remote_temp
        + "\\\\"
        + os.path.basename(chunk_file)
    )

    script = f"""
$ErrorActionPreference = "Stop"

$data = "{encoded}"

$bytes = [Convert]::FromBase64String($data)

[IO.File]::WriteAllBytes(
    "{remote_chunk}",
    $bytes
)

Write-Output "CHUNK_UPLOADED"
"""

    result = session.run_ps(script)

    if result.status_code != 0:
        print("ERROR uploading chunk:")
        print(result.std_err.decode(errors="ignore"))
        sys.exit(1)

    print(result.std_out.decode(errors="ignore"))


print("All chunks uploaded successfully.")


print("Reassembling ZIP on IIS server...")


reassemble_script = f"""
$ErrorActionPreference = "Stop"

$remoteTemp = "{remote_temp}"
$remoteZip = "{remote_zip}"

$chunks = Get-ChildItem "$remoteTemp\\chunk_*" |
          Sort-Object Name

if ($chunks.Count -eq 0) {{
    throw "No chunks found on remote server."
}}

if (Test-Path $remoteZip) {{
    Remove-Item $remoteZip -Force
}}

$stream = [IO.File]::Open(
    $remoteZip,
    [IO.FileMode]::Create
)

try {{

    foreach ($chunk in $chunks) {{

        $bytes = [IO.File]::ReadAllBytes(
            $chunk.FullName
        )

        $stream.Write(
            $bytes,
            0,
            $bytes.Length
        )
    }}

}}
finally {{
    $stream.Close()
}}

Write-Output "ZIP_REASSEMBLED"

Write-Output "ZIP_SIZE:"
Write-Output ((Get-Item $remoteZip).Length)
"""

result = session.run_ps(reassemble_script)

if result.status_code != 0:
    print("ERROR reassembling ZIP:")
    print(result.std_err.decode(errors="ignore"))
    sys.exit(1)

print(result.std_out.decode(errors="ignore"))


print("Validating ZIP...")


validate_script = f"""
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = "{remote_zip}"

if (!(Test-Path $zip)) {{
    throw "Deployment ZIP does not exist."
}}

$archive = [System.IO.Compression.ZipFile]::OpenRead($zip)

try {{
    Write-Output "ZIP_VALID"

    Write-Output "ZIP_ENTRIES:"
    Write-Output $archive.Entries.Count

    $package = $archive.Entries |
        Where-Object {{ $_.FullName -eq "package.json" }}

    $webconfig = $archive.Entries |
        Where-Object {{ $_.FullName -eq "web.config" }}

    if (!$package) {{
        throw "package.json not found in ZIP root."
    }}

    if (!$webconfig) {{
        throw "web.config not found in ZIP root."
    }}

    Write-Output "PACKAGE_JSON_FOUND"
    Write-Output "WEB_CONFIG_FOUND"
}}
finally {{
    $archive.Dispose()
}}
"""

result = session.run_ps(validate_script)

if result.status_code != 0:
    print("ERROR validating ZIP:")
    print(result.std_err.decode(errors="ignore"))
    sys.exit(1)

print(result.std_out.decode(errors="ignore"))


print("Deploying files to IIS...")


deploy_script = f"""
$ErrorActionPreference = "Stop"

$zip = "{remote_zip}"
$target = "{target}"

if (!(Test-Path $target)) {{
    New-Item -ItemType Directory -Path $target -Force | Out-Null
}}

Write-Output "IIS_TARGET:"
Write-Output $target

Expand-Archive `
    -LiteralPath $zip `
    -DestinationPath $target `
    -Force

Write-Output "IIS_DEPLOYMENT_COMPLETED"
"""

result = session.run_ps(deploy_script)

if result.status_code != 0:
    print("ERROR deploying to IIS:")
    print(result.std_err.decode(errors="ignore"))
    sys.exit(1)

print(result.std_out.decode(errors="ignore"))


print("Cleaning remote temporary files...")


cleanup_script = f"""
$ErrorActionPreference = "SilentlyContinue"

$remoteTemp = "{remote_temp}"

if (Test-Path $remoteTemp) {{
    Remove-Item $remoteTemp -Recurse -Force
}}

Write-Output "REMOTE_CLEANUP_COMPLETED"
"""

result = session.run_ps(cleanup_script)

print(result.std_out.decode(errors="ignore"))

print("==========================================")
print("IIS DEPLOYMENT SUCCESSFUL")
print("==========================================")
PYTHON
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
                        usernameVariable: 'WINRM_USER',
                        passwordVariable: 'WINRM_PASSWORD'
                    )
                ]) {

                    sh '''
                        python3 - <<'PYTHON'
import os
import winrm
import sys

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]
username = os.environ["WINRM_USER"]
password = os.environ["WINRM_PASSWORD"]

session = winrm.Session(
    f"http://{server}:5985/wsman",
    auth=(username, password),
    transport="ntlm"
)

script = f"""
$ErrorActionPreference = "Stop"

$target = "{target}"

if (!(Test-Path $target)) {{
    throw "IIS deployment directory does not exist."
}}

$package = Join-Path $target "package.json"
$webconfig = Join-Path $target "web.config"

if (!(Test-Path $package)) {{
    throw "package.json not found."
}}

if (!(Test-Path $webconfig)) {{
    throw "web.config not found."
}}

Write-Output "DEPLOYMENT_DIRECTORY_EXISTS"
Write-Output "PACKAGE_JSON_EXISTS"
Write-Output "WEB_CONFIG_EXISTS"

$count = (
    Get-ChildItem $target -Recurse -File |
    Measure-Object
).Count

Write-Output "DEPLOYED_FILE_COUNT=$count"

if ($count -eq 0) {{
    throw "No deployed files found."
}}

Write-Output "DEPLOYMENT_VERIFICATION_SUCCESS"
"""

result = session.run_ps(script)

if result.status_code != 0:
    print("DEPLOYMENT VERIFICATION FAILED")
    print(result.std_err.decode(errors="ignore"))
    sys.exit(1)

print(result.std_out.decode(errors="ignore"))
PYTHON
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
            echo 'GitHub -> Jenkins -> IIS deployment completed successfully.'
        }

        failure {
            echo '=========================================='
            echo 'PUFFIN UI DEPLOYMENT FAILED'
            echo '=========================================='
            echo 'Please check the Jenkins console log.'
        }

        always {
            sh '''
                rm -f "$DEPLOY_ZIP" || true
                rm -rf deployment_chunks || true
            '''
        }
    }
}
