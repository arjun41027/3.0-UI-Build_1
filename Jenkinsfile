pipeline {
    agent any

    environment {
        IIS_SERVER = '172.16.4.166'
        IIS_TARGET = 'C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI'
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

        stage('Verify UI Build') {
            steps {
                script {

                    echo 'Checking UI build files...'

                    if (!fileExists('web.config')) {
                        error 'UI build not found or web.config is missing from the Jenkins workspace.'
                    }

                    echo 'UI build verified successfully.'
                    echo "UI source: ${env.WORKSPACE}"
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
import winrm
import base64

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]
source = os.environ["WORKSPACE"]
username = os.environ["IIS_USER"]
password = os.environ["IIS_PASSWORD"]

print("==========================================")
print("Puffin UI Deployment")
print("==========================================")
print("IIS Server :", server)
print("Source     :", source)
print("Target     :", target)

print("")
print("Connecting to IIS server...")

session = winrm.Session(
    f"http://{server}:5985/wsman",
    auth=(username, password),
    transport="ntlm"
)

# --------------------------------------------------
# Check WinRM connection
# --------------------------------------------------

result = session.run_cmd(
    "cmd",
    ["/c", "echo WINRM_CONNECTION_SUCCESS"]
)

if result.status_code != 0:
    raise Exception(
        "Unable to connect to IIS server: "
        + result.std_err.decode(errors="ignore")
    )

print(result.std_out.decode(errors="ignore"))

# --------------------------------------------------
# Create target folder if required
# --------------------------------------------------

print("Checking IIS target folder...")

command = (
    'if not exist "' + target + '" '
    '(mkdir "' + target + '" && echo TARGET_CREATED) '
    'else (echo TARGET_EXISTS)'
)

result = session.run_cmd("cmd", ["/c", command])

if result.status_code != 0:
    raise Exception(
        "Unable to access/create IIS target folder: "
        + result.std_err.decode(errors="ignore")
    )

print(result.std_out.decode(errors="ignore"))

# --------------------------------------------------
# Deploy files
# --------------------------------------------------

print("")
print("Starting UI file deployment...")
print("")

file_count = 0

for root, dirs, files in os.walk(source):

    relative_path = os.path.relpath(root, source)

    if relative_path == ".":
        remote_dir = target
    else:
        remote_dir = (
            target
            + "\\"
            + relative_path.replace("/", "\\")
        )

    # Create remote directory
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
            + result.std_err.decode(errors="ignore")
        )

    # Copy files
    for file_name in files:

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
            os.path.relpath(local_file, source)
        )

        # Read local file
        with open(local_file, "rb") as f:
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

        # Write file remotely using PowerShell
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
print("UI deployment completed successfully")
print("Files deployed:", file_count)
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

web_config = target + "\\\\web.config"

command = (
    'if exist "' + web_config + '" '
    '(echo DEPLOYMENT_VERIFIED) '
    'else (echo DEPLOYMENT_FAILED && exit /b 1)'
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

print("==========================================")
print("IIS UI deployment verified successfully")
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
        }

        failure {
            echo '=========================================='
            echo 'Puffin 3.0 UI Deployment FAILED'
            echo '=========================================='
        }
    }
}
