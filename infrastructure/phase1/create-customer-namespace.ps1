param(
    [Parameter(Mandatory=$true)]
    [string]$CustomerId
)

if (-not $CustomerId) {
    Write-Host "Usage: create-customer-namespace.ps1 -CustomerId customer-id"
    Write-Host "Example: create-customer-namespace.ps1 -CustomerId customer-12345"
    exit 1
}

$creationTimestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

Write-Host "Creating namespace and resources for customer: $CustomerId"

# Read template and replace variables
$template = Get-Content "customer-namespace-template.yaml" -Raw
$template = $template -replace '\$\{CUSTOMER_ID\}', $CustomerId
$template = $template -replace '\$\{CREATION_TIMESTAMP\}', $creationTimestamp

# Apply the configuration
$template | kubectl apply -f -

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Created namespace and resources for customer: $CustomerId" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to create resources for customer: $CustomerId" -ForegroundColor Red
}
