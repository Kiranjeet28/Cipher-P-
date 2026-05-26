#pragma once
#include "../core/ImageLoader.h"
#include "../algorithms/CipherBase.h"
#include <memory>

namespace ImageCrypto {
namespace Processing {

class EncryptionPipeline {
public:
    explicit EncryptionPipeline(std::unique_ptr<Algorithms::CipherBase> cipher);
    
    Core::ImageData processImage(const Core::ImageData& inputImage);
    std::vector<unsigned char> encryptImageToBytes(const Core::ImageData& inputImage);
    
private:
    std::unique_ptr<Algorithms::CipherBase> cipher_;
};

} // namespace Processing
} // namespace ImageCrypto
