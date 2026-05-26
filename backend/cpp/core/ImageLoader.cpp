#include "ImageLoader.h"
#include "../third_party/stb_image.h"
#include <stdexcept>
#include <cstring>

namespace ImageCrypto {
namespace Core {

ImageData ImageLoader::loadFromMemory(const std::string& data) {
    if (data.empty()) {
        throw std::runtime_error("Empty image data");
    }
    
    int width, height, channels;
    unsigned char* img = stbi_load_from_memory(
        reinterpret_cast<const unsigned char*>(data.data()),
        static_cast<int>(data.size()),
        &width, &height, &channels,
        STBI_rgb_alpha
    );
    
    if (!img) {
        throw std::runtime_error("Failed to decode image: " + std::string(stbi_failure_reason()));
    }
    
    ImageData result(width, height, 4);
    size_t pixelCount = static_cast<size_t>(width) * height * 4;
    memcpy(result.pixels.data(), img, pixelCount);
    
    stbi_image_free(img);
    return result;
}

ImageData ImageLoader::loadFromFile(const std::string& filepath) {
    int width, height, channels;
    unsigned char* img = stbi_load(filepath.c_str(), &width, &height, &channels, STBI_rgb_alpha);
    
    if (!img) {
        throw std::runtime_error("Failed to load image file: " + filepath);
    }
    
    ImageData result(width, height, 4);
    size_t pixelCount = static_cast<size_t>(width) * height * 4;
    memcpy(result.pixels.data(), img, pixelCount);
    
    stbi_image_free(img);
    return result;
}

bool ImageLoader::validateImage(const ImageData& img) {
    if (!img.isValid()) return false;
    if (img.width > 16384 || img.height > 16384) return false;
    if (img.pixels.size() != static_cast<size_t>(img.width * img.height * img.channels)) return false;
    return true;
}

} // namespace Core
} // namespace ImageCrypto
