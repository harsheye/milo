# Android APK Signing Guide

This guide describes how to sign your unsigned release APK (`app-release-unsigned.apk`) so it is ready to be installed on physical devices or uploaded to the Google Play Store.

---

## Prerequisites

You need the following tools, which are installed as part of the Java JDK and Android SDK:
1. **`keytool`**: Generates your release signing key (keystore).
2. **`zipalign`**: Optimizes the APK's alignment for execution efficiency.
3. **`apksigner`**: Signs the APK using the generated key.

---

## Step 1: Locate the Tools

### A. Locate `keytool`
`keytool` is included with Java. If you use Android Studio, it includes a Java runtime at:
`C:\Program Files\Android\Android Studio\jbr\bin`

You can add this folder to your system variables, or run it directly by referencing the full path.

### B. Locate `zipalign` and `apksigner`
These are located inside the Android SDK Build-Tools directory:
`C:\Users\<YourUsername>\AppData\Local\Android\Sdk\build-tools\<version>\`

*Replace `<YourUsername>` with your Windows user name, and `<version>` with the version installed on your machine (e.g. `35.0.0` or `34.0.0`).*

---

## Step 2: Generate a Release Keystore

Run the following command to generate a new keystore file named `my-release-key.keystore`. 

```cmd
"C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

*Note:*
- It will prompt you to create a **password** for the keystore. Keep this password safe!
- It will ask for your name, organization, etc.
- A file named `my-release-key.keystore` will be created in your current directory.

---

## Step 3: Align the Unsigned APK

Before signing, you must align the APK using `zipalign`. In your command prompt, navigate to where your `app-release-unsigned.apk` is stored, and run:

```cmd
"C:\Users\<YourUsername>\AppData\Local\Android\Sdk\build-tools\<version>\zipalign.exe" -v 4 app-release-unsigned.apk app-release-aligned.apk
```

- This reads `app-release-unsigned.apk` and generates an optimized copy named `app-release-aligned.apk`.

---

## Step 4: Sign the Aligned APK

Now, sign the aligned APK with the keystore you generated in Step 2:

```cmd
"C:\Users\<YourUsername>\AppData\Local\Android\Sdk\build-tools\<version>\apksigner.bat" sign --ks my-release-key.keystore --ks-key-alias my-key-alias --out app-release-signed.apk app-release-aligned.apk
```

- It will prompt you to enter the **keystore password** you created in Step 2.
- Once entered, it will sign the APK and save it as `app-release-signed.apk`.

---

## Step 5: Verify the Signed APK

To verify that the APK is signed correctly and is compatible with Android devices, run:

```cmd
"C:\Users\<YourUsername>\AppData\Local\Android\Sdk\build-tools\<version>\apksigner.bat" verify --verbose app-release-signed.apk
```

If successful, the output will display:
```
Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
...
```

Your `app-release-signed.apk` is now fully ready for distribution and Play Store upload!
