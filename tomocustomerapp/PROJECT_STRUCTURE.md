# Project Structure

## البنية المنظمة للمشروع

```
tomocustomerapp/
├── Features/                    # Features organized by domain
│   ├── Home/
│   │   └── HomeView.swift
│   ├── Search/
│   │   └── SearchView.swift
│   ├── Cart/
│   │   └── CartView.swift
│   ├── Orders/
│   │   └── OrdersView.swift
│   └── Profile/
│       └── ProfileView.swift
│
├── Core/                        # Core functionality
│   ├── DesignSystem/           # Design system components (empty - ready for future use)
│   ├── Localization/            # Localization & language management
│   │   ├── LanguageManager.swift
│   │   ├── LanguageSelectionView.swift
│   │   └── String+Localized.swift
│   └── Networking/              # API & network layer
│       ├── APIClient.swift
│       └── Endpoints.swift
│
├── Models/                      # Data models
│   ├── Banner.swift
│   ├── Category.swift
│   └── Product.swift
│
├── ViewModels/                  # ViewModels
│   └── HomeViewModel.swift
│
├── ContentView.swift            # Root view with TabView
├── tomocustomerappApp.swift    # App entry point
└── RootTabView.swift            # (Legacy - can be removed if not used)
```

## Features/
كل feature في مجلد منفصل يحتوي على View الخاص به.

## Core/
- **DesignSystem/**: جاهز لإضافة مكونات التصميم المشتركة
- **Localization/**: إدارة اللغات والترجمة
- **Networking/**: طبقة الشبكة والـ API

## ملاحظات:
- Xcode يستخدم `PBXFileSystemSynchronizedRootGroup` - يكتشف الملفات تلقائياً
- جميع الـ imports تعمل تلقائياً في Swift
- البنية جاهزة للتوسع المستقبلي
