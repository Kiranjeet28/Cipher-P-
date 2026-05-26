#pragma once
#include <string>
#include <vector>
#include <memory>

namespace ImageCrypto {
namespace Core {

struct ImageData {
    int width;
    int height;
    int channels;
    std::vector<unsigned char> pixels;
    
    ImageData() : width(0), height(0), channels(0) {}
    ImageData(int w, int h, int c) : width(w), height(h), channels(c) {
        pixels.resize(w * h * c);
    }
    
    size_t size() const { return pixels.size(); }
    bool isValid() const { return width > 0 && height > 0 && channels > 0 && !pixels.empty(); }
};

class ImageLoader {
public:
    static ImageData loadFromMemory(const std::string& data);
    static ImageData loadFromFile(const std::string& filepath);
    static bool validateImage(const ImageData& img);
    
private:
    static ImageData decodePNG(const unsigned char* data, size_t size);
    static ImageData decodeJPG(const unsigned char* data, size_t size);
};

} // namespace Core
} // namespace ImageCrypto
