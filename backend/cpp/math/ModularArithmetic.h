#pragma once
#include <tuple>

namespace ImageCrypto {
namespace Math {

class ModularArithmetic {
public:
    static int modInverse(int a, int modulus);
    static int modPow(int base, int exp, int modulus);
    static std::tuple<int, int, int> extendedGCD(int a, int b);
    static bool isCoprime(int a, int b);
    static int mod(int value, int modulus);
    
private:
    static int gcd(int a, int b);
};

} // namespace Math
} // namespace ImageCrypto
