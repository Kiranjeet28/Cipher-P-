#include "EncryptionPipeline.h"
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

EncryptionPipeline::EncryptionPipeline(std::unique_ptr<Algorithms::CipherBase> cipher)
    : cipher_(std::move(cipher)) {}

Core::ImageData EncryptionPipeline::processImage(const Core::ImageData& inputImage) {
    std::vector<unsigned char> rgbStream = Core::PixelProcessor::extractRGBStream(inputImage);
    std::string permutationSeed = buildSeedMaterial(*cipher_, rgbStream.size(), "permute");
    std::string diffusionSeed = buildSeedMaterial(*cipher_, rgbStream.size(), "diffuse");
    
    std::vector<unsigned char> permutedStream = Core::PixelProcessor::permuteRGBStream(rgbStream, permutationSeed);
    std::vector<unsigned char> encryptedStream = cipher_->encrypt(permutedStream);
    std::vector<unsigned char> diffusedStream = Core::PixelProcessor::xorDiffuse(encryptedStream, diffusionSeed);
    
    Core::ImageData outputImage = inputImage;
    Core::PixelProcessor::reconstructRGBStream(outputImage, diffusedStream);
    
    return outputImage;
}

std::vector<unsigned char> EncryptionPipeline::encryptImageToBytes(const Core::ImageData& inputImage) {
    Core::ImageData encrypted = processImage(inputImage);
    return Core::ImageReconstructor::encodePNG(encrypted);
}

} // namespace Processing
} // namespace ImageCrypto
