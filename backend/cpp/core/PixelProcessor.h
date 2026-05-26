#pragma once
#include "ImageLoader.h"
#include <vector>

namespace ImageCrypto {
namespace Core {

class PixelProcessor {
public:
    static std::vector<unsigned char> extractRGBStream(const ImageData& img);
    static void reconstructRGBStream(ImageData& img, const std::vector<unsigned char>& stream);
    static void separateChannels(const ImageData& img, 
                                 std::vector<unsigned char>& r,
                                 std::vector<unsigned char>& g,
                                 std::vector<unsigned char>& b);
    static void mergeChannels(ImageData& img,
                             const std::vector<unsigned char>& r,
                             const std::vector<unsigned char>& g,
                             const std::vector<unsigned char>& b);
};

} // namespace Core
} // namespace ImageCrypto
