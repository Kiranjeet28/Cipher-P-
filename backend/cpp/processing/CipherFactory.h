#pragma once
#include "../algorithms/CipherBase.h"
#include <memory>
#include <string>
#include <map>
#include <vector>

namespace ImageCrypto {
namespace Processing {

class CipherFactory {
public:
    static std::unique_ptr<Algorithms::CipherBase> createCipher(
        const std::string& algorithm,
        const std::string& key,
        const std::string& param
    );
    
private:
    static std::vector<int> parseKeyMatrix(const std::string& key);
    static int parseInteger(const std::string& str, int defaultValue = 0);
};

} // namespace Processing
} // namespace ImageCrypto
