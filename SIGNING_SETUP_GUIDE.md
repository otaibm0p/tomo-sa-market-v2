# TOMO iOS - Signing Setup Guide for Archive

**Date:** 2026-02-14  
**Project:** tomocustomerapp  
**Bundle ID:** `com.tomo.tomocustomerapp`  
**Scheme:** `tomocustomerapp`

---

## ✅ Current Status

### Verified Settings:
- ✅ **Bundle ID:** `com.tomo.tomocustomerapp` (correct)
- ✅ **CODE_SIGN_STYLE:** `Automatic` (correct)
- ✅ **CODE_SIGN_IDENTITY:** `Apple Development` (correct)
- ⚠️ **DEVELOPMENT_TEAM:** Not set in project.pbxproj (needs to be set in Xcode UI)

---

## 🔧 Required Actions in Xcode

### Step 1: Open Project
```bash
cd /Users/user294169/Desktop/tomo-ios-new/tomocustomerapp
open tomocustomerapp.xcodeproj
```

### Step 2: Configure Signing & Capabilities

1. **Select Target:**
   - In left sidebar, click on **`tomocustomerapp`** project (blue icon)
   - Under **TARGETS**, select **`tomocustomerapp`**

2. **Go to Signing & Capabilities Tab:**
   - Click **"Signing & Capabilities"** tab at the top

3. **Configure Signing:**
   - ✅ **Automatically manage signing:** Check this box (ON)
   - **Team:** Select your Apple Developer account from dropdown
     - If no team appears:
       - Go to **Xcode > Settings > Accounts**
       - Click **"+"** to add Apple ID
       - Sign in with Apple Developer account
       - Return to Signing & Capabilities
       - Team should now appear in dropdown
   - **Bundle Identifier:** `com.tomo.tomocustomerapp` (should be auto-filled)
   - **Provisioning Profile:** Should show "Xcode Managed Profile" (automatic)

4. **Verify Capabilities:**
   - No special capabilities needed for basic app
   - If you see any expired capabilities, remove them

### Step 3: Verify Build Settings

1. **Select Target > Build Settings:**
   - Search for: `CODE_SIGN`
   - Verify:
     - `CODE_SIGN_STYLE` = `Automatic` ✅
     - `CODE_SIGN_IDENTITY` = `Apple Development` ✅
     - `DEVELOPMENT_TEAM` = Your Team ID (should be set automatically after Step 2)

2. **Search for:** `PRODUCT_BUNDLE_IDENTIFIER`
   - Should be: `com.tomo.tomocustomerapp` ✅

### Step 4: Clean Old Signing (if needed)

If you see any errors about:
- Expired provisioning profiles
- Invalid certificates
- Manual provisioning

**Fix:**
1. In **Signing & Capabilities**, uncheck "Automatically manage signing"
2. Wait 2 seconds
3. Check "Automatically manage signing" again
4. Select Team from dropdown
5. Xcode will regenerate everything automatically

### Step 5: Clean Build Folder

1. **Product > Clean Build Folder** (or `Cmd + Shift + K`)
2. Wait for cleanup to complete

### Step 6: Verify Scheme

1. Click scheme selector (next to device selector in toolbar)
2. Verify: **`tomocustomerapp`** is selected
3. If not, select it from dropdown

### Step 7: Set Destination for Archive

1. Click device selector in toolbar
2. Select: **"Any iOS Device (arm64)"**
   - ⚠️ **NOT** a Simulator
   - ⚠️ **NOT** "My Mac"

---

## 🎯 Expected Result

After completing above steps:
- ✅ No signing errors in Xcode
- ✅ Team selected and valid
- ✅ Provisioning profile: "Xcode Managed Profile"
- ✅ Ready for Archive

---

## 🚨 Common Signing Errors & Fixes

### Error: "Signing for 'tomocustomerapp' requires a development team"

**Fix:**
1. Go to **Signing & Capabilities**
2. Select **Team** from dropdown
3. If no teams appear:
   - **Xcode > Settings > Accounts**
   - Add Apple ID
   - Sign in
   - Return and select team

### Error: "No profiles for 'com.tomo.tomocustomerapp' were found"

**Fix:**
1. Ensure "Automatically manage signing" is ON
2. Select Team
3. Xcode will create profile automatically
4. Wait 10-30 seconds for profile generation

### Error: "Provisioning profile expired"

**Fix:**
1. Uncheck "Automatically manage signing"
2. Check it again
3. Select Team
4. Xcode will regenerate profile

### Error: "Code signing is required for product type 'Application'"

**Fix:**
1. Go to **Build Settings**
2. Search: `CODE_SIGNING_REQUIRED`
3. Ensure it's set to `YES`
4. Search: `CODE_SIGNING_ALLOWED`
5. Ensure it's set to `YES`

---

## 📋 Pre-Archive Checklist

Before running **Product > Archive**:

- [ ] Xcode project opened
- [ ] Target `tomocustomerapp` selected
- [ ] Signing & Capabilities tab open
- [ ] "Automatically manage signing" = ON
- [ ] Team selected (not empty)
- [ ] Bundle ID = `com.tomo.tomocustomerapp`
- [ ] Provisioning Profile = "Xcode Managed Profile"
- [ ] No signing errors (red warnings)
- [ ] Clean Build Folder completed
- [ ] Scheme = `tomocustomerapp`
- [ ] Destination = "Any iOS Device (arm64)"

---

## 🚀 Archive Command (Alternative)

If you prefer command line:

```bash
cd /Users/user294169/Desktop/tomo-ios-new/tomocustomerapp

# Archive (requires team to be set in Xcode first)
xcodebuild -scheme tomocustomerapp \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "./build/tomocustomerapp.xcarchive" \
  archive
```

**Note:** Team must be set in Xcode UI first, then this command will work.

---

## 📝 Notes

- **Automatic Signing:** Xcode will handle certificates and profiles automatically
- **Team Selection:** Must be done in Xcode UI (cannot be set via command line easily)
- **Bundle ID:** Must match App Store Connect app (if exists)
- **Version:** Currently `1.0 (2)` - increment before each TestFlight upload

---

**End of Signing Setup Guide**
