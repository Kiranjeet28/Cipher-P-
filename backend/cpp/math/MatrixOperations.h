#pragma once
#include <vector>

namespace ImageCrypto {
namespace Math {

class MatrixOperations {
public:
    static std::vector<int> multiply(const std::vector<int>& matrix, const std::vector<unsigned char>& vec, int n, int modulus);
    static int determinant(const std::vector<int>& matrix, int n, int modulus);
    static std::vector<int> inverse(const std::vector<int>& matrix, int n, int modulus);
    static bool isInvertible(const std::vector<int>& matrix, int n, int modulus);
    
private:
    static int determinant2x2(const std::vector<int>& matrix, int modulus);
    static int determinant3x3(const std::vector<int>& matrix, int modulus);
    static std::vector<int> adjugate2x2(const std::vector<int>& matrix, int modulus);
    static std::vector<int> adjugate3x3(const std::vector<int>& matrix, int modulus);
};

} // namespace Math
} // namespace ImageCrypto
