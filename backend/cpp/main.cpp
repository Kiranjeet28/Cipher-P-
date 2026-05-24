#include <string>
#include <vector>
#include <iostream>
#include <sstream>

// Requires: httplib.h (cpp-httplib) and stb_image.h / stb_image_write.h in include path
#include "httplib.h"
#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

using namespace httplib;

static void append_to_vector(void* context, void* data, int size) {
    auto *out = reinterpret_cast<std::vector<unsigned char>*>(context);
    unsigned char *b = reinterpret_cast<unsigned char*>(data);
    out->insert(out->end(), b, b + size);
}

std::vector<unsigned char> read_png_from_memory(const std::string &in_data, const std::string &algorithm, const std::string &key, const std::string &param, const std::string &mode) {
    int w, h, channels;
    unsigned char *img = stbi_load_from_memory(reinterpret_cast<const unsigned char*>(in_data.data()), static_cast<int>(in_data.size()), &w, &h, &channels, STBI_rgb_alpha);
    if (!img) throw std::runtime_error("failed to decode image");

    const int out_channels = 4;
    size_t pixels = static_cast<size_t>(w) * static_cast<size_t>(h);
    std::vector<unsigned char> buffer(pixels * out_channels);
    // copy input to buffer (stbi returns RGBA when STBI_rgb_alpha used)
    std::memcpy(buffer.data(), img, pixels * out_channels);

    // helper lambdas / functions
    auto mod256 = [](int x)->unsigned char { return static_cast<unsigned char>(x & 0xFF); };

    auto egcd = [](int a, int b){
        // returns tuple (g, x, y) such that ax+by=g
        int x0=1,y0=0,x1=0,y1=1;
        while(b){
            int q=a/b; int t=b; b=a-q*b; a=t;
            t=x1; x1=x0-q*x1; x0=t;
            t=y1; y1=y0-q*y1; y0=t;
        }
        return std::tuple<int,int,int>(a,x0,y0);
    };

    auto modinv = [&](int a, int m)->int {
        auto [g,x,y] = egcd((a%m+m)%m, m);
        if (g!=1) return 0; // no inverse
        int inv = (x % m + m) % m;
        return inv;
    };

    // process only RGB channels
    if (algorithm == "caesar") {
        int shift = 3;
        if (!key.empty()) {
            try { shift = std::stoi(key); } catch(...) { shift = 3; }
        }
        if (mode == "decrypt") shift = (-shift) & 0xFF;
        for (size_t i = 0; i < pixels; ++i) {
            size_t base = i * out_channels;
            buffer[base + 0] = static_cast<unsigned char>((buffer[base + 0] + shift) & 0xFF);
            buffer[base + 1] = static_cast<unsigned char>((buffer[base + 1] + shift) & 0xFF);
            buffer[base + 2] = static_cast<unsigned char>((buffer[base + 2] + shift) & 0xFF);
        }
    } else if (algorithm == "rc4") {
        stbi_image_free(img);
        throw std::runtime_error("algorithm not implemented");
    } else if (algorithm == "railfence") {
        stbi_image_free(img);
        throw std::runtime_error("algorithm not implemented");
            // try hex
            bool hex_ok = (key.size()%2==0);
            if(hex_ok){
                try{ for(size_t i=0;i<key.size(); i+=2){ unsigned int byte=0; std::stringstream ss; ss<<std::hex<<key.substr(i,2); ss>>byte; seed.push_back((unsigned char)byte); } }
                catch(...){ seed.assign(key.begin(), key.end()); }
            } else seed.assign(key.begin(), key.end());
        }
        size_t idx=0;
        for(unsigned char c: seed) if(!used[c]){ square[idx++]=c; used[c]=true; }
        for(int v=0; v<256 && idx<256; ++v) if(!used[v]){ square[idx++]=(unsigned char)v; }
        // map value->pos
        std::vector<int> posr(256), posc(256);
        for(int i=0;i<256;i++){ posr[square[i]]=i/16; posc[square[i]]=i%16; }

        // build byte stream of RGB only
        std::vector<unsigned char> stream; stream.reserve(pixels*3);
        for(size_t i=0;i<pixels;++i){ size_t b=i*out_channels; stream.push_back(buffer[b+0]); stream.push_back(buffer[b+1]); stream.push_back(buffer[b+2]); }
        // Ensure even length by padding with 0x00
        if(stream.size()%2==1) stream.push_back(0);
        for(size_t i=0;i<stream.size(); i+=2){ unsigned char a=stream[i], b=stream[i+1]; int r1=posr[a], c1=posc[a]; int r2=posr[b], c2=posc[b]; unsigned char o1,o2;
            if(r1==r2){ o1 = square[r1*16 + ((c1+ (mode=="encrypt"?1:15))%16)]; o2 = square[r2*16 + ((c2+ (mode=="encrypt"?1:15))%16)]; }
            else if(c1==c2){ o1 = square[(( (r1+ (mode=="encrypt"?1:15))%16)*16) + c1]; o2 = square[(( (r2+ (mode=="encrypt"?1:15))%16)*16) + c2]; }
            else { o1 = square[r1*16 + c2]; o2 = square[r2*16 + c1]; }
            stream[i]=o1; stream[i+1]=o2;
        }
        // write back to buffer (RGB)
        size_t si=0;
        for(size_t i=0;i<pixels;++i){ size_t b=i*out_channels; buffer[b+0]=stream[si++]; buffer[b+1]=stream[si++]; buffer[b+2]=stream[si++]; if(si>stream.size()) break; }
    } else if (algorithm == "hill") {
        // Hill cipher with n x n matrix; key provided as comma-separated values length n*n; param may contain n
        int n = 2;
        if(!param.empty()) n = std::stoi(param);
        if(n<2 || n>4) throw std::runtime_error("Hill supports n=2..4");
        // parse key
        std::vector<int> K;
        if(key.empty()) throw std::runtime_error("hill requires key with n*n integers");
        {
            std::stringstream ss(key); std::string tok;
            while(std::getline(ss, tok, ',')) if(!tok.empty()) K.push_back(std::stoi(tok));
        }
        if((int)K.size()!=n*n) throw std::runtime_error("hill key length mismatch");
        // build matrix and compute determinant and inverse
        // only handle n=2 or 3 for now
        auto det2 = [&](const std::vector<int>&M){ return M[0]*M[3]-M[1]*M[2]; };
        int det = 0;
        if(n==2) det = det2(K);
        else throw std::runtime_error("hill currently supports n=2 only");
        int detmod = ((det%256)+256)%256;
        int detinv = modinv(detmod,256);
        if(detinv==0) throw std::runtime_error("hill key matrix not invertible mod 256");
        // compute adjugate for 2x2
        std::vector<int> adj(4);
        adj[0]=K[3]; adj[1]=-K[1]; adj[2]=-K[2]; adj[3]=K[0];
        for(int i=0;i<4;i++) adj[i]=((adj[i]%256)+256)%256;
        // encryption or decryption: use matrix or inverse matrix
        std::vector<int> mat(4);
        if(mode=="encrypt"){
            for(int i=0;i<4;i++) mat[i]=((K[i]%256)+256)%256;
        } else {
            for(int i=0;i<4;i++) mat[i]= (detinv * adj[i])%256;
        }
        // apply to RGB as blocks of size n
        std::vector<unsigned char> stream; stream.reserve(pixels*3);
        for(size_t i=0;i<pixels;++i){ size_t b=i*out_channels; stream.push_back(buffer[b+0]); stream.push_back(buffer[b+1]); stream.push_back(buffer[b+2]); }
        // pad to multiple of n
        while(stream.size()%n!=0) stream.push_back(0);
        for(size_t i=0;i<stream.size(); i+=n){
            for(int row=0; row<n; ++row){ int sum=0; for(int col=0; col<n; ++col){ sum += mat[row*n+col] * stream[i+col]; } stream[i+row]=mod256(sum); }
        }
        // write back
        size_t si=0;
        for(size_t i=0;i<pixels;++i){ size_t b=i*out_channels; buffer[b+0]=stream[si++]; buffer[b+1]=stream[si++]; buffer[b+2]=stream[si++]; if(si>stream.size()) break; }
    } else if (algorithm == "railfence") {
        stbi_image_free(img);
        throw std::runtime_error("algorithm not implemented");
    } else {
        stbi_image_free(img);
        throw std::runtime_error("algorithm not implemented");
    }

    // write PNG to memory
    std::vector<unsigned char> out;
    stbi_write_png_to_func(append_to_vector, &out, w, h, out_channels, buffer.data(), w * out_channels);

    stbi_image_free(img);
    return out;
}

int main() {
    Server svr;

    svr.set_exception_handler([](const Request & /*req*/, Response &res, std::exception &e){
        res.status = 500;
        res.set_content(e.what(), "text/plain");
    });

    // handle preflight CORS
    svr.Options(R"(/api/.*)", [](const Request &req, Response &res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.status = 200;
    });

    svr.Post(R"(/api/(encrypt|decrypt))", [](const Request &req, Response &res){
        res.set_header("Access-Control-Allow-Origin", "*");
        std::string path = req.path;
        std::string mode = (path.find("decrypt") != std::string::npos) ? "decrypt" : "encrypt";

        if (!req.has_file("image")) {
            res.status = 400; res.set_content("missing image", "text/plain"); return;
        }
        auto file = req.get_file_value("image");
        std::string algorithm = req.has_param("algorithm") ? req.get_param_value("algorithm") : "caesar";
        std::string key = req.has_param("key") ? req.get_param_value("key") : "";
        std::string param = req.has_param("param") ? req.get_param_value("param") : "";

        try {
            auto out_png = read_png_from_memory(file.content, algorithm, key, param, mode);
            res.set_content_provider(out_png.size(), "image/png", [out_png](size_t offset, size_t length, DataSink &sink){
                sink.write(out_png.data() + offset, length);
                return true;
            });
        } catch (const std::exception &e) {
            res.status = 501; res.set_content(std::string("Error: ") + e.what(), "text/plain");
        }
    });

    std::cout << "Starting server on http://0.0.0.0:5000" << std::endl;
    svr.listen("0.0.0.0", 5000);
    return 0;
}
