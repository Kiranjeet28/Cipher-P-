cmake_minimum_required(VERSION 3.10)
project(ImageCrypto)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(${CMAKE_SOURCE_DIR})
include_directories(${CMAKE_SOURCE_DIR}/third_party)

set(CORE_SOURCES
    core/ImageLoader.cpp
    core/PixelProcessor.cpp
    core/ImageReconstructor.cpp
)

set(MATH_SOURCES
    math/ModularArithmetic.cpp
    math/MatrixOperations.cpp
)

set(ALGORITHM_SOURCES
    algorithms/CaesarCipher.cpp
    algorithms/MultiplicativeCipher.cpp
    algorithms/AffineCipher.cpp
    algorithms/PlayfairCipher.cpp
    algorithms/HillCipher.cpp
    algorithms/RC4Cipher.cpp
    algorithms/RailFenceCipher.cpp
)

set(PROCESSING_SOURCES
    processing/CipherFactory.cpp
    processing/EncryptionPipeline.cpp
    processing/DecryptionPipeline.cpp
)

add_executable(ImageCrypto
    main.cpp
    ${CORE_SOURCES}
    ${MATH_SOURCES}
    ${ALGORITHM_SOURCES}
    ${PROCESSING_SOURCES}
)

if(MSVC)
    target_compile_options(ImageCrypto PRIVATE /W4)
else()
    target_compile_options(ImageCrypto PRIVATE -Wall -Wextra -Wpedantic)
endif()
