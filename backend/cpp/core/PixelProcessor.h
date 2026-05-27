#pragma once
#include "ImageLoader.h"
#include <vector>
#include <string>

namespace ImageCrypto {
namespace Core {

class PixelProcessor {
public:
    static std::vector<unsigned char> extractRGBStream(const ImageData& img);
    static void reconstructRGBStream(ImageData& img, const std::vector<unsigned char>& stream);
    static std::vector<unsigned char> permuteRGBStream(const std::vector<unsigned char>& stream, const std::string& seedMaterial);
    static std::vector<unsigned char> unpermuteRGBStream(const std::vector<unsigned char>& stream, const std::string& seedMaterial);
    static std::vector<unsigned char> xorDiffuse(const std::vector<unsigned char>& stream, const std::string& seedMaterial);
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
