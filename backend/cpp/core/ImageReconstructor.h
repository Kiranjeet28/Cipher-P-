#pragma once
#include "ImageLoader.h"
#include <vector>

namespace ImageCrypto {
namespace Core {

class ImageReconstructor {
public:
    static std::vector<unsigned char> encodePNG(const ImageData& img);
    static std::vector<unsigned char> encodeJPG(const ImageData& img, int quality = 90);
    static ImageData rebuildImage(int width, int height, const std::vector<unsigned char>& rgbStream);
    
private:
    static void writeCallback(void* context, void* data, int size);
};

} // namespace Core
} // namespace ImageCrypto
