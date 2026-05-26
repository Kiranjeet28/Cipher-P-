#include "CaesarCipher.h"
#include "../math/ModularArithmetic.h"

namespace ImageCrypto {
namespace Algorithms {

CaesarCipher::CaesarCipher(int shift) : shift_(shift) {}

void CaesarCipher::setShift(int shift) {
    shift_ = shift;
}

bool CaesarCipher::validateKey() const {
    return true;
}

std::vector<unsigned char> CaesarCipher::encrypt(const std::vector<unsigned char>& data) {
    std::vector<unsigned char> result(data.size());
    
    for (size_t i = 0; i < data.size(); ++i) {
        result[i] = static_cast<unsigned char>((data[i] + shift_) & 0xFF);
    }
    
    return result;
}

std::vector<unsigned char> CaesarCipher::decrypt(const std::vector<unsigned char>& data) {
    std::vector<unsigned char> result(data.size());
    
    for (size_t i = 0; i < data.size(); ++i) {
        result[i] = static_cast<unsigned char>((data[i] - shift_) & 0xFF);
    }
    
    return result;
}

} // namespace Algorithms
} // namespace ImageCrypto
