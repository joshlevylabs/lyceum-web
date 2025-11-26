@echo off
REM Stripe Webhook Forwarding - Quick Start Script
REM This script starts Stripe CLI webhook forwarding to your local dev server

echo.
echo ========================================
echo  Stripe Webhook Forwarding
echo ========================================
echo.

REM Check if Stripe CLI exists
if not exist "C:\Users\joshual\Documents\Josh Levy Labs\Stripe\stripe.exe" (
    echo ERROR: Stripe CLI not found at expected location
    echo Please install Stripe CLI or update the path in this script
    pause
    exit /b 1
)

echo Starting webhook forwarding to localhost:3000...
echo.
echo IMPORTANT: Copy the webhook signing secret that appears below
echo and add it to your .env.local file:
echo.
echo   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
echo.
echo Then restart your Next.js dev server!
echo.
echo ========================================
echo.

cd "C:\Users\joshual\Documents\Josh Levy Labs\Stripe"
stripe.exe listen --forward-to localhost:3000/api/stripe/webhook

pause
