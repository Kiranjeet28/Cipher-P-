#pragma once
#include "CipherBase.h"

namespace ImageCrypto {
namespace Algorithms {

class AffineCipher : public CipherBase {
public:
    AffineCipher(int a, int b);
    
    std::vector<unsigned char> encrypt(const std::vector<unsigned char>& data) override;
    std::vector<unsigned char> decrypt(const std::vector<unsigned char>& data) override;
    bool validateKey() const override;
    std::string getAlgorithmName() const override { return "Affine"; }
    
    void setKeys(int a, int b);
    
private:
    int a_;
    int b_;
    int aInverse_;
    static constexpr int MODULUS = 256;
    
    void computeInverse();
};

} // namespace Algorithms
} // namespace ImageCrypto
