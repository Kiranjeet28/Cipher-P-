#include "ImageReconstructor.h"
#include "../third_party/stb_image_write.h"
#include "PixelProcessor.h"
#include <stdexcept>

namespace ImageCrypto {
namespace Core {

void ImageReconstructor::writeCallback(void* context, void* data, int size) {
    auto* vec = reinterpret_cast<std::vector<unsigned char>*>(context);
    unsigned char* bytes = reinterpret_cast<unsigned char*>(data);
    vec->insert(vec->end(), bytes, bytes + size);
}

std::vector<unsigned char> ImageReconstructor::encodePNG(const ImageData& img) {
    if (!ImageLoader::validateImage(img)) {
        throw std::runtime_error("Invalid image data for encoding");
    }
    
    std::vector<unsigned char> output;
    int stride = img.width * img.channels;
    
    int result = stbi_write_png_to_func(
        writeCallback,
        &output,
        img.width,
        img.height,
        img.channels,
        img.pixels.data(),
        stride
    );
    
    if (!result) {
        throw std::runtime_error("Failed to encode PNG");
    }
    
    return output;
}

std::vector<unsigned char> ImageReconstructor::encodeJPG(const ImageData& img, int quality) {
    if (!ImageLoader::validateImage(img)) {
        throw std::runtime_error("Invalid image data for encoding");
    }
    
    std::vector<unsigned char> output;
    
    int result = stbi_write_jpg_to_func(
        writeCallback,
        &output,
        img.width,
        img.height,
        img.channels,
        img.pixels.data(),
        quality
    );
    
    if (!result) {
        throw std::runtime_error("Failed to encode JPG");
    }
    
    return output;
}

ImageData ImageReconstructor::rebuildImage(int width, int height, const std::vector<unsigned char>& rgbStream) {
    ImageData img(width, height, 4);
    PixelProcessor::reconstructRGBStream(img, rgbStream);
    return img;
}

} // namespace Core
} // namespace ImageCrypto
