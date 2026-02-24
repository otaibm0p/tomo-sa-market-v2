# TOMO iOS - TestFlight Upload Guide

**Date:** 2026-02-14  
**Project:** tomocustomerapp  
**Bundle ID:** `com.tomo.tomocustomerapp`  
**Version:** 1.0 (Build 3)  
**Team:** 85V7NA4A54

---

## ✅ Pre-Flight Checklist

### Current Configuration:
- ✅ **Bundle ID:** `com.tomo.tomocustomerapp`
- ✅ **Version:** `1.0`
- ✅ **Build:** `3` (incremented from 2)
- ✅ **Team:** `85V7NA4A54`
- ✅ **Code Signing:** Automatic
- ✅ **Code Sign Identity:** Apple Development

---

## 🚀 Step-by-Step Archive & Upload

### Step 1: Open Project in Xcode

✅ **Done:** Project opened automatically.

If not open:
```bash
cd /Users/user294169/Desktop/tomo-ios-new/tomocustomerapp
open tomocustomerapp.xcodeproj
```

---

### Step 2: Verify Target & Signing

1. **Select Target:**
   - In left sidebar, click **`tomocustomerapp`** project (blue icon)
   - Under **TARGETS**, select **`tomocustomerapp`**

2. **Go to Signing & Capabilities Tab:**
   - Click **"Signing & Capabilities"** tab

3. **Verify Settings:**
   - ✅ **Automatically manage signing:** ON
   - ✅ **Team:** Should show your team (85V7NA4A54)
   - ✅ **Bundle Identifier:** `com.tomo.tomocustomerapp`
   - ✅ **Provisioning Profile:** "Xcode Managed Profile" (automatic)

4. **If Signing Errors Appear:**
   - Uncheck "Automatically manage signing"
   - Wait 2 seconds
   - Check it again
   - Select Team from dropdown
   - Xcode will regenerate profile automatically

---

### Step 3: Verify General Settings

1. **Go to General Tab:**
   - Click **"General"** tab

2. **Verify Version Info:**
   - **Version:** `1.0` ✅
   - **Build:** `3` ✅ (should be 3, incremented from 2)

3. **If Build is not 3:**
   - Change Build to `3`
   - Or use: `$(CURRENT_PROJECT_VERSION)` (should auto-resolve to 3)

---

### Step 4: Select Destination

1. **In Xcode Toolbar (top):**
   - Click device selector (next to scheme selector)
   - Select: **"Any iOS Device (arm64)"**
   - ⚠️ **NOT** a Simulator
   - ⚠️ **NOT** "My Mac"
   - ⚠️ **NOT** a connected device

2. **Verify Scheme:**
   - Scheme selector should show: **`tomocustomerapp`**
   - If not, select it from dropdown

---

### Step 5: Clean Build Folder

1. **Menu:** `Product > Clean Build Folder`
   - Or press: `Cmd + Shift + K`

2. **Wait for cleanup to complete**
   - Should see: "Clean Succeeded"

---

### Step 6: Archive

1. **Menu:** `Product > Archive`
   - Or press: `Cmd + B` (build first), then `Product > Archive`

2. **Wait for Archive to complete:**
   - This may take 2-5 minutes
   - Progress shown in Xcode activity area (top right)

3. **Organizer Opens Automatically:**
   - After successful archive, **Organizer** window opens
   - You should see your archive listed with:
     - Name: `tomocustomerapp`
     - Date: Today's date
     - Version: 1.0 (3)

---

### Step 7: Distribute to App Store Connect

1. **In Organizer Window:**
   - Select your archive (latest one)
   - Click **"Distribute App"** button (right side)

2. **Distribution Method:**
   - Select: **"App Store Connect"**
   - Click **"Next"**

3. **Distribution Options:**
   - Select: **"Upload"**
   - Click **"Next"**

4. **App Thinning:**
   - Select: **"All compatible device variants"** (default)
   - Click **"Next"**

5. **Distribution Options:**
   - ✅ **Include bitcode:** OFF (if shown)
   - ✅ **Upload your app's symbols:** ON (recommended)
   - Click **"Next"**

6. **Signing:**
   - Select: **"Automatically manage signing"**
   - Xcode will handle certificates and profiles
   - Click **"Next"**

7. **Review:**
   - Review summary:
     - App: `tomocustomerapp`
     - Version: 1.0 (3)
     - Bundle ID: `com.tomo.tomocustomerapp`
   - Click **"Upload"**

8. **Upload Progress:**
   - Wait for upload to complete (5-15 minutes depending on size)
   - Progress shown in Organizer
   - Status: "Uploaded" when complete

---

### Step 8: Verify in App Store Connect

1. **Open App Store Connect:**
   - Go to: https://appstoreconnect.apple.com
   - Sign in with your Apple Developer account

2. **Navigate to Your App:**
   - **My Apps** > **TOMO** (or your app name)
   - Click **"TestFlight"** tab

3. **Check Build Status:**
   - Your build should appear in **"Processing"** state
   - Wait 10-30 minutes for processing to complete
   - Status changes to: **"Ready to Submit"** or **"Ready to Test"**

4. **If Build Processing Fails:**
   - Check email for error notifications
   - Common issues:
     - Missing compliance (export compliance)
     - Missing privacy info
     - Invalid provisioning profile
   - Fix issues and re-upload

---

## 🚨 Troubleshooting

### Error: "Signing for 'tomocustomerapp' requires a development team"

**Fix:**
1. Go to **Signing & Capabilities**
2. Select **Team** from dropdown
3. If no teams appear:
   - **Xcode > Settings > Accounts**
   - Add Apple ID
   - Sign in
   - Return and select team

---

### Error: "No profiles for 'com.tomo.tomocustomerapp' were found"

**Fix:**
1. Ensure "Automatically manage signing" is ON
2. Select Team
3. Wait 10-30 seconds for profile generation
4. Try Archive again

---

### Error: "Provisioning profile expired"

**Fix:**
1. Uncheck "Automatically manage signing"
2. Check it again
3. Select Team
4. Xcode will regenerate profile

---

### Error: "Archive failed" or "Build failed"

**Fix:**
1. **Product > Clean Build Folder**
2. Check for red errors in Xcode
3. Fix any compilation errors
4. Try Archive again

---

### Error: "Upload failed" or "Invalid bundle"

**Fix:**
1. Verify Bundle ID matches App Store Connect
2. Verify Version/Build is unique (not already uploaded)
3. Check App Store Connect for existing builds
4. Increment Build number if needed

---

### Build Stuck in "Processing" in App Store Connect

**Wait:**
- Processing takes 10-30 minutes
- Check email for notifications
- If stuck > 1 hour, check App Store Connect for error messages

---

## 📋 Final Checklist

Before Archive:
- [ ] Xcode project opened
- [ ] Target `tomocustomerapp` selected
- [ ] Signing & Capabilities: Team selected, Auto signing ON
- [ ] General: Version 1.0, Build 3
- [ ] Destination: "Any iOS Device (arm64)"
- [ ] Scheme: `tomocustomerapp`
- [ ] Clean Build Folder completed
- [ ] No red errors in Xcode

After Archive:
- [ ] Archive succeeded
- [ ] Organizer opened
- [ ] Archive visible with correct version (1.0, Build 3)

After Upload:
- [ ] Upload succeeded
- [ ] Build appears in App Store Connect > TestFlight
- [ ] Build status: Processing or Ready

---

## 🎯 Expected Result

✅ **Archive:** Successfully created  
✅ **Upload:** Successfully uploaded to App Store Connect  
✅ **TestFlight:** Build appears in TestFlight tab  
✅ **Status:** Processing → Ready to Test (within 30 minutes)

---

**End of TestFlight Upload Guide**
