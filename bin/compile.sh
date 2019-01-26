#!/bin/bash

# Delete any old build artifacts and compile new ones
rm -rf build
npx truffle compile
npx solium lint -d ./contracts
