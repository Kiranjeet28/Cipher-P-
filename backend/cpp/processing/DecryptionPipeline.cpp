#include "DecryptionPipeline.h"
#include "../core/PixelProcessor.h"
#include "../core/ImageReconstructor.h"

#include <string>

namespace {

std::string buildSeedMaterial(const ImageCrypto::Algorithms::CipherBase& cipher, size_t length, const char* phase) {
    return cipher.getAlgorithmName() + "|" + cipher.getKeyMaterial() + "|" + phase + "|" + std::to_string(length);
}

} // namespace

namespace ImageCrypto {
namespace Processing {

DecryptionPipeline::DecryptionPipeline(std::unique_ptr<Algorithms::CipherBase> cipher)
    : cipher_(std::move(cipher)) {}

Core::ImageData DecryptionPipeline::processImage(const Core::ImageData& inputImage) {
    std::vector<unsigned char> rgbStream = Core::PixelProcessor::extractRGBStream(inputImage);
    std::string permutationSeed = buildSeedMaterial(*cipher_, rgbStream.size(), "permute");
    std::string diffusionSeed = buildSeedMaterial(*cipher_, rgbStream.size(), "diffuse");
    
    std::vector<unsigned char> undiffusedStream = Core::PixelProcessor::xorDiffuse(rgbStream, diffusionSeed);
    std::vector<unsigned char> decryptedStream = cipher_->decrypt(undiffusedStream);
    std::vector<unsigned char> unpermutedStream = Core::PixelProcessor::unpermuteRGBStream(decryptedStream, permutationSeed);
    
    Core::ImageData outputImage = inputImage;
    Core::PixelProcessor::reconstructRGBStream(outputImage, unpermutedStream);
    
    return outputImage;
}

std::vector<unsigned char> DecryptionPipeline::decryptImageToBytes(const Core::ImageData& inputImage) {
    Core::ImageData decrypted = processImage(inputImage);
    return Core::ImageReconstructor::encodePNG(decrypted);
}

} // namespace Processing
} // namespace ImageCrypto
