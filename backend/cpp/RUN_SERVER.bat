@echo off
echo ================================
echo Image Encryption Backend Server
echo ================================
echo.
echo Starting server...
echo.
echo Server will run on: http://localhost:5000
echo.
echo Endpoints:
echo   POST http://localhost:5000/api/encrypt
echo   POST http://localhost:5000/api/decrypt
echo.
echo Supported Algorithms:
echo   - caesar       (shift cipher)
echo   - multiplicative
echo   - affine
echo   - playfair
echo   - hill
echo.
echo Press Ctrl+C to stop the server
echo.
echo ================================
echo.

ImageCrypto.exe
