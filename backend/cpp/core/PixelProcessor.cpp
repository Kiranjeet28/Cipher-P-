#include "PixelProcessor.h"
#include <algorithm>
#include <cstdint>
#include <numeric>

namespace {

uint64_t fnv1a64(const std::string& text) {
    uint64_t hash = 1469598103934665603ULL;
    for (unsigned char c : text) {
        hash ^= static_cast<uint64_t>(c);
        hash *= 1099511628211ULL;
    }
    return hash;
}

class XorShift64Star {
public:
    explicit XorShift64Star(uint64_t seed)
        : state_(seed == 0 ? 0x9e3779b97f4a7c15ULL : seed) {}

    uint64_t next() {
        state_ ^= state_ >> 12;
        state_ ^= state_ << 25;
        state_ ^= state_ >> 27;
        return state_ * 2685821657736338717ULL;
    }

    size_t nextIndex(size_t upperBound) {
        return upperBound == 0 ? 0 : static_cast<size_t>(next() % upperBound);
    }

    unsigned char nextByte() {
        return static_cast<unsigned char>(next() & 0xFFU);
    }

private:
    uint64_t state_;
};

uint64_t mixSeed(const std::string& seedMaterial, size_t length, const char* phase) {
    uint64_t hash = fnv1a64(seedMaterial);
    hash ^= fnv1a64(std::string(phase));
    hash ^= static_cast<uint64_t>(length) + 0x9e3779b97f4a7c15ULL + (hash << 6) + (hash >> 2);
    return hash;
}

std::vector<size_t> buildPermutation(size_t itemCount, uint64_t seed) {
    std::vector<size_t> order(itemCount);
    std::iota(order.begin(), order.end(), 0);

    XorShift64Star rng(seed);
    for (size_t i = itemCount; i > 1; --i) {
        size_t j = rng.nextIndex(i);
        std::swap(order[i - 1], order[j]);
    }

    return order;
}

} // namespace

namespace ImageCrypto {
namespace Core {

std::vector<unsigned char> PixelProcessor::extractRGBStream(const ImageData& img) {
    size_t pixelCount = img.width * img.height;
    std::vector<unsigned char> stream;
    stream.reserve(pixelCount * 3);
    
    for (size_t i = 0; i < pixelCount; ++i) {
        size_t base = i * img.channels;
        stream.push_back(img.pixels[base + 0]); // R
        stream.push_back(img.pixels[base + 1]); // G
        stream.push_back(img.pixels[base + 2]); // B
    }
    
    return stream;
}

void PixelProcessor::reconstructRGBStream(ImageData& img, const std::vector<unsigned char>& stream) {
    size_t pixelCount = img.width * img.height;
    size_t streamIdx = 0;
    
    for (size_t i = 0; i < pixelCount && streamIdx + 2 < stream.size(); ++i) {
        size_t base = i * img.channels;
        img.pixels[base + 0] = stream[streamIdx++]; // R
        img.pixels[base + 1] = stream[streamIdx++]; // G
        img.pixels[base + 2] = stream[streamIdx++]; // B
    }
}

std::vector<unsigned char> PixelProcessor::permuteRGBStream(const std::vector<unsigned char>& stream, const std::string& seedMaterial) {
    if (stream.empty()) {
        return {};
    }

    size_t pixelCount = stream.size() / 3;
    size_t tailBytes = stream.size() % 3;
    std::vector<unsigned char> result(stream.size());

    if (pixelCount == 0) {
        return stream;
    }

    std::vector<size_t> order = buildPermutation(pixelCount, mixSeed(seedMaterial, stream.size(), "permute"));

    for (size_t i = 0; i < pixelCount; ++i) {
        size_t sourcePixel = order[i];
        size_t sourceBase = sourcePixel * 3;
        size_t targetBase = i * 3;
        result[targetBase + 0] = stream[sourceBase + 0];
        result[targetBase + 1] = stream[sourceBase + 1];
        result[targetBase + 2] = stream[sourceBase + 2];
    }

    if (tailBytes > 0) {
        size_t tailStart = pixelCount * 3;
        for (size_t i = 0; i < tailBytes; ++i) {
            result[tailStart + i] = stream[tailStart + i];
        }
    }

    return result;
}

std::vector<unsigned char> PixelProcessor::unpermuteRGBStream(const std::vector<unsigned char>& stream, const std::string& seedMaterial) {
    if (stream.empty()) {
        return {};
    }

    size_t pixelCount = stream.size() / 3;
    size_t tailBytes = stream.size() % 3;
    std::vector<unsigned char> result(stream.size());

    if (pixelCount == 0) {
        return stream;
    }

    std::vector<size_t> order = buildPermutation(pixelCount, mixSeed(seedMaterial, stream.size(), "permute"));

    for (size_t targetPixel = 0; targetPixel < pixelCount; ++targetPixel) {
        size_t sourcePixel = order[targetPixel];
        size_t sourceBase = targetPixel * 3;
        size_t targetBase = sourcePixel * 3;
        result[targetBase + 0] = stream[sourceBase + 0];
        result[targetBase + 1] = stream[sourceBase + 1];
        result[targetBase + 2] = stream[sourceBase + 2];
    }

    if (tailBytes > 0) {
        size_t tailStart = pixelCount * 3;
        for (size_t i = 0; i < tailBytes; ++i) {
            result[tailStart + i] = stream[tailStart + i];
        }
    }

    return result;
}

std::vector<unsigned char> PixelProcessor::xorDiffuse(const std::vector<unsigned char>& stream, const std::string& seedMaterial) {
    std::vector<unsigned char> result(stream.size());
    XorShift64Star rng(mixSeed(seedMaterial, stream.size(), "diffuse"));

    for (size_t i = 0; i < stream.size(); ++i) {
        result[i] = static_cast<unsigned char>(stream[i] ^ rng.nextByte());
    }

    return result;
}

void PixelProcessor::separateChannels(const ImageData& img,
                                     std::vector<unsigned char>& r,
                                     std::vector<unsigned char>& g,
                                     std::vector<unsigned char>& b) {
    size_t pixelCount = img.width * img.height;
    r.resize(pixelCount);
    g.resize(pixelCount);
    b.resize(pixelCount);
    
    for (size_t i = 0; i < pixelCount; ++i) {
        size_t base = i * img.channels;
        r[i] = img.pixels[base + 0];
        g[i] = img.pixels[base + 1];
        b[i] = img.pixels[base + 2];
    }
}

void PixelProcessor::mergeChannels(ImageData& img,
                                  const std::vector<unsigned char>& r,
                                  const std::vector<unsigned char>& g,
                                  const std::vector<unsigned char>& b) {
    size_t pixelCount = img.width * img.height;
    
    for (size_t i = 0; i < pixelCount; ++i) {
        size_t base = i * img.channels;
        img.pixels[base + 0] = r[i];
        img.pixels[base + 1] = g[i];
        img.pixels[base + 2] = b[i];
    }
}

} // namespace Core
} // namespace ImageCrypto
