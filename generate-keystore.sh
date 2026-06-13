#!/bin/bash
keytool -genkeypair \
  -alias redroid-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -keystore redroid.keystore \
  -storepass redroid2024 \
  -keypass redroid2024 \
  -dname "CN=REDroid, OU=Security Tools, O=REDroid, L=Cairo, S=Cairo, C=EG"
echo "Keystore generated: redroid.keystore"
echo "Base64 for GitHub Secret:"
base64 -w 0 redroid.keystore
