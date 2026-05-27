#pragma once
#include "CipherBase.h"
#include <array>

namespace ImageCrypto {
namespace Algorithms {

class PlayfairCipher : public CipherBase {
public:
    explicit PlayfairCipher(const std::string& key);
    
    std::vector<unsigned char> encrypt(const std::vector<unsigned char>& data) override;
    std::vector<unsigned char> decrypt(const std::vector<unsigned char>& data) override;
    bool validateKey() const override;
    std::string getAlgorithmName() const override { return "Playfair"; }
    std::string getKeyMaterial() const override { return key_; }
    
    void setKey(const std::string& key);
    
private:
    std::string key_;
    std::array<unsigned char, 256> square_;
    std::array<int, 256> rowPosition_;
    std::array<int, 256> colPosition_;
    
    void buildSquare(const std::string& key);
    void processPair(unsigned char& a, unsigned char& b, bool encrypt);
    
    static constexpr int GRID_SIZE = 16;
};

} // namespace Algorithms
} // namespace ImageCrypto
