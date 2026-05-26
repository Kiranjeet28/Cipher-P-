#include "PixelProcessor.h"

namespace ImageCrypto {
namespace Core {

std::vector<unsigned char> PixelProcessor::extractRGBStream(const ImageData& img) {
    size_t pixelCount = img.width * img.height;
    std::vector<unsigned char> stream;
    stream.reserve(pixelCount * 3);
    
    for (size_t i = 0; i < pixelCount; ++i) {
        size_t base = i * img.channels;
        stream.push_back(img.pixels[base + 0]); // R
        stream.push_back(img.pixels[base + 1]); // G
        stream.push_back(img.pixels[base + 2]); // B
    }
    
    return stream;
}

void PixelProcessor::reconstructRGBStream(ImageData& img, const std::vector<unsigned char>& stream) {
    size_t pixelCount = img.width * img.height;
    size_t streamIdx = 0;
    
    for (size_t i = 0; i < pixelCount && streamIdx + 2 < stream.size(); ++i) {
        size_t base = i * img.channels;
        img.pixels[base + 0] = stream[streamIdx++]; // R
        img.pixels[base + 1] = stream[streamIdx++]; // G
        img.pixels[base + 2] = stream[streamIdx++]; // B
    }
}

void PixelProcessor::separateChannels(const ImageData& img,
                                     std::vector<unsigned char>& r,
                                     std::vector<unsigned char>& g,
                                     std::vector<unsigned char>& b) {
    size_t pixelCount = img.width * img.height;
    r.resize(pixelCount);
    g.resize(pixelCount);
    b.resize(pixelCount);
    
    for (size_t i = 0; i < pixelCount; ++i) {
        size_t base = i * img.channels;
        r[i] = img.pixels[base + 0];
        g[i] = img.pixels[base + 1];
        b[i] = img.pixels[base + 2];
    }
}

void PixelProcessor::mergeChannels(ImageData& img,
                                  const std::vector<unsigned char>& r,
                                  const std::vector<unsigned char>& g,
                                  const std::vector<unsigned char>& b) {
    size_t pixelCount = img.width * img.height;
    
    for (size_t i = 0; i < pixelCount; ++i) {
        size_t base = i * img.channels;
        img.pixels[base + 0] = r[i];
        img.pixels[base + 1] = g[i];
        img.pixels[base + 2] = b[i];
    }
}

} // namespace Core
} // namespace ImageCrypto
