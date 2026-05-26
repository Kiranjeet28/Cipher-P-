#include "DecryptionPipeline.h"
#include "../core/PixelProcessor.h"
#include "../core/ImageReconstructor.h"

namespace ImageCrypto {
namespace Processing {

DecryptionPipeline::DecryptionPipeline(std::unique_ptr<Algorithms::CipherBase> cipher)
    : cipher_(std::move(cipher)) {}

Core::ImageData DecryptionPipeline::processImage(const Core::ImageData& inputImage) {
    std::vector<unsigned char> rgbStream = Core::PixelProcessor::extractRGBStream(inputImage);
    
    std::vector<unsigned char> decryptedStream = cipher_->decrypt(rgbStream);
    
    Core::ImageData outputImage = inputImage;
    Core::PixelProcessor::reconstructRGBStream(outputImage, decryptedStream);
    
    return outputImage;
}

std::vector<unsigned char> DecryptionPipeline::decryptImageToBytes(const Core::ImageData& inputImage) {
    Core::ImageData decrypted = processImage(inputImage);
    return Core::ImageReconstructor::encodePNG(decrypted);
}

} // namespace Processing
} // namespace ImageCrypto
