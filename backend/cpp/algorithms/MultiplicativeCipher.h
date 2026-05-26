#pragma once
#include "CipherBase.h"

namespace ImageCrypto {
namespace Algorithms {

class MultiplicativeCipher : public CipherBase {
public:
    explicit MultiplicativeCipher(int key);
    
    std::vector<unsigned char> encrypt(const std::vector<unsigned char>& data) override;
    std::vector<unsigned char> decrypt(const std::vector<unsigned char>& data) override;
    bool validateKey() const override;
    std::string getAlgorithmName() const override { return "Multiplicative"; }
    
    void setKey(int key);
    int getKey() const { return key_; }
    
private:
    int key_;
    int keyInverse_;
    static constexpr int MODULUS = 256;
    
    void computeInverse();
};

} // namespace Algorithms
} // namespace ImageCrypto
