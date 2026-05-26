#include "MultiplicativeCipher.h"
#include "../math/ModularArithmetic.h"
#include <stdexcept>

namespace ImageCrypto {
namespace Algorithms {

MultiplicativeCipher::MultiplicativeCipher(int key) : key_(key), keyInverse_(-1) {
    computeInverse();
}

void MultiplicativeCipher::setKey(int key) {
    key_ = key;
    computeInverse();
}

void MultiplicativeCipher::computeInverse() {
    keyInverse_ = Math::ModularArithmetic::modInverse(key_, MODULUS);
}

bool MultiplicativeCipher::validateKey() const {
    return keyInverse_ != -1 && Math::ModularArithmetic::isCoprime(key_, MODULUS);
}

std::vector<unsigned char> MultiplicativeCipher::encrypt(const std::vector<unsigned char>& data) {
    if (!validateKey()) {
        throw std::runtime_error("Invalid multiplicative key: not coprime with 256");
    }
    
    std::vector<unsigned char> result(data.size());
    
    for (size_t i = 0; i < data.size(); ++i) {
        result[i] = static_cast<unsigned char>((key_ * data[i]) & 0xFF);
    }
    
    return result;
}

std::vector<unsigned char> MultiplicativeCipher::decrypt(const std::vector<unsigned char>& data) {
    if (!validateKey()) {
        throw std::runtime_error("Invalid multiplicative key: cannot compute inverse");
    }
    
    std::vector<unsigned char> result(data.size());
    
    for (size_t i = 0; i < data.size(); ++i) {
        result[i] = static_cast<unsigned char>((keyInverse_ * data[i]) & 0xFF);
    }
    
    return result;
}

} // namespace Algorithms
} // namespace ImageCrypto
