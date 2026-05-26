#include "RailFenceCipher.h"
#include <stdexcept>

namespace ImageCrypto {
namespace Algorithms {

RailFenceCipher::RailFenceCipher(int rails) : rails_(rails) {}

void RailFenceCipher::setRails(int rails) {
    rails_ = rails;
}

bool RailFenceCipher::validateKey() const {
    return rails_ >= 2 && rails_ <= 100;
}

std::vector<unsigned char> RailFenceCipher::encryptRailFence(const std::vector<unsigned char>& data) {
    if (rails_ == 1) return data;
    
    std::vector<std::vector<unsigned char>> fence(rails_);
    int rail = 0;
    bool down = true;
    
    for (unsigned char c : data) {
        fence[rail].push_back(c);
        if (rail == rails_ - 1) down = false;
        else if (rail == 0) down = true;
        rail += down ? 1 : -1;
    }
    
    std::vector<unsigned char> result;
    result.reserve(data.size());
    for (auto& row : fence) {
        for (unsigned char c : row) {
            result.push_back(c);
        }
    }
    
    return result;
}

std::vector<unsigned char> RailFenceCipher::decryptRailFence(const std::vector<unsigned char>& data) {
    if (rails_ == 1) return data;
    
    size_t n = data.size();
    std::vector<int> railIndices(n);
    int rail = 0;
    bool down = true;
    
    for (size_t i = 0; i < n; ++i) {
        railIndices[i] = rail;
        if (rail == rails_ - 1) down = false;
        else if (rail == 0) down = true;
        rail += down ? 1 : -1;
    }
    
    std::vector<int> railCounts(rails_, 0);
    for (int r : railIndices) railCounts[r]++;
    
    std::vector<int> railOffsets(rails_, 0);
    for (int r = 1; r < rails_; ++r) {
        railOffsets[r] = railOffsets[r-1] + railCounts[r-1];
    }
    
    std::vector<unsigned char> result(n);
    std::vector<int> railPos = railOffsets;
    
    for (size_t i = 0; i < n; ++i) {
        result[i] = data[railPos[railIndices[i]]++];
    }
    
    return result;
}

std::vector<unsigned char> RailFenceCipher::encrypt(const std::vector<unsigned char>& data) {
    if (!validateKey()) {
        throw std::runtime_error("Invalid rail fence key: rails must be between 2 and 100");
    }
    return encryptRailFence(data);
}

std::vector<unsigned char> RailFenceCipher::decrypt(const std::vector<unsigned char>& data) {
    if (!validateKey()) {
        throw std::runtime_error("Invalid rail fence key: rails must be between 2 and 100");
    }
    return decryptRailFence(data);
}

} // namespace Algorithms
} // namespace ImageCrypto
