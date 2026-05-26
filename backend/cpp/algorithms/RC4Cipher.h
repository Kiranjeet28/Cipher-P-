#pragma once
#include "CipherBase.h"
#include <string>

namespace ImageCrypto {
namespace Algorithms {

class RC4Cipher : public CipherBase {
public:
    explicit RC4Cipher(const std::string& key);
    
    std::vector<unsigned char> encrypt(const std::vector<unsigned char>& data) override;
    std::vector<unsigned char> decrypt(const std::vector<unsigned char>& data) override;
    bool validateKey() const override;
    std::string getAlgorithmName() const override { return "RC4"; }
    
    void setKey(const std::string& key);

private:
    std::string key_;
    std::vector<unsigned char> generateKeyStream(size_t length) const;
    void initSBox(std::vector<unsigned char>& S) const;
};

} // namespace Algorithms
} // namespace ImageCrypto
