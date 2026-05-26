#include "MatrixOperations.h"
#include "ModularArithmetic.h"
#include <stdexcept>

namespace ImageCrypto {
namespace Math {

std::vector<int> MatrixOperations::multiply(const std::vector<int>& matrix, const std::vector<unsigned char>& vec, int n, int modulus) {
    std::vector<int> result(n, 0);
    
    for (int row = 0; row < n; ++row) {
        int sum = 0;
        for (int col = 0; col < n; ++col) {
            sum += matrix[row * n + col] * vec[col];
        }
        result[row] = ModularArithmetic::mod(sum, modulus);
    }
    
    return result;
}

int MatrixOperations::determinant2x2(const std::vector<int>& matrix, int modulus) {
    int det = matrix[0] * matrix[3] - matrix[1] * matrix[2];
    return ModularArithmetic::mod(det, modulus);
}

int MatrixOperations::determinant3x3(const std::vector<int>& matrix, int modulus) {
    int det = matrix[0] * (matrix[4] * matrix[8] - matrix[5] * matrix[7])
            - matrix[1] * (matrix[3] * matrix[8] - matrix[5] * matrix[6])
            + matrix[2] * (matrix[3] * matrix[7] - matrix[4] * matrix[6]);
    return ModularArithmetic::mod(det, modulus);
}

int MatrixOperations::determinant(const std::vector<int>& matrix, int n, int modulus) {
    if (n == 2) {
        return determinant2x2(matrix, modulus);
    } else if (n == 3) {
        return determinant3x3(matrix, modulus);
    }
    throw std::runtime_error("Determinant only supported for 2x2 and 3x3 matrices");
}

std::vector<int> MatrixOperations::adjugate2x2(const std::vector<int>& matrix, int modulus) {
    std::vector<int> adj(4);
    adj[0] = ModularArithmetic::mod(matrix[3], modulus);
    adj[1] = ModularArithmetic::mod(-matrix[1], modulus);
    adj[2] = ModularArithmetic::mod(-matrix[2], modulus);
    adj[3] = ModularArithmetic::mod(matrix[0], modulus);
    return adj;
}

std::vector<int> MatrixOperations::adjugate3x3(const std::vector<int>& matrix, int modulus) {
    std::vector<int> adj(9);
    
    adj[0] = ModularArithmetic::mod(matrix[4] * matrix[8] - matrix[5] * matrix[7], modulus);
    adj[1] = ModularArithmetic::mod(-(matrix[1] * matrix[8] - matrix[2] * matrix[7]), modulus);
    adj[2] = ModularArithmetic::mod(matrix[1] * matrix[5] - matrix[2] * matrix[4], modulus);
    
    adj[3] = ModularArithmetic::mod(-(matrix[3] * matrix[8] - matrix[5] * matrix[6]), modulus);
    adj[4] = ModularArithmetic::mod(matrix[0] * matrix[8] - matrix[2] * matrix[6], modulus);
    adj[5] = ModularArithmetic::mod(-(matrix[0] * matrix[5] - matrix[2] * matrix[3]), modulus);
    
    adj[6] = ModularArithmetic::mod(matrix[3] * matrix[7] - matrix[4] * matrix[6], modulus);
    adj[7] = ModularArithmetic::mod(-(matrix[0] * matrix[7] - matrix[1] * matrix[6]), modulus);
    adj[8] = ModularArithmetic::mod(matrix[0] * matrix[4] - matrix[1] * matrix[3], modulus);
    
    return adj;
}

bool MatrixOperations::isInvertible(const std::vector<int>& matrix, int n, int modulus) {
    int det = determinant(matrix, n, modulus);
    return ModularArithmetic::modInverse(det, modulus) != -1;
}

std::vector<int> MatrixOperations::inverse(const std::vector<int>& matrix, int n, int modulus) {
    int det = determinant(matrix, n, modulus);
    int detInv = ModularArithmetic::modInverse(det, modulus);
    
    if (detInv == -1) {
        throw std::runtime_error("Matrix is not invertible modulo " + std::to_string(modulus));
    }
    
    std::vector<int> adj;
    if (n == 2) {
        adj = adjugate2x2(matrix, modulus);
    } else if (n == 3) {
        adj = adjugate3x3(matrix, modulus);
    } else {
        throw std::runtime_error("Matrix inversion only supported for 2x2 and 3x3");
    }
    
    std::vector<int> inv(n * n);
    for (int i = 0; i < n * n; ++i) {
        inv[i] = ModularArithmetic::mod(detInv * adj[i], modulus);
    }
    
    return inv;
}

} // namespace Math
} // namespace ImageCrypto
