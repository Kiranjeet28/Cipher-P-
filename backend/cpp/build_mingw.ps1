# PowerShell helper to build with MinGW/g++
# Run from backend\cpp (powershell -ExecutionPolicy Bypass -File build_mingw.ps1)
$g = "g++"
if (-not (Get-Command $g -ErrorAction SilentlyContinue)) {
    Write-Error "g++ not found on PATH. Install MinGW/MSYS2 and ensure g++ is in PATH."
    exit 1
}

& $g -std=c++17 -O2 -Wall -Ithird_party -D_WIN32_WINNT=0x0A00 -pthread main.cpp -o cipher_server.exe -lws2_32 -lwinpthread-1
if ($LASTEXITCODE -eq 0) { Write-Host "Built cipher_server.exe" } else { exit $LASTEXITCODE }
