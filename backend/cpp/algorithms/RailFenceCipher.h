#pragma once
#include "CipherBase.h"

namespace ImageCrypto {
namespace Algorithms {

class RailFenceCipher : public CipherBase {
public:
    explicit RailFenceCipher(int rails = 3);
    
    std::vector<unsigned char> encrypt(const std::vector<unsigned char>& data) override;
    std::vector<unsigned char> decrypt(const std::vector<unsigned char>& data) override;
    bool validateKey() const override;
    std::string getAlgorithmName() const override { return "RailFence"; }
    std::string getKeyMaterial() const override { return std::to_string(rails_); }
    
    void setRails(int rails);

private:
    int rails_;
    std::vector<unsigned char> encryptRailFence(const std::vector<unsigned char>& data);
    std::vector<unsigned char> decryptRailFence(const std::vector<unsigned char>& data);
};

} // namespace Algorithms
} // namespace ImageCrypto
