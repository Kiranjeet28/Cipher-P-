#include <thread>
#include <mutex>
#include <condition_variable>
#include "third_party/httplib.h"

#define STB_IMAGE_IMPLEMENTATION
#include "third_party/stb_image.h"

#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "third_party/stb_image_write.h"

#include "core/ImageLoader.h"
#include "core/ImageReconstructor.h"
#include "processing/CipherFactory.h"
#include "processing/EncryptionPipeline.h"
#include "processing/DecryptionPipeline.h"

#include <iostream>
#include <string>

using namespace httplib;
using namespace ImageCrypto;

void setCORSHeaders(Response& res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

void handleEncryptDecrypt(const Request& req, Response& res, bool isEncrypt) {
    setCORSHeaders(res);
    
    try {
        if (!req.form.has_file("image")) {
            res.status = 400;
            res.set_content("Missing image file", "text/plain");
            return;
        }
        
        auto imageFile = req.form.get_file("image");
        std::string algorithm = req.has_param("algorithm") ? req.get_param_value("algorithm") : "caesar";
        std::string key = req.has_param("key") ? req.get_param_value("key") : "";
        std::string param = req.has_param("param") ? req.get_param_value("param") : "";
        
        Core::ImageData inputImage = Core::ImageLoader::loadFromMemory(imageFile.content);
        
        if (!Core::ImageLoader::validateImage(inputImage)) {
            res.status = 400;
            res.set_content("Invalid image data", "text/plain");
            return;
        }
        
        auto cipher = Processing::CipherFactory::createCipher(algorithm, key, param);
        
        if (!cipher->validateKey()) {
            res.status = 400;
            res.set_content("Invalid cipher key for algorithm: " + algorithm, "text/plain");
            return;
        }
        
        std::vector<unsigned char> outputBytes;
        
        if (isEncrypt) {
            Processing::EncryptionPipeline pipeline(std::move(cipher));
            outputBytes = pipeline.encryptImageToBytes(inputImage);
        } else {
            Processing::DecryptionPipeline pipeline(std::move(cipher));
            outputBytes = pipeline.decryptImageToBytes(inputImage);
        }
        
        res.set_content_provider(
            outputBytes.size(),
            "image/png",
            [outputBytes](size_t offset, size_t length, DataSink& sink) {
                sink.write(reinterpret_cast<const char*>(outputBytes.data()) + offset, length);
                return true;
            }
        );
        
    } catch (const std::exception& e) {
        res.status = 500;
        res.set_content(std::string("Error: ") + e.what(), "text/plain");
    }
}

int main() {
    Server server;
    
    server.set_exception_handler([](const Request&, Response& res, std::exception_ptr ep) {
        res.status = 500;
        try {
            std::rethrow_exception(ep);
        } catch (const std::exception& e) {
            res.set_content(std::string("Internal error: ") + e.what(), "text/plain");
        } catch (...) {
            res.set_content("Unknown error", "text/plain");
        }
    });
    
    server.Options(R"(/api/.*)", [](const Request&, Response& res) {
        setCORSHeaders(res);
        res.status = 200;
    });
    
    server.Post("/api/encrypt", [](const Request& req, Response& res) {
        handleEncryptDecrypt(req, res, true);
    });
    
    server.Post("/api/decrypt", [](const Request& req, Response& res) {
        handleEncryptDecrypt(req, res, false);
    });
    
    server.Get("/api/health", [](const Request&, Response& res) {
        setCORSHeaders(res);
        res.set_content("{\"status\":\"ok\",\"algorithms\":[\"caesar\",\"multiplicative\",\"affine\",\"playfair\",\"hill\"]}", "application/json");
    });

    std::cout << "Image Encryption Server Starting" << std::endl;
    std::cout << "Listening on http://0.0.0.0:5000" << std::endl;
    std::cout << "Supported algorithms: caesar, multiplicative, affine, playfair, hill" << std::endl;
    
    server.listen("0.0.0.0", 5000);
    
    return 0;
}
