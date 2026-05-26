#include "HillCipher.h"
#include "../math/MatrixOperations.h"
#include "../math/ModularArithmetic.h"
#include <stdexcept>

namespace ImageCrypto {
namespace Algorithms {

HillCipher::HillCipher(const std::vector<int>& keyMatrix, int matrixSize)
    : keyMatrix_(keyMatrix), matrixSize_(matrixSize) {
    if (keyMatrix_.size() != static_cast<size_t>(matrixSize_ * matrixSize_)) {
        throw std::runtime_error("Key matrix size mismatch");
    }
    computeInverse();
}

void HillCipher::setKey(const std::vector<int>& keyMatrix, int matrixSize) {
    keyMatrix_ = keyMatrix;
    matrixSize_ = matrixSize;
    if (keyMatrix_.size() != static_cast<size_t>(matrixSize_ * matrixSize_)) {
        throw std::runtime_error("Key matrix size mismatch");
    }
    computeInverse();
}

void HillCipher::computeInverse() {
    try {
        inverseMatrix_ = Math::MatrixOperations::inverse(keyMatrix_, matrixSize_, MODULUS);
    } catch (const std::exception&) {
        inverseMatrix_.clear();
    }
}

bool HillCipher::validateKey() const {
    return !inverseMatrix_.empty() && 
           Math::MatrixOperations::isInvertible(keyMatrix_, matrixSize_, MODULUS);
}

std::vector<unsigned char> HillCipher::processBlocks(const std::vector<unsigned char>& data, 
                                                     const std::vector<int>& matrix) {
    std::vector<unsigned char> result = data;
    
    while (result.size() % matrixSize_ != 0) {
        result.push_back(0);
    }
    
    for (size_t i = 0; i < result.size(); i += matrixSize_) {
        std::vector<unsigned char> block(result.begin() + i, result.begin() + i + matrixSize_);
        std::vector<int> transformed = Math::MatrixOperations::multiply(matrix, block, matrixSize_, MODULUS);
        
        for (int j = 0; j < matrixSize_; ++j) {
            result[i + j] = static_cast<unsigned char>(transformed[j]);
        }
    }
    
    return result;
}

std::vector<unsigned char> HillCipher::encrypt(const std::vector<unsigned char>& data) {
    if (!validateKey()) {
        throw std::runtime_error("Invalid Hill cipher key: matrix not invertible");
    }
    
    return processBlocks(data, keyMatrix_);
}

std::vector<unsigned char> HillCipher::decrypt(const std::vector<unsigned char>& data) {
    if (!validateKey()) {
        throw std::runtime_error("Invalid Hill cipher key: cannot compute inverse");
    }
    
    return processBlocks(data, inverseMatrix_);
}

} // namespace Algorithms
} // namespace ImageCrypto
