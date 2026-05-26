#include "CipherFactory.h"
#include "../algorithms/CaesarCipher.h"
#include "../algorithms/MultiplicativeCipher.h"
#include "../algorithms/AffineCipher.h"
#include "../algorithms/PlayfairCipher.h"
#include "../algorithms/HillCipher.h"
#include "../algorithms/RC4Cipher.h"
#include "../algorithms/RailFenceCipher.h"
#include <sstream>
#include <stdexcept>

namespace ImageCrypto {
namespace Processing {

int CipherFactory::parseInteger(const std::string& str, int defaultValue) {
    try {
        return std::stoi(str);
    } catch (...) {
        return defaultValue;
    }
}

std::vector<int> CipherFactory::parseKeyMatrix(const std::string& key) {
    std::vector<int> matrix;
    std::stringstream ss(key);
    std::string token;
    
    while (std::getline(ss, token, ',')) {
        if (!token.empty()) {
            matrix.push_back(parseInteger(token, 0));
        }
    }
    
    return matrix;
}

std::unique_ptr<Algorithms::CipherBase> CipherFactory::createCipher(
    const std::string& algorithm,
    const std::string& key,
    const std::string& param) {
    
    if (algorithm == "caesar") {
        int shift = key.empty() ? 3 : parseInteger(key, 3);
        return std::make_unique<Algorithms::CaesarCipher>(shift);
    }
    
    if (algorithm == "multiplicative") {
        if (key.empty()) {
            throw std::runtime_error("Multiplicative cipher requires a key");
        }
        int k = parseInteger(key, 1);
        return std::make_unique<Algorithms::MultiplicativeCipher>(k);
    }
    
    if (algorithm == "affine") {
        std::vector<int> keys = parseKeyMatrix(key);
        if (keys.size() < 2) {
            throw std::runtime_error("Affine cipher requires two keys (a,b)");
        }
        return std::make_unique<Algorithms::AffineCipher>(keys[0], keys[1]);
    }
    
    if (algorithm == "playfair") {
        return std::make_unique<Algorithms::PlayfairCipher>(key);
    }
    
    if (algorithm == "hill") {
        int n = param.empty() ? 2 : parseInteger(param, 2);
        std::vector<int> matrix = parseKeyMatrix(key);
        
        if (matrix.size() != static_cast<size_t>(n * n)) {
            throw std::runtime_error("Hill cipher key matrix size mismatch");
        }
        
        return std::make_unique<Algorithms::HillCipher>(matrix, n);
    }
    
    if (algorithm == "rc4") {
        if (key.empty()) {
            throw std::runtime_error("RC4 cipher requires a key");
        }
        return std::make_unique<Algorithms::RC4Cipher>(key);
    }

    if (algorithm == "railfence") {
        int rails = param.empty() ? 3 : parseInteger(param, 3);
        return std::make_unique<Algorithms::RailFenceCipher>(rails);
    }

    throw std::runtime_error("Unknown algorithm: " + algorithm);
}

} // namespace Processing
} // namespace ImageCrypto
