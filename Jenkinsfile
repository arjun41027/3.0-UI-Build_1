pipeline {
agent any

```
environment {
    IIS_SERVER = '172.16.4.166'
    IIS_TARGET = 'C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI'

    UI_SOURCE = 'Desktop/3.0 UI and API Docs/3.0 UI Build'

    DEPLOY_ZIP = 'PuffinUI_Deployment.zip'
    CHUNK_SIZE = '500000'
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
            echo "UI Source: ${env.UI_SOURCE}"
        }
    }

    stage('Verify UI Files') {
        steps {
            sh '''
                set -e

                echo "=========================================="
                echo "Verifying UI source folder"
                echo "=========================================="

                if [ ! -d "$UI_SOURCE" ]; then
                    echo "ERROR: UI source folder not found:"
                    echo "$UI_SOURCE"
                    exit 1
                fi

                echo ""
                echo "UI source folder:"
                echo "$UI_SOURCE"

                echo ""
                echo "Top-level UI contents:"
                find "$UI_SOURCE" -maxdepth 2 -type f | sort | head -100

                echo ""
                echo "UI source verification successful."

                echo ""
                echo "Source size:"
                du -sh "$UI_SOURCE"

                echo "=========================================="
            '''
        }
    }

    stage('Create Deployment ZIP') {
        steps {
            sh '''
                set -e

                echo "=========================================="
                echo "Creating deployment ZIP"
                echo "=========================================="

                rm -f "$DEPLOY_ZIP"

                cd "$UI_SOURCE"

                echo "Packaging UI contents from:"
                pwd

                zip -r "$WORKSPACE/$DEPLOY_ZIP" . \
                    -x "Jenkinsfile" \
                    -x "iisnode/*"

                cd "$WORKSPACE"

                echo ""
                echo "Deployment ZIP created:"
                ls -lh "$DEPLOY_ZIP"

                echo ""
                echo "Checking ZIP root contents:"

                unzip -l "$DEPLOY_ZIP" | head -80

                echo ""
                echo "Deployment ZIP creation successful."

                echo "=========================================="
            '''
        }
    }

    stage('Split Deployment ZIP') {
        steps {
            sh '''
                set -e

                echo "=========================================="
                echo "Splitting deployment ZIP"
                echo "=========================================="

                rm -rf deployment_chunks
                mkdir -p deployment_chunks

                split \
                    -b "$CHUNK_SIZE" \
                    -d \
                    -a 5 \
                    "$DEPLOY_ZIP" \
                    "deployment_chunks/chunk_"

                echo ""
                echo "ZIP size:"
                ls -lh "$DEPLOY_ZIP"

                echo ""
                echo "Number of chunks:"
                find deployment_chunks -type f | wc -l

                echo ""
                echo "Chunk list:"
                ls -lh deployment_chunks/

                echo ""
                echo "Chunking successful."

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
```

python3 - <<'PY'
import os
import base64
import winrm

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]
workspace = os.environ["WORKSPACE"]

username = os.environ["IIS_USER"]
password = os.environ["IIS_PASSWORD"]

chunks_dir = os.path.join(
workspace,
"deployment_chunks"
)

remote_temp = r"C:\Windows\Temp\PuffinUI_Deployment"
remote_zip = remote_temp + r"\PuffinUI_Deployment.zip"

print("==========================================")
print("Puffin 3.0 UI Deployment")
print("==========================================")
print("Server      :", server)
print("Target      :", target)
print("Chunks      :", chunks_dir)
print("Remote Temp :", remote_temp)
print("Remote ZIP  :", remote_zip)
print("==========================================")

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

print("")
print("Preparing remote temporary directory...")

ps_prepare = f"""
$remoteTemp = '{remote_temp}'
$remoteZip = '{remote_zip}'

if (Test-Path -LiteralPath $remoteTemp) {{
Remove-Item -LiteralPath $remoteTemp -Recurse -Force
}}

New-Item `    -ItemType Directory`
-Path $remoteTemp `
-Force | Out-Null

Write-Output 'REMOTE_TEMP_READY'
"""

result = session.run_ps(ps_prepare)

if result.status_code != 0:
raise Exception(
"Failed to prepare remote temporary directory: "
+ result.std_err.decode(errors="ignore")
)

print(
result.std_out.decode(
errors="ignore"
)
)

chunk_files = sorted(
[
os.path.join(chunks_dir, name)
for name in os.listdir(chunks_dir)
if name.startswith("chunk_")
]
)

if not chunk_files:
raise Exception(
"No deployment chunks found."
)

print("")
print("Total chunks:", len(chunk_files))

print("")
print("==========================================")
print("Uploading deployment chunks")
print("==========================================")

for index, chunk_file in enumerate(chunk_files, start=1):

```
chunk_name = os.path.basename(chunk_file)

print(
    f"Uploading chunk {index}/{len(chunk_files)}: {chunk_name}"
)

with open(chunk_file, "rb") as f:
    chunk_data = f.read()

encoded = base64.b64encode(
    chunk_data
).decode("ascii")

remote_chunk = (
    remote_temp
    + "\\"
    + chunk_name
)

safe_remote_chunk = remote_chunk.replace(
    "'",
    "''"
)

ps_upload = (
    "$data=[Convert]::FromBase64String('"
    + encoded
    + "');"
    "[IO.File]::WriteAllBytes('"
    + safe_remote_chunk
    + "', $data)"
)

result = session.run_ps(
    ps_upload
)

if result.status_code != 0:

    print(
        result.std_err.decode(
            errors="ignore"
        )
    )

    raise Exception(
        f"Failed to upload chunk {chunk_name}"
    )

print(
    f"Chunk {index}/{len(chunk_files)} uploaded successfully "
    f"({len(chunk_data) / 1024:.1f} KB)"
)
```

print("")
print("All chunks uploaded successfully.")

print("")
print("==========================================")
print("Reassembling deployment ZIP")
print("==========================================")

ps_combine = f"""
$remoteTemp = '{remote_temp}'
$remoteZip = '{remote_zip}'

$chunks = Get-ChildItem `    -LiteralPath $remoteTemp`
-Filter 'chunk_*' |
Sort-Object Name

if ($chunks.Count -eq 0) {{
Write-Error 'NO_CHUNKS_FOUND'
exit 1
}}

if (Test-Path -LiteralPath $remoteZip) {{
Remove-Item -LiteralPath $remoteZip -Force
}}

$stream = [System.IO.File]::Open(
$remoteZip,
[System.IO.FileMode]::Create
)

try {{

```
foreach ($chunk in $chunks) {{

    Write-Output ("Combining " + $chunk.Name)

    $bytes = [System.IO.File]::ReadAllBytes(
        $chunk.FullName
    )

    $stream.Write(
        $bytes,
        0,
        $bytes.Length
    )
}
```

}}
finally {{

```
$stream.Close()
```

}}

Write-Output 'ZIP_REASSEMBLED'
Write-Output ("REMOTE_ZIP_SIZE=" + (Get-Item $remoteZip).Length)
"""

result = session.run_ps(
ps_combine
)

if result.status_code != 0:

```
print(
    result.std_err.decode(
        errors="ignore"
    )
)

raise Exception(
    "Failed to reassemble deployment ZIP."
)
```

print(
result.std_out.decode(
errors="ignore"
)
)

print("")
print("==========================================")
print("Validating remote ZIP")
print("==========================================")

ps_zip_test = f"""
$zip = '{remote_zip}'

if (-not (Test-Path -LiteralPath $zip)) {{
Write-Error 'REMOTE_ZIP_NOT_FOUND'
exit 1
}}

Add-Type -AssemblyName System.IO.Compression.FileSystem

try {{

```
$archive = [System.IO.Compression.ZipFile]::OpenRead(
    $zip
)

Write-Output (
    "ZIP_ENTRIES=" + $archive.Entries.Count
)

$archive.Dispose()

Write-Output 'REMOTE_ZIP_VALID'
```

}}
catch {{

```
Write-Error (
    "INVALID_ZIP: " + $_.Exception.Message
)

exit 1
```

}}
"""

result = session.run_ps(
ps_zip_test
)

if result.status_code != 0:

```
print(
    result.std_err.decode(
        errors="ignore"
    )
)

raise Exception(
    "Remote deployment ZIP is invalid."
)
```

print(
result.std_out.decode(
errors="ignore"
)
)

print("")
print("Checking IIS target folder...")

ps_target = f"""
$target = '{target}'

if (-not (Test-Path -LiteralPath $target)) {{

```
New-Item `
    -ItemType Directory `
    -Path $target `
    -Force | Out-Null

Write-Output 'TARGET_CREATED'
```

}}
else {{

```
Write-Output 'TARGET_EXISTS'
```

}}
"""

result = session.run_ps(ps_target)

if result.status_code != 0:

```
raise Exception(
    "Unable to create/access IIS target folder: "
    + result.std_err.decode(
        errors="ignore"
    )
)
```

print(
result.std_out.decode(
errors="ignore"
)
)

print("")
print("==========================================")
print("Extracting UI files to IIS")
print("==========================================")

ps_extract = f"""
$zip = '{remote_zip}'
$target = '{target}'

if (-not (Test-Path -LiteralPath $target)) {{

```
New-Item `
    -ItemType Directory `
    -Path $target `
    -Force | Out-Null
```

}}

Expand-Archive `    -LiteralPath $zip`
-DestinationPath $target `
-Force

Write-Output 'EXTRACTION_SUCCESS'
"""

result = session.run_ps(ps_extract)

if result.status_code != 0:

```
print(
    result.std_err.decode(
        errors="ignore"
    )
)

raise Exception(
    "Failed to extract deployment ZIP."
)
```

print(
result.std_out.decode(
errors="ignore"
)
)

print("")
print("==========================================")
print("Verifying deployed UI")
print("==========================================")

ps_verify = f"""
$target = '{target}'

if (-not (Test-Path -LiteralPath $target)) {{
Write-Error 'TARGET_FOLDER_NOT_FOUND'
exit 1
}}

$package = Join-Path $target 'package.json'
$webconfig = Join-Path $target 'web.config'

if (-not (Test-Path -LiteralPath $package)) {{
Write-Error 'package.json NOT FOUND'
exit 1
}}

if (-not (Test-Path -LiteralPath $webconfig)) {{
Write-Error 'web.config NOT FOUND'
exit 1
}}

$count = (
Get-ChildItem `        -LiteralPath $target`
-Recurse `
-File |
Measure-Object
).Count

Write-Output 'DEPLOYMENT_VERIFIED'
Write-Output "FILES_ON_SERVER=$count"
Write-Output "PACKAGE_JSON_FOUND=$((Test-Path -LiteralPath $package))"
Write-Output "WEBCONFIG_FOUND=$((Test-Path -LiteralPath $webconfig))"
"""

result = session.run_ps(ps_verify)

print(
result.std_out.decode(
errors="ignore"
)
)

if result.status_code != 0:

```
print(
    result.std_err.decode(
        errors="ignore"
    )
)

raise Exception(
    "Deployment verification failed."
)
```

print("")
print("==========================================")
print("Cleaning remote temporary files")
print("==========================================")

ps_cleanup = f"""
$remoteTemp = '{remote_temp}'

if (Test-Path -LiteralPath $remoteTemp) {{

```
Remove-Item `
    -LiteralPath $remoteTemp `
    -Recurse `
    -Force
```

}}

Write-Output 'REMOTE_TEMP_CLEANED'
"""

result = session.run_ps(ps_cleanup)

if result.status_code != 0:

```
print(
    "WARNING: Could not clean remote temporary files."
)

print(
    result.std_err.decode(
        errors="ignore"
    )
)
```

else:

```
print(
    result.std_out.decode(
        errors="ignore"
    )
)
```

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

```
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
```

python3 - <<'PY'
import os
import winrm

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]

username = os.environ["IIS_USER"]
password = os.environ["IIS_PASSWORD"]

print("==========================================")
print("Final IIS Deployment Verification")
print("==========================================")

session = winrm.Session(
f"http://{server}:5985/wsman",
auth=(username, password),
transport="ntlm"
)

ps_verify = f"""
$target = '{target}'

if (-not (Test-Path -LiteralPath $target)) {{
Write-Error 'TARGET_FOLDER_NOT_FOUND'
exit 1
}}

$package = Join-Path $target 'package.json'
$webconfig = Join-Path $target 'web.config'

if (-not (Test-Path -LiteralPath $package)) {{
Write-Error 'package.json NOT FOUND'
exit 1
}}

if (-not (Test-Path -LiteralPath $webconfig)) {{
Write-Error 'web.config NOT FOUND'
exit 1
}}

$count = (
Get-ChildItem `        -LiteralPath $target`
-Recurse `
-File |
Measure-Object
).Count

Write-Output '=========================================='
Write-Output 'DEPLOYMENT VERIFIED'
Write-Output '=========================================='
Write-Output "TARGET=$target"
Write-Output "FILES_ON_SERVER=$count"
Write-Output "PACKAGE_JSON=$((Test-Path -LiteralPath $package))"
Write-Output "WEBCONFIG=$((Test-Path -LiteralPath $webconfig))"
Write-Output '=========================================='
"""

result = session.run_ps(ps_verify)

print(
result.std_out.decode(
errors="ignore"
)
)

if result.status_code != 0:

```
print(
    result.std_err.decode(
        errors="ignore"
    )
)

raise Exception(
    "Final deployment verification failed."
)
```

print("")
print("==========================================")
print("FINAL DEPLOYMENT VERIFICATION SUCCESSFUL")
print("==========================================")

PY
'''
}
}
}
}

```
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
            rm -rf deployment_chunks 2>/dev/null || true
        '''
    }
}
```

}
