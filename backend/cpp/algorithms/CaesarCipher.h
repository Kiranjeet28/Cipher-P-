#pragma once
#include "CipherBase.h"

namespace ImageCrypto {
namespace Algorithms {

class CaesarCipher : public CipherBase {
public:
    explicit CaesarCipher(int shift = 3);
    
    std::vector<unsigned char> encrypt(const std::vector<unsigned char>& data) override;
    std::vector<unsigned char> decrypt(const std::vector<unsigned char>& data) override;
    bool validateKey() const override;
    std::string getAlgorithmName() const override { return "Caesar"; }
    
    void setShift(int shift);
    int getShift() const { return shift_; }
    
private:
    int shift_;
    static constexpr int MODULUS = 256;
};

} // namespace Algorithms
} // namespace ImageCrypto
