# Image Encryption Backend

A professional, modular C++17 image encryption engine supporting multiple classical cipher algorithms.

## Architecture

```
backend/cpp/
├── core/                   # Core image processing modules
│   ├── ImageLoader         # Image loading and decoding
│   ├── PixelProcessor      # RGB extraction and reconstruction
│   └── ImageReconstructor  # Image encoding (PNG/JPG)
│
├── algorithms/             # Cipher implementations
│   ├── CipherBase          # Abstract base class
│   ├── CaesarCipher        # Shift cipher
│   ├── MultiplicativeCipher # Multiplicative cipher
│   ├── AffineCipher        # Affine cipher (ax + b)
│   ├── PlayfairCipher      # 16x16 Playfair grid
│   └── HillCipher          # Matrix-based Hill cipher
│
├── math/                   # Mathematical operations
│   ├── ModularArithmetic   # Extended GCD, modular inverse
│   └── MatrixOperations    # Matrix multiplication, determinant, inverse
│
├── processing/             # Processing pipeline
│   ├── CipherFactory       # Cipher instantiation
│   ├── EncryptionPipeline  # Encryption workflow
│   └── DecryptionPipeline  # Decryption workflow
│
├── third_party/            # External headers
│   ├── httplib.h           # HTTP server
│   ├── stb_image.h         # Image loading
│   └── stb_image_write.h   # Image encoding
│
└── main.cpp                # HTTP server entry point
```

## Encryption Pipeline

```
Input Image
    ↓
Image Loader (decode PNG/JPG)
    ↓
Pixel Processor (extract RGB stream)
    ↓
Cipher Algorithm (encrypt bytes)
    ↓
Pixel Reconstructor (rebuild image)
    ↓
Image Encoder (encode PNG)
    ↓
Output Encrypted Image
```

## Supported Algorithms

### 1. Caesar Cipher
- **Type:** Additive cipher
- **Key:** Shift value (integer)
- **Operation:** `E(x) = (x + k) mod 256`

### 2. Multiplicative Cipher
- **Type:** Multiplicative cipher
- **Key:** Multiplier `a` (must be coprime with 256)
- **Operation:** `E(x) = (a * x) mod 256`

### 3. Affine Cipher
- **Type:** Combined additive and multiplicative
- **Key:** Two integers `(a, b)`
- **Operation:** `E(x) = (a * x + b) mod 256`

### 4. Playfair Cipher
- **Type:** Digraph substitution
- **Key:** String (generates 16×16 substitution grid)
- **Operation:** Processes byte pairs using positional rules

### 5. Hill Cipher
- **Type:** Matrix-based polyalphabetic
- **Key:** n×n invertible matrix (n=2 or 3)
- **Operation:** Block matrix multiplication mod 256

## API Endpoints

### POST /api/encrypt
Encrypt an image using the specified algorithm.

**Parameters:**
- `image` (file): Input image (PNG/JPG)
- `algorithm` (string): Algorithm name
- `key` (string): Encryption key
- `param` (string, optional): Additional parameters

**Response:** PNG image (encrypted)

### POST /api/decrypt
Decrypt an image using the specified algorithm.

**Parameters:**
- `image` (file): Encrypted image
- `algorithm` (string): Algorithm name
- `key` (string): Decryption key
- `param` (string, optional): Additional parameters

**Response:** PNG image (decrypted)

## Key Formats

### Caesar
```
key = "3"  // shift by 3
```

### Multiplicative
```
key = "5"  // multiply by 5 (must be coprime with 256)
```

### Affine
```
key = "5,8"  // a=5, b=8
```

### Playfair
```
key = "secretkey"  // any string or hex
key = "ABCD1234"   // hex format (pairs)
```

### Hill
```
key = "3,2,5,7"  // 2×2 matrix [3,2; 5,7]
param = "2"      // matrix size (n=2)

key = "6,24,1,13,16,10,20,17,15"  // 3×3 matrix
param = "3"                        // matrix size (n=3)
```

## Build Instructions

### Using CMake

```bash
cd backend/cpp
mkdir build
cd build
cmake ..
cmake --build .
./ImageCrypto
```

### Using MinGW (Windows)

```bash
cd backend/cpp
g++ -std=c++17 -O2 -I. -Ithird_party \
    main.cpp \
    core/*.cpp \
    math/*.cpp \
    algorithms/*.cpp \
    processing/*.cpp \
    -o ImageCrypto.exe
```

## Dependencies

All dependencies are header-only:
- **cpp-httplib** (included): HTTP server
- **stb_image** (included): Image loading
- **stb_image_write** (included): Image encoding

## Technical Details

### Modular Arithmetic
- Extended Euclidean algorithm for modular inverse
- Modular exponentiation for power operations
- Coprimality testing for key validation

### Matrix Operations
- Determinant calculation (2×2, 3×3)
- Adjugate matrix computation
- Modular matrix inversion
- Matrix-vector multiplication mod 256

### Image Processing
- RGBA format (4 channels)
- RGB processing (alpha preserved)
- Byte stream extraction and reconstruction
- PNG encoding with compression

### Security Considerations
- Key validation before encryption/decryption
- Matrix invertibility checking
- Error handling for invalid keys
- Image dimension validation

## Error Handling

The backend provides detailed error messages:
- Invalid image format
- Missing encryption key
- Key not coprime with modulus
- Matrix not invertible
- Algorithm not supported

## Performance

- **Zero-copy** image processing where possible
- **Streaming** PNG encoding
- **Efficient** modular arithmetic
- **Block processing** for Hill cipher

## Example Usage

### Caesar Encryption
```bash
curl -X POST http://localhost:5000/api/encrypt \
  -F "image=@input.png" \
  -F "algorithm=caesar" \
  -F "key=3" \
  -o encrypted.png
```

### Hill Cipher Encryption
```bash
curl -X POST http://localhost:5000/api/encrypt \
  -F "image=@input.png" \
  -F "algorithm=hill" \
  -F "key=3,2,5,7" \
  -F "param=2" \
  -o encrypted.png
```

### Decryption
```bash
curl -X POST http://localhost:5000/api/decrypt \
  -F "image=@encrypted.png" \
  -F "algorithm=hill" \
  -F "key=3,2,5,7" \
  -F "param=2" \
  -o decrypted.png
```

## License

Educational project for cryptography and image processing demonstration.
