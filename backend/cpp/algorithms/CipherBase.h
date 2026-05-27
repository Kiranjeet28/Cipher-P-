#pragma once
#include <vector>
#include <string>

namespace ImageCrypto {
namespace Algorithms {

class CipherBase {
public:
    virtual ~CipherBase() = default;
    
    virtual std::vector<unsigned char> encrypt(const std::vector<unsigned char>& data) = 0;
    virtual std::vector<unsigned char> decrypt(const std::vector<unsigned char>& data) = 0;
    virtual bool validateKey() const = 0;
    virtual std::string getAlgorithmName() const = 0;
    virtual std::string getKeyMaterial() const { return {}; }
};

} // namespace Algorithms
} // namespace ImageCrypto
