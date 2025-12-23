@echo off
echo Deploying HH-Tetris to Google Cloud Run...
echo.
echo Ensuring gcloud is installed...
where gcloud >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: gcloud CLI is not found in PATH. Please install Google Cloud SDK.
    pause
    exit /b 1
)

echo.
echo Deploying with cost optimization (256MB RAM, 1 CPU, Max 1 Instance)...
cmd /c "gcloud run deploy hh-tetris --source . --region europe-west1 --allow-unauthenticated --memory 256Mi --cpu 1 --max-instances 1 --port 8080 --service-account gamer-des-nordens@hh-tetris.iam.gserviceaccount.com --project hh-tetris"

if %errorlevel% neq 0 (
    echo.
    echo Deployment failed. Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo Deployment Successful!
pause
