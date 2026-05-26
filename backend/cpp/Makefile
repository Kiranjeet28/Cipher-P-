CXX := g++
CXXFLAGS := -std=c++17 -O2 -Wall -Ithird_party
LDFLAGS := -lws2_32

SRC := main.cpp
OUT := cipher_server.exe

.PHONY: all clean

all: $(OUT)

$(OUT): $(SRC)
	$(CXX) $(CXXFLAGS) $(SRC) -o $(OUT) $(LDFLAGS)

clean:
	-rm -f $(OUT)
