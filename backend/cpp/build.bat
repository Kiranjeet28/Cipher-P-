@echo off
echo ================================
echo Building Image Encryption Backend
echo ================================
echo.

REM Check if g++ exists
where g++ >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: g++ not found in PATH
    echo Please install MinGW-w64 with POSIX threads
    echo See INSTALL_MINGW.md for instructions
    exit /b 1
)

echo Compiler found:
g++ --version | findstr "g++"
echo.

REM Check threading model
echo Checking threading support...
g++ -v 2>&1 | findstr "thread"
echo.

echo Compiling...
g++ -std=c++17 -O2 -D_WIN32_WINNT=0x0A00 ^
    -I. -Ithird_party ^
    main.cpp ^
    core/ImageLoader.cpp core/PixelProcessor.cpp core/ImageReconstructor.cpp ^
    math/ModularArithmetic.cpp math/MatrixOperations.cpp ^
    algorithms/CaesarCipher.cpp algorithms/MultiplicativeCipher.cpp ^
    algorithms/AffineCipher.cpp algorithms/PlayfairCipher.cpp algorithms/HillCipher.cpp ^
    algorithms/RC4Cipher.cpp algorithms/RailFenceCipher.cpp ^
    processing/CipherFactory.cpp processing/EncryptionPipeline.cpp processing/DecryptionPipeline.cpp ^
    -lws2_32 -o ImageCrypto.exe

if %errorlevel% equ 0 (
    echo.
    echo ================================
    echo Build SUCCESS!
    echo ================================
    echo.
    echo Run the server with:
    echo     ImageCrypto.exe
    echo.
    echo Server will listen on: http://localhost:5000
    echo API endpoints:
    echo     POST /api/encrypt
    echo     POST /api/decrypt
) else (
    echo.
    echo ================================
    echo Build FAILED!
    echo ================================
    echo.
    echo Check the error messages above
    echo.
    echo Common issues:
    echo 1. Wrong MinGW version (need POSIX threads)
    echo 2. Missing threading support
    echo.
    echo See INSTALL_MINGW.md for help
    exit /b 1
)
