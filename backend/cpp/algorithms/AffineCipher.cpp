#include "AffineCipher.h"
#include "../math/ModularArithmetic.h"
#include <stdexcept>

namespace ImageCrypto {
namespace Algorithms {

AffineCipher::AffineCipher(int a, int b) : a_(a), b_(b), aInverse_(-1) {
    computeInverse();
}

void AffineCipher::setKeys(int a, int b) {
    a_ = a;
    b_ = b;
    computeInverse();
}

void AffineCipher::computeInverse() {
    aInverse_ = Math::ModularArithmetic::modInverse(a_, MODULUS);
}

bool AffineCipher::validateKey() const {
    return aInverse_ != -1 && Math::ModularArithmetic::isCoprime(a_, MODULUS);
}

std::vector<unsigned char> AffineCipher::encrypt(const std::vector<unsigned char>& data) {
    if (!validateKey()) {
        throw std::runtime_error("Invalid affine key: 'a' not coprime with 256");
    }
    
    std::vector<unsigned char> result(data.size());
    
    for (size_t i = 0; i < data.size(); ++i) {
        int encrypted = (a_ * data[i] + b_) & 0xFF;
        result[i] = static_cast<unsigned char>(encrypted);
    }
    
    return result;
}

std::vector<unsigned char> AffineCipher::decrypt(const std::vector<unsigned char>& data) {
    if (!validateKey()) {
        throw std::runtime_error("Invalid affine key: cannot compute inverse");
    }
    
    std::vector<unsigned char> result(data.size());
    
    for (size_t i = 0; i < data.size(); ++i) {
        int temp = (data[i] - b_) & 0xFF;
        int decrypted = (aInverse_ * temp) & 0xFF;
        result[i] = static_cast<unsigned char>(decrypted);
    }
    
    return result;
}

} // namespace Algorithms
} // namespace ImageCrypto
