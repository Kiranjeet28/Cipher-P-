#include "RC4Cipher.h"
#include <stdexcept>

namespace ImageCrypto {
namespace Algorithms {

RC4Cipher::RC4Cipher(const std::string& key) : key_(key) {}

void RC4Cipher::setKey(const std::string& key) {
    key_ = key;
}

bool RC4Cipher::validateKey() const {
    return !key_.empty() && key_.size() >= 1 && key_.size() <= 256;
}

void RC4Cipher::initSBox(std::vector<unsigned char>& S) const {
    S.resize(256);
    for (int i = 0; i < 256; ++i) S[i] = static_cast<unsigned char>(i);
    
    int j = 0;
    for (int i = 0; i < 256; ++i) {
        j = (j + S[i] + static_cast<unsigned char>(key_[i % key_.size()])) % 256;
        std::swap(S[i], S[j]);
    }
}

std::vector<unsigned char> RC4Cipher::generateKeyStream(size_t length) const {
    std::vector<unsigned char> S;
    initSBox(S);
    
    std::vector<unsigned char> keyStream(length);
    int i = 0, j = 0;
    
    for (size_t k = 0; k < length; ++k) {
        i = (i + 1) % 256;
        j = (j + S[i]) % 256;
        std::swap(S[i], S[j]);
        keyStream[k] = S[(S[i] + S[j]) % 256];
    }
    
    return keyStream;
}

std::vector<unsigned char> RC4Cipher::encrypt(const std::vector<unsigned char>& data) {
    if (!validateKey()) {
        throw std::runtime_error("Invalid RC4 key");
    }
    
    std::vector<unsigned char> keyStream = generateKeyStream(data.size());
    std::vector<unsigned char> result(data.size());
    
    for (size_t i = 0; i < data.size(); ++i) {
        result[i] = data[i] ^ keyStream[i];
    }
    
    return result;
}

std::vector<unsigned char> RC4Cipher::decrypt(const std::vector<unsigned char>& data) {
    return encrypt(data); // RC4 is symmetric - same operation for encrypt/decrypt
}

} // namespace Algorithms
} // namespace ImageCrypto
