cmake_minimum_required(VERSION 3.10)
project(imgcrypt_cpp)

set(CMAKE_CXX_STANDARD 17)

# Expect headers in third_party/ (place httplib.h, stb_image.h, stb_image_write.h there)
include_directories(${CMAKE_SOURCE_DIR}/third_party)

add_executable(imgcrypt main.cpp)

# No extra libraries required (stb and httplib are header-only)
