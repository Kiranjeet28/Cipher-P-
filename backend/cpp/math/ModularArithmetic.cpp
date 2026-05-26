#include "ModularArithmetic.h"
#include <stdexcept>

namespace ImageCrypto {
namespace Math {

int ModularArithmetic::mod(int value, int modulus) {
    int result = value % modulus;
    return result < 0 ? result + modulus : result;
}

std::tuple<int, int, int> ModularArithmetic::extendedGCD(int a, int b) {
    int x0 = 1, y0 = 0;
    int x1 = 0, y1 = 1;
    
    while (b != 0) {
        int q = a / b;
        int temp = b;
        b = a - q * b;
        a = temp;
        
        temp = x1;
        x1 = x0 - q * x1;
        x0 = temp;
        
        temp = y1;
        y1 = y0 - q * y1;
        y0 = temp;
    }
    
    return std::make_tuple(a, x0, y0);
}

int ModularArithmetic::modInverse(int a, int modulus) {
    auto [g, x, y] = extendedGCD(mod(a, modulus), modulus);
    
    if (g != 1) {
        return -1;
    }
    
    return mod(x, modulus);
}

int ModularArithmetic::modPow(int base, int exp, int modulus) {
    int result = 1;
    base = mod(base, modulus);
    
    while (exp > 0) {
        if (exp % 2 == 1) {
            result = mod(result * base, modulus);
        }
        exp = exp >> 1;
        base = mod(base * base, modulus);
    }
    
    return result;
}

int ModularArithmetic::gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

bool ModularArithmetic::isCoprime(int a, int b) {
    return gcd(a, b) == 1;
}

} // namespace Math
} // namespace ImageCrypto
