#pragma once
#include "../core/ImageLoader.h"
#include "../algorithms/CipherBase.h"
#include <memory>

namespace ImageCrypto {
namespace Processing {

class DecryptionPipeline {
public:
    explicit DecryptionPipeline(std::unique_ptr<Algorithms::CipherBase> cipher);
    
    Core::ImageData processImage(const Core::ImageData& inputImage);
    std::vector<unsigned char> decryptImageToBytes(const Core::ImageData& inputImage);
    
private:
    std::unique_ptr<Algorithms::CipherBase> cipher_;
};

} // namespace Processing
} // namespace ImageCrypto
