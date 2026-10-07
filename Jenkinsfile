pipeline {
    agent any

    environment {
        IIS_SERVER = '172.16.4.166'
        IIS_TARGET = 'C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI'
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

                    echo "Workspace:"
                    pwd

                    echo ""
                    echo "Files/folders:"
                    find . -maxdepth 2 -type f \
                        ! -path './.git/*' \
                        ! -name 'Jenkinsfile' | sort

                    echo ""
                    echo "UI files found successfully."
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
import winrm
import base64

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]
source = os.environ["WORKSPACE"]
username = os.environ["IIS_USER"]
password = os.environ["IIS_PASSWORD"]

print("==========================================")
print("Puffin 3.0 UI Deployment")
print("==========================================")
print("Source :", source)
print("Server :", server)
print("Target :", target)
print("==========================================")

# --------------------------------------------------
# Connect to Windows IIS server
# --------------------------------------------------

print("")
print("Connecting to IIS server...")

session = winrm.Session(
    f"http://{server}:5985/wsman",
    auth=(username, password),
    transport="ntlm"
)

# Test connection
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
# Create IIS target folder
# --------------------------------------------------

print("Checking IIS target folder...")

create_target_command = (
    'if not exist "' + target + '" '
    '(mkdir "' + target + '" && echo TARGET_CREATED) '
    'else (echo TARGET_EXISTS)'
)

result = session.run_cmd(
    "cmd",
    ["/c", create_target_command]
)

if result.status_code != 0:
    raise Exception(
        "Unable to create/access IIS target folder: "
        + result.std_err.decode(errors="ignore")
    )

print(
    result.std_out.decode(
        errors="ignore"
    )
)

# --------------------------------------------------
# Deploy repository files
# --------------------------------------------------

print("")
print("Starting file deployment...")
print("")

file_count = 0
folder_count = 0

for root, dirs, files in os.walk(source):

    # Do not deploy Git metadata
    dirs[:] = [
        d for d in dirs
        if d != ".git"
    ]

    relative_path = os.path.relpath(
        root,
        source
    )

    # Skip Jenkins workspace root special path
    if relative_path == ".":
        remote_dir = target
    else:
        remote_dir = (
            target
            + "\\"
            + relative_path.replace("/", "\\")
        )

    # --------------------------------------------------
    # Create remote directory
    # --------------------------------------------------

    mkdir_command = (
        'if not exist "' + remote_dir + '" '
        'mkdir "' + remote_dir + '"'
    )

    result = session.run_cmd(
        "cmd",
        ["/c", mkdir_command]
    )

    if result.status_code != 0:
        raise Exception(
            "Failed to create remote directory: "
            + remote_dir
            + "\\n"
            + result.std_err.decode(
                errors="ignore"
            )
        )

    folder_count += 1

    # --------------------------------------------------
    # Deploy files
    # --------------------------------------------------

    for file_name in files:

        # Do not deploy Jenkinsfile
        if file_name.lower() == "jenkinsfile":
            continue

        local_file = os.path.join(
            root,
            file_name
        )

        remote_file = (
            remote_dir
            + "\\"
            + file_name
        )

        print(
            "Deploying:",
            os.path.relpath(
                local_file,
                source
            )
        )

        # Read file
        with open(
            local_file,
            "rb"
        ) as f:
            file_data = f.read()

        # Convert to Base64
        encoded = base64.b64encode(
            file_data
        ).decode("ascii")

        # Escape single quotes
        safe_remote_file = remote_file.replace(
            "'",
            "''"
        )

        # PowerShell writes the file.
        # Existing files are automatically replaced.
        ps_command = (
            "$data=[Convert]::FromBase64String('"
            + encoded
            + "');"
            "[IO.File]::WriteAllBytes('"
            + safe_remote_file
            + "', $data)"
        )

        result = session.run_ps(
            ps_command
        )

        if result.status_code != 0:

            raise Exception(
                "Failed to deploy file: "
                + local_file
                + "\\n"
                + result.std_err.decode(
                    errors="ignore"
                )
            )

        file_count += 1

print("")
print("==========================================")
print("UI DEPLOYMENT COMPLETED")
print("==========================================")
print("Folders deployed :", folder_count)
print("Files deployed   :", file_count)
print("Target           :", target)
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

# Verify target folder
command = (
    'if exist "' + target + '" '
    '(echo TARGET_FOLDER_EXISTS) '
    'else (echo TARGET_FOLDER_MISSING && exit /b 1)'
)

result = session.run_cmd(
    "cmd",
    ["/c", command]
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

# Count deployed files
count_command = (
    'powershell -NoProfile -Command '
    '"(Get-ChildItem -Path \\"'
    + target
    + '\\" -Recurse -File | Measure-Object).Count"'
)

result = session.run_cmd(
    "cmd",
    ["/c", count_command]
)

if result.status_code == 0:

    deployed_count = result.std_out.decode(
        errors="ignore"
    ).strip()

    print(
        "Files currently present on IIS: "
        + deployed_count
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
            echo "Deployed to: ${env.IIS_SERVER}"
            echo "Path: ${env.IIS_TARGET}"
            echo '=========================================='
        }

        failure {
            echo '=========================================='
            echo 'Puffin 3.0 UI Deployment FAILED'
            echo '=========================================='
        }
    }
}
