pipeline {
    agent any

    environment {
        IIS_SERVER = '172.16.4.166'
        IIS_TARGET = 'C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI'
        DEPLOY_ZIP = 'PuffinUI_Deployment.zip'
    }

    options {
        skipDefaultCheckout(true)
        timestamps()
    }

    stages {

        stage('Checkout') {
            steps {
                echo '=========================================='
                echo 'Checking out latest UI build from GitHub'
                echo '=========================================='

                checkout scm

                echo "Workspace: ${env.WORKSPACE}"
            }
        }

        stage('Verify UI Files') {
            steps {
                sh '''
                    echo "=========================================="
                    echo "Verifying UI files"
                    echo "=========================================="

                    pwd

                    echo ""
                    echo "Repository contents:"
                    find . -maxdepth 2 -type f \
                        ! -path './.git/*' \
                        ! -name 'Jenkinsfile' | sort

                    echo ""
                    echo "UI files verified."
                '''
            }
        }

        stage('Create Deployment ZIP') {
            steps {
                sh '''
                    echo "=========================================="
                    echo "Creating deployment ZIP"
                    echo "=========================================="

                    rm -f "$DEPLOY_ZIP"

                    zip -r "$DEPLOY_ZIP" . \
                        -x ".git/*" \
                        -x ".git/**" \
                        -x "Jenkinsfile"

                    echo ""
                    echo "Deployment ZIP created:"
                    ls -lh "$DEPLOY_ZIP"

                    echo "=========================================="
                '''
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
zip_file = os.path.join(
    os.environ["WORKSPACE"],
    os.environ["DEPLOY_ZIP"]
)

username = os.environ["IIS_USER"]
password = os.environ["IIS_PASSWORD"]

print("==========================================")
print("Puffin 3.0 UI Deployment")
print("==========================================")
print("Server :", server)
print("Target :", target)
print("ZIP    :", zip_file)
print("==========================================")

# --------------------------------------------------
# Connect to Windows server
# --------------------------------------------------

print("")
print("Connecting to IIS server...")

session = winrm.Session(
    f"http://{server}:5985/wsman",
    auth=(username, password),
    transport="ntlm"
)

result = session.run_cmd(
    "cmd",
    ["/c", "echo WINRM_CONNECTION_SUCCESS"]
)

if result.status_code != 0:
    raise Exception(
        "WinRM connection failed: "
        + result.std_err.decode(errors="ignore")
    )

print(
    result.std_out.decode(
        errors="ignore"
    )
)

# --------------------------------------------------
# Check / create IIS target
# --------------------------------------------------

print("Checking IIS target folder...")

ps_check = f"""
$target = '{target}'
if (-not (Test-Path -LiteralPath $target)) {{
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    Write-Output 'TARGET_CREATED'
}}
else {{
    Write-Output 'TARGET_EXISTS'
}}
"""

result = session.run_ps(ps_check)

if result.status_code != 0:
    raise Exception(
        "Unable to create/access target folder: "
        + result.std_err.decode(errors="ignore")
    )

print(
    result.std_out.decode(
        errors="ignore"
    )
)

# --------------------------------------------------
# Read ZIP
# --------------------------------------------------

print("")
print("Reading deployment ZIP...")

with open(zip_file, "rb") as f:
    zip_data = f.read()

print(
    "ZIP size:",
    round(len(zip_data) / 1024 / 1024, 2),
    "MB"
)

# --------------------------------------------------
# Upload ZIP using Base64
# --------------------------------------------------

print("")
print("Uploading deployment ZIP to IIS server...")

encoded = base64.b64encode(
    zip_data
).decode("ascii")

remote_zip = (
    "C:\\Windows\\Temp\\PuffinUI_Deployment.zip"
)

safe_remote_zip = remote_zip.replace(
    "'",
    "''"
)

ps_upload = (
    "$data=[Convert]::FromBase64String('"
    + encoded
    + "');"
    "[IO.File]::WriteAllBytes('"
    + safe_remote_zip
    + "', $data)"
)

result = session.run_ps(
    ps_upload
)

if result.status_code != 0:
    raise Exception(
        "Failed to upload deployment ZIP: "
        + result.std_err.decode(
            errors="ignore"
        )
    )

print("ZIP uploaded successfully.")

# --------------------------------------------------
# Extract ZIP
# --------------------------------------------------

print("")
print("Extracting UI files...")

ps_extract = f"""
$zip = '{remote_zip}'
$target = '{target}'

if (-not (Test-Path -LiteralPath $target)) {{
    New-Item -ItemType Directory -Path $target -Force | Out-Null
}}

Expand-Archive `
    -LiteralPath $zip `
    -DestinationPath $target `
    -Force

Write-Output 'EXTRACTION_SUCCESS'
"""

result = session.run_ps(
    ps_extract
)

if result.status_code != 0:

    print(
        result.std_err.decode(
            errors="ignore"
        )
    )

    raise Exception(
        "Failed to extract deployment ZIP."
    )

print(
    result.std_out.decode(
        errors="ignore"
    )
)

# --------------------------------------------------
# Remove temporary ZIP
# --------------------------------------------------

print("Removing temporary ZIP...")

ps_cleanup = f"""
$zip = '{remote_zip}'

if (Test-Path -LiteralPath $zip) {{
    Remove-Item -LiteralPath $zip -Force
}}

Write-Output 'TEMP_FILE_REMOVED'
"""

result = session.run_ps(
    ps_cleanup
)

if result.status_code != 0:
    print(
        "Warning: Could not remove temporary ZIP."
    )

print("")
print("==========================================")
print("UI DEPLOYMENT COMPLETED SUCCESSFULLY")
print("==========================================")
print("Server :", server)
print("Target :", target)
print("==========================================")

PY
                    '''
                }
            }
        }

        stage('Verify Deployment') {
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

print("==========================================")
print("Verifying IIS Deployment")
print("==========================================")

session = winrm.Session(
    f"http://{server}:5985/wsman",
    auth=(username, password),
    transport="ntlm"
)

# Verify target folder and files
ps_verify = f"""
$target = '{target}'

if (-not (Test-Path -LiteralPath $target)) {{
    Write-Error 'TARGET_FOLDER_NOT_FOUND'
    exit 1
}}

$count = (
    Get-ChildItem `
        -LiteralPath $target `
        -Recurse `
        -File |
    Measure-Object
).Count

Write-Output "DEPLOYMENT_VERIFIED"
Write-Output "FILES_ON_SERVER=$count"
"""

result = session.run_ps(
    ps_verify
)

print(
    result.std_out.decode(
        errors="ignore"
    )
)

if result.status_code != 0:

    print(
        result.std_err.decode(
            errors="ignore"
        )
    )

    raise Exception(
        "Deployment verification failed."
    )

print("")
print("==========================================")
print("DEPLOYMENT VERIFIED SUCCESSFULLY")
print("==========================================")

PY
                    '''
                }
            }
        }
    }

    post {

        success {
            echo '=========================================='
            echo 'Puffin 3.0 UI Deployment SUCCESSFUL'
            echo '=========================================='
            echo "Server: ${env.IIS_SERVER}"
            echo "Target: ${env.IIS_TARGET}"
            echo '=========================================='
        }

        failure {
            echo '=========================================='
            echo 'Puffin 3.0 UI Deployment FAILED'
            echo '=========================================='
        }

        always {
            sh '''
                rm -f "$DEPLOY_ZIP" 2>/dev/null || true
            '''
        }
    }
}
