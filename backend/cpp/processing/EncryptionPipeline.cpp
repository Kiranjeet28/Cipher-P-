#include "EncryptionPipeline.h"
#include "../core/PixelProcessor.h"
#include "../core/ImageReconstructor.h"

namespace ImageCrypto {
namespace Processing {

EncryptionPipeline::EncryptionPipeline(std::unique_ptr<Algorithms::CipherBase> cipher)
    : cipher_(std::move(cipher)) {}

Core::ImageData EncryptionPipeline::processImage(const Core::ImageData& inputImage) {
    std::vector<unsigned char> rgbStream = Core::PixelProcessor::extractRGBStream(inputImage);
    
    std::vector<unsigned char> encryptedStream = cipher_->encrypt(rgbStream);
    
    Core::ImageData outputImage = inputImage;
    Core::PixelProcessor::reconstructRGBStream(outputImage, encryptedStream);
    
    return outputImage;
}

std::vector<unsigned char> EncryptionPipeline::encryptImageToBytes(const Core::ImageData& inputImage) {
    Core::ImageData encrypted = processImage(inputImage);
    return Core::ImageReconstructor::encodePNG(encrypted);
}

} // namespace Processing
} // namespace ImageCrypto
