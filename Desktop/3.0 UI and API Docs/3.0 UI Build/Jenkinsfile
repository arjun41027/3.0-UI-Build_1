pipeline {
    agent any

    environment {
        IIS_SERVER = '172.16.4.166'
        IIS_TARGET = 'C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI'
        UI_BUILD_PATH = 'Desktop/3.0 UI and API Docs/3.0 UI Build'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out latest UI build from GitHub...'
                checkout scm
            }
        }

        stage('Verify UI Build') {
            steps {
                script {
                    if (!fileExists("${env.UI_BUILD_PATH}/web.config")) {
                        error "UI build not found or web.config is missing: ${env.UI_BUILD_PATH}"
                    }

                    echo "UI build verified successfully."
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

server = os.environ["IIS_SERVER"]
target = os.environ["IIS_TARGET"]
source = os.environ["UI_BUILD_PATH"]
username = os.environ["IIS_USER"]
password = os.environ["IIS_PASSWORD"]

print("Connecting to IIS server:", server)

session = winrm.Session(
    f"http://{server}:5985/wsman",
    auth=(username, password),
    transport="ntlm"
)

# Check/create target folder
command = f'''
if not exist "{target}" (
    mkdir "{target}"
    echo TARGET_CREATED
) else (
    echo TARGET_EXISTS
)
'''

result = session.run_cmd("cmd", ["/c", command])

if result.status_code != 0:
    raise Exception(
        "Unable to access/create IIS target folder: "
        + result.std_err.decode(errors="ignore")
    )

print(result.std_out.decode(errors="ignore"))

# Copy build files using PowerShell Remoting
# Files with the same name are overwritten.
print("Starting UI file deployment...")

for root, dirs, files in os.walk(source):

    relative_path = os.path.relpath(root, source)

    if relative_path == ".":
        remote_dir = target
    else:
        remote_dir = target + "\\" + relative_path.replace("/", "\\")

    # Create directory
    mkdir_command = f'if not exist "{remote_dir}" mkdir "{remote_dir}"'

    result = session.run_cmd("cmd", ["/c", mkdir_command])

    if result.status_code != 0:
        raise Exception(
            "Failed to create remote directory: "
            + remote_dir
        )

    # Copy each file
    for file_name in files:

        local_file = os.path.join(root, file_name)
        remote_file = remote_dir + "\\" + file_name

        # Base64 transfer
        import base64

        with open(local_file, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("ascii")

        ps_command = (
            "$data=[Convert]::FromBase64String('"
            + encoded
            + "');"
            "[IO.File]::WriteAllBytes('"
            + remote_file.replace("'", "''")
            + "', $data)"
        )

        result = session.run_ps(ps_command)

        if result.status_code != 0:
            raise Exception(
                "Failed to deploy file: "
                + local_file
                + "\n"
                + result.std_err.decode(errors="ignore")
            )

        print("Deployed:", relative_path, "/", file_name)

print("UI deployment completed successfully.")
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

session = winrm.Session(
    "http://172.16.4.166:5985/wsman",
    auth=(
        os.environ["IIS_USER"],
        os.environ["IIS_PASSWORD"]
    ),
    transport="ntlm"
)

command = r'''
if exist "C:\\inetpub\\wwwroot\\PuffinMT_Demo\\PuffinUI\\web.config" (
    echo DEPLOYMENT_VERIFIED
) else (
    echo DEPLOYMENT_FAILED
    exit /b 1
)
'''

result = session.run_cmd("cmd", ["/c", command])

print(result.std_out.decode(errors="ignore"))

if result.status_code != 0:
    print(result.std_err.decode(errors="ignore"))
    raise Exception("Deployment verification failed.")

print("IIS UI deployment verified successfully.")
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
