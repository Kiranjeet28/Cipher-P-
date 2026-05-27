#pragma once
#include "CipherBase.h"
#include <vector>

namespace ImageCrypto {
namespace Algorithms {

class HillCipher : public CipherBase {
public:
    HillCipher(const std::vector<int>& keyMatrix, int matrixSize);
    
    std::vector<unsigned char> encrypt(const std::vector<unsigned char>& data) override;
    std::vector<unsigned char> decrypt(const std::vector<unsigned char>& data) override;
    bool validateKey() const override;
    std::string getAlgorithmName() const override { return "Hill"; }
    std::string getKeyMaterial() const override;
    
    void setKey(const std::vector<int>& keyMatrix, int matrixSize);
    
private:
    std::vector<int> keyMatrix_;
    std::vector<int> inverseMatrix_;
    int matrixSize_;
    static constexpr int MODULUS = 256;
    
    void computeInverse();
    std::vector<unsigned char> processBlocks(const std::vector<unsigned char>& data, const std::vector<int>& matrix);
};

} // namespace Algorithms
} // namespace ImageCrypto
