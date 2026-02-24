# Phase 20 - Xcode Archive + TestFlight Upload Guide

**Date:** 2026-02-14  
**Project:** TOMO iOS Customer App  
**Status:** Ready for Archive

---

## 📋 Project Information

- **Project Path:** `/Users/user294169/Desktop/tomo-ios-new/tomocustomerapp`
- **Xcode Project:** `tomocustomerapp.xcodeproj`
- **Scheme:** `tomocustomerapp`
- **Bundle ID:** `com.tomo.tomocustomerapp`
- **Current Version:** `1.0` (MARKETING_VERSION)
- **Build Number:** `2` (CURRENT_PROJECT_VERSION)
- **Branch:** `home-ui-arabic`
- **Git Status:** Clean (all changes committed)

---

## ✅ Step 1: Pre-Flight Checks (COMPLETED)

- ✅ Git fetch completed
- ✅ Working tree clean
- ✅ Remote configured: `https://github.com/otaibm0p/tomo-sa-market-v2.git`
- ✅ All changes committed

---

## 🚀 Step 2: Open Xcode Project

### Terminal Command:
```bash
cd /Users/user294169/Desktop/tomo-ios-new/tomocustomerapp
open tomocustomerapp.xcodeproj
```

**OR** manually:
1. Open Xcode
2. File > Open
3. Navigate to: `/Users/user294169/Desktop/tomo-ios-new/tomocustomerapp`
4. Select `tomocustomerapp.xcodeproj`
5. Click Open

---

## 🧹 Step 3: Clean Build Folder

1. In Xcode: **Product > Clean Build Folder** (or `Cmd + Shift + K`)
2. Wait for cleanup to complete

---

## ⚙️ Step 4: Verify Signing & Capabilities

1. Select **`tomocustomerapp`** target in the left sidebar
2. Go to **Signing & Capabilities** tab
3. Verify:
   - ✅ **Team:** Your Apple Developer account
   - ✅ **Automatically manage signing:** ON
   - ✅ **Bundle Identifier:** `com.tomo.tomocustomerapp`
   - ✅ **Provisioning Profile:** Should be auto-generated

**If signing errors appear:**
- Check Team selection
- Ensure Apple Developer account is signed in (Xcode > Settings > Accounts)
- Try: **Product > Clean Build Folder** then rebuild

---

## 🧪 Step 5: Test Run (Optional but Recommended)

1. Select **Any iOS Simulator** (e.g., iPhone 15 Pro)
2. Click **Run** (or `Cmd + R`)
3. Verify app launches without crashes
4. Quick smoke test:
   - Home screen loads
   - Navigation works
   - Cart badge visible

---

## 📦 Step 6: Archive (Release Build)

### 6.1 Select Destination
1. In Xcode toolbar, click device selector
2. Select **"Any iOS Device (arm64)"** (NOT Simulator)

### 6.2 Create Archive
1. **Product > Archive** (or `Cmd + B` then wait, then **Product > Archive**)
2. Wait for build to complete (may take 2-5 minutes)
3. **Organizer** window should open automatically

### 6.3 Verify Archive
- Archive should appear in Organizer
- Status should show: **"Ready to Distribute"**
- Version: `1.0 (2)`

**If Archive fails:**
- Check for build errors in Issue Navigator
- Verify signing is correct
- Ensure "Any iOS Device" is selected (not Simulator)

---

## ☁️ Step 7: Upload to TestFlight

### 7.1 Distribute App
1. In **Organizer**, select your archive
2. Click **"Distribute App"**
3. Select **"App Store Connect"**
4. Click **"Next"**

### 7.2 Distribution Options
1. Select **"Upload"**
2. Click **"Next"**

### 7.3 Signing
1. Select **"Automatically manage signing"**
2. Click **"Next"**
3. Review signing summary
4. Click **"Upload"**

### 7.4 Upload Progress
- Wait for upload to complete (5-15 minutes depending on size)
- Progress bar will show in Organizer
- **DO NOT close Xcode during upload**

### 7.5 Upload Complete
- Success message: "Your app has been uploaded to App Store Connect"
- Note the build number for reference

---

## 📱 Step 8: App Store Connect (TestFlight)

### 8.1 Access TestFlight
1. Go to: https://appstoreconnect.apple.com
2. Sign in with Apple Developer account
3. Navigate to: **My Apps > TOMO > TestFlight**

### 8.2 Processing
- New build will appear with status: **"Processing"**
- Wait 10-30 minutes for processing to complete
- Status will change to: **"Ready to Test"**

### 8.3 Add Testers (Internal Testing)
1. Go to **Internal Testing** tab
2. Click **"+"** to add new test group (or use existing)
3. Select the build (version 1.0, build 2)
4. Add tester emails:
   - Enter email addresses
   - Click **"Add"**
5. Testers will receive email invitation

### 8.4 External Testing (Optional)
- If needed, create External Testing group
- Requires App Review (24-48 hours)
- Add testers after approval

---

## 📸 Required Screenshots

Please capture screenshots of:

1. ✅ **Archive Success:**
   - Organizer window showing "Ready to Distribute"
   - Version and build number visible

2. ✅ **Upload Success:**
   - Upload completion message
   - Build number confirmation

3. ✅ **App Store Connect:**
   - TestFlight tab showing build
   - Processing/Ready status

4. ✅ **Signing Info:**
   - Signing & Capabilities tab
   - Team and Bundle ID visible

---

## 🔍 Troubleshooting

### Archive Fails
- **Error:** "No signing certificate"
  - **Fix:** Add Apple Developer account in Xcode Settings > Accounts
  - **Fix:** Select correct Team in Signing & Capabilities

- **Error:** "Multiple commands produce"
  - **Fix:** Already resolved (using PBXFileSystemSynchronizedRootGroup)
  - **Fix:** Clean Build Folder and rebuild

### Upload Fails
- **Error:** "Invalid Bundle"
  - **Fix:** Check Bundle ID matches App Store Connect
  - **Fix:** Verify version number is incremented

- **Error:** "Missing compliance"
  - **Fix:** Answer export compliance questions in App Store Connect

### TestFlight Processing Stuck
- Wait up to 1 hour
- Check email for any issues
- Verify build passes all checks in App Store Connect

---

## 📝 Checklist

Before Archive:
- [ ] Xcode project opened
- [ ] Clean Build Folder completed
- [ ] Signing verified (Team + Bundle ID)
- [ ] Test run successful (optional)

Archive:
- [ ] "Any iOS Device" selected
- [ ] Archive created successfully
- [ ] Organizer shows "Ready to Distribute"

Upload:
- [ ] Upload to App Store Connect started
- [ ] Upload completed without errors
- [ ] Build appears in App Store Connect

TestFlight:
- [ ] Build processing completed
- [ ] Build status: "Ready to Test"
- [ ] Internal testers added
- [ ] Testers received invitation emails

---

## 🎯 Expected Results

- **Archive:** ✅ Success
- **Upload:** ✅ Success (5-15 minutes)
- **Processing:** ✅ Complete (10-30 minutes)
- **TestFlight:** ✅ Ready for testing

---

## 📞 Support

If issues occur:
1. Check Xcode build logs
2. Review App Store Connect build details
3. Verify Apple Developer account status
4. Check email for App Store Connect notifications

---

**End of Archive + TestFlight Guide**
