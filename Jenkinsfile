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
    }

    stages {

        stage('Checkout') {
            steps {

                echo '=========================================='
                echo 'CHECKOUT SOURCE CODE'
                echo '=========================================='

                checkout scm

                sh '''
                    echo "Current workspace:"
                    pwd

                    echo ""
                    echo "Git branch:"
                    git branch --show-current || true

                    echo ""
                    echo "Latest commit:"
                    git log -1 --oneline

                    echo ""
                    echo "Workspace content:"
                    ls -la
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

                    echo "UI Source:"
                    echo "$UI_SOURCE"

                    if [ ! -d "$UI_SOURCE" ]; then
                        echo "ERROR: UI source directory does not exist:"
                        echo "$UI_SOURCE"
                        exit 1
                    fi

                    echo ""
                    echo "UI source directory found."

                    echo ""
                    echo "UI source files:"
                    ls -la "$UI_SOURCE"

                    echo ""
                    echo "Top-level files:"
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
                    set -e

                    rm -f "$DEPLOY_ZIP"
                    rm -rf deployment_chunks

                    echo "Creating deployment ZIP..."

                    cd "$UI_SOURCE"

                    zip -r "$WORKSPACE/$DEPLOY_ZIP" . \
                        -x "Jenkinsfile" \
                        -x "iisnode/*"

                    cd "$WORKSPACE"

                    echo ""
                    echo "ZIP created successfully."

                    echo ""
                    echo "ZIP information:"
                    ls -lh "$DEPLOY_ZIP"

                    echo ""
                    echo "ZIP contents:"
                    unzip -l "$DEPLOY_ZIP" | head -100

                    echo ""
                    echo "Checking required files..."

                    unzip -l "$DEPLOY_ZIP" | grep -q "package.json"
                    unzip -l "$DEPLOY_ZIP" | grep -q "web.config"

                    echo ""
                    echo "Required files found:"
                    echo "- package.json"
                    echo "- web.config"
                '''
            }
        }


        stage('Split ZIP into Chunks') {
            steps {

                echo '=========================================='
                echo 'SPLIT ZIP INTO SMALL CHUNKS'
                echo '=========================================='

                sh '''
                    set -e

                    CHUNK_SIZE=25000

                    rm -rf deployment_chunks
                    mkdir -p deployment_chunks

                    echo "Chunk size: ${CHUNK_SIZE} bytes"

                    if [ ! -f "$DEPLOY_ZIP" ]; then
                        echo "ERROR: Deployment ZIP not found:"
                        echo "$DEPLOY_ZIP"
                        exit 1
                    fi

                    echo ""
                    echo "Splitting ZIP..."

                    split -b "${CHUNK_SIZE}" -d -a 5 \
                        "$DEPLOY_ZIP" \
                        "deployment_chunks/chunk_"

                    echo ""
                    echo "Chunks created:"
                    ls -lh deployment_chunks | head -20

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
                        set -e

                        python3 - <<'PYTHON'
import os
import base64
import glob
import sys
import winrm


# ============================================================
# CONFIGURATION
# ============================================================

IIS_SERVER = os.environ["IIS_SERVER"]
IIS_TARGET = os.environ["IIS_TARGET"]

WINRM_USER = os.environ["WINRM_USER"]
WINRM_PASSWORD = os.environ["WINRM_PASSWORD"]

# Windows backslash without writing "\\" in the Python source
BS = chr(92)

REMOTE_TEMP = "C:" + BS + "Windows" + BS + "Temp" + BS + "PuffinUI_Deployment"
REMOTE_ZIP = REMOTE_TEMP + BS + "PuffinUI_Deployment.zip"


# ============================================================
# WINRM CONNECTION
# ============================================================

print("")
print("==========================================")
print("WINRM CONNECTION")
print("==========================================")

print("IIS Server :", IIS_SERVER)
print("WinRM User :", WINRM_USER)
print("Endpoint   : http://" + IIS_SERVER + ":5985/wsman")

try:

    session = winrm.Session(
        "http://" + IIS_SERVER + ":5985/wsman",
        auth=(WINRM_USER, WINRM_PASSWORD),
        transport="ntlm"
    )

    result = session.run_ps(
        'Write-Output "WINRM_CONNECTION_SUCCESS"'
    )

    stdout = result.std_out.decode(errors="ignore")
    stderr = result.std_err.decode(errors="ignore")

    print(stdout)

    if result.status_code != 0:

        print("ERROR: WinRM connection failed")
        print(stderr)

        sys.exit(1)

except Exception as e:

    print("ERROR: Unable to connect to WinRM")
    print(str(e))

    sys.exit(1)


# ============================================================
# PREPARE REMOTE TEMP DIRECTORY
# ============================================================

print("")
print("==========================================")
print("PREPARE REMOTE TEMP DIRECTORY")
print("==========================================")

prepare_script = f"""
$ErrorActionPreference = "Stop"

$remoteTemp = "{REMOTE_TEMP}"

if (Test-Path $remoteTemp) {{
    Remove-Item $remoteTemp -Recurse -Force
}}

New-Item `
    -ItemType Directory `
    -Path $remoteTemp `
    -Force | Out-Null

Write-Output "REMOTE_TEMP_READY"
"""

result = session.run_ps(prepare_script)

stdout = result.std_out.decode(errors="ignore")
stderr = result.std_err.decode(errors="ignore")

print(stdout)

if result.status_code != 0:

    print("ERROR preparing remote directory")
    print(stderr)

    sys.exit(1)


# ============================================================
# FIND LOCAL CHUNKS
# ============================================================

print("")
print("==========================================")
print("FIND ZIP CHUNKS")
print("==========================================")

chunks = sorted(
    glob.glob("deployment_chunks/chunk_*")
)

if not chunks:

    print("ERROR: No ZIP chunks found")

    sys.exit(1)

print("Total chunks:", len(chunks))


# ============================================================
# UPLOAD CHUNKS
# ============================================================

print("")
print("==========================================")
print("UPLOAD ZIP CHUNKS")
print("==========================================")

total_chunks = len(chunks)

for index, chunk_file in enumerate(chunks, start=1):

    chunk_name = os.path.basename(chunk_file)

    remote_chunk = (
        REMOTE_TEMP
        + BS
        + chunk_name
    )

    with open(chunk_file, "rb") as f:
        chunk_data = f.read()

    encoded = base64.b64encode(
        chunk_data
    ).decode("ascii")


    print(
        "["
        + str(index)
        + "/"
        + str(total_chunks)
        + "] Uploading "
        + chunk_name
        + " - "
        + str(len(chunk_data))
        + " bytes"
    )


    upload_script = f"""
$ErrorActionPreference = "Stop"

$data = "{encoded}"

$bytes = [Convert]::FromBase64String($data)

[System.IO.File]::WriteAllBytes(
    "{remote_chunk}",
    $bytes
)

Write-Output "CHUNK_UPLOADED"
"""


    try:

        result = session.run_ps(
            upload_script
        )

        stdout = result.std_out.decode(
            errors="ignore"
        )

        stderr = result.std_err.decode(
            errors="ignore"
        )


        if result.status_code != 0:

            print("")
            print("ERROR uploading chunk:")
            print(chunk_name)

            print("")
            print("STDOUT:")
            print(stdout)

            print("")
            print("STDERR:")
            print(stderr)

            sys.exit(1)


        if "CHUNK_UPLOADED" not in stdout:

            print("")
            print("ERROR: Upload confirmation not received")
            print("Chunk:", chunk_name)

            print(stdout)
            print(stderr)

            sys.exit(1)


    except Exception as e:

        print("")
        print("ERROR uploading chunk:")
        print(chunk_name)

        print(str(e))

        sys.exit(1)


print("")
print("ALL CHUNKS UPLOADED SUCCESSFULLY")


# ============================================================
# REASSEMBLE ZIP
# ============================================================

print("")
print("==========================================")
print("REASSEMBLE ZIP ON IIS SERVER")
print("==========================================")

reassemble_script = f"""
$ErrorActionPreference = "Stop"

$remoteTemp = "{REMOTE_TEMP}"
$remoteZip = "{REMOTE_ZIP}"

$chunks = Get-ChildItem "$remoteTemp\\chunk_*" |
    Sort-Object Name

if ($chunks.Count -eq 0) {{
    throw "No chunks found on remote server."
}}

Write-Output ("Remote chunks found: " + $chunks.Count)

if (Test-Path $remoteZip) {{
    Remove-Item $remoteZip -Force
}}

$stream = [System.IO.File]::Open(
    $remoteZip,
    [System.IO.FileMode]::Create
)

try {{

    foreach ($chunk in $chunks) {{

        $bytes = [System.IO.File]::ReadAllBytes(
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

Write-Output "Remote ZIP size:"

(Get-Item $remoteZip).Length
"""

result = session.run_ps(
    reassemble_script
)

stdout = result.std_out.decode(
    errors="ignore"
)

stderr = result.std_err.decode(
    errors="ignore"
)

print(stdout)

if result.status_code != 0:

    print("ERROR: ZIP reassembly failed")
    print(stderr)

    sys.exit(1)


# ============================================================
# VALIDATE REMOTE ZIP
# ============================================================

print("")
print("==========================================")
print("VALIDATE REMOTE ZIP")
print("==========================================")

validate_script = f"""
$ErrorActionPreference = "Stop"

$zip = "{REMOTE_ZIP}"

if (!(Test-Path $zip)) {{
    throw "Remote ZIP does not exist."
}}

Write-Output "Remote ZIP exists."

Write-Output "ZIP size:"
(Get-Item $zip).Length

Add-Type -AssemblyName System.IO.Compression.FileSystem

$archive = [System.IO.Compression.ZipFile]::OpenRead($zip)

try {{

    $package = $archive.Entries |
        Where-Object {{ $_.FullName -eq "package.json" }}

    $webconfig = $archive.Entries |
        Where-Object {{ $_.FullName -eq "web.config" }}

    if ($null -eq $package) {{
        throw "package.json not found in ZIP."
    }}

    if ($null -eq $webconfig) {{
        throw "web.config not found in ZIP."
    }}

    Write-Output "package.json found."
    Write-Output "web.config found."

    Write-Output "ZIP_VALIDATION_SUCCESS"

}}
finally {{

    $archive.Dispose()

}}
"""

result = session.run_ps(
    validate_script
)

stdout = result.std_out.decode(
    errors="ignore"
)

stderr = result.std_err.decode(
    errors="ignore"
)

print(stdout)

if result.status_code != 0:

    print("ERROR: Remote ZIP validation failed")
    print(stderr)

    sys.exit(1)


# ============================================================
# DEPLOY TO IIS
# ============================================================

print("")
print("==========================================")
print("DEPLOY ZIP TO IIS")
print("==========================================")

deploy_script = f"""
$ErrorActionPreference = "Stop"

$zip = "{REMOTE_ZIP}"
$target = "{IIS_TARGET}"

Write-Output "Deployment target:"
Write-Output $target

if (!(Test-Path $target)) {{

    Write-Output "Creating IIS target directory..."

    New-Item `
        -ItemType Directory `
        -Path $target `
        -Force | Out-Null
}}

Write-Output "Extracting deployment..."

Expand-Archive `
    -LiteralPath $zip `
    -DestinationPath $target `
    -Force

Write-Output "DEPLOYMENT_EXTRACT_SUCCESS"
"""

result = session.run_ps(
    deploy_script
)

stdout = result.std_out.decode(
    errors="ignore"
)

stderr = result.std_err.decode(
    errors="ignore"
)

print(stdout)

if result.status_code != 0:

    print("ERROR: IIS deployment failed")
    print(stderr)

    sys.exit(1)


# ============================================================
# REMOTE CLEANUP
# ============================================================

print("")
print("==========================================")
print("REMOTE CLEANUP")
print("==========================================")

cleanup_script = f"""
$ErrorActionPreference = "SilentlyContinue"

$remoteTemp = "{REMOTE_TEMP}"

if (Test-Path $remoteTemp) {{
    Remove-Item $remoteTemp -Recurse -Force
}}

Write-Output "REMOTE_CLEANUP_SUCCESS"
"""

result = session.run_ps(
    cleanup_script
)

print(
    result.std_out.decode(
        errors="ignore"
    )
)


# ============================================================
# COMPLETE
# ============================================================

print("")
print("==========================================")
print("IIS DEPLOYMENT COMPLETED SUCCESSFULLY")
print("==========================================")

print("IIS Server :", IIS_SERVER)
print("Target     :", IIS_TARGET)

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
                        set -e

                        python3 - <<'PYTHON'
import os
import sys
import winrm


IIS_SERVER = os.environ["IIS_SERVER"]
IIS_TARGET = os.environ["IIS_TARGET"]

WINRM_USER = os.environ["WINRM_USER"]
WINRM_PASSWORD = os.environ["WINRM_PASSWORD"]


print("")
print("==========================================")
print("CONNECT TO IIS FOR VERIFICATION")
print("==========================================")


try:

    session = winrm.Session(
        "http://" + IIS_SERVER + ":5985/wsman",
        auth=(WINRM_USER, WINRM_PASSWORD),
        transport="ntlm"
    )

except Exception as e:

    print("ERROR connecting to IIS:")
    print(str(e))

    sys.exit(1)


print("")
print("==========================================")
print("VERIFY DEPLOYED FILES")
print("==========================================")


verify_script = f"""
$ErrorActionPreference = "Stop"

$target = "{IIS_TARGET}"

Write-Output "Deployment directory:"
Write-Output $target

if (!(Test-Path $target)) {{
    throw "Deployment directory does not exist."
}}

$package = Join-Path $target "package.json"
$webconfig = Join-Path $target "web.config"

if (!(Test-Path $package)) {{
    throw "package.json not found."
}}

if (!(Test-Path $webconfig)) {{
    throw "web.config not found."
}}

Write-Output ""
Write-Output "Required files found:"
Write-Output "package.json"
Write-Output "web.config"

Write-Output ""
Write-Output "Deployment file count:"

(Get-ChildItem `
    -Path $target `
    -Recurse `
    -File |
    Measure-Object).Count

Write-Output ""
Write-Output "Top-level deployment files:"

Get-ChildItem `
    -Path $target |
    Select-Object Name, Length, LastWriteTime

Write-Output ""
Write-Output "DEPLOYMENT_VERIFICATION_SUCCESS"
"""


result = session.run_ps(
    verify_script
)

stdout = result.std_out.decode(
    errors="ignore"
)

stderr = result.std_err.decode(
    errors="ignore"
)

print(stdout)

if result.status_code != 0:

    print("ERROR: Deployment verification failed")
    print(stderr)

    sys.exit(1)


print("")
print("==========================================")
print("DEPLOYMENT VERIFICATION SUCCESS")
print("==========================================")

PYTHON
                    '''
                }
            }
        }
    }


    post {

        success {

            echo '=========================================='
            echo 'DEPLOYMENT SUCCESSFUL'
            echo '=========================================='

            echo 'Puffin 3.0 UI deployment completed successfully.'
            echo 'IIS Server: 172.16.4.166'
            echo 'Target: C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI'
        }


        failure {

            echo '=========================================='
            echo 'DEPLOYMENT FAILED'
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
