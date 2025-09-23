# Windows PowerShell API Testing Commands

## PowerShell Method (Recommended for Windows)

### Test 1: List Clusters (GET)
```powershell
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6Iit2VzVWTU5OTjY4MnN0OTEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2tmZmlhcXNpaGxkZ3Fkd2Fnb29rLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIyYzNkNDc0Ny04ZDY3LTQ1YWYtOTBmNS1iNWU5MDU4ZWMyNDYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4NTgzNjk4LCJpYXQiOjE3NTg1ODAwOTgsImVtYWlsIjoiam9zaEB0aGVseWNldW0uaW8iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNvbXBhbnkiOiJUaGUgTHljZXVtIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ikpvc2h1YSBMZXZ5IiwiaW52aXRlZF9ieV9hZG1pbiI6dHJ1ZSwicm9sZSI6ImFkbWluIiwidXNlcl9uYW1lIjoibHljZXVtLWFkbWluIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTg1NjQ4OTd9XSwic2Vzc2lvbl9pZCI6Ijk5ZjJlMzA2LTdjYjQtNGM1Yy1iYzE4LTliYzdiMjlhMjczNCIsImlzX2Fub255bW91cyI6ZmFsc2V9.Pn0n2aYCSkrItIm3RrOiAs8q1-j2tKp9d_Oyb-TIF2Q"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:3594/api/clusters" -Method GET -Headers $headers
```

### Test 2: Create Cluster (POST)
```powershell
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6Iit2VzVWTU5OTjY4MnN0OTEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2tmZmlhcXNpaGxkZ3Fkd2Fnb29rLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIyYzNkNDc0Ny04ZDY3LTQ1YWYtOTBmNS1iNWU5MDU4ZWMyNDYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4NTgzNjk4LCJpYXQiOjE3NTg1ODAwOTgsImVtYWlsIjoiam9zaEB0aGVseWNldW0uaW8iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNvbXBhbnkiOiJUaGUgTHljZXVtIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ikpvc2h1YSBMZXZ5IiwiaW52aXRlZF9ieV9hZG1pbiI6dHJ1ZSwicm9sZSI6ImFkbWluIiwidXNlcl9uYW1lIjoibHljZXVtLWFkbWluIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTg1NjQ4OTd9XSwic2Vzc2lvbl9pZCI6Ijk5ZjJlMzA2LTdjYjQtNGM1Yy1iYzE4LTliYzdiMjlhMjczNCIsImlzX2Fub255bW91cyI6ZmFsc2V9.Pn0n2aYCSkrItIm3RrOiAs8q1-j2tKp9d_Oyb-TIF2Q"
    "Content-Type" = "application/json"
}

$body = @{
    name = "Lyceum Test Manufacturing Cluster"
    description = "First test cluster for manufacturing analytics"
    cluster_type = "development"
    region = "us-east-1"
    configuration = @{
        nodes = 1
        cpu_per_node = 4
        memory_per_node = "16GB"
        storage_per_node = "500GB"
        hot_tier_size = "100GB"
        warm_tier_size = "300GB"
        cold_tier_size = "1TB"
    }
    retention_policy = @{
        hot_days = 30
        warm_days = 90
        cold_days = 365
        archive_enabled = $true
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3594/api/clusters" -Method POST -Headers $headers -Body $body
```

## Alternative: Use Real Curl (if installed)

If you have real curl installed, use `curl.exe` instead:

```cmd
curl.exe -X GET http://localhost:3594/api/clusters ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6Iit2VzVWTU5OTjY4MnN0OTEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2tmZmlhcXNpaGxkZ3Fkd2Fnb29rLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIyYzNkNDc0Ny04ZDY3LTQ1YWYtOTBmNS1iNWU5MDU4ZWMyNDYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4NTgzNjk4LCJpYXQiOjE3NTg1ODAwOTgsImVtYWlsIjoiam9zaEB0aGVseWNldW0uaW8iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNvbXBhbnkiOiJUaGUgTHljZXVtIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ikpvc2h1YSBMZXZ5IiwiaW52aXRlZF9ieV9hZG1pbiI6dHJ1ZSwicm9sZSI6ImFkbWluIiwidXNlcl9uYW1lIjoibHljZXVtLWFkbWluIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTg1NjQ4OTd9XSwic2Vzc2lvbl9pZCI6Ijk5ZjJlMzA2LTdjYjQtNGM1Yy1iYzE4LTliYzdiMjlhMjczNCIsImlzX2Fub255bW91cyI6ZmFsc2V9.Pn0n2aYCSkrItIm3RrOiAs8q1-j2tKp9d_Oyb-TIF2Q" ^
  -H "Content-Type: application/json"
```

## Browser Testing (Easiest Alternative)

Open browser Developer Tools (F12) and use the Console:

```javascript
// Test 1: List clusters
fetch('http://localhost:3594/api/clusters', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6Iit2VzVWTU5OTjY4MnN0OTEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2tmZmlhcXNpaGxkZ3Fkd2Fnb29rLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIyYzNkNDc0Ny04ZDY3LTQ1YWYtOTBmNS1iNWU5MDU4ZWMyNDYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4NTgzNjk4LCJpYXQiOjE3NTg1ODAwOTgsImVtYWlsIjoiam9zaEB0aGVseWNldW0uaW8iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImNvbXBhbnkiOiJUaGUgTHljZXVtIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6Ikpvc2h1YSBMZXZ5IiwiaW52aXRlZF9ieV9hZG1pbiI6dHJ1ZSwicm9sZSI6ImFkbWluIiwidXNlcl9uYW1lIjoibHljZXVtLWFkbWluIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTg1NjQ4OTd9XSwic2Vzc2lvbl9pZCI6Ijk5ZjJlMzA2LTdjYjQtNGM1Yy1iYzE4LTliYzdiMjlhMjczNCIsImlzX2Fub255bW91cyI6ZmFsc2V9.Pn0n2aYCSkrItIm3RrOiAs8q1-j2tKp9d_Oyb-TIF2Q',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('Response:', data))
.catch(error => console.error('Error:', error));
```
