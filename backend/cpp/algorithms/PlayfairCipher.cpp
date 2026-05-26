#include "PlayfairCipher.h"
#include <vector>
#include <sstream>

namespace ImageCrypto {
namespace Algorithms {

PlayfairCipher::PlayfairCipher(const std::string& key) {
    buildSquare(key);
}

void PlayfairCipher::setKey(const std::string& key) {
    buildSquare(key);
}

void PlayfairCipher::buildSquare(const std::string& key) {
    std::vector<bool> used(256, false);
    int idx = 0;
    
    std::vector<unsigned char> seed;
    if (!key.empty()) {
        bool isHex = true;
        if (key.length() % 2 == 0) {
            for (size_t i = 0; i < key.length(); i += 2) {
                try {
                    unsigned int byte;
                    std::stringstream ss;
                    ss << std::hex << key.substr(i, 2);
                    ss >> byte;
                    seed.push_back(static_cast<unsigned char>(byte));
                } catch (...) {
                    isHex = false;
                    break;
                }
            }
        }
        
        if (!isHex || seed.empty()) {
            seed.clear();
            for (char c : key) {
                seed.push_back(static_cast<unsigned char>(c));
            }
        }
    }
    
    for (unsigned char c : seed) {
        if (!used[c]) {
            square_[idx++] = c;
            used[c] = true;
        }
    }
    
    for (int v = 0; v < 256 && idx < 256; ++v) {
        if (!used[v]) {
            square_[idx++] = static_cast<unsigned char>(v);
        }
    }
    
    for (int i = 0; i < 256; ++i) {
        rowPosition_[square_[i]] = i / GRID_SIZE;
        colPosition_[square_[i]] = i % GRID_SIZE;
    }
}

bool PlayfairCipher::validateKey() const {
    return true;
}

void PlayfairCipher::processPair(unsigned char& a, unsigned char& b, bool encrypt) {
    int r1 = rowPosition_[a];
    int c1 = colPosition_[a];
    int r2 = rowPosition_[b];
    int c2 = colPosition_[b];
    
    int shift = encrypt ? 1 : (GRID_SIZE - 1);
    
    if (r1 == r2) {
        a = square_[r1 * GRID_SIZE + ((c1 + shift) % GRID_SIZE)];
        b = square_[r2 * GRID_SIZE + ((c2 + shift) % GRID_SIZE)];
    } else if (c1 == c2) {
        a = square_[((r1 + shift) % GRID_SIZE) * GRID_SIZE + c1];
        b = square_[((r2 + shift) % GRID_SIZE) * GRID_SIZE + c2];
    } else {
        a = square_[r1 * GRID_SIZE + c2];
        b = square_[r2 * GRID_SIZE + c1];
    }
}

std::vector<unsigned char> PlayfairCipher::encrypt(const std::vector<unsigned char>& data) {
    std::vector<unsigned char> result = data;
    
    if (result.size() % 2 == 1) {
        result.push_back(0);
    }
    
    for (size_t i = 0; i < result.size(); i += 2) {
        processPair(result[i], result[i + 1], true);
    }
    
    return result;
}

std::vector<unsigned char> PlayfairCipher::decrypt(const std::vector<unsigned char>& data) {
    std::vector<unsigned char> result = data;
    
    if (result.size() % 2 == 1) {
        result.push_back(0);
    }
    
    for (size_t i = 0; i < result.size(); i += 2) {
        processPair(result[i], result[i + 1], false);
    }
    
    return result;
}

} // namespace Algorithms
} // namespace ImageCrypto
